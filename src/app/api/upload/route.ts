// Path: src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/role-guard";
import { storageProvider } from "@/lib/storage";

// POST /api/upload — receive compressed image, save via storage provider, create AssetPhoto record
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionWithRole();
    if (!session || !["ADMIN", "USER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const assetId = formData.get("assetId") as string | null;
    const isPrimary = formData.get("isPrimary") === "true";

    if (!file || !assetId) {
      return NextResponse.json({ error: "file and assetId required" }, { status: 400 });
    }

    // Max 8MB (already compressed client-side, this is a safety check)
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "image/png" ? "png" : "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

    // ใช้ storage provider — เปลี่ยน provider ได้ที่ src/lib/storage.ts
    const url = await storageProvider.upload(buffer, filename);

    // If this should be primary, unset all existing primaries first
    if (isPrimary) {
      await prisma.assetPhoto.updateMany({
        where: { assetId },
        data: { isPrimary: false },
      });
    }

    const order = await prisma.assetPhoto.count({ where: { assetId } });

    const photo = await prisma.assetPhoto.create({
      data: { assetId, url, isPrimary, order },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

// DELETE /api/upload?photoId=xxx — remove photo record + file
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionWithRole();
    if (!session || !["ADMIN", "USER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const photoId = new URL(req.url).searchParams.get("photoId");
    if (!photoId) {
      return NextResponse.json({ error: "photoId required" }, { status: 400 });
    }

    const photo = await prisma.assetPhoto.findUnique({ where: { id: photoId } });
    if (!photo) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ลบไฟล์ผ่าน storage provider — รองรับทั้ง local, Supabase, S3
    await storageProvider.delete(photo.url);

    await prisma.assetPhoto.delete({ where: { id: photoId } });

    // If deleted photo was primary, promote the next photo
    if (photo.isPrimary) {
      const next = await prisma.assetPhoto.findFirst({
        where: { assetId: photo.assetId },
        orderBy: { order: "asc" },
      });
      if (next) {
        await prisma.assetPhoto.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/upload error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

// PATCH /api/upload?photoId=xxx — set as primary
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionWithRole();
    if (!session || !["ADMIN", "USER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const photoId = new URL(req.url).searchParams.get("photoId");
    if (!photoId) {
      return NextResponse.json({ error: "photoId required" }, { status: 400 });
    }

    const photo = await prisma.assetPhoto.findUnique({ where: { id: photoId } });
    if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.assetPhoto.updateMany({
      where: { assetId: photo.assetId },
      data: { isPrimary: false },
    });
    const updated = await prisma.assetPhoto.update({
      where: { id: photoId },
      data: { isPrimary: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/upload error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
