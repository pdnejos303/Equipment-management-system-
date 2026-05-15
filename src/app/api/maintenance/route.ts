// Path: src/app/api/maintenance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/role-guard";
import { z } from "zod";

// GET /api/maintenance
export async function GET(req: NextRequest) {
  try {
    const assetId = new URL(req.url).searchParams.get("assetId");
    const where: any = {};
    if (assetId) where.assetId = assetId;

    const data = await prisma.maintenanceRecord.findMany({
      where,
      include: {
        asset: { select: { id: true, code: true, name: true } },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/maintenance
const schema = z.object({
  assetId: z.string().min(1),
  date: z.string().transform((s) => new Date(s)),
  description: z.string().min(1),
  cost: z.number().min(0),
  vendor: z.string().optional(),
  type: z.enum(["REPAIR", "PREVENTIVE", "INSPECTION"]).default("REPAIR"),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionWithRole();
    if (!session || !["ADMIN", "USER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = schema.parse(await req.json());

    const record = await prisma.maintenanceRecord.create({ data });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("POST /api/maintenance error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
