// Path: src/app/api/photos/[...path]/route.ts
// Serve images from UPLOADS_DIR (Docker volume / local ./uploads)
//
// Supports:
//   GET /api/photos/EQ-001.jpg          → full original
//   GET /api/photos/thumbs/EQ-001.jpg   → resized thumbnail
//
// Public (matches /public/uploads/ pattern used by /api/upload).
// Path-traversal safe — segments stripped + resolved path must stay under UPLOADS_DIR.

import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { extname, join, resolve } from "path";

const UPLOADS_DIR =
  process.env.UPLOADS_DIR || resolve(process.cwd(), "uploads");

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".webp": "image/webp",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const segments = path.map((s) => s.replace(/[\\/]/g, ""));
  const rel = join(...segments);
  const filepath = resolve(UPLOADS_DIR, rel);

  if (!filepath.startsWith(resolve(UPLOADS_DIR))) {
    return new NextResponse("Bad request", { status: 400 });
  }

  try {
    await stat(filepath);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const buf = await readFile(filepath);
  const ext = extname(filepath).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";

  return new NextResponse(buf, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
