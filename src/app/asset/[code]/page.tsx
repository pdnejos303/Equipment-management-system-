// Path: src/app/asset/[code]/page.tsx
// ============================================================
// File: page.tsx
// Path: equip-track/src/app/asset/[code]/page.tsx
// Desc: Public page — scan QR Code to view asset info (no login required)
// ============================================================

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AssetPublicClient } from "./AssetPublicClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

type Props = { params: Promise<{ code: string }> };

export default async function AssetPublicPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session;
  const { code } = await params;
  const asset = await prisma.asset.findUnique({
    where: { code },
    include: {
      photos: { where: { isPrimary: true }, take: 1 },
      testDeviceLogs: { where: { returnedAt: null }, take: 1, include: { user: true } },
    },
  });

  if (!asset) notFound();

  return (
    <AssetPublicClient
      asset={{
        id: asset.id,
        code: asset.code,
        name: asset.name,
        brand: asset.brand,
        model: asset.model,
        serialNumber: asset.serialNumber,
        category: asset.category,
        status: asset.status,
        photo: asset.photos[0]?.url || null,
        isTestDevice: asset.isTestDevice,
        testDeviceLogs: asset.testDeviceLogs.map(l => ({
          userId: l.userId,
          guestName: l.guestName,
          user: l.user ? { name: l.user.name, email: l.user.email } : null
        })),
      }}
      purchasePrice={Number(asset.purchasePrice)}
      purchaseDate={asset.purchaseDate.toISOString()}
      isLoggedIn={isLoggedIn}
      currentUser={session?.user || null}
    />
  );
}
