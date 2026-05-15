// Path: prisma/seed-reset.ts
// ============================================================
// Reset DB: ลบข้อมูลทั้งหมด + สร้าง admin 1 ตัว
// Run (local):     npx tsx prisma/seed-reset.ts
// Run (in Docker): docker compose exec app npx tsx prisma/seed-reset.ts
// ============================================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@company.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Admin";

async function main() {
  console.log("Wiping all data...");

  // ลบตามลำดับ foreign key (child → parent)
  await prisma.booking.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.assetPhoto.deleteMany();
  await prisma.asset.deleteMany();

  // NextAuth tables
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();

  // Users สุดท้าย
  await prisma.user.deleteMany();

  console.log("Creating admin user...");
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: "ADMIN",
      hashedPassword,
    },
  });

  console.log("Done.");
  console.log(`   Login: ${admin.email} / ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("Reset failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
