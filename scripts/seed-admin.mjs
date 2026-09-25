// scripts/seed-admin.mjs
// ============================================================
// Lightweight startup seed — creates a default admin user
// ONLY if the database has zero users.
//
// Runs inside Docker as part of the CMD chain:
//   prisma db push → node scripts/seed-admin.mjs → node server.js
//
// This script uses @prisma/client directly (already generated
// during build) and bcryptjs (already in node_modules).
// ============================================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@company.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Admin";

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();

  if (userCount > 0) {
    console.log(`✅ Database already has ${userCount} user(s) — skipping seed.`);
    return;
  }

  console.log("🌱 No users found — creating default admin...");

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: "ADMIN",
      hashedPassword,
    },
  });

  console.log(`✅ Admin created: ${admin.email} / ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed-admin failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
