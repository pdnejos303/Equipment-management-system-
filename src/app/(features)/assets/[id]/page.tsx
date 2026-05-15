// Path: src/app/(features)/assets/[id]/page.tsx
// ============================================================
// File: page.tsx
// Path: equip-track/src/app/(features)/assets/[id]/page.tsx
// Desc: Asset detail — server fetch + client interactive (QR/Barcode/tabs)
// ============================================================

import { prisma } from "@/lib/prisma";
import { calculateDepreciation } from "@/lib/depreciation";
import { STATUS_CONFIG, CATEGORY_CONFIG } from "@/lib/utils";
import { notFound } from "next/navigation";
import { AssetDetailClient } from "./AssetDetailClient";
import { AssetActions } from "@/components/AssetActions";
import { AssetDetailHeader } from "./AssetDetailHeader";

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await prisma.asset.findFirst({
    where: { OR: [{ id }, { code: id }] },
    include: {
      photos: { orderBy: { order: "asc" } },
      assignments: { orderBy: { dateOut: "desc" }, take: 20 },
      maintenanceRecords: { orderBy: { date: "desc" } },
      bookings: { orderBy: { dateStart: "desc" }, take: 10 },
    },
  });

  if (!asset) notFound();

  const price = Number(asset.purchasePrice);
  const dep = calculateDepreciation(price, asset.purchaseDate, asset.expectedLife);
  const totalRepair = asset.maintenanceRecords.reduce((s, m) => s + Number(m.cost), 0);
  const repairRatio = price > 0 ? (totalRepair / price) * 100 : 0;
  const st = STATUS_CONFIG[asset.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.AVAILABLE;
  const currentAssignment = asset.assignments.find((a) => !a.dateIn);

  // Serialize for client component (Decimal → number, Date → string)
  const serializedAsset = {
    ...asset,
    purchasePrice: price,
    purchaseDate: asset.purchaseDate.toISOString(),
    warrantyEnd: asset.warrantyEnd?.toISOString() || null,
    nextMaintenance: asset.nextMaintenance?.toISOString() || null,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
    photos: asset.photos.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    assignments: asset.assignments.map((a) => ({
      ...a,
      dateOut: a.dateOut.toISOString(),
      dateIn: a.dateIn?.toISOString() || null,
      createdAt: a.createdAt.toISOString(),
    })),
    maintenanceRecords: asset.maintenanceRecords.map((m) => ({
      ...m,
      cost: Number(m.cost),
      date: m.date.toISOString(),
      createdAt: m.createdAt.toISOString(),
    })),
    bookings: asset.bookings.map((b) => ({
      ...b,
      dateStart: b.dateStart.toISOString(),
      dateEnd: b.dateEnd.toISOString(),
      createdAt: b.createdAt.toISOString(),
    })),
  };

  return (
    <div>
      <AssetDetailHeader
        assetId={asset.id}
        assetName={asset.name}
        assetCode={asset.code}
        brand={asset.brand || ""}
        model={asset.model || ""}
        serialNumber={asset.serialNumber || ""}
        status={asset.status}
        statusBg={st.bg}
        statusColor={st.color}
        assignedTo={currentAssignment?.personName || null}
      />

      <AssetDetailClient
        asset={serializedAsset}
        depreciation={dep}
        totalRepair={totalRepair}
        repairRatio={repairRatio}
      />
    </div>
  );
}