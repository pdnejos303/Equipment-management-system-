// Path: src/lib/prisma.ts
//Singleton Pattern สำหรับ PrismaClient เพื่อป้องกันปัญหาที่มักเกิดในสภาพแวดล้อมการพัฒนา
//  (Development) ของ Framework อย่าง Next.js 
import { PrismaClient } from "@prisma/client";
// การใช้ตัวแปร globalThis เพื่อเก็บ instance ของ PrismaClient ในระหว่างการพัฒนา
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma || // ถ้ามีอยู่แล้วใช้อันนี้เลย
  new PrismaClient({ // ถ้ายังไม่มี สร้างใหม่
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
