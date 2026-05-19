// Path: prisma/extrac-image.ts
// Extract images from legacy SQL Server (Items table) →
//   1. write FULL original to UPLOADS_DIR/<code>.<ext>
//   2. write 1200px thumbnail to UPLOADS_DIR/thumbs/<code>.jpg
//   3. upsert AssetPhoto record (url = /api/photos/<code>.<ext>)
//
// Handles legacy AssetCode formats:
//   - "EQ-001"                          → single, link 1:1
//   - "(CAB-001) - (CAB-010)"           → range, link to FIRST code only
//                                          (rest will be re-photographed manually)
//
// Usage:  npm run db:extract-images

import sql from "mssql";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, join } from "path";

const prisma = new PrismaClient();

const config: sql.config = {
  server: "192.168.1.21",
  port: 1433,
  database: "aspnet-TaeAuthenticationTestDb",
  user: "sa",
  password: "01Password",
  options: {
    instanceName: "INTERNPRJ",
    encrypt: false,
    trustServerCertificate: true,
  },
};

const UPLOADS_DIR =
  process.env.UPLOADS_DIR || resolve(__dirname, "../uploads");
const THUMBS_DIR = join(UPLOADS_DIR, "thumbs");
const THUMB_WIDTH = 1200;
const THUMB_QUALITY = 80;

function detectExt(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "gif";
  if (buf[0] === 0x42 && buf[1] === 0x4d) return "bmp";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) return "webp";
  return "bin";
}

// "(CAB-001) - (CAB-010)"        →  "CAB-001"   (range)
// "EQ-001, EQ-002"                →  "EQ-001"    (comma list)
// "EQ-001"                        →  "EQ-001"
// "-" / ""                        →  null
function firstAssetCode(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.trim();
  if (!cleaned || cleaned === "-") return null;

  const rangeMatch = cleaned.match(/\(([\w-]+)\)\s*-\s*\(([\w-]+)\)/);
  if (rangeMatch) return rangeMatch[1];

  const first = cleaned.split(",")[0].trim().replace(/^\(|\)$/g, "");
  if (!first || !/^[\w-]+$/.test(first)) return null;
  return first;
}

async function main() {
  if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!existsSync(THUMBS_DIR)) mkdirSync(THUMBS_DIR, { recursive: true });
  console.log(`Originals: ${UPLOADS_DIR}`);
  console.log(`Thumbnails: ${THUMBS_DIR} (${THUMB_WIDTH}px, q${THUMB_QUALITY})`);

  console.log("\nConnecting to SQL Server...");
  await sql.connect(config);

  console.log("Fetching images...");
  const result = await sql.query`
    SELECT Id, AssetCode, ImageData
    FROM Items
    WHERE ImageData IS NOT NULL AND DATALENGTH(ImageData) > 0
  `;

  console.log(`Found ${result.recordset.length} rows with images\n`);

  const stats = {
    saved: 0,
    fileExists: 0,
    photoCreated: 0,
    photoExists: 0,
    assetNotFound: 0,
    skipped: 0,
    rangeRows: 0,
  };
  const errors: string[] = [];
  const orphans: string[] = [];

  for (const row of result.recordset) {
    const buf: Buffer = row.ImageData;
    if (!buf || buf.length === 0) {
      stats.skipped++;
      continue;
    }

    const rawCode = row.AssetCode?.trim() || "";
    const isRange = /\(.+\)\s*-\s*\(.+\)/.test(rawCode);
    if (isRange) stats.rangeRows++;

    const code = firstAssetCode(rawCode);
    if (!code) {
      orphans.push(`Id=${row.Id} (empty AssetCode)`);
      stats.assetNotFound++;
      continue;
    }

    const ext = detectExt(buf);
    const safeName = code.replace(/[^\w-]/g, "_");
    const filename = `${safeName}.${ext}`;
    const fullPath = resolve(UPLOADS_DIR, filename);
    const thumbPath = resolve(THUMBS_DIR, `${safeName}.jpg`);
    const url = `/api/photos/${filename}`;

    try {
      if (existsSync(fullPath)) {
        stats.fileExists++;
      } else {
        writeFileSync(fullPath, buf);
        stats.saved++;
      }

      if (!existsSync(thumbPath)) {
        await sharp(buf)
          .rotate()
          .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
          .jpeg({ quality: THUMB_QUALITY })
          .toFile(thumbPath);
      }

      const asset = await prisma.asset.findUnique({ where: { code } });
      if (!asset) {
        orphans.push(isRange ? `${code} (from range "${rawCode}")` : code);
        stats.assetNotFound++;
        continue;
      }

      const existingPhoto = await prisma.assetPhoto.findFirst({
        where: { assetId: asset.id, url },
      });

      if (existingPhoto) {
        stats.photoExists++;
      } else {
        await prisma.assetPhoto.create({
          data: { assetId: asset.id, url, isPrimary: true, order: 0 },
        });
        stats.photoCreated++;
      }

      const done = stats.saved + stats.fileExists;
      if (done % 20 === 0) console.log(`  processed ${done}...`);
    } catch (e: any) {
      errors.push(`${row.Id} (${rawCode}): ${e.message}`);
    }
  }

  console.log("\n========== DONE ==========");
  console.log(`Files saved (new):         ${stats.saved}`);
  console.log(`Files already on disk:     ${stats.fileExists}`);
  console.log(`AssetPhoto created:        ${stats.photoCreated}`);
  console.log(`AssetPhoto already linked: ${stats.photoExists}`);
  console.log(`Asset not found (orphan):  ${stats.assetNotFound}`);
  console.log(`Range rows (1 photo each): ${stats.rangeRows}`);
  console.log(`Skipped (empty image):     ${stats.skipped}`);
  console.log(`Errors:                    ${errors.length}`);
  console.log(`\nOriginals: ${UPLOADS_DIR}`);
  console.log(`Thumbs:    ${THUMBS_DIR}`);

  if (orphans.length) {
    console.log(`\nOrphan codes (file saved but no matching Asset.code):`);
    orphans.slice(0, 30).forEach((c) => console.log(`  ${c}`));
    if (orphans.length > 30) console.log(`  ... and ${orphans.length - 30} more`);
  }

  if (errors.length) {
    console.log(`\nErrors:`);
    errors.slice(0, 10).forEach((e) => console.log(`  ${e}`));
  }

  await (sql as any).close();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
