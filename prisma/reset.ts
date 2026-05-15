// prisma/reset.ts — ลบข้อมูลทั้งหมดใน DB (ยกเว้น schema)
// Usage: pnpm db:reset

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("⚠️  Wiping all data...");

  await prisma.booking.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.assetPhoto.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ Database is now empty.");
}

main()
  .catch((e) => { console.error("❌ Reset failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
