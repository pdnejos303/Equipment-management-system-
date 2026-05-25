// Path: src/app/api/backup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/role-guard";
import AdmZip from "adm-zip";
import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { format } from "date-fns";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
  randomBytes,
} from "crypto";

export const dynamic = "force-dynamic";

// ── Password protection ──────────────────────────────────────────────────────
// adm-zip 0.5.x does not write encrypted ZIPs, so when the user sets a password
// we wrap the produced ZIP buffer in an AES-256-GCM envelope. The output uses
// the .zip.enc extension to make it obvious it cannot be opened by 7-Zip etc.
// Layout: magic(9) | salt(16) | iv(12) | authTag(16) | ciphertext
//
// Restore detects the magic, prompts the user for the password, decrypts to
// recover the original ZIP buffer, then feeds it into the existing pipeline.

const ENC_MAGIC = Buffer.from("EQUIPENC1", "utf-8"); // 9 bytes
const ENC_SALT_LEN = 16;
const ENC_IV_LEN = 12;
const ENC_TAG_LEN = 16;
const ENC_KDF_ITERS = 100_000;

function deriveKey(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, ENC_KDF_ITERS, 32, "sha256");
}

function encryptZip(zipBuffer: Buffer, password: string): Buffer {
  const salt = randomBytes(ENC_SALT_LEN);
  const iv = randomBytes(ENC_IV_LEN);
  const key = deriveKey(password, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(zipBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([ENC_MAGIC, salt, iv, authTag, ciphertext]);
}

function isEncryptedBackup(buf: Buffer): boolean {
  return buf.length >= ENC_MAGIC.length && buf.subarray(0, ENC_MAGIC.length).equals(ENC_MAGIC);
}

function decryptZip(buf: Buffer, password: string): Buffer {
  const offset1 = ENC_MAGIC.length;
  const offset2 = offset1 + ENC_SALT_LEN;
  const offset3 = offset2 + ENC_IV_LEN;
  const offset4 = offset3 + ENC_TAG_LEN;
  const salt = buf.subarray(offset1, offset2);
  const iv = buf.subarray(offset2, offset3);
  const authTag = buf.subarray(offset3, offset4);
  const ciphertext = buf.subarray(offset4);
  const key = deriveKey(password, salt);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// Strip path separators and any character disallowed by Windows/Unix filesystems.
// Keep Unicode (so Thai/Japanese names survive) but cap length.
function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 80) || `equip-backup-${format(new Date(), "yyyyMMdd-HHmmss")}`;
}

// ── Storage adapters ─────────────────────────────────────────────────────────
// Backup must be portable across environments:
//   - dev:    images live in ./public/uploads/        (URL: /uploads/<file>)
//   - Docker: images live in $UPLOADS_DIR (volume)    (URL: /api/photos/<file>)
//   - Cloud:  images live in Supabase Storage         (URL: https://...)
// Export reads from wherever the URL points; restore writes to current provider
// and rewrites AssetPhoto.url so the backup works after a migration.

const LEGACY_PUBLIC_DIR = path.join(process.cwd(), "public", "uploads");
const VOLUME_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");

function hasSupabase(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function supabaseClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/** Read an image referenced by a stored URL, regardless of where it actually lives. */
async function readImageByUrl(url: string): Promise<{ filename: string; buffer: Buffer } | null> {
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const filename = path.basename(new URL(url).pathname);
      if (!filename) return null;
      const res = await fetch(url);
      if (!res.ok) return null;
      return { filename, buffer: Buffer.from(await res.arrayBuffer()) };
    }

    const filename = path.basename(url);
    if (!filename) return null;

    if (url.startsWith("/uploads/")) {
      const buf = await readFile(path.join(LEGACY_PUBLIC_DIR, filename));
      return { filename, buffer: buf };
    }

    if (url.startsWith("/api/photos/")) {
      const buf = await readFile(path.join(VOLUME_DIR, filename));
      return { filename, buffer: buf };
    }

    return null;
  } catch {
    return null;
  }
}

/** Write an image to the current storage provider with upsert. Returns the new URL. */
async function restoreImage(filename: string, buffer: Buffer): Promise<string> {
  if (hasSupabase()) {
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "asset-photos";
    const contentType = filename.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    const client = supabaseClient();
    const { error } = await client.storage
      .from(bucket)
      .upload(filename, buffer, { contentType, upsert: true, cacheControl: "31536000" });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    const { data } = client.storage.from(bucket).getPublicUrl(filename);
    return data.publicUrl;
  }

  const useVolume = !!process.env.UPLOADS_DIR;
  const dir = useVolume ? VOLUME_DIR : LEGACY_PUBLIC_DIR;
  const prefix = useVolume ? "/api/photos" : "/uploads";
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `${prefix}/${filename}`;
}

// ── GET /api/backup — Export full backup as ZIP (Admin only) ─────────────────
// Query params:
//   name=<string>      — custom filename (without extension), sanitized server-side
//   images=false       — skip images to produce a much smaller backup
//   password=<string>  — wrap the ZIP in an AES-256-GCM envelope (.zip.enc output)

export async function GET(req: NextRequest) {
  const session = await getSessionWithRole();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const requestedName = searchParams.get("name") ?? "";
  const includeImages = searchParams.get("images") !== "false";
  const password = searchParams.get("password") ?? "";

  try {
    const [users, assets, assetPhotos, assignments, maintenanceRecords, bookings] =
      await Promise.all([
        prisma.user.findMany({
          select: {
            id: true, name: true, email: true, hashedPassword: true,
            role: true, image: true, createdAt: true, updatedAt: true,
          },
        }),
        prisma.asset.findMany(),
        prisma.assetPhoto.findMany(),
        prisma.assignment.findMany(),
        prisma.maintenanceRecord.findMany(),
        prisma.booking.findMany(),
      ]);

    const zip = new AdmZip();
    const seen = new Set<string>();
    let imagesBundled = 0;
    let imagesMissing = 0;

    if (includeImages) {
      // Pull every photo referenced in DB from its actual storage location
      for (const photo of assetPhotos) {
        const got = await readImageByUrl(photo.url);
        if (!got) { imagesMissing++; continue; }
        if (seen.has(got.filename)) continue;
        seen.add(got.filename);
        zip.addFile(`uploads/${got.filename}`, got.buffer);
        imagesBundled++;
      }

      // Sweep local dirs for orphan files (best effort — files referenced only on disk)
      for (const dir of [LEGACY_PUBLIC_DIR, VOLUME_DIR]) {
        try {
          const files = await readdir(dir);
          for (const file of files) {
            if (seen.has(file)) continue;
            try {
              const buf = await readFile(path.join(dir, file));
              zip.addFile(`uploads/${file}`, buf);
              seen.add(file);
            } catch { /* skip unreadable */ }
          }
        } catch { /* dir may not exist */ }
      }
    }

    const data = {
      version: "1.1",
      exportedAt: new Date().toISOString(),
      meta: {
        imagesBundled,
        imagesMissing,
        imagesTotal: assetPhotos.length,
        imagesIncluded: includeImages,
      },
      tables: { users, assets, assetPhotos, assignments, maintenanceRecords, bookings },
    };
    zip.addFile("data.json", Buffer.from(JSON.stringify(data, null, 2), "utf-8"));

    let payload: Buffer = zip.toBuffer();
    const baseName = sanitizeFilename(
      requestedName || `equip-backup-${format(new Date(), "yyyyMMdd-HHmmss")}`
    );

    let filename: string;
    let contentType: string;
    if (password) {
      payload = encryptZip(payload, password);
      filename = `${baseName}.zip.enc`;
      contentType = "application/octet-stream";
    } else {
      filename = `${baseName}.zip`;
      contentType = "application/zip";
    }

    return new NextResponse(new Uint8Array(payload), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/backup error:", error);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}

// ── POST /api/backup — Restore from ZIP (Admin only) ─────────────────────────
//   mode=skip    → upsert by ID, skip on conflict (default)
//   mode=replace → clear all records first, then insert fresh

export async function POST(req: NextRequest) {
  const session = await getSessionWithRole();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) || "skip";
    const password = (formData.get("password") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    let buffer: Buffer = Buffer.from(await file.arrayBuffer());

    if (isEncryptedBackup(buffer)) {
      if (!password) {
        return NextResponse.json(
          { error: "password_required", message: "This backup is password-protected" },
          { status: 401 }
        );
      }
      try {
        buffer = decryptZip(buffer, password);
      } catch {
        return NextResponse.json(
          { error: "password_wrong", message: "Incorrect password or corrupted backup" },
          { status: 401 }
        );
      }
    }

    const zip = new AdmZip(buffer);

    const dataEntry = zip.getEntry("data.json");
    if (!dataEntry) {
      return NextResponse.json({ error: "Invalid backup: data.json not found" }, { status: 400 });
    }

    const parsed = JSON.parse(dataEntry.getData().toString("utf-8"));
    const { tables } = parsed as {
      tables: {
        users: any[];
        assets: any[];
        assetPhotos: any[];
        assignments: any[];
        maintenanceRecords: any[];
        bookings: any[];
      };
    };

    // Map ZIP entries by filename for O(1) lookup against photo URLs
    const imageEntries = new Map<string, Buffer>();
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      if (!entry.entryName.startsWith("uploads/")) continue;
      imageEntries.set(path.basename(entry.entryName), entry.getData());
    }

    // Upload each photo to the CURRENT storage provider and rewrite URL,
    // so a backup taken on Docker can be restored into Supabase (or vice versa)
    // without leaving dangling references.
    const photoUrlMap = new Map<string, string>();
    let imagesRestored = 0;
    let imagesMissing = 0;
    for (const photo of tables.assetPhotos ?? []) {
      const filename = typeof photo.url === "string" ? path.basename(photo.url) : "";
      const buf = filename ? imageEntries.get(filename) : null;
      if (!buf) { imagesMissing++; continue; }
      try {
        const newUrl = await restoreImage(filename, buf);
        photoUrlMap.set(photo.url, newUrl);
        imagesRestored++;
      } catch (e: any) {
        console.error("Restore image failed:", filename, e?.message);
        imagesMissing++;
      }
    }

    const stats = {
      users: 0, assets: 0, assetPhotos: 0,
      assignments: 0, maintenanceRecords: 0, bookings: 0,
      images: imagesRestored,
      imagesMissing,
    };

    if (mode === "replace") {
      // Reverse dependency order; skip users so admin doesn't lock self out
      await prisma.booking.deleteMany();
      await prisma.maintenanceRecord.deleteMany();
      await prisma.assignment.deleteMany();
      await prisma.assetPhoto.deleteMany();
      await prisma.asset.deleteMany();
    }

    const CHUNK = 100;
    async function batchUpsert<T>(items: T[], buildOp: (item: T) => any): Promise<number> {
      let count = 0;
      for (let c = 0; c < items.length; c += CHUNK) {
        const chunk = items.slice(c, c + CHUNK);
        try {
          await prisma.$transaction(chunk.map(buildOp));
          count += chunk.length;
        } catch {
          for (const item of chunk) {
            try {
              await (buildOp(item) as any);
              count++;
            } catch { /* skip on conflict */ }
          }
        }
      }
      return count;
    }

    stats.users = await batchUpsert(tables.users ?? [], (u: any) =>
      prisma.user.upsert({
        where: { email: u.email },
        create: {
          id: u.id, name: u.name, email: u.email,
          hashedPassword: u.hashedPassword, role: u.role, image: u.image,
          createdAt: new Date(u.createdAt),
        },
        update: mode === "replace" ? { name: u.name, role: u.role, image: u.image } : {},
      })
    );

    stats.assets = await batchUpsert(tables.assets ?? [], (a: any) => {
      const assetData = {
        code: a.code, name: a.name, brand: a.brand, model: a.model,
        serialNumber: a.serialNumber, category: a.category, status: a.status,
        purchaseDate: new Date(a.purchaseDate), purchasePrice: a.purchasePrice,
        expectedLife: a.expectedLife,
        warrantyEnd: a.warrantyEnd ? new Date(a.warrantyEnd) : null,
        nextMaintenance: a.nextMaintenance ? new Date(a.nextMaintenance) : null,
        location: a.location, notes: a.notes,
      };
      return prisma.asset.upsert({
        where: { id: a.id },
        create: { id: a.id, ...assetData, createdAt: new Date(a.createdAt) },
        update: mode === "replace" ? assetData : {},
      });
    });

    stats.assetPhotos = await batchUpsert(tables.assetPhotos ?? [], (p: any) => {
      const url = photoUrlMap.get(p.url) ?? p.url;
      return prisma.assetPhoto.upsert({
        where: { id: p.id },
        create: {
          id: p.id, assetId: p.assetId, url, caption: p.caption,
          isPrimary: p.isPrimary, order: p.order, createdAt: new Date(p.createdAt),
        },
        update: mode === "replace" ? { url, isPrimary: p.isPrimary, order: p.order } : {},
      });
    });

    stats.assignments = await batchUpsert(tables.assignments ?? [], (a: any) =>
      prisma.assignment.upsert({
        where: { id: a.id },
        create: {
          id: a.id, assetId: a.assetId, userId: a.userId, personName: a.personName,
          department: a.department, dateOut: new Date(a.dateOut),
          dateIn: a.dateIn ? new Date(a.dateIn) : null,
          notes: a.notes, signatureUrl: a.signatureUrl, createdAt: new Date(a.createdAt),
        },
        update: {},
      })
    );

    stats.maintenanceRecords = await batchUpsert(tables.maintenanceRecords ?? [], (m: any) =>
      prisma.maintenanceRecord.upsert({
        where: { id: m.id },
        create: {
          id: m.id, assetId: m.assetId, date: new Date(m.date),
          description: m.description, cost: m.cost, vendor: m.vendor,
          type: m.type, receiptUrl: m.receiptUrl, notes: m.notes,
          createdAt: new Date(m.createdAt),
        },
        update: {},
      })
    );

    stats.bookings = await batchUpsert(tables.bookings ?? [], (b: any) =>
      prisma.booking.upsert({
        where: { id: b.id },
        create: {
          id: b.id, assetId: b.assetId, userId: b.userId, personName: b.personName,
          dateStart: new Date(b.dateStart), dateEnd: new Date(b.dateEnd),
          purpose: b.purpose, conditionBefore: b.conditionBefore,
          conditionAfter: b.conditionAfter, status: b.status,
          createdAt: new Date(b.createdAt),
        },
        update: {},
      })
    );

    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    console.error("POST /api/backup error:", error);
    return NextResponse.json({ error: "Restore failed" }, { status: 500 });
  }
}
