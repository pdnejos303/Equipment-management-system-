import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code parameter" }, { status: 400 });
  }

  const asset = await prisma.asset.findUnique({
    where: { code },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      isTestDevice: true,
      testDeviceLogs: {
        where: { returnedAt: null },
        select: { userId: true, guestName: true },
        take: 1,
      },
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(asset);
}
