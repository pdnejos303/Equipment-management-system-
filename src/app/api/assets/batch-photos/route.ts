// Path: src/app/api/assets/batch-photos/route.ts
// Batch photo operation — apply one image (and/or delete existing) to many assets at once.
// Mainly used when many identical assets (e.g. 100 chairs) need the same photo.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/role-guard";
import { storageProvider } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionWithRole();
    if (!session || !["ADMIN", "USER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const assetIdsRaw = formData.get("assetIds") as string | null;
    const replaceExisting = formData.get("replaceExisting") === "true";

    if (!assetIdsRaw) {
      return NextResponse.json({ error: "assetIds required" }, { status: 400 });
    }

    let assetIds: string[];
    try {
      assetIds = JSON.parse(assetIdsRaw);
      if (!Array.isArray(assetIds) || assetIds.length === 0) throw new Error();
    } catch {
      return NextResponse.json({ error: "assetIds must be a non-empty JSON array" }, { status: 400 });
    }

    if (!file && !replaceExisting) {
      return NextResponse.json({ error: "Nothing to do — provide file and/or replaceExisting=true" }, { status: 400 });
    }

    if (file && file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 413 });
    }

    // Read file once into buffer; we'll re-upload per asset to keep storage rows independent
    // (so deleting one asset's photo never wipes a file another asset still references).
    let buffer: Buffer | null = null;
    let ext = "jpg";
    if (file) {
      buffer = Buffer.from(await file.arrayBuffer());
      ext = file.type === "image/png" ? "png" : "jpg";
    }

    let ok = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const assetId of assetIds) {
      try {
        if (replaceExisting) {
          const existing = await prisma.assetPhoto.findMany({
            where: { assetId },
            select: { id: true, url: true },
          });
          if (existing.length > 0) {
            await prisma.assetPhoto.deleteMany({ where: { assetId } });
            await Promise.allSettled(existing.map((p) => storageProvider.delete(p.url)));
          }
        }

        if (buffer) {
          const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
          const url = await storageProvider.upload(buffer, filename);

          // New photo becomes primary. Unset any existing primary first (only relevant when !replaceExisting).
          if (!replaceExisting) {
            await prisma.assetPhoto.updateMany({
              where: { assetId },
              data: { isPrimary: false },
            });
          }

          const order = replaceExisting ? 0 : await prisma.assetPhoto.count({ where: { assetId } });
          await prisma.assetPhoto.create({
            data: { assetId, url, isPrimary: true, order },
          });
        }

        ok++;
      } catch (err) {
        failed++;
        errors.push(`${assetId}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }

    return NextResponse.json({ ok, failed, errors: errors.slice(0, 5) });
  } catch (error) {
    console.error("POST /api/assets/batch-photos error:", error);
    return NextResponse.json({ error: "Batch photo operation failed" }, { status: 500 });
  }
}
