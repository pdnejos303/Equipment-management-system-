// Path: src/lib/storage.ts
/**
 * Storage Provider Abstraction
 *
 * Auto-detect ตอน startup:
 *   - มี NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY  → ใช้ Supabase Storage (มี CDN, scale ได้, Vercel-friendly)
 *   - ไม่มี                                                    → ใช้ Local filesystem (public/uploads/) — เหมาะกับ dev/Docker
 *
 * S3 provider เตรียมโค้ดไว้ในคอมเมนต์ด้านล่าง เปิดใช้ภายหลังถ้าจำเป็น
 */

import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ─── Storage Provider Interface ───────────────────────────────────────────────

export interface StorageProvider {
  /** อัปโหลดไฟล์ คืน URL ที่เข้าถึงได้ */
  upload(buffer: Buffer, filename: string): Promise<string>;
  /** ลบไฟล์ตาม URL ที่ได้จาก upload */
  delete(url: string): Promise<void>;
}

// ─── 1. Local Filesystem Provider ────────────────────────────────────────────

class LocalStorageProvider implements StorageProvider {
  private uploadDir = path.join(process.cwd(), "public", "uploads");

  async upload(buffer: Buffer, filename: string): Promise<string> {
    await mkdir(this.uploadDir, { recursive: true });
    await writeFile(path.join(this.uploadDir, filename), buffer);
    return `/uploads/${filename}`;
  }

  async delete(url: string): Promise<void> {
    if (!url.startsWith("/uploads/")) return;
    const filePath = path.join(process.cwd(), "public", url);
    try {
      await unlink(filePath);
    } catch {
      // ไฟล์อาจถูกลบไปแล้ว ไม่ต้อง throw
    }
  }
}

// ─── 2. Supabase Storage Provider ────────────────────────────────────────────

class SupabaseStorageProvider implements StorageProvider {
  private bucket = process.env.SUPABASE_STORAGE_BUCKET || "asset-photos";
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }

  async upload(buffer: Buffer, filename: string): Promise<string> {
    const contentType = filename.endsWith(".png") ? "image/png" : "image/jpeg";
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(filename, buffer, {
        contentType,
        upsert: false,
        cacheControl: "31536000", // 1 ปี — ชื่อไฟล์ unique จึง immutable ได้
      });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    const { data } = this.client.storage.from(this.bucket).getPublicUrl(filename);
    return data.publicUrl;
  }

  async delete(url: string): Promise<void> {
    // รองรับทั้ง URL ของ Supabase และ legacy local URL (/uploads/...)
    // เผื่อกรณี migrate ค่อยๆ — ลบของเก่าจาก local แทน
    if (url.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", url);
      try {
        await unlink(filePath);
      } catch {
        /* already gone */
      }
      return;
    }

    const parts = url.split(`/storage/v1/object/public/${this.bucket}/`);
    if (parts.length < 2) return;
    const filePath = parts[1];
    const { error } = await this.client.storage.from(this.bucket).remove([filePath]);
    if (error) console.error("[storage] Supabase delete error:", error.message);
  }
}

// ─── 3. AWS S3 Provider (เตรียมไว้ — ยังไม่เปิดใช้) ──────────────────────────
// เมื่อพร้อมย้ายไป S3:
//   1) npm install @aws-sdk/client-s3
//   2) uncomment block ด้านล่าง
//   3) ตั้ง env: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET
//   4) แก้ createStorageProvider() ให้ตรวจ env แล้วคืน S3StorageProvider
//
// import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
//
// class S3StorageProvider implements StorageProvider {
//   private bucket = process.env.S3_BUCKET!;
//   private region = process.env.AWS_REGION || "ap-southeast-1";
//   private client = new S3Client({ region: this.region });
//
//   async upload(buffer: Buffer, filename: string): Promise<string> {
//     await this.client.send(
//       new PutObjectCommand({
//         Bucket: this.bucket,
//         Key: `asset-photos/${filename}`,
//         Body: buffer,
//         ContentType: filename.endsWith(".png") ? "image/png" : "image/jpeg",
//         CacheControl: "public, max-age=31536000, immutable",
//       })
//     );
//     return `https://${this.bucket}.s3.${this.region}.amazonaws.com/asset-photos/${filename}`;
//   }
//
//   async delete(url: string): Promise<void> {
//     const key = url.split(".amazonaws.com/")[1];
//     if (!key) return;
//     try {
//       await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
//     } catch (err) {
//       console.error("[storage] S3 delete error:", err);
//     }
//   }
// }

// ─── Auto-detect provider ตอน import ─────────────────────────────────────────

function createStorageProvider(): StorageProvider {
  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (hasSupabase) {
    console.log("[storage] Using Supabase Storage (cloud)");
    return new SupabaseStorageProvider();
  }
  console.log("[storage] Using local filesystem (public/uploads/)");
  return new LocalStorageProvider();
}

export const storageProvider: StorageProvider = createStorageProvider();
