// Path: src/app/api/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/role-guard";
import { z } from "zod";

const DEFAULT_CATEGORIES = [
  { key: "LAPTOP",    label: "Laptop",     emoji: "💻", order: 10 },
  { key: "MONITOR",   label: "Monitor",    emoji: "🖥️", order: 20 },
  { key: "VEHICLE",   label: "Vehicle",    emoji: "🚗", order: 30 },
  { key: "FURNITURE", label: "Furniture",  emoji: "🪑", order: 40 },
  { key: "CAMERA",    label: "Camera",     emoji: "📷", order: 50 },
  { key: "PROJECTOR", label: "Projector",  emoji: "📽️", order: 60 },
  { key: "PRINTER",   label: "Printer",    emoji: "🖨️", order: 70 },
  { key: "PHONE",     label: "Phone",      emoji: "📱", order: 80 },
  { key: "OTHER",     label: "Other",      emoji: "📦", order: 999 },
];

async function ensureDefaults() {
  const count = await prisma.category.count();
  if (count === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, isDefault: true })),
    });
  }
}

// GET /api/categories — list
export async function GET() {
  try {
    await ensureDefaults();
    const categories = await prisma.category.findMany({
      orderBy: [{ order: "asc" }, { label: "asc" }],
    });
    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

// POST /api/categories — create (USER/ADMIN)
const createSchema = z.object({
  key: z.string().min(1).max(32).regex(/^[A-Z0-9_]+$/, "Use uppercase letters, numbers, underscore"),
  label: z.string().min(1).max(64),
  emoji: z.string().max(8).optional().nullable(),
  order: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionWithRole();
    if (!session || !["ADMIN", "USER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const data = createSchema.parse(body);

    const existing = await prisma.category.findUnique({ where: { key: data.key } });
    if (existing) {
      return NextResponse.json({ error: `Category ${data.key} already exists` }, { status: 409 });
    }

    const last = await prisma.category.findFirst({ orderBy: { order: "desc" } });
    const category = await prisma.category.create({
      data: {
        key: data.key,
        label: data.label,
        emoji: data.emoji || null,
        order: data.order ?? (last ? last.order + 10 : 10),
        isDefault: false,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("POST /api/categories error:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
