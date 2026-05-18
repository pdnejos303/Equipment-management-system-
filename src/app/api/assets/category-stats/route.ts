import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.asset.groupBy({
    by: ["category", "status"],
    _count: { id: true },
  });

  return NextResponse.json(
    rows.map((r) => ({ category: r.category, status: r.status, count: r._count.id }))
  );
}
