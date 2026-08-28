// Path: src/app/api/assets/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { eventEmitter } from "@/lib/eventEmitter";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/role-guard";
import { storageProvider } from "@/lib/storage";
import { z } from "zod";

// GET /api/assets/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await prisma.asset.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: {
        photos: { orderBy: { order: "asc" } },
        assignments: { orderBy: { dateOut: "desc" }, take: 20 },
        maintenanceRecords: { orderBy: { date: "desc" } },
        bookings: { orderBy: { dateStart: "desc" }, take: 10 },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error("GET /api/assets/[id] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH /api/assets/[id]
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  category: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "AVAILABLE", "MAINTENANCE", "RETIRED"]).optional(),
  purchaseDate: z.string().transform((s) => new Date(s)).optional(),
  purchasePrice: z.number().positive().optional(),
  expectedLife: z.number().int().positive().optional(),
  // null/"" = ผู้ใช้ล้างค่า → เซ็ตเป็น null (ลบประกัน/วันบำรุงรักษา); undefined = ไม่ได้ส่งมา → ไม่แตะต้อง
  warrantyEnd: z.union([z.string(), z.null()]).optional().transform((s) =>
    s === undefined ? undefined : s ? new Date(s) : null
  ),
  nextMaintenance: z.union([z.string(), z.null()]).optional().transform((s) =>
    s === undefined ? undefined : s ? new Date(s) : null
  ),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole();
    if (!session || !["ADMIN", "USER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    const asset = await prisma.asset.update({
      where: { id },
      data,
    });

    eventEmitter.emit("update");
    return NextResponse.json(asset);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("PATCH /api/assets/[id] error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE /api/assets/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Fetch photo URLs ก่อนลบ row — เอาไว้ลบไฟล์จาก storage ทีหลัง
    // ใช้ URL ไม่ใช่ filename เพราะ provider แต่ละตัวเก็บคนละที่ (local/Supabase/S3)
    const photoUrls = (
      await prisma.assetPhoto.findMany({
        where: { assetId: id },
        select: { url: true },
      })
    ).map((p) => p.url);

    // ลบ DB rows เป็น atomic transaction ก่อน — ถ้า fail ไฟล์ยังอยู่ครบ ปลอดภัยกว่าฝั่งกลับ
    await prisma.$transaction([
      prisma.assetPhoto.deleteMany({ where: { assetId: id } }),
      prisma.assignment.deleteMany({ where: { assetId: id } }),
      prisma.maintenanceRecord.deleteMany({ where: { assetId: id } }),
      prisma.booking.deleteMany({ where: { assetId: id } }),
      prisma.asset.delete({ where: { id } }),
    ]);

    // ลบไฟล์จริงจาก storage แบบ best-effort — ถ้าไฟล์เพี้ยน/หายไปแล้ว ไม่ต้อง throw
    // (ถ้าลบไม่สำเร็จ ก็แค่กลายเป็น orphan file — ดีกว่าทำ request fail หลัง DB ลบไปแล้ว)
    if (photoUrls.length > 0) {
      const results = await Promise.allSettled(
        photoUrls.map((url) => storageProvider.delete(url))
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        console.warn(
          `[assets DELETE] ${failed.length}/${photoUrls.length} photo files could not be removed`,
          failed
        );
      }
    }

    eventEmitter.emit("update");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/assets/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
