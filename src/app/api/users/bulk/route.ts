// Path: src/app/api/users/bulk/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/role-guard";
import { z } from "zod";

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  action: z.enum(["delete", "updateRole"]),
  role: z.enum(["ADMIN", "USER", "VIEWER"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionWithRole();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = bulkSchema.parse(body);

    const ids = data.ids.filter((id) => id !== session.userId);
    const skippedSelf = ids.length !== data.ids.length;

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "Cannot perform bulk action on your own account only" },
        { status: 400 }
      );
    }

    if (data.action === "delete") {
      await prisma.$transaction([
        prisma.account.deleteMany({ where: { userId: { in: ids } } }),
        prisma.session.deleteMany({ where: { userId: { in: ids } } }),
        prisma.user.deleteMany({ where: { id: { in: ids } } }),
      ]);
      return NextResponse.json({ success: true, count: ids.length, skippedSelf });
    }

    if (data.action === "updateRole") {
      if (!data.role) {
        return NextResponse.json({ error: "Role is required" }, { status: 400 });
      }
      const result = await prisma.user.updateMany({
        where: { id: { in: ids } },
        data: { role: data.role },
      });
      return NextResponse.json({ success: true, count: result.count, skippedSelf });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("POST /api/users/bulk error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
