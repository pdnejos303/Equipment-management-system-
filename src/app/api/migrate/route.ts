// Path: src/app/api/migrate/route.ts
// ============================================================
// File: route.ts
// Path: equip-track/src/app/api/migrate/route.ts
// Desc: Migration API — Import data from legacy C# app
//       Accepts JSON with field mapping, validates, and inserts
//       POST /api/migrate { type, data, fieldMap }
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ── Types ──

interface MigrateRequest {
  type: "assets" | "assignments" | "maintenance" | "bookings";
  data: Record<string, any>[];
  fieldMap: Record<string, string>; // { newFieldName: "oldFieldName" }
  options?: {
    skipDuplicates?: boolean;  // skip if code/serialNumber already exists
    dryRun?: boolean;          // preview only, don't insert
    defaultCategory?: string;
    defaultStatus?: string;
  };
}

interface MigrateResult {
  success: boolean;
  type: string;
  total: number;
  imported: number;
  skipped: number;
  errors: { row: number; message: string; data?: any }[];
  preview?: any[];
}

// ── Helpers ──

function mapRow(row: Record<string, any>, fieldMap: Record<string, string>): Record<string, any> {
  const mapped: Record<string, any> = {};
  for (const [newField, oldField] of Object.entries(fieldMap)) {
    if (oldField && row[oldField] !== undefined) {
      mapped[newField] = row[oldField];
    }
  }
  return mapped;
}

function parseDate(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function parseNumber(val: any): number {
  if (val === null || val === undefined || val === "") return 0;
  const n = Number(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

// Normalize status values from legacy systems
function normalizeStatus(val: string | null | undefined, defaults: string): string {
  if (!val) return defaults;
  const s = val.toUpperCase().trim();
  const statusMap: Record<string, string> = {
    // English
    "ACTIVE": "ACTIVE", "IN USE": "ACTIVE", "INUSE": "ACTIVE", "USED": "ACTIVE",
    "AVAILABLE": "AVAILABLE", "FREE": "AVAILABLE", "IDLE": "AVAILABLE", "READY": "AVAILABLE",
    "MAINTENANCE": "MAINTENANCE", "REPAIR": "MAINTENANCE", "FIXING": "MAINTENANCE", "BROKEN": "MAINTENANCE",
    "RETIRED": "RETIRED", "DISPOSED": "RETIRED", "SCRAPPED": "RETIRED", "DECOMMISSIONED": "RETIRED",
    // Thai
    "ใช้งาน": "ACTIVE", "ใช้งานอยู่": "ACTIVE", "กำลังใช้": "ACTIVE",
    "ว่าง": "AVAILABLE", "พร้อมใช้": "AVAILABLE", "ว่างอยู่": "AVAILABLE",
    "ซ่อม": "MAINTENANCE", "กำลังซ่อม": "MAINTENANCE", "ชำรุด": "MAINTENANCE",
    "เสื่อมสภาพ": "RETIRED", "จำหน่าย": "RETIRED", "ยกเลิก": "RETIRED", "เลิกใช้": "RETIRED",
  };
  return statusMap[s] || defaults;
}

function normalizeCategory(val: string | null | undefined, defaults: string): string {
  if (!val) return defaults;
  const c = val.toUpperCase().trim();
  const categoryMap: Record<string, string> = {
    // English
    "LAPTOP": "LAPTOP", "NOTEBOOK": "LAPTOP", "COMPUTER": "LAPTOP", "PC": "LAPTOP",
    "MONITOR": "MONITOR", "DISPLAY": "MONITOR", "SCREEN": "MONITOR",
    "VEHICLE": "VEHICLE", "CAR": "VEHICLE", "TRUCK": "VEHICLE", "MOTORCYCLE": "VEHICLE",
    "FURNITURE": "FURNITURE", "DESK": "FURNITURE", "CHAIR": "FURNITURE", "TABLE": "FURNITURE",
    "CAMERA": "CAMERA",
    "PROJECTOR": "PROJECTOR",
    "PRINTER": "PRINTER", "SCANNER": "PRINTER",
    "PHONE": "PHONE", "MOBILE": "PHONE", "TELEPHONE": "PHONE",
    // Thai
    "โน้ตบุ๊ก": "LAPTOP", "คอมพิวเตอร์": "LAPTOP", "โน๊ตบุ๊ค": "LAPTOP",
    "จอ": "MONITOR", "จอมอนิเตอร์": "MONITOR",
    "รถ": "VEHICLE", "ยานพาหนะ": "VEHICLE", "รถยนต์": "VEHICLE",
    "เฟอร์นิเจอร์": "FURNITURE", "โต๊ะ": "FURNITURE", "เก้าอี้": "FURNITURE",
    "กล้อง": "CAMERA",
    "โปรเจกเตอร์": "PROJECTOR",
    "เครื่องพิมพ์": "PRINTER", "ปริ้นเตอร์": "PRINTER",
    "โทรศัพท์": "PHONE", "มือถือ": "PHONE",
  };

  // Exact match
  if (categoryMap[c]) return categoryMap[c];

  // Partial match
  for (const [key, value] of Object.entries(categoryMap)) {
    if (c.includes(key) || key.includes(c)) return value;
  }

  return defaults;
}

// ── Import Functions ──

async function importAssets(
  data: Record<string, any>[],
  fieldMap: Record<string, string>,
  options: MigrateRequest["options"] = {}
): Promise<MigrateResult> {
  const result: MigrateResult = {
    success: true, type: "assets",
    total: data.length, imported: 0, skipped: 0, errors: [],
  };

  const preview: any[] = [];

  // Map all rows first
  const mapped: { index: number; asset: any }[] = [];
  for (let i = 0; i < data.length; i++) {
    try {
      const raw = mapRow(data[i], fieldMap);
      const code = String(raw.code || `EQ-${String(i + 1).padStart(3, "0")}`).trim();
      const asset = {
        code,
        name: String(raw.name || "Unknown").trim(),
        brand: raw.brand ? String(raw.brand).trim() : null,
        model: raw.model ? String(raw.model).trim() : null,
        serialNumber: raw.serialNumber ? String(raw.serialNumber).trim() : null,
        category: normalizeCategory(raw.category, options?.defaultCategory || "OTHER"),
        status: normalizeStatus(raw.status, options?.defaultStatus || "AVAILABLE"),
        purchaseDate: parseDate(raw.purchaseDate) || new Date(),
        purchasePrice: parseNumber(raw.purchasePrice),
        expectedLife: parseInt(raw.expectedLife) || 5,
        warrantyEnd: parseDate(raw.warrantyEnd),
        nextMaintenance: parseDate(raw.nextMaintenance),
        location: raw.location ? String(raw.location).trim() : null,
        notes: raw.notes ? String(raw.notes).trim() : null,
      };
      mapped.push({ index: i, asset });
    } catch (e: any) {
      result.errors.push({ row: i + 1, message: e.message || "Unknown error", data: data[i] });
    }
  }

  if (options?.dryRun) {
    result.preview = mapped.slice(0, 10).map((m) => ({
      row: m.index + 1, original: data[m.index], mapped: m.asset,
    }));
    result.imported = mapped.length;
    return result;
  }

  // Pre-fetch existing codes & serial numbers in bulk (1 query instead of N)
  let existingCodes = new Set<string>();
  let existingSerials = new Set<string>();
  if (options?.skipDuplicates) {
    const allCodes = mapped.map((m) => m.asset.code);
    const allSerials = mapped.map((m) => m.asset.serialNumber).filter(Boolean) as string[];

    const existing = await prisma.asset.findMany({
      where: {
        OR: [
          { code: { in: allCodes } },
          ...(allSerials.length > 0 ? [{ serialNumber: { in: allSerials } }] : []),
        ],
      },
      select: { code: true, serialNumber: true },
    });
    existingCodes = new Set(existing.map((e) => e.code));
    existingSerials = new Set(existing.map((e) => e.serialNumber).filter(Boolean) as string[]);
  }

  // Filter out duplicates in memory, then batch create
  const toCreate: any[] = [];
  for (const { index, asset } of mapped) {
    if (options?.skipDuplicates) {
      if (existingCodes.has(asset.code) || (asset.serialNumber && existingSerials.has(asset.serialNumber))) {
        result.skipped++;
        continue;
      }
      // Also track within-batch duplicates
      existingCodes.add(asset.code);
      if (asset.serialNumber) existingSerials.add(asset.serialNumber);
    }
    toCreate.push({ index, asset });
  }

  // Batch create in transaction chunks of 100
  const CHUNK = 100;
  for (let c = 0; c < toCreate.length; c += CHUNK) {
    const chunk = toCreate.slice(c, c + CHUNK);
    try {
      await prisma.$transaction(
        chunk.map(({ asset }) => prisma.asset.create({ data: asset }))
      );
      result.imported += chunk.length;
    } catch {
      // If batch fails, fall back to individual creates for this chunk
      for (const { index, asset } of chunk) {
        try {
          await prisma.asset.create({ data: asset });
          result.imported++;
        } catch (e: any) {
          result.errors.push({ row: index + 1, message: e.message || "Unknown error", data: data[index] });
        }
      }
    }
  }

  return result;
}

async function importAssignments(
  data: Record<string, any>[],
  fieldMap: Record<string, string>,
  options: MigrateRequest["options"] = {}
): Promise<MigrateResult> {
  const result: MigrateResult = {
    success: true, type: "assignments",
    total: data.length, imported: 0, skipped: 0, errors: [],
  };

  // Collect all asset codes needed, then fetch in bulk (1 query instead of N)
  const rows = data.map((row, i) => ({ index: i, raw: mapRow(row, fieldMap) }));
  const assetCodes = [...new Set(rows.map((r) => String(r.raw.assetCode || "").trim()).filter(Boolean))];

  const assets = await prisma.asset.findMany({
    where: { code: { in: assetCodes } },
    select: { id: true, code: true },
  });
  const assetMap = new Map(assets.map((a) => [a.code, a.id]));

  const toCreate: { index: number; data: any }[] = [];
  for (const { index, raw } of rows) {
    const assetCode = String(raw.assetCode || "").trim();
    const assetId = assetMap.get(assetCode);
    if (!assetId) {
      result.errors.push({ row: index + 1, message: `Asset not found: ${assetCode}` });
      continue;
    }

    if (options?.dryRun) { result.imported++; continue; }

    toCreate.push({
      index,
      data: {
        assetId,
        personName: String(raw.personName || "Unknown").trim(),
        department: raw.department ? String(raw.department).trim() : null,
        dateOut: parseDate(raw.dateOut) || new Date(),
        dateIn: parseDate(raw.dateIn),
        notes: raw.notes ? String(raw.notes).trim() : null,
      },
    });
  }

  if (options?.dryRun) return result;

  // Batch create in transaction chunks
  const CHUNK = 100;
  for (let c = 0; c < toCreate.length; c += CHUNK) {
    const chunk = toCreate.slice(c, c + CHUNK);
    try {
      await prisma.$transaction(
        chunk.map(({ data }) => prisma.assignment.create({ data }))
      );
      result.imported += chunk.length;
    } catch {
      for (const { index, data } of chunk) {
        try {
          await prisma.assignment.create({ data });
          result.imported++;
        } catch (e: any) {
          result.errors.push({ row: index + 1, message: e.message });
        }
      }
    }
  }

  return result;
}

async function importMaintenance(
  data: Record<string, any>[],
  fieldMap: Record<string, string>,
  options: MigrateRequest["options"] = {}
): Promise<MigrateResult> {
  const result: MigrateResult = {
    success: true, type: "maintenance",
    total: data.length, imported: 0, skipped: 0, errors: [],
  };

  // Bulk fetch all referenced assets (1 query instead of N)
  const rows = data.map((row, i) => ({ index: i, raw: mapRow(row, fieldMap) }));
  const assetCodes = [...new Set(rows.map((r) => String(r.raw.assetCode || "").trim()).filter(Boolean))];

  const assets = await prisma.asset.findMany({
    where: { code: { in: assetCodes } },
    select: { id: true, code: true },
  });
  const assetMap = new Map(assets.map((a) => [a.code, a.id]));

  const toCreate: { index: number; data: any }[] = [];
  for (const { index, raw } of rows) {
    const assetCode = String(raw.assetCode || "").trim();
    const assetId = assetMap.get(assetCode);
    if (!assetId) {
      result.errors.push({ row: index + 1, message: `Asset not found: ${assetCode}` });
      continue;
    }

    if (options?.dryRun) { result.imported++; continue; }

    toCreate.push({
      index,
      data: {
        assetId,
        date: parseDate(raw.date) || new Date(),
        description: String(raw.description || "Imported record").trim(),
        cost: parseNumber(raw.cost),
        vendor: raw.vendor ? String(raw.vendor).trim() : null,
        type: (raw.type || "REPAIR").toUpperCase(),
        notes: raw.notes ? String(raw.notes).trim() : null,
      },
    });
  }

  if (options?.dryRun) return result;

  // Batch create in transaction chunks
  const CHUNK = 100;
  for (let c = 0; c < toCreate.length; c += CHUNK) {
    const chunk = toCreate.slice(c, c + CHUNK);
    try {
      await prisma.$transaction(
        chunk.map(({ data }) => prisma.maintenanceRecord.create({ data }))
      );
      result.imported += chunk.length;
    } catch {
      for (const { index, data } of chunk) {
        try {
          await prisma.maintenanceRecord.create({ data });
          result.imported++;
        } catch (e: any) {
          result.errors.push({ row: index + 1, message: e.message });
        }
      }
    }
  }

  return result;
}

async function importBookings(
  data: Record<string, any>[],
  fieldMap: Record<string, string>,
  options: MigrateRequest["options"] = {}
): Promise<MigrateResult> {
  const result: MigrateResult = {
    success: true, type: "bookings",
    total: data.length, imported: 0, skipped: 0, errors: [],
  };

  // Bulk fetch all referenced assets (1 query instead of N)
  const rows = data.map((row, i) => ({ index: i, raw: mapRow(row, fieldMap) }));
  const assetCodes = [...new Set(rows.map((r) => String(r.raw.assetCode || "").trim()).filter(Boolean))];

  const assets = await prisma.asset.findMany({
    where: { code: { in: assetCodes } },
    select: { id: true, code: true },
  });
  const assetMap = new Map(assets.map((a) => [a.code, a.id]));

  const toCreate: { index: number; data: any }[] = [];
  for (const { index, raw } of rows) {
    const assetCode = String(raw.assetCode || "").trim();
    const assetId = assetMap.get(assetCode);
    if (!assetId) {
      result.errors.push({ row: index + 1, message: `Asset not found: ${assetCode}` });
      continue;
    }

    if (options?.dryRun) { result.imported++; continue; }

    toCreate.push({
      index,
      data: {
        assetId,
        personName: String(raw.personName || "Unknown").trim(),
        dateStart: parseDate(raw.dateStart) || new Date(),
        dateEnd: parseDate(raw.dateEnd) || new Date(),
        purpose: raw.purpose ? String(raw.purpose).trim() : null,
        status: "RETURNED",
      },
    });
  }

  if (options?.dryRun) return result;

  // Batch create in transaction chunks
  const CHUNK = 100;
  for (let c = 0; c < toCreate.length; c += CHUNK) {
    const chunk = toCreate.slice(c, c + CHUNK);
    try {
      await prisma.$transaction(
        chunk.map(({ data }) => prisma.booking.create({ data }))
      );
      result.imported += chunk.length;
    } catch {
      for (const { index, data } of chunk) {
        try {
          await prisma.booking.create({ data });
          result.imported++;
        } catch (e: any) {
          result.errors.push({ row: index + 1, message: e.message });
        }
      }
    }
  }

  return result;
}

// ── Route Handler ──

export async function POST(req: NextRequest) {
  try {
    // Auth check — ADMIN only
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body: MigrateRequest = await req.json();
    const { type, data, fieldMap, options } = body;

    if (!type || !data || !Array.isArray(data) || !fieldMap) {
      return NextResponse.json(
        { error: "Required: type, data (array), fieldMap (object)" },
        { status: 400 }
      );
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: "Data array is empty" },
        { status: 400 }
      );
    }

    if (data.length > 10000) {
      return NextResponse.json(
        { error: "Maximum 10,000 rows per request" },
        { status: 400 }
      );
    }

    let result: MigrateResult;

    switch (type) {
      case "assets":
        result = await importAssets(data, fieldMap, options);
        break;
      case "assignments":
        result = await importAssignments(data, fieldMap, options);
        break;
      case "maintenance":
        result = await importMaintenance(data, fieldMap, options);
        break;
      case "bookings":
        result = await importBookings(data, fieldMap, options);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown type: ${type}. Use: assets, assignments, maintenance, bookings` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/migrate error:", error);
    return NextResponse.json(
      { error: error.message || "Migration failed" },
      { status: 500 }
    );
  }
}

// ── GET: Show schema info for field mapping ──

export async function GET() {
  return NextResponse.json({
    schemas: {
      assets: {
        required: ["code", "name"],
        optional: [
          "brand", "model", "serialNumber", "category", "status",
          "purchaseDate", "purchasePrice", "expectedLife",
          "warrantyEnd", "nextMaintenance", "location", "notes",
        ],
        categories: ["LAPTOP", "MONITOR", "VEHICLE", "FURNITURE", "CAMERA", "PROJECTOR", "PRINTER", "PHONE", "OTHER"],
        statuses: ["ACTIVE", "AVAILABLE", "MAINTENANCE", "RETIRED"],
      },
      assignments: {
        required: ["assetCode", "personName"],
        optional: ["department", "dateOut", "dateIn", "notes"],
      },
      maintenance: {
        required: ["assetCode", "description"],
        optional: ["date", "cost", "vendor", "type", "notes"],
        types: ["REPAIR", "PREVENTIVE", "INSPECTION"],
      },
      bookings: {
        required: ["assetCode", "personName", "dateStart", "dateEnd"],
        optional: ["purpose", "status"],
      },
    },
    example: {
      type: "assets",
      data: [
        { "AssetCode": "PC-001", "AssetName": "Dell Laptop", "Brand": "Dell", "Category": "Computer", "Status": "Active", "Price": 35000, "PurchaseDate": "2023-01-15" },
      ],
      fieldMap: {
        code: "AssetCode",
        name: "AssetName",
        brand: "Brand",
        category: "Category",
        status: "Status",
        purchasePrice: "Price",
        purchaseDate: "PurchaseDate",
      },
      options: { skipDuplicates: true, dryRun: true },
    },
  });
}
