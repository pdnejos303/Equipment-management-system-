// Path: prisma/import-csv.ts
// ============================================================
// Import legacy CSV → EquipTrack Asset table
// Prisma schema is the source of truth; CSV columns that don't
// match are coerced/mapped here, never the reverse.
//
// Usage:
//   npx tsx prisma/import-csv.ts                    (uses prisma/data.csv)
//   npx tsx prisma/import-csv.ts <path-to-csv>      (custom path)
//   docker compose exec app npx tsx prisma/import-csv.ts /app/data/legacy.csv
//
// CSV columns (12, no header expected) → Prisma Asset field:
//   1 legacy id  → (used only to seed fallback `code`, not stored)
//   2 category   → category   (via mapCategory)
//   3 name       → name
//   4 model/desc → model
//   5 quantity   → expands into N Asset rows (one per code)
//   6 price      → purchasePrice
//   7 status     → status     (via mapStatus → ACTIVE/AVAILABLE/MAINTENANCE/RETIRED)
//   8 date       → purchaseDate
//   9 serial     → serialNumber (only first row of an expanded group; column is @unique)
//   10 codes     → code        (range "(A-001) - (A-012)" or "A,B" or single)
//   11 notes     → notes
//   12 extra     → ignored
//
// Fields not present in CSV (kept null/default):
//   brand, location, warrantyEnd, nextMaintenance
// ============================================================

import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const prisma = new PrismaClient();

// ── Category mapping ────────────────────────────────────────
const STANDARD_CATEGORY_MAP: Record<string, string> = {
  PC: "LAPTOP",
  LAPTOP: "LAPTOP",
  CHAIR: "FURNITURE",
  TABLE: "FURNITURE",
  DESK: "FURNITURE",
  DRAWER: "FURNITURE",
  PHONE: "PHONE",
  PRINTER: "PRINTER",
  MONITOR: "MONITOR",
  CAMERA: "CAMERA",
  PROJECTOR: "PROJECTOR",
  VEHICLE: "VEHICLE",
};

function mapCategory(raw: string): string {
  const key = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (!key || key === "NULL") return "OTHER";
  return STANDARD_CATEGORY_MAP[key] ?? key;
}

// ── Expected life by category (years) ───────────────────────
function expectedLifeFor(category: string): number {
  const fast = ["LAPTOP", "MONITOR", "PRINTER", "PHONE", "NAS", "CAMERA", "PROJECTOR"];
  const long = ["FURNITURE", "VEHICLE"];
  if (fast.includes(category)) return 5;
  if (long.includes(category)) return 10;
  return 7;
}

// ── Status mapping ──────────────────────────────────────────
// Prisma Asset.status enum: ACTIVE | AVAILABLE | MAINTENANCE | RETIRED (default AVAILABLE)
type AssetStatus = "ACTIVE" | "AVAILABLE" | "MAINTENANCE" | "RETIRED";

function mapStatus(raw: string): AssetStatus {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v || v === "null" || v === "unknow" || v === "unknown") return "AVAILABLE";
  if (v === "use" || v === "in use" || v === "in-use" || v === "active") return "ACTIVE";
  if (v === "available" || v === "free" || v === "not use" || v === "not-use" || v === "unused") return "AVAILABLE";
  if (v === "maintenance" || v === "repair" || v === "repairing" || v === "fixing") return "MAINTENANCE";
  if (v === "broken" || v === "retired" || v === "disposed" || v === "scrapped") return "RETIRED";
  return "AVAILABLE";
}

// ── Date parsing ────────────────────────────────────────────
function parseDate(raw: string): Date | null {
  if (!raw || raw.trim() === "" || raw.trim().toUpperCase() === "NULL") return null;
  const s = raw.trim().split(" ")[0]; // "2020-06-02 00:00:00.0000000" → "2020-06-02"
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// ── Number parsing ──────────────────────────────────────────
function parseNumber(raw: string): number {
  if (!raw || raw.trim().toUpperCase() === "NULL") return 0;
  const n = parseFloat(raw.trim());
  return isNaN(n) ? 0 : n;
}

// ── Code expansion ──────────────────────────────────────────
function expandRange(startCode: string, endCode: string): string[] {
  const m1 = startCode.match(/^(.+-)(\d+)$/);
  const m2 = endCode.match(/^(.+-)(\d+)$/);
  if (!m1 || !m2 || m1[1] !== m2[1]) return [startCode, endCode];
  const prefix = m1[1];
  const start = parseInt(m1[2], 10);
  const end = parseInt(m2[2], 10);
  const padLen = m1[2].length;
  const codes: string[] = [];
  for (let i = start; i <= end; i++) {
    codes.push(prefix + String(i).padStart(padLen, "0"));
  }
  return codes;
}

function parseCodes(raw: string): string[] {
  if (!raw) return [];
  const cleaned = raw.trim();
  if (!cleaned || cleaned.toUpperCase() === "NULL" || cleaned === "-") return [];

  // Pattern: "(XXX-001) - (XXX-012)"
  const rangeMatch = cleaned.match(/\(([\w-]+)\)\s*-\s*\(([\w-]+)\)/);
  if (rangeMatch) {
    return expandRange(rangeMatch[1], rangeMatch[2]);
  }

  // Pattern: "AAA-001,BBB-002" or "AAA-001, BBB-002"
  if (cleaned.includes(",")) {
    return cleaned
      .split(",")
      .map((s) => s.trim().replace(/^\(|\)$/g, ""))
      .filter(Boolean);
  }

  // Single
  return [cleaned.replace(/^\(|\)$/g, "")];
}

function generateFallbackCodes(legacyId: string, category: string, qty: number): string[] {
  const prefix = category.slice(0, 3).toUpperCase();
  return Array.from({ length: qty }, (_, i) => `LEGACY-${prefix}-${legacyId}-${i + 1}`);
}

// ── CSV parser (handles quoted fields with commas) ──────────
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "," && !inQuote) {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  const argPath = process.argv[2];
  const defaultPath = resolve(__dirname, "data.csv");
  const fullPath = argPath ? resolve(argPath) : defaultPath;

  if (!existsSync(fullPath)) {
    if (argPath) {
      console.error(`File not found: ${fullPath}`);
    } else {
      console.error(`No CSV file found at: ${fullPath}`);
      console.error(`Drop a "data.csv" into the prisma/ folder, or run:`);
      console.error(`   npx tsx prisma/import-csv.ts <path-to-csv>`);
    }
    process.exit(1);
  }

  console.log(`Reading: ${fullPath}`);
  const raw = readFileSync(fullPath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  console.log(`Found ${lines.length} non-empty lines`);

  // Track stats
  const stats = {
    rowsRead: 0,
    assetsCreated: 0,
    assetsUpdated: 0,
    rowsSkipped: 0,
    fallbackCodes: 0,
    categoriesCreated: 0,
  };

  const seenCategories = new Set<string>();
  const errors: { row: number; msg: string }[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const rowNum = idx + 1;
    stats.rowsRead++;

    const cells = parseCsvLine(line);
    if (cells.length < 10) {
      errors.push({ row: rowNum, msg: `only ${cells.length} columns` });
      stats.rowsSkipped++;
      continue;
    }

    const [
      legacyId,
      categoryRaw,
      nameRaw,
      modelRaw,
      qtyRaw,
      priceRaw,
      statusRaw,
      dateRaw,
      serialRaw,
      codesRaw,
      noteRaw,
    ] = cells;

    const name = nameRaw?.trim();
    if (!name) {
      errors.push({ row: rowNum, msg: "empty name" });
      stats.rowsSkipped++;
      continue;
    }

    const category = mapCategory(categoryRaw);
    seenCategories.add(category);

    const qty = Math.max(1, Math.floor(parseNumber(qtyRaw)) || 1);
    const price = parseNumber(priceRaw);
    const status = mapStatus(statusRaw);
    const purchaseDate = parseDate(dateRaw) ?? new Date("2020-01-01");
    const expectedLife = expectedLifeFor(category);

    const model =
      modelRaw && modelRaw.trim().toUpperCase() !== "NULL" ? modelRaw.trim() : null;
    const serial =
      serialRaw && serialRaw.trim().toUpperCase() !== "NULL" ? serialRaw.trim() : null;
    const notes =
      noteRaw && noteRaw.trim().toUpperCase() !== "NULL" ? noteRaw.trim() : null;

    // Expand codes
    let codes = parseCodes(codesRaw);

    if (codes.length === 0) {
      codes = generateFallbackCodes(legacyId, category, qty);
      stats.fallbackCodes += codes.length;
    } else if (codes.length < qty) {
      // Partial codes — fill the rest with fallback
      const extra = generateFallbackCodes(legacyId, category, qty - codes.length);
      codes = [...codes, ...extra];
      stats.fallbackCodes += extra.length;
    }
    // codes.length > qty → use all codes (CSV is more authoritative)

    // Upsert each asset
    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      // Only first record gets the serial (unique constraint)
      const thisSerial = i === 0 ? serial : null;

      try {
        const existing = await prisma.asset.findUnique({ where: { code } });
        if (existing) {
          await prisma.asset.update({
            where: { code },
            data: {
              name,
              category,
              model,
              status,
              purchaseDate,
              purchasePrice: price,
              expectedLife,
              serialNumber: thisSerial,
              notes,
            },
          });
          stats.assetsUpdated++;
        } else {
          await prisma.asset.create({
            data: {
              code,
              name,
              category,
              model,
              status,
              purchaseDate,
              purchasePrice: price,
              expectedLife,
              serialNumber: thisSerial,
              notes,
            },
          });
          stats.assetsCreated++;
        }
      } catch (e: any) {
        errors.push({ row: rowNum, msg: `code ${code}: ${e.message}` });
      }
    }
  }

  // Auto-create Category records for any categories we used
  console.log("\nSyncing Category table...");
  let order = 0;
  for (const cat of Array.from(seenCategories).sort()) {
    const exists = await prisma.category.findUnique({ where: { key: cat } });
    if (!exists) {
      await prisma.category.create({
        data: {
          key: cat,
          label: cat
            .split("_")
            .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
            .join(" "),
          order: order++,
          isDefault: false,
        },
      });
      stats.categoriesCreated++;
    }
  }

  // Report
  console.log("\n========== IMPORT COMPLETE ==========");
  console.log(`Rows read:           ${stats.rowsRead}`);
  console.log(`Rows skipped:        ${stats.rowsSkipped}`);
  console.log(`Assets created:      ${stats.assetsCreated}`);
  console.log(`Assets updated:      ${stats.assetsUpdated}`);
  console.log(`Fallback codes gen:  ${stats.fallbackCodes}`);
  console.log(`Categories created:  ${stats.categoriesCreated}`);
  console.log(`Categories seen:     ${Array.from(seenCategories).join(", ")}`);

  if (errors.length) {
    console.log(`\n${errors.length} error(s):`);
    errors.slice(0, 20).forEach((e) => console.log(`  row ${e.row}: ${e.msg}`));
    if (errors.length > 20) console.log(`  ... and ${errors.length - 20} more`);
  }
}

main()
  .catch((e) => {
    console.error("Import failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
