// Path: src/app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/role-guard";
import { z } from "zod";

const updateSchema = z.object({
  label: z.string().min(1).max(64).optional(),
  emoji: z.string().max(8).optional().nullable(),
  order: z.number().int().optional(),
});

// PATCH /api/categories/[id] — edit (USER/ADMIN)
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
    const body = await req.json();
    const data = updateSchema.parse(body);

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(data.label !== undefined && { label: data.label }),
        ...(data.emoji !== undefined && { emoji: data.emoji || null }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("PATCH /api/categories/[id] error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE /api/categories/[id] — delete (ADMIN)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionWithRole();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (category.isDefault) {
      return NextResponse.json({ error: "Cannot delete default category" }, { status: 400 });
    }

    const inUse = await prisma.asset.count({ where: { category: category.key } });
    if (inUse > 0) {
      return NextResponse.json(
        { error: `Category is used by ${inUse} asset(s). Reassign them first.` },
        { status: 409 }
      );
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/categories/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
