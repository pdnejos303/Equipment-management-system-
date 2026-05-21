# ระบบจัดการรูปภาพอุปกรณ์ (Photo Storage Architecture)

## ภาพรวม

ระบบรูปภาพของ Asset Management ออกแบบแบบ **Storage Provider Abstraction** — โค้ดชุดเดียวรองรับหลาย backend:

```
Browser → POST /api/upload → storage.ts (auto-detect) → Local FS  หรือ  Supabase
                                                                ↓               ↓
                                                        /uploads/xxx.jpg   CDN URL
                                                                ↓
                                                        DB: AssetPhoto.url
```

---

## 1. Database Schema

ไฟล์: `prisma/schema.prisma`

```prisma
model AssetPhoto {
  id        String   @id @default(cuid())
  assetId   String                        -- FK → Asset
  url       String                        -- URL ที่ใช้แสดงรูป (local path หรือ CDN URL)
  caption   String?
  isPrimary Boolean  @default(false)      -- รูปหลัก (แสดงก่อน)
  order     Int      @default(0)          -- ลำดับในแกลเลอรี่
  createdAt DateTime @default(now())

  asset Asset @relation(fields: [assetId], references: [id], onDelete: Cascade)

  @@index([assetId])
}
```

**กฎสำคัญ:**
- Asset หนึ่งชิ้น → มีได้หลายรูป (one-to-many)
- `isPrimary = true` มีได้แค่ 1 รูปต่อ Asset (API บังคับ)
- ลบ Asset → ลบ AssetPhoto ทุกรูปอัตโนมัติ (`onDelete: Cascade`)
- `url` เก็บเป็น path หรือ full URL ขึ้นอยู่กับ storage provider ที่ใช้

---

## 2. Storage Provider (`src/lib/storage.ts`)

คือหัวใจของระบบ — ตรวจ env vars ตอน import แล้วเลือก provider อัตโนมัติ

### Auto-detect Logic

```typescript
function createStorageProvider(): StorageProvider {
  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (hasSupabase) return new SupabaseStorageProvider(); // Cloud
  return new LocalStorageProvider();                     // Local / Docker
}
```

### Provider A — Local Filesystem (Default)

**เมื่อไหร่:** ไม่ได้ตั้ง Supabase env vars

| จุด | ค่า |
|-----|-----|
| เขียนไฟล์ไปที่ | `{cwd}/public/uploads/{filename}` |
| URL ที่เก็บใน DB | `/uploads/{filename}` |
| เสิร์ฟโดย | Next.js Static File Serving (built-in) |

```
public/
  uploads/
    1716123456789-abc1234.jpg   ← ไฟล์รูปจริง
    1716123456790-def5678.jpg
```

### Provider B — Supabase Storage

**เมื่อไหร่:** ตั้งทั้ง `NEXT_PUBLIC_SUPABASE_URL` และ `SUPABASE_SERVICE_ROLE_KEY`

| จุด | ค่า |
|-----|-----|
| เขียนไปที่ | Supabase Storage bucket `asset-photos` |
| URL ที่เก็บใน DB | `https://{project}.supabase.co/storage/v1/object/public/asset-photos/{filename}` |
| เสิร์ฟโดย | Supabase CDN (global edge, มี cache 1 ปี) |

### Provider C — AWS S3 (เตรียมไว้, ยังไม่เปิดใช้)

โค้ดอยู่ใน `storage.ts` แบบ comment ไว้ พร้อม activate เมื่อต้องการ:
1. `npm install @aws-sdk/client-s3`
2. Uncomment class `S3StorageProvider`
3. ตั้ง env: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`
4. แก้ `createStorageProvider()` ให้ตรวจ env แล้วคืน S3StorageProvider

---

## 3. Upload API (`src/app/api/upload/route.ts`)

### POST — อัปโหลดรูปใหม่

```
POST /api/upload
Content-Type: multipart/form-data

file      File     รูปที่ compress แล้ว (จาก browser)
assetId   string   CUID ของ Asset
isPrimary boolean  ให้เป็นรูปหลักหรือไม่
```

**ขั้นตอนภายใน:**
1. ตรวจ session — ต้อง role `ADMIN` หรือ `USER` เท่านั้น
2. ตรวจขนาดไฟล์ — max 8 MB (safety net, browser compress ก่อนแล้ว)
3. สร้างชื่อไฟล์ unique: `{timestamp}-{random7chars}.jpg`
4. เรียก `storageProvider.upload(buffer, filename)` → ได้ URL กลับมา
5. ถ้า `isPrimary = true` → reset `isPrimary = false` ทุกรูปของ Asset นั้นก่อน
6. หา `order` = จำนวนรูปปัจจุบัน (ต่อท้ายคิว)
7. สร้าง record ใน `AssetPhoto`
8. คืน AssetPhoto object ให้ browser

```
Response 201: { id, assetId, url, isPrimary, order, createdAt }
```

### DELETE — ลบรูป

```
DELETE /api/upload?photoId={id}
```

1. ดึง record จาก DB
2. เรียก `storageProvider.delete(photo.url)` — ลบไฟล์จริง
3. ลบ record ออกจาก DB
4. ถ้ารูปที่ลบเป็น primary → promote รูปถัดไป (order ต่ำสุด) ขึ้นเป็น primary

### PATCH — ตั้งรูปหลัก

```
PATCH /api/upload?photoId={id}
```

1. Reset `isPrimary = false` ทุกรูปของ Asset
2. Set `isPrimary = true` ให้รูปที่เลือก

---

## 4. Photo Serving API (`src/app/api/photos/[...path]/route.ts`)

**วัตถุประสงค์:** เสิร์ฟรูปจาก Docker volume หรือโฟลเดอร์ `./uploads/` ที่อยู่นอก `public/`

```
GET /api/photos/EQ-001.jpg         → อ่านจาก {UPLOADS_DIR}/EQ-001.jpg
GET /api/photos/thumbs/EQ-001.jpg  → อ่านจาก {UPLOADS_DIR}/thumbs/EQ-001.jpg
```

**ทำไมต้องมี route นี้ทั้งที่ Next.js เสิร์ฟ `/uploads/` ได้อยู่แล้ว?**

เพราะใน Docker, volume mount ที่ `/app/uploads` อยู่ **นอก** `public/` ของ Next.js:
- Next.js static: `/app/public/uploads/` → URL `/uploads/xxx`
- Docker volume: `/app/uploads/` → ต้องมี API route เสิร์ฟให้

รองรับ legacy files จากระบบเก่า (C# เดิม) ที่เก็บรูปใน volume ตรงๆ

**Security:**
- Path-traversal safe — strip `/` และ `\` ออกจากทุก segment ก่อน
- ตรวจว่า resolved path ยังอยู่ใต้ `UPLOADS_DIR` เสมอ

**Cache:**
```
Cache-Control: public, max-age=86400, immutable
```
(24 ชั่วโมง — ชื่อไฟล์ unique จึง immutable ได้)

---

## 5. Client-Side Compression (`src/components/PhotoUpload.tsx`)

รูปถูก compress **บน browser** ก่อน upload — ไม่ส่งไฟล์ดิบขึ้น server

### ขั้นตอน compressImage()

```
รูปต้นฉบับ (อาจ 10MB+)
     ↓
สร้าง <img> element จาก ObjectURL
     ↓
ถ้ากว้างเกิน 1920px → scale ลงรักษา aspect ratio
     ↓
วาดลง <canvas> (พื้นหลังขาว กัน PNG transparent)
     ↓
canvas.toBlob("image/jpeg", 0.82)
     ↓
รูปใหม่ (ปกติลดขนาดได้ 60-80%)
```

**ค่าที่ใช้:**
- Max width: `1920px`
- Quality: `0.82` (82%)
- Output format: `image/jpeg` เสมอ (PNG → JPEG ด้วย)

### UX Features

| Feature | รายละเอียด |
|---------|------------|
| Drag & Drop | วางรูปบน area ได้เลย |
| File picker | คลิกเลือกไฟล์ |
| Compression info | แสดง "5.2MB → 1.1MB (79%)" หลัง upload สำเร็จ |
| Thumbnail grid | แสดงรูปทั้งหมด 5 คอลัมน์ |
| Primary photo | ขอบสีทอง + ดาว, คลิก thumbnail เพื่อเปลี่ยน |
| Lightbox | คลิกรูปหลัก → fullscreen overlay |
| Delete | hover thumbnail → ปุ่มลบแดง (edit mode เท่านั้น) |
| Optimistic update | UI อัปเดตทันทีไม่รอ server (เฉพาะ set primary) |

---

## 6. การทำงานใน Docker Compose

### Environment Variables

```yaml
# docker-compose.yml
environment:
  DATABASE_URL: "file:/app/data/prod.db"   # SQLite บน volume
  UPLOADS_DIR: "/app/uploads"              # บอก API route ว่า volume อยู่ไหน
```

### Volumes

```yaml
volumes:
  - equiptrack-data:/app/data       # SQLite database
  - equiptrack-uploads:/app/uploads # รูปอุปกรณ์
```

**Named Docker volumes** — ข้อมูลอยู่ใน Docker daemon (ไม่ใช่ path บน host) ไม่หายเมื่อ:
- `docker-compose restart`
- `docker-compose up --build` (rebuild image)
- อัปเดต code แล้ว deploy ใหม่

**หายเมื่อ:**
- `docker-compose down -v` (ลบ volumes ตั้งใจ)

### Data Flow ใน Docker

```
Browser upload รูป
       ↓
POST /api/upload (Next.js container)
       ↓
LocalStorageProvider.upload()
       ↓
เขียนไฟล์ → /app/public/uploads/{filename}  ← อยู่ใน container layer
       ↓
DB record: url = "/uploads/{filename}"
       ↓
Browser ขอดูรูป: GET /uploads/{filename}
       ↓
Next.js Static File Serving (จาก public/)
```

> **หมายเหตุ:** ไฟล์ที่เขียนใน `/app/public/uploads/` อยู่ใน container layer — ถ้า rebuild image จะหาย!
> แนะนำให้ใช้ Supabase Storage หรือ S3 ใน production เพื่อความปลอดภัยของข้อมูล

### Legacy Files จาก Volume

ไฟล์ที่คัดลอกเข้า volume `/app/uploads` โดยตรง (เช่น migrate จากระบบเก่า):

```
GET /api/photos/EQ-001.jpg
       ↓
src/app/api/photos/[...path]/route.ts
       ↓
อ่านจาก UPLOADS_DIR=/app/uploads/EQ-001.jpg  ← Docker volume (persistent!)
       ↓
คืน image bytes พร้อม Cache-Control header
```

---

## 7. สรุปเปรียบเทียบ Mode

| | Dev (Local) | Docker | Production (Supabase) |
|--|--|--|--|
| Storage provider | Local FS | Local FS | Supabase Storage |
| เขียนไฟล์ไปที่ | `public/uploads/` | `public/uploads/` (container layer) | Supabase CDN bucket |
| URL ใน DB | `/uploads/xxx.jpg` | `/uploads/xxx.jpg` | `https://xxx.supabase.co/...` |
| เสิร์ฟโดย | Next.js static | Next.js static | Supabase CDN (global) |
| รูปหายเมื่อ | ไม่หาย (local) | Rebuild container! | ไม่หาย (cloud) |
| Legacy files | `/api/photos/` route | `/api/photos/` route (UPLOADS_DIR volume) | — |
| ต้อง config | ไม่ต้อง | ไม่ต้อง (auto) | ตั้ง 2 env vars |

---

## 8. การ Config สำหรับ Production

### ตัวเลือกที่ 1: Supabase Storage (แนะนำ)

1. Supabase Dashboard → Storage → New bucket ชื่อ `asset-photos` → เปิด **Public**
2. ตั้ง env vars:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=asset-photos  # optional, default คือชื่อนี้อยู่แล้ว
```

3. Deploy → `storage.ts` จะ auto-switch ไปใช้ Supabase อัตโนมัติ

### ตัวเลือกที่ 2: Docker + Volume Mount บน Host

แก้ `docker-compose.yml` ให้ volume ชี้ไป host path:

```yaml
volumes:
  - /data/equiptrack/uploads:/app/uploads   # persistent บน host
```

และแก้ LocalStorageProvider ให้เขียนไปที่ `UPLOADS_DIR` แทน `public/uploads/`:

```typescript
// src/lib/storage.ts — LocalStorageProvider
private uploadDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");

async upload(buffer: Buffer, filename: string): Promise<string> {
  await mkdir(this.uploadDir, { recursive: true });
  await writeFile(path.join(this.uploadDir, filename), buffer);
  return `/api/photos/${filename}`;  // เปลี่ยน URL prefix ด้วย
}
```

---

## 9. ไฟล์ที่เกี่ยวข้องทั้งหมด

```
src/lib/storage.ts                          Storage provider abstraction + 3 implementations
src/app/api/upload/route.ts                 POST/DELETE/PATCH photo management API
src/app/api/photos/[...path]/route.ts       Legacy/volume file serving
src/components/PhotoUpload.tsx              Client component (compress + upload + gallery UI)
prisma/schema.prisma (model AssetPhoto)     DB schema
docker-compose.yml                          Volume definitions (equiptrack-uploads)
.env.example                                ตัวอย่าง env vars ที่ต้องตั้ง
```
