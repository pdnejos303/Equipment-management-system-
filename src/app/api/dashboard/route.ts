// Path: src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateDepreciation } from "@/lib/depreciation";
import { format, subDays, startOfMonth, eachMonthOfInterval, startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "30"; // days
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Calculate date range
  let dateFrom: Date;
  let dateTo: Date = endOfDay(new Date());

  if (from && to) {
    dateFrom = startOfDay(new Date(from));
    dateTo = endOfDay(new Date(to));
  } else {
    const days = parseInt(range, 10);
    dateFrom = startOfDay(subDays(new Date(), days));
  }

  const [assets, maintenance, assignments, bookings] = await Promise.all([
    prisma.asset.findMany({
      include: {
        assignments: { where: { dateIn: null }, take: 1 },
      },
    }),
    prisma.maintenanceRecord.findMany({
      where: { date: { gte: dateFrom, lte: dateTo } },
      orderBy: { date: "desc" },
      include: { asset: { select: { code: true, name: true, category: true } } },
    }),
    prisma.assignment.findMany({
      where: { dateOut: { gte: dateFrom, lte: dateTo } },
      orderBy: { dateOut: "desc" },
      include: { asset: { select: { code: true, name: true, category: true } } },
    }),
    prisma.booking.findMany({
      where: { dateStart: { gte: dateFrom, lte: dateTo } },
      orderBy: { dateStart: "desc" },
      include: { asset: { select: { code: true, name: true, category: true } } },
    }),
  ]);

  // Status breakdown
  const byStatus: Record<string, number> = { ACTIVE: 0, AVAILABLE: 0, MAINTENANCE: 0, RETIRED: 0 };
  let totalOriginal = 0;
  let totalCurrent = 0;

  // Category breakdown
  const categoryBreakdown: Record<string, { count: number; value: number }> = {};

  // Depreciation by asset for top depreciating
  const assetDepreciation: { name: string; code: string; original: number; current: number; percent: number }[] = [];

  assets.forEach((a) => {
    if (a.status in byStatus) byStatus[a.status]++;
    const price = Number(a.purchasePrice);
    totalOriginal += price;
    const dep = calculateDepreciation(price, a.purchaseDate, a.expectedLife);
    totalCurrent += dep.currentValue;

    if (!categoryBreakdown[a.category]) {
      categoryBreakdown[a.category] = { count: 0, value: 0 };
    }
    categoryBreakdown[a.category].count++;
    categoryBreakdown[a.category].value += dep.currentValue;

    assetDepreciation.push({
      name: a.name,
      code: a.code,
      original: price,
      current: Math.round(dep.currentValue),
      percent: dep.percentUsed,
    });
  });

  // Monthly maintenance cost trend
  const months = eachMonthOfInterval({ start: dateFrom, end: dateTo });
  const maintenanceTrend = months.map((month) => {
    const key = format(month, "yyyy-MM");
    const label = format(month, "MMM yy");
    const records = maintenance.filter((m) => format(m.date, "yyyy-MM") === key);
    const repair = records.filter((r) => r.type === "REPAIR").reduce((s, r) => s + Number(r.cost), 0);
    const preventive = records.filter((r) => r.type === "PREVENTIVE").reduce((s, r) => s + Number(r.cost), 0);
    const inspection = records.filter((r) => r.type === "INSPECTION").reduce((s, r) => s + Number(r.cost), 0);
    return { month: label, repair, preventive, inspection, total: repair + preventive + inspection, count: records.length };
  });

  // Monthly maintenance by type count
  const maintByType: Record<string, number> = { REPAIR: 0, PREVENTIVE: 0, INSPECTION: 0 };
  maintenance.forEach((m) => {
    if (m.type in maintByType) maintByType[m.type]++;
  });

  // Booking activity trend
  const bookingTrend = months.map((month) => {
    const key = format(month, "yyyy-MM");
    const label = format(month, "MMM yy");
    const monthBookings = bookings.filter((b) => format(b.dateStart, "yyyy-MM") === key);
    return {
      month: label,
      pending: monthBookings.filter((b) => b.status === "PENDING").length,
      approved: monthBookings.filter((b) => b.status === "APPROVED").length,
      active: monthBookings.filter((b) => b.status === "ACTIVE").length,
      returned: monthBookings.filter((b) => b.status === "RETURNED").length,
      cancelled: monthBookings.filter((b) => b.status === "CANCELLED").length,
      total: monthBookings.length,
    };
  });

  // Assignment activity trend
  const assignmentTrend = months.map((month) => {
    const key = format(month, "yyyy-MM");
    const label = format(month, "MMM yy");
    const monthAssignments = assignments.filter((a) => format(a.dateOut, "yyyy-MM") === key);
    return {
      month: label,
      assigned: monthAssignments.length,
      returned: monthAssignments.filter((a) => a.dateIn !== null).length,
    };
  });

  // Top maintenance cost by asset
  const costByAsset: Record<string, { name: string; code: string; cost: number; count: number }> = {};
  maintenance.forEach((m) => {
    if (!costByAsset[m.assetId]) {
      costByAsset[m.assetId] = { name: m.asset.name, code: m.asset.code, cost: 0, count: 0 };
    }
    costByAsset[m.assetId].cost += Number(m.cost);
    costByAsset[m.assetId].count++;
  });
  const topMaintenanceCost = Object.values(costByAsset)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 8);

  // Maintenance cost by category
  const maintByCat: Record<string, number> = {};
  maintenance.forEach((m) => {
    const cat = m.asset.category;
    maintByCat[cat] = (maintByCat[cat] || 0) + Number(m.cost);
  });

  // Recent maintenance
  const recentMaintenance = maintenance.slice(0, 5).map((m) => ({
    id: m.id,
    description: m.description,
    cost: Number(m.cost),
    date: m.date.toISOString(),
    type: m.type,
    asset: m.asset,
  }));

  // Utilization rate (active / total)
  const utilizationRate = assets.length > 0
    ? Math.round(((byStatus.ACTIVE || 0) / assets.length) * 100)
    : 0;

  return NextResponse.json({
    totalAssets: assets.length,
    byStatus,
    totalOriginal,
    totalCurrent: Math.round(totalCurrent),
    totalRepair: maintenance.reduce((s, r) => s + Number(r.cost), 0),
    totalMaintenanceCount: maintenance.length,
    totalBookings: bookings.length,
    totalAssignments: assignments.length,
    utilizationRate,
    categoryBreakdown,
    maintenanceTrend,
    maintByType,
    bookingTrend,
    assignmentTrend,
    topMaintenanceCost,
    maintByCat,
    recentMaintenance,
    assetDepreciation: assetDepreciation.sort((a, b) => b.percent - a.percent).slice(0, 10),
    dateRange: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
  });
}
