// Path: src/app/asset/[code]/page.tsx
// ============================================================
// File: page.tsx
// Path: equip-track/src/app/asset/[code]/page.tsx
// Desc: Public page — scan QR Code to view asset info (no login required)
// ============================================================

import { prisma } from "@/lib/prisma";
import { calculateDepreciation } from "@/lib/depreciation";
import { notFound } from "next/navigation";
import { AssetPublicClient } from "./AssetPublicClient";

type Props = { params: Promise<{ code: string }> };

export default async function AssetPublicPage({ params }: Props) {
  const { code } = await params;
  const asset = await prisma.asset.findUnique({
    where: { code },
    include: {
      photos: { where: { isPrimary: true }, take: 1 },
    },
  });

  if (!asset) notFound();

  const price = Number(asset.purchasePrice);
  const dep = calculateDepreciation(
    price,
    asset.purchaseDate,
    asset.expectedLife
  );

  return (
    <AssetPublicClient
      asset={{
        code: asset.code,
        name: asset.name,
        brand: asset.brand,
        model: asset.model,
        serialNumber: asset.serialNumber,
        category: asset.category,
        status: asset.status,
        photo: asset.photos[0]?.url || null,
      }}
      depreciation={{
        yearsUsed: dep.yearsUsed,
        percentUsed: dep.percentUsed,
      }}
      expectedLife={asset.expectedLife}
      purchaseDate={asset.purchaseDate.toISOString()}
    />
  );
}
