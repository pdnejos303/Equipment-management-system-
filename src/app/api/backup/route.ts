// Path: src/app/api/backup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/role-guard";
import AdmZip from "adm-zip";
import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

// ── GET /api/backup — Export full backup as ZIP (Admin only) ──

export async function GET() {
  const session = await getSessionWithRole();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

    const data = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      tables: { users, assets, assetPhotos, assignments, maintenanceRecords, bookings },
    };

    const zip = new AdmZip();
    zip.addFile("data.json", Buffer.from(JSON.stringify(data, null, 2), "utf-8"));

    // Bundle local images from public/uploads/
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    try {
      const files = await readdir(uploadsDir);
      for (const file of files) {
        const buffer = await readFile(path.join(uploadsDir, file));
        zip.addFile(`uploads/${file}`, buffer);
      }
    } catch {
      // uploads dir may not exist yet — continue without images
    }

    const zipBuffer = zip.toBuffer();
    const filename = `equip-backup-${format(new Date(), "yyyyMMdd-HHmmss")}.zip`;

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/backup error:", error);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}

// ── POST /api/backup — Restore from ZIP (Admin only) ──
//   mode=skip  → upsert by ID, skip on conflict (default)
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

    if (!file) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
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

    // Restore images
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const imageEntries = zip.getEntries().filter(
      (e) => e.entryName.startsWith("uploads/") && !e.isDirectory
    );
    for (const entry of imageEntries) {
      const filename = path.basename(entry.entryName);
      await writeFile(path.join(uploadsDir, filename), entry.getData());
    }

    const stats = {
      users: 0, assets: 0, assetPhotos: 0,
      assignments: 0, maintenanceRecords: 0, bookings: 0, images: imageEntries.length,
    };

    if (mode === "replace") {
      // Clear in reverse dependency order (skip users to avoid locking self out)
      await prisma.booking.deleteMany();
      await prisma.maintenanceRecord.deleteMany();
      await prisma.assignment.deleteMany();
      await prisma.assetPhoto.deleteMany();
      await prisma.asset.deleteMany();
    }

    // ── Helper: batch upsert in transaction chunks ──
    const CHUNK = 100;
    async function batchUpsert<T>(
      items: T[],
      buildOp: (item: T) => any,
    ): Promise<number> {
      let count = 0;
      for (let c = 0; c < items.length; c += CHUNK) {
        const chunk = items.slice(c, c + CHUNK);
        try {
          await prisma.$transaction(chunk.map(buildOp));
          count += chunk.length;
        } catch {
          // Fallback: try individually on chunk failure
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

    // ── Restore users ──
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

    // ── Restore assets ──
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

    // ── Restore asset photos ──
    stats.assetPhotos = await batchUpsert(tables.assetPhotos ?? [], (p: any) =>
      prisma.assetPhoto.upsert({
        where: { id: p.id },
        create: {
          id: p.id, assetId: p.assetId, url: p.url, caption: p.caption,
          isPrimary: p.isPrimary, order: p.order, createdAt: new Date(p.createdAt),
        },
        update: mode === "replace" ? { url: p.url, isPrimary: p.isPrimary, order: p.order } : {},
      })
    );

    // ── Restore assignments ──
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

    // ── Restore maintenance records ──
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

    // ── Restore bookings ──
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
