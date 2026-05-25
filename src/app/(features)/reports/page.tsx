// Path: src/app/(features)/reports/page.tsx
import { prisma } from "@/lib/prisma";
import { calculateDepreciation } from "@/lib/depreciation";
import { ReportsClient } from "./ReportsClient";

export const dynamic = "force-dynamic";

interface ReportsSearchParams {
  asOf?: string;
  category?: string;
  status?: string;
  location?: string;
}

function parseAsOf(value?: string): Date {
  if (!value) return new Date();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date();
  // End of selected day so depreciation reflects full day
  d.setHours(23, 59, 59, 999);
  return d;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<ReportsSearchParams>;
}) {
  const sp = await searchParams;
  const asOf = parseAsOf(sp.asOf);

  const where: any = {};
  if (sp.category) where.category = sp.category;
  if (sp.status) where.status = sp.status;
  if (sp.location) where.location = { contains: sp.location };
  // When viewing a historical snapshot, exclude assets that didn't exist yet
  if (sp.asOf) where.purchaseDate = { lte: asOf };

  const assets = await prisma.asset.findMany({
    where,
    include: {
      maintenanceRecords: {
        where: sp.asOf ? { date: { lte: asOf } } : undefined,
        select: { cost: true },
      },
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
    const dep = calculateDepreciation(price, a.purchaseDate, a.expectedLife, asOf);
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

  // Distinct locations for filter dropdown
  const locationRows = await prisma.asset.findMany({
    where: { location: { not: null } },
    select: { location: true },
    distinct: ["location"],
  });
  const locations = locationRows
    .map((r) => r.location)
    .filter((l): l is string => !!l && l.trim().length > 0)
    .sort();

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
        locations,
        filters: {
          asOf: sp.asOf || "",
          category: sp.category || "",
          status: sp.status || "",
          location: sp.location || "",
        },
      }}
    />
  );
}
