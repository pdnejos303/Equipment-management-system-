// Path: src/app/api/bookings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { eventEmitter } from "@/lib/eventEmitter";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/role-guard";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["PENDING", "APPROVED", "ACTIVE", "RETURNED", "CANCELLED"]),
  conditionAfter: z.string().optional(),
});

// PATCH /api/bookings/[id] — update booking status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole();
    if (!session || !["ADMIN", "USER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const data = schema.parse(await req.json());

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.conditionAfter ? { conditionAfter: data.conditionAfter } : {}),
      },
    });

    eventEmitter.emit("update");
    return NextResponse.json(booking);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    console.error("PATCH /api/bookings/[id] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
