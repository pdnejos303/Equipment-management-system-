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
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { dateStart: "desc" },
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// Booker must be identified either by `userId` (real user in the system)
// or by `personName` (free-text fallback for external people / guests).
const schema = z
  .object({
    assetId: z.string().min(1),
    userId: z.string().optional(),
    personName: z.string().optional(),
    dateStart: z.string().transform((s) => new Date(s)),
    dateEnd: z.string().transform((s) => new Date(s)),
    purpose: z.string().optional(),
    conditionBefore: z.string().optional(),
  })
  .refine((d) => !!d.userId || (d.personName && d.personName.trim().length > 0), {
    message: "Either userId or personName is required",
    path: ["userId"],
  });

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionWithRole();
    if (!session || !["ADMIN", "USER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = schema.parse(await req.json());

    let resolvedName = data.personName?.trim() || "";
    let resolvedUserId: string | undefined = undefined;

    if (data.userId) {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { id: true, name: true, email: true },
      });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      resolvedUserId = user.id;
      resolvedName = user.name?.trim() || user.email;
    }

    if (!resolvedName) {
      return NextResponse.json({ error: "Person name is required" }, { status: 400 });
    }

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

    const booking = await prisma.booking.create({
      data: {
        assetId: data.assetId,
        userId: resolvedUserId,
        personName: resolvedName,
        dateStart: data.dateStart,
        dateEnd: data.dateEnd,
        purpose: data.purpose,
        conditionBefore: data.conditionBefore,
      },
    });
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
