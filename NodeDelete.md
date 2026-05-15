รุป — เกิดอะไรขึ้นและแก้ยังไง                                                                                                                                                                             
                                                                                                                                                                                                       
  สาเหตุ:                                                                                                                                                                                               
  - โปรเจกต์นี้ใช้ pnpm (มี pnpm-lock.yaml ไม่ใช่ npm)
  - ตอนคุณลบ node_modules แล้วโหลดกลับ น่าจะใช้ npm install ซึ่งมีปัญหากับโครงสร้าง pnpm — ทำให้ node_modules ว่างเปล่า (0 ไฟล์) แม้จะดูเหมือนติดตั้งแล้ว                                                                    
  - ต่อให้ติดตั้งสำเร็จ Prisma Client ก็ต้อง generate แยก เพราะ pnpm ใช้ symlink ไป .pnpm/ ทำให้ @prisma/client did not initialize yet

  สิ่งที่ผมทำ:
  1. pnpm install — ติดตั้ง dependencies ใหม่ทั้งหมด (ใช้เวลา ~3 นาที)
  2. ลบ .next cache แล้ว pnpm prisma generate — สร้าง Prisma Client ใหม่
  3. ทดสอบ pnpm run dev → ✓ Ready, GET / → HTTP 200

  ตอนนี้ใช้งานได้ที่ http://localhost:3000 (admin@company.com / admin123)

  เพิ่มเติม: มี TypeScript implicit-any errors ค้างอยู่หลายไฟล์ (pre-existing ไม่ใช่จากการลบ node_modules) — ไม่ block dev server เพราะ next.config.mjs ตั้ง ignoreBuildErrors ไว้ ถ้าอยากให้ไล่แก้ทั้งหมดบอกได้



  ทำไม Prisma ถึงโดนด้วย

  Prisma ไม่เหมือน library ทั่วไปที่แค่ import แล้วใช้ได้เลย มันมี 2 ส่วน:

  1. @prisma/client — package ปกติที่อยู่ใน node_modules (โดนลบไปด้วย)
  2. Prisma Client ที่ generate ขึ้นมาเฉพาะโปรเจกต์ — สร้างจาก prisma/schema.prisma ของคุณ
    - มี TypeScript types ที่ตรงกับ models ของคุณ (User, Asset, Booking ฯลฯ)
    - มี query engine binary (query_engine-windows.dll.node) ที่เป็นไฟล์ native ~50MB
    - ทั้งหมดถูก generate ลงไปที่ node_modules/.prisma/client/

  ลบ node_modules = ลบ generated client ไปด้วย → เหลือแค่ stub เปล่าๆ → import ได้แต่พอเรียกใช้จริง throw did not initialize yet

  ทำไม pnpm install ปกติแล้วยังพัง

  ใน package.json มี "postinstall": "prisma generate" ซึ่งรันอัตโนมัติแล้ว (เห็นใน log ตอนติดตั้ง) — แต่ pnpm เก็บ Prisma Client ไว้ที่ node_modules/.pnpm/@prisma+client@5.22.0_.../ แล้ว symlink มาที่
  node_modules/@prisma/client

  ปัญหาคือ Next.js dev server cached path เก่าใน .next/ — เลยต้องลบ .next ทิ้งก่อน Prisma ถึงจะโหลด client ใหม่ได้

  สรุปกฎจำง่าย

  ถ้าลบ node_modules ในโปรเจกต์ที่ใช้ Prisma ให้ทำตามลำดับนี้เสมอ:

  pnpm install              # ติดตั้ง + postinstall จะรัน prisma generate
  rm -rf .next              # ลบ build cache เก่า
  pnpm run dev              # เริ่มใหม่

  ถ้ายังเจอ did not initialize yet ให้รัน pnpm prisma generate ซ้ำอีกครั้งแล้วลองใหม่
