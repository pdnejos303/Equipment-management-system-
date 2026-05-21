# Asset Management — ระบบจัดการอุปกรณ์

Equipment Management System สำหรับบริษัทเล็ก-กลาง

## Tech Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS
- **Backend:** Next.js API Routes, Zod validation
- **Database:** SQLite (file-based — `prisma/dev.db` dev / `/app/data/prod.db` Docker)
- **ORM:** Prisma
- **Auth:** NextAuth.js (Google OAuth + Email/Password with bcrypt)
- **Storage:** Local filesystem (default) — Supabase Storage เป็น optional cloud option
- **Email:** Resend (แจ้งเตือน daily)
- **Hosting:** Docker (self-hosted) — รูปและ DB เก็บใน named volumes

## Quick Start

### 1. ตั้งค่า Environment

```bash
cp .env.example .env.local
```

ค่า default ใช้ SQLite ที่ `prisma/dev.db` — ไม่ต้องตั้งอะไรเพิ่มสำหรับ DB
ตั้งค่าที่เหลือตาม comment ใน `.env.local`:
- NEXTAUTH_SECRET — `openssl rand -base64 32`
- Google OAuth (optional) — Google Cloud Console
- CRON_SECRET — `openssl rand -base64 32`

### 2. Install + Setup DB

```bash
npm install
npx prisma db push     # สร้าง tables ใน dev.db
npx prisma db seed     # (optional) ใส่ข้อมูลตัวอย่าง
```

### 3. Run

```bash
npm run dev
```

เปิด http://localhost:3000

**Demo:** admin@company.com / admin123

### 4. Deploy (Docker)

```bash
cp .env.production.example .env
# แก้ค่าใน .env (NEXTAUTH_URL, NEXTAUTH_SECRET, ฯลฯ)
docker compose up -d
```

DB และรูปอุปกรณ์เก็บใน named volumes (`equiptrack-data`, `equiptrack-uploads`) — ไม่หายเวลา rebuild image

## โครงสร้าง Project (70 ไฟล์)

```
equip-track/
├── prisma/
│   ├── schema.prisma          # DB schema (User, Asset, Assignment, etc.)
│   └── seed.ts                # ข้อมูลตัวอย่าง 8 อุปกรณ์ + 4 users
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (providers, fonts)
│   │   ├── page.tsx           # → redirect /dashboard
│   │   ├── globals.css        # Tailwind + custom components
│   │   ├── login/page.tsx     # Google OAuth + Email/Password
│   │   ├── asset/[code]/      # QR scan public page
│   │   ├── dashboard/
│   │   │   ├── layout.tsx     # Sidebar + auth check
│   │   │   ├── page.tsx       # Overview (stats, alerts, depreciation)
│   │   │   ├── loading.tsx    # Loading skeleton
│   │   │   ├── error.tsx      # Error boundary
│   │   │   ├── not-found.tsx  # 404
│   │   │   ├── assets/        # ทะเบียนอุปกรณ์ (list, detail, new, edit)
│   │   │   ├── assignments/   # การมอบหมาย
│   │   │   ├── maintenance/   # ซ่อมบำรุง
│   │   │   ├── alerts/        # แจ้งเตือน
│   │   │   ├── bookings/      # ยืม-คืน
│   │   │   └── reports/       # รายงาน
│   │   └── api/
│   │       ├── auth/          # NextAuth
│   │       ├── assets/        # CRUD + sticker
│   │       ├── assignments/   # CRUD + return
│   │       ├── maintenance/   # CRUD
│   │       ├── bookings/      # CRUD + overlap check
│   │       ├── alerts/        # GET alerts
│   │       ├── reports/       # Summary data
│   │       ├── export/        # CSV + PDF
│   │       ├── upload/        # Photo upload
│   │       └── cron/          # Daily email alerts
│   ├── components/
│   │   ├── Sidebar.tsx        # Responsive sidebar (mobile hamburger)
│   │   ├── Providers.tsx      # SessionProvider
│   │   ├── PageActions.tsx    # Action buttons (role-aware)
│   │   ├── AssetActions.tsx   # Edit + Delete (role-aware)
│   │   ├── ExportButtons.tsx  # Excel + PDF export
│   │   ├── Pagination.tsx     # Page navigation
│   │   ├── PhotoUpload.tsx    # Drag-drop photo
│   │   ├── QRCodeDisplay.tsx  # QR Code generator
│   │   ├── BarcodeDisplay.tsx # Barcode (Code128)
│   │   ├── AssetSticker.tsx   # Printable label
│   │   ├── ui/Modal.tsx       # Reusable modal
│   │   ├── ui/ConfirmDialog.tsx # Delete confirmation
│   │   └── forms/
│   │       ├── AddMaintenanceForm.tsx
│   │       ├── AddAssignmentForm.tsx
│   │       ├── ReturnAssetForm.tsx
│   │       └── AddBookingForm.tsx
│   ├── lib/
│   │   ├── prisma.ts          # Singleton client
│   │   ├── auth.ts            # NextAuth + bcrypt
│   │   ├── supabase.ts        # Storage helpers
│   │   ├── codes.ts           # QR + Barcode
│   │   ├── depreciation.ts    # Straight-line calculation
│   │   ├── alerts.ts          # Alert collection + email
│   │   ├── role-guard.ts      # Role-based access (server)
│   │   ├── useRole.ts         # Role-based access (client hook)
│   │   └── utils.ts           # cn(), formatters, constants
│   ├── middleware.ts          # Route protection
│   └── types/index.ts        # Shared TypeScript types
├── .env.example
├── package.json
├── vercel.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── postcss.config.js
```

## ฟีเจอร์

### Core
- ✅ ทะเบียนอุปกรณ์ CRUD + ค้นหา/กรอง/pagination
- ✅ รูปถ่ายอุปกรณ์ (local fs default + optional Supabase Storage, drag-drop, primary photo)
- ✅ QR Code + Barcode + สติกเกอร์ที่พิมพ์ได้
- ✅ คำนวณค่าเสื่อมราคา (Straight-line)

### การจัดการ
- ✅ มอบหมายอุปกรณ์ + คืน + ประวัติ
- ✅ ซ่อมบำรุง (ค่าใช้จ่าย, ร้านซ่อม, ประเภท)
- ✅ ยืม-คืนอุปกรณ์กลาง (จอง + เช็ค overlap + สภาพก่อน-หลัง)

### แจ้งเตือน + รายงาน
- ✅ แจ้งเตือน (ประกันหมด, บำรุงรักษา, หมดอายุใช้งาน)
- ✅ Email alert daily via Resend + Vercel Cron
- ✅ รายงาน (มูลค่ารวม, ค่าซ่อมสูง, อุปกรณ์ว่าง)
- ✅ Export Excel (CSV) + PDF

### Security
- ✅ Auth (Google OAuth + Email/Password with bcrypt)
- ✅ Role-based access (ADMIN / USER / VIEWER)
- ✅ Route protection (middleware)
- ✅ API role guards (DELETE = ADMIN only)
- ✅ Confirm dialog ก่อนลบ

### UX
- ✅ Mobile responsive (hamburger menu)
- ✅ Loading skeletons
- ✅ Error boundary
- ✅ 404 page
- ✅ Dark theme

## Role Permissions

| Action | VIEWER | USER | ADMIN |
|--------|--------|------|-------|
| ดูข้อมูล | ✅ | ✅ | ✅ |
| เพิ่ม/แก้ไข | ❌ | ✅ | ✅ |
| ลบ | ❌ | ❌ | ✅ |
| จัดการ users | ❌ | ❌ | ✅ |"# Equipment-management-system-" 
