// Path: prisma/seed.ts
// ============================================================
// File: seed.ts
// Path: equip-track/prisma/seed.ts
// Desc: Seed data — ข้อมูลตัวอย่าง + hashed passwords
//       Run: npx prisma db seed
// ============================================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const hashedPassword = await bcrypt.hash("admin123", 12);

  // ── Users ──
  const admin = await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: { hashedPassword },
    create: { email: "admin@company.com", name: "Admin", role: "ADMIN", hashedPassword },
  });

  const somchai = await prisma.user.upsert({
    where: { email: "somchai@company.com" },
    update: { hashedPassword },
    create: { email: "somchai@company.com", name: "สมชาย", role: "USER", hashedPassword },
  });

  const somying = await prisma.user.upsert({
    where: { email: "somying@company.com" },
    update: { hashedPassword },
    create: { email: "somying@company.com", name: "สมหญิง", role: "USER", hashedPassword },
  });

  const wichai = await prisma.user.upsert({
    where: { email: "wichai@company.com" },
    update: { hashedPassword },
    create: { email: "wichai@company.com", name: "วิชัย", role: "USER", hashedPassword },
  });

  // ── Assets ──
  const assetsData = [
    { code: "EQ-001", name: 'MacBook Pro 14"', brand: "Apple", model: "M3 Pro", serialNumber: "C02X1234HASH", category: "LAPTOP" as const, status: "ACTIVE" as const, purchaseDate: new Date("2024-01-15"), purchasePrice: 75900, expectedLife: 4, warrantyEnd: new Date("2027-01-15"), nextMaintenance: new Date("2025-07-15") },
    { code: "EQ-002", name: 'Dell UltraSharp 27"', brand: "Dell", model: "U2723QE", serialNumber: "DL9988776655", category: "MONITOR" as const, status: "ACTIVE" as const, purchaseDate: new Date("2023-06-10"), purchasePrice: 18500, expectedLife: 6, warrantyEnd: new Date("2026-06-10") },
    { code: "EQ-003", name: "Toyota Vios", brand: "Toyota", model: "Vios 1.5", serialNumber: "JTDKN3DU5A0", category: "VEHICLE" as const, status: "ACTIVE" as const, purchaseDate: new Date("2022-03-01"), purchasePrice: 629000, expectedLife: 8, warrantyEnd: new Date("2025-03-01"), nextMaintenance: new Date("2025-04-01") },
    { code: "EQ-004", name: "Canon EOS R6", brand: "Canon", model: "EOS R6 II", serialNumber: "CN1122334455", category: "CAMERA" as const, status: "AVAILABLE" as const, purchaseDate: new Date("2023-11-20"), purchasePrice: 79990, expectedLife: 5, warrantyEnd: new Date("2025-11-20") },
    { code: "EQ-005", name: "Epson Projector", brand: "Epson", model: "EB-FH52", serialNumber: "EP5566778899", category: "PROJECTOR" as const, status: "MAINTENANCE" as const, purchaseDate: new Date("2021-08-05"), purchasePrice: 32000, expectedLife: 5, warrantyEnd: new Date("2024-08-05"), nextMaintenance: new Date("2025-03-10") },
    { code: "EQ-006", name: "ThinkPad X1 Carbon", brand: "Lenovo", model: "Gen 11", serialNumber: "LN4455667788", category: "LAPTOP" as const, status: "ACTIVE" as const, purchaseDate: new Date("2023-09-01"), purchasePrice: 52900, expectedLife: 4, warrantyEnd: new Date("2026-09-01"), nextMaintenance: new Date("2025-09-01") },
    { code: "EQ-007", name: "Herman Miller Aeron", brand: "Herman Miller", model: "Aeron Size B", serialNumber: "HM0011223344", category: "FURNITURE" as const, status: "ACTIVE" as const, purchaseDate: new Date("2022-01-10"), purchasePrice: 45000, expectedLife: 12, warrantyEnd: new Date("2034-01-10") },
    { code: "EQ-008", name: 'MacBook Air 13"', brand: "Apple", model: "M2", serialNumber: "C02Y5678ABCD", category: "LAPTOP" as const, status: "RETIRED" as const, purchaseDate: new Date("2023-03-20"), purchasePrice: 42900, expectedLife: 4, warrantyEnd: new Date("2026-03-20") },
  ];

  const assets: Record<string, any> = {};
  for (const data of assetsData) {
    assets[data.code] = await prisma.asset.upsert({ where: { code: data.code }, update: {}, create: data });
  }

  // ── Photos (placeholder ภายนอก) ──
  // ใช้ picsum.photos เพื่อไม่ผูกกับ filesystem — สลับ DB ไป-มาแล้วรูปยังโชว์ได้
  // seed ของจริง (real data) จะ upload เข้า storage provider เอง ผ่าน /api/upload
  const photoCount = await prisma.assetPhoto.count();
  if (photoCount === 0) {
    const photoSeeds = [
      { code: "EQ-001", seeds: ["macbook-1", "macbook-2"] },
      { code: "EQ-002", seeds: ["monitor-1"] },
      { code: "EQ-003", seeds: ["vios-1", "vios-2"] },
      { code: "EQ-004", seeds: ["canon-1"] },
      { code: "EQ-005", seeds: ["projector-1"] },
      { code: "EQ-006", seeds: ["thinkpad-1"] },
      { code: "EQ-007", seeds: ["aeron-1"] },
      { code: "EQ-008", seeds: ["air-1"] },
    ];
    for (const { code, seeds } of photoSeeds) {
      const asset = assets[code];
      if (!asset) continue;
      await prisma.assetPhoto.createMany({
        data: seeds.map((s, i) => ({
          assetId: asset.id,
          url: `https://picsum.photos/seed/${s}/800/600`,
          isPrimary: i === 0,
          order: i,
        })),
      });
    }
  }

  // ── Assignments ──
  const assignCount = await prisma.assignment.count();
  if (assignCount === 0) {
    await prisma.assignment.createMany({
      data: [
        { assetId: assets["EQ-001"].id, userId: somchai.id, personName: "สมชาย", dateOut: new Date("2024-01-20"), notes: "ใช้ประจำ" },
        { assetId: assets["EQ-002"].id, userId: somying.id, personName: "สมหญิง", dateOut: new Date("2023-06-15") },
        { assetId: assets["EQ-003"].id, personName: "แผนกขาย", dateOut: new Date("2022-03-05"), notes: "รถประจำแผนก" },
        { assetId: assets["EQ-006"].id, userId: wichai.id, personName: "วิชัย", dateOut: new Date("2023-09-05") },
        { assetId: assets["EQ-008"].id, userId: somchai.id, personName: "สมชาย", dateOut: new Date("2023-03-25"), dateIn: new Date("2024-11-01"), notes: "คืนแล้ว เครื่องช้า" },
      ],
    });
  }

  // ── Maintenance ──
  const maintCount = await prisma.maintenanceRecord.count();
  if (maintCount === 0) {
    await prisma.maintenanceRecord.createMany({
      data: [
        { assetId: assets["EQ-003"].id, date: new Date("2024-12-01"), description: "เปลี่ยนถ่ายน้ำมันเครื่อง + เช็คสภาพ", cost: 3500, vendor: "Toyota สาขาบางนา", type: "PREVENTIVE" },
        { assetId: assets["EQ-003"].id, date: new Date("2024-06-15"), description: "เปลี่ยนยาง 4 เส้น", cost: 12000, vendor: "B-Quik ลาดพร้าว", type: "REPAIR" },
        { assetId: assets["EQ-005"].id, date: new Date("2025-02-15"), description: "หลอดไฟเสีย เปลี่ยนหลอดใหม่", cost: 8900, vendor: "Epson Service Center", type: "REPAIR" },
        { assetId: assets["EQ-005"].id, date: new Date("2024-05-20"), description: "พัดลมระบายอากาศเสีย", cost: 4200, vendor: "Epson Service Center", type: "REPAIR" },
        { assetId: assets["EQ-001"].id, date: new Date("2024-09-10"), description: "เปลี่ยนแบตเตอรี่", cost: 6500, vendor: "Apple iCare", type: "REPAIR" },
      ],
    });
  }

  // ── Bookings ──
  const bookCount = await prisma.booking.count();
  if (bookCount === 0) {
    await prisma.booking.createMany({
      data: [
        { assetId: assets["EQ-004"].id, userId: somying.id, personName: "สมหญิง", dateStart: new Date("2025-03-10"), dateEnd: new Date("2025-03-12"), purpose: "ถ่ายภาพสินค้าใหม่", conditionBefore: "ดี", status: "APPROVED" },
        { assetId: assets["EQ-004"].id, userId: wichai.id, personName: "วิชัย", dateStart: new Date("2025-03-15"), dateEnd: new Date("2025-03-16"), purpose: "ถ่ายงาน event", status: "PENDING" },
      ],
    });
  }

  console.log("✅ Seed complete!");
  console.log("   Demo login: admin@company.com / admin123");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());