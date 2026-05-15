// Path: src/app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/role-guard";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  try {
    const session = await getSessionWithRole();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true, image: true },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionWithRole();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const updateData: Record<string, string> = {};
    if (data.name) updateData.name = data.name;

    if (data.newPassword) {
      if (!data.currentPassword) {
        return NextResponse.json({ error: "กรุณาใส่รหัสผ่านปัจจุบัน" }, { status: 400 });
      }
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { hashedPassword: true },
      });
      if (!user?.hashedPassword) {
        return NextResponse.json({ error: "ไม่สามารถเปลี่ยนรหัสผ่านสำหรับบัญชี OAuth ได้" }, { status: 400 });
      }
      const valid = await verifyPassword(data.currentPassword, user.hashedPassword);
      if (!valid) {
        return NextResponse.json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, { status: 400 });
      }
      updateData.hashedPassword = await hashPassword(data.newPassword);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "ไม่มีข้อมูลที่จะอัปเดต" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
