// Path: src/app/api/assignments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/role-guard";
import { z } from "zod";

// GET /api/assignments
export async function GET(req: NextRequest) {
  try {
    const assetId = new URL(req.url).searchParams.get("assetId");
    const where: any = {};
    if (assetId) where.assetId = assetId;

    const data = await prisma.assignment.findMany({
      where,
      include: {
        asset: { select: { id: true, code: true, name: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { dateOut: "desc" },
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/assignments
const schema = z.object({
  assetId: z.string().min(1),
  userId: z.string().optional(),
  personName: z.string().min(1),
  department: z.string().optional(),
  dateOut: z.string().transform((s) => new Date(s)),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionWithRole();
    if (!session || !["ADMIN", "USER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = schema.parse(await req.json());

    // Update asset status to ACTIVE
    await prisma.asset.update({
      where: { id: data.assetId },
      data: { status: "ACTIVE" },
    });

    const assignment = await prisma.assignment.create({ data });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("POST /api/assignments error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
