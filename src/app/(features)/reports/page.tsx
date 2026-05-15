// Path: src/app/(features)/reports/page.tsx
import { prisma } from "@/lib/prisma";
import { calculateDepreciation } from "@/lib/depreciation";
import { ReportsClient } from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const assets = await prisma.asset.findMany({
    include: {
      maintenanceRecords: { select: { cost: true } },
      assignments: { where: { dateIn: null }, take: 1 },
    },
  });

  let totalOriginal = 0;
  let totalCurrent = 0;
  let totalRepair = 0;

  const byCategory: Record<string, { count: number; original: number; current: number; repair: number }> = {};
  const byStatus: Record<string, number> = { ACTIVE: 0, AVAILABLE: 0, MAINTENANCE: 0, RETIRED: 0 };

  assets.forEach((a) => {
    const price = Number(a.purchasePrice);
    const dep = calculateDepreciation(price, a.purchaseDate, a.expectedLife);
    const repair = a.maintenanceRecords.reduce((s, m) => s + Number(m.cost), 0);

    totalOriginal += price;
    totalCurrent += dep.currentValue;
    totalRepair += repair;

    if (a.status in byStatus) byStatus[a.status]++;

    if (!byCategory[a.category]) {
      byCategory[a.category] = { count: 0, original: 0, current: 0, repair: 0 };
    }
    byCategory[a.category].count++;
    byCategory[a.category].original += price;
    byCategory[a.category].current += dep.currentValue;
    byCategory[a.category].repair += repair;
  });

  const assigned = assets.filter((a) => a.assignments.length > 0).length;

  return (
    <ReportsClient
      data={{
        totalAssets: assets.length,
        totalOriginal,
        totalCurrent,
        totalRepair,
        byStatus,
        byCategory,
        assigned,
      }}
    />
  );
}
