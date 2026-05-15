// Path: src/app/api/assignments/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/role-guard";
import { z } from "zod";

// PATCH /api/assignments/[id] — return asset
const schema = z.object({
  dateIn: z.string().transform((s) => new Date(s)),
  notes: z.string().optional(),
});

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

    const assignment = await prisma.assignment.update({
      where: { id },
      data: {
        dateIn: data.dateIn,
        notes: data.notes,
      },
    });

    // Check if this was the last active assignment for the asset
    const activeAssignments = await prisma.assignment.count({
      where: { assetId: assignment.assetId, dateIn: null },
    });

    if (activeAssignments === 0) {
      await prisma.asset.update({
        where: { id: assignment.assetId },
        data: { status: "AVAILABLE" },
      });
    }

    return NextResponse.json(assignment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    console.error("PATCH /api/assignments/[id] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
