// Path: prisma/seed-reset.ts
// ============================================================
// Reset DB: ลบข้อมูลทั้งหมด (ยกเว้น Admin) + สร้าง admin ถ้ายีงไม่มี
// Run (local):     npx tsx prisma/reset2.ts
// Run (in Docker): docker compose exec app npx tsx prisma/reset2.ts
// ============================================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@company.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Admin";

async function main() {
  console.log("Wiping all data (excluding ADMIN users)...");

  // ลบตามลำดับ foreign key (child → parent)
  await prisma.testDeviceLog.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.assetPhoto.deleteMany();
  await prisma.asset.deleteMany();

  // NextAuth tables and Users
  const adminUsers = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  const adminIds = adminUsers.map(u => u.id);

  if (adminIds.length > 0) {
    await prisma.session.deleteMany({ where: { userId: { notIn: adminIds } } });
    await prisma.account.deleteMany({ where: { userId: { notIn: adminIds } } });
    await prisma.user.deleteMany({ where: { role: { not: 'ADMIN' } } });
  } else {
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
  }

  await prisma.verificationToken.deleteMany();

  console.log("Checking for admin user...");
  let admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  
  if (!admin) {
    console.log("Creating admin user...");
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
    admin = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        role: "ADMIN",
        hashedPassword,
      },
    });
    console.log(`   Created: ${admin.email} / ${ADMIN_PASSWORD}`);
  } else {
    console.log(`   Admin already exists: ${admin.email}`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error("Reset failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
