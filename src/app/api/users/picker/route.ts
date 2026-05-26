// Path: src/app/api/users/picker/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/role-guard";

// GET /api/users/picker — list users for borrower selection.
// Any authenticated session may read. Returns minimal fields only.
export async function GET() {
  try {
    const session = await getSessionWithRole();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });

    return NextResponse.json({ data: users });
  } catch (error) {
    console.error("GET /api/users/picker error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
