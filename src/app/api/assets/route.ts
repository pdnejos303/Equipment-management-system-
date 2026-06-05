// Path: src/app/api/assets/route.ts
// ============================================================
// File: route.ts
// Path: equip-track/src/app/api/assets/route.ts
// Desc: API สำหรับ Asset — GET (list + filter), POST (create)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/role-guard";
import { z } from "zod";

// ── GET /api/assets ──
// Query params: ?status=ACTIVE&category=LAPTOP&search=mac&page=1&limit=20

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 20)));

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
        { brand: { contains: search } },
        { serialNumber: { contains: search } },
      ];
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          photos: { where: { isPrimary: true }, take: 1 },
          assignments: {
            where: { dateIn: null },
            take: 1,
            select: { personName: true },
          },
        },
        orderBy: { code: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.asset.count({ where }),
    ]);

    return NextResponse.json({
      data: assets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/assets error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 }
    );
  }
}

// ── POST /api/assets ──

const createAssetSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  category: z.string().min(1),
  purchaseDate: z.string().transform((s) => new Date(s)),
  purchasePrice: z.number().positive(),
  expectedLife: z.number().int().positive(),
  warrantyEnd: z.string().optional().transform((s) => s ? new Date(s) : undefined),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionWithRole();
    if (!session || !["ADMIN", "USER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = createAssetSchema.parse(body);

    // Validate category exists — report as a field-level issue so the UI can
    // point at the "category" field with a localized reason.
    const categoryExists = await prisma.category.findUnique({ where: { key: data.category } });
    if (!categoryExists) {
      return NextResponse.json(
        {
          error: `Unknown category: ${data.category}`,
          details: [{ path: ["category"], code: "unknownCategory", message: `Unknown category: ${data.category}` }],
        },
        { status: 400 }
      );
    }

    // Check duplicate code — report against the "code" field.
    const existing = await prisma.asset.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      return NextResponse.json(
        {
          error: `Code ${data.code} already exists`,
          details: [{ path: ["code"], code: "duplicate", message: `Code ${data.code} already exists` }],
        },
        { status: 409 }
      );
    }

    const asset = await prisma.asset.create({ data });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("POST /api/assets error:", error);
    return NextResponse.json(
      { error: "Failed to create asset" },
      { status: 500 }
    );
  }
}
