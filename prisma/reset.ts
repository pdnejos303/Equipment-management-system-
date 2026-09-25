// prisma/reset.ts — ลบข้อมูลทั้งหมดใน DB (ยกเว้น schema และ ADMIN)
// Usage: pnpm db:reset

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("⚠️  Wiping all data (excluding ADMIN users)...");

  await prisma.testDeviceLog.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.assetPhoto.deleteMany();
  await prisma.asset.deleteMany();

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

  console.log("✅ Database is now empty (except ADMIN users).");
}

main()
  .catch((e) => { console.error("❌ Reset failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
