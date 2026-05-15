// Path: src/lib/storage.ts
/**
 * Storage Provider Abstraction
 *
 * ปัจจุบันใช้ Local filesystem (public/uploads/)
 * เตรียมไว้สำหรับเปลี่ยนไปใช้ Supabase Storage หรือ AWS S3 ในอนาคต
 *
 * วิธีเปลี่ยน: uncomment provider ที่ต้องการ แล้วเปลี่ยน `storageProvider` ด้านล่าง
 */

import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";

// ─── Storage Provider Interface ───────────────────────────────────────────────
// ทุก provider ต้อง implement interface นี้

export interface StorageProvider {
  /** อัปโหลดไฟล์ คืน URL ที่เข้าถึงได้ */
  upload(buffer: Buffer, filename: string): Promise<string>;
  /** ลบไฟล์ตาม URL ที่ได้จาก upload */
  delete(url: string): Promise<void>;
}

// ─── 1. Local Filesystem Provider (ใช้งานอยู่ปัจจุบัน) ──────────────────────

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

// ─── 2. Supabase Storage Provider (เตรียมไว้) ────────────────────────────────
// TODO: เปิดใช้เมื่อพร้อมย้ายไป Supabase Storage
// ต้องตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env
//
// import { createClient } from "@supabase/supabase-js";
//
// class SupabaseStorageProvider implements StorageProvider {
//   private bucket = "asset-photos";
//   private client = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.SUPABASE_SERVICE_ROLE_KEY!
//   );
//
//   async upload(buffer: Buffer, filename: string): Promise<string> {
//     const { error } = await this.client.storage
//       .from(this.bucket)
//       .upload(filename, buffer, {
//         contentType: filename.endsWith(".png") ? "image/png" : "image/jpeg",
//         upsert: false,
//       });
//     if (error) throw new Error(`Supabase upload failed: ${error.message}`);
//
//     const { data } = this.client.storage
//       .from(this.bucket)
//       .getPublicUrl(filename);
//     return data.publicUrl;
//   }
//
//   async delete(url: string): Promise<void> {
//     // สกัดชื่อไฟล์จาก public URL
//     const parts = url.split(`/storage/v1/object/public/${this.bucket}/`);
//     if (parts.length < 2) return;
//     const filePath = parts[1];
//     const { error } = await this.client.storage
//       .from(this.bucket)
//       .remove([filePath]);
//     if (error) console.error("Supabase delete error:", error.message);
//   }
// }

// ─── 3. AWS S3 Provider (เตรียมไว้) ──────────────────────────────────────────
// TODO: เปิดใช้เมื่อพร้อมย้ายไป S3
// ต้องตั้งค่า AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET ใน .env
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
//       })
//     );
//     return `https://${this.bucket}.s3.${this.region}.amazonaws.com/asset-photos/${filename}`;
//   }
//
//   async delete(url: string): Promise<void> {
//     const key = url.split(".amazonaws.com/")[1];
//     if (!key) return;
//     try {
//       await this.client.send(
//         new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
//       );
//     } catch (err) {
//       console.error("S3 delete error:", err);
//     }
//   }
// }

// ─── Export: เปลี่ยน provider ตรงนี้ ─────────────────────────────────────────
// เปลี่ยนจาก LocalStorageProvider เป็น SupabaseStorageProvider หรือ S3StorageProvider
// เมื่อพร้อมย้าย แค่แก้บรรทัดเดียว:

export const storageProvider: StorageProvider = new LocalStorageProvider();

// เปลี่ยนเป็น:
// export const storageProvider: StorageProvider = new SupabaseStorageProvider();
// export const storageProvider: StorageProvider = new S3StorageProvider();
