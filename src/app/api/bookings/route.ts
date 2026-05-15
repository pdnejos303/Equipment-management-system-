// Path: src/app/api/bookings/route.ts
// ============================================================
// File: route.ts
// Path: equip-track/src/app/api/bookings/route.ts
// Desc: API สำหรับ Booking (ยืม-คืน) — GET, POST
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/role-guard";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const assetId = new URL(req.url).searchParams.get("assetId");
    const where: any = {};
    if (assetId) where.assetId = assetId;

    const data = await prisma.booking.findMany({
      where,
      include: {
        asset: { select: { id: true, code: true, name: true, category: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { dateStart: "desc" },
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const schema = z.object({
  assetId: z.string().min(1),
  userId: z.string().optional(),
  personName: z.string().min(1),
  dateStart: z.string().transform((s) => new Date(s)),
  dateEnd: z.string().transform((s) => new Date(s)),
  purpose: z.string().optional(),
  conditionBefore: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionWithRole();
    if (!session || !["ADMIN", "USER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = schema.parse(await req.json());

    // Check for overlapping bookings
    const overlap = await prisma.booking.findFirst({
      where: {
        assetId: data.assetId,
        status: { in: ["PENDING", "APPROVED", "ACTIVE"] },
        dateStart: { lte: data.dateEnd },
        dateEnd: { gte: data.dateStart },
      },
    });

    if (overlap) {
      return NextResponse.json(
        { error: "This time slot is already booked" },
        { status: 409 }
      );
    }

    const booking = await prisma.booking.create({ data });
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}