// Path: src/app/(features)/maintenance/page.tsx
import { prisma } from "@/lib/prisma";
import { MaintenanceClient } from "./MaintenanceClient";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const [records, assets, upcoming] = await Promise.all([
    prisma.maintenanceRecord.findMany({
      include: { asset: { select: { id: true, code: true, name: true, purchasePrice: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.asset.findMany({ select: { id: true, code: true, name: true, status: true, category: true } }),
    prisma.asset.findMany({
      where: { nextMaintenance: { lte: new Date(Date.now() + 30 * 86400000) }, status: { not: "RETIRED" } },
      select: { code: true, name: true, nextMaintenance: true },
    }),
  ]);

  const serializedRecords = records.map((r) => ({
    id: r.id,
    description: r.description,
    vendor: r.vendor,
    cost: Number(r.cost),
    date: r.date.toISOString(),
    type: r.type,
    asset: { code: r.asset.code, name: r.asset.name, purchasePrice: Number(r.asset.purchasePrice) },
  }));

  const totalCost = serializedRecords.reduce((s, r) => s + r.cost, 0);

  const byAsset: Record<string, typeof serializedRecords> = {};
  serializedRecords.forEach((r) => {
    (byAsset[r.asset.code] = byAsset[r.asset.code] || []).push(r);
  });

  return (
    <MaintenanceClient
      data={{
        records: serializedRecords,
        assets,
        upcoming: upcoming.map((a) => ({
          code: a.code,
          name: a.name,
          nextMaintenance: a.nextMaintenance!.toISOString(),
        })),
        totalCost,
        byAsset,
      }}
    />
  );
}
