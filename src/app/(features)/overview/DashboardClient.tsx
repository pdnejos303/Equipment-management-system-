// Path: src/app/(features)/overview/DashboardClient.tsx
"use client";

import { useI18n } from "@/lib/i18n";
import { useCategories } from "@/lib/useCategories";
import { formatMoney, formatDate } from "@/lib/utils";
import {
  Package, Wrench, DollarSign,
  Activity, Loader2,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, ComposedChart, Line,
} from "recharts";
import { AIInsights } from "@/components/AIInsights";
import { CategorySunburst } from "@/components/charts/CategorySunburst";
import { PageHeader } from "@/components/ui/PageHeader";
import { DateRangePicker, type RangePreset } from "@/components/ui/DateRangePicker";
import type { Alert } from "@/lib/alerts";
import DashboardLoading from "./loading";

// ── Types ──

interface ServerData {
  totalAssets: number;
  byStatus: Record<string, number>;
  totalOriginal: number;
  totalCurrent: number;
  totalRepair: number;
  alerts: Alert[];
  recentMaintenance: { id: string; description: string; cost: number; date: string; asset: { code: string; name: string } }[];
  categoryBreakdown: Record<string, number>;
}

interface ChartData {
  totalAssets: number;
  byStatus: Record<string, number>;
  totalOriginal: number;
  totalCurrent: number;
  totalRepair: number;
  totalMaintenanceCount: number;
  totalBookings: number;
  totalAssignments: number;
  utilizationRate: number;
  categoryBreakdown: Record<string, { count: number; value: number }>;
  maintenanceTrend: { month: string; repair: number; preventive: number; inspection: number; total: number; count: number }[];
  maintByType: Record<string, number>;
  bookingTrend: { month: string; pending: number; approved: number; active: number; returned: number; cancelled: number; total: number }[];
  assignmentTrend: { month: string; assigned: number; returned: number }[];
  topMaintenanceCost: { name: string; code: string; cost: number; count: number }[];
  maintByCat: Record<string, number>;
  recentMaintenance: { id: string; description: string; cost: number; date: string; type: string; asset: { code: string; name: string } }[];
  assetDepreciation: { name: string; code: string; original: number; current: number; percent: number }[];
  dateRange: { from: string; to: string };
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#22c55e",
  AVAILABLE: "#3b82f6",
  MAINTENANCE: "#f59e0b",
  RETIRED: "#ef4444",
};

const CATEGORY_COLORS = ["#f59e0b", "#3b82f6", "#22c55e", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#6366f1"];

const MAINT_TYPE_COLORS: Record<string, string> = {
  REPAIR: "#ef4444",
  PREVENTIVE: "#3b82f6",
  INSPECTION: "#22c55e",
};

// ── Custom Tooltip ──

function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 relative overflow-hidden" style={{ boxShadow: "0 12px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.02) inset" }}>
      <div className="absolute top-0 left-3 right-3 h-px" style={{ background: "linear-gradient(90deg, transparent, rgb(var(--brand-rgb) / 0.2), transparent)" }} />
      <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-sm" style={{ background: entry.color }} />
          <span style={{ color: "var(--text-muted)" }}>{entry.name}:</span>
          <span className="font-semibold" style={{ color: "var(--text-default)" }}>
            {formatter ? formatter(entry.value) : entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ──

const defaultServerData: ServerData = {
  totalAssets: 0,
  byStatus: {},
  totalOriginal: 0,
  totalCurrent: 0,
  totalRepair: 0,
  alerts: [],
  recentMaintenance: [],
  categoryBreakdown: {},
};

export function DashboardClient({ data }: { data?: ServerData }) {
  const serverData = data ?? defaultServerData;
  const { t, locale } = useI18n();
  const { labelFor } = useCategories();
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetched, setFetched] = useState(false);
  const [range, setRange] = useState<RangePreset>("90");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const fetchChartData = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/dashboard?range=${range}`;
      if (range === "custom" && customFrom && customTo) {
        url = `/api/dashboard?from=${customFrom}&to=${customTo}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        setChartData(null);
        return;
      }
      const json = await res.json();
      setChartData(json);
    } catch {
      setChartData(null);
    } finally {
      setFetched(true);
      setLoading(false);
    }
  }, [range, customFrom, customTo]);

  useEffect(() => {
    if (range !== "custom") fetchChartData();
  }, [range, fetchChartData]);

  useEffect(() => {
    if (range === "custom" && customFrom && customTo) fetchChartData();
  }, [customFrom, customTo, fetchChartData, range]);

  // Use chart data when available, fall back to server data
  const d = chartData || null;
  const totalAssets = d?.totalAssets ?? serverData.totalAssets;
  const byStatus = d?.byStatus ?? serverData.byStatus;
  const totalOriginal = d?.totalOriginal ?? serverData.totalOriginal;
  const totalCurrent = d?.totalCurrent ?? serverData.totalCurrent;
  const totalRepair = d?.totalRepair ?? serverData.totalRepair;

  const fmt = useCallback((v: number) => `${t("common.baht")}${formatMoney(v, locale)}`, [t, locale]);

  const depreciationPercent = useMemo(
    () => (totalOriginal > 0 ? Math.round((totalCurrent / totalOriginal) * 100) : 0),
    [totalCurrent, totalOriginal]
  );

  // Prepare chart data from API
  const statusPieData = useMemo(
    () => Object.entries(byStatus)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({ name: t(`status.${key}`), value, color: STATUS_COLORS[key] })),
    [byStatus, t]
  );

  const categoryBarData = useMemo(
    () => d
      ? Object.entries(d.categoryBreakdown).map(([key, val], i) => ({
          name: labelFor(key),
          count: val.count,
          value: Math.round(val.value),
          fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        }))
      : Object.entries(serverData.categoryBreakdown).map(([key, count], i) => ({
          name: labelFor(key),
          count: count as number,
          value: 0,
          fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        })),
    [d, serverData.categoryBreakdown, labelFor]
  );

  const maintTypeData = useMemo(
    () => d
      ? Object.entries(d.maintByType)
          .filter(([, v]) => v > 0)
          .map(([key, value]) => ({ name: t(`maintType.${key}`), value, color: MAINT_TYPE_COLORS[key] }))
      : [],
    [d, t]
  );

  const utilizationRate = useMemo(
    () => d?.utilizationRate ?? (totalAssets > 0 ? Math.round(((byStatus.ACTIVE || 0) / totalAssets) * 100) : 0),
    [d, totalAssets, byStatus]
  );

  const utilizationData = useMemo(
    () => [{ name: "Utilization", value: utilizationRate, fill: "#22c55e" }],
    [utilizationRate]
  );

  const stats = useMemo(
    () => [
      {
        label: t("dashboard.totalAssets"),
        value: totalAssets,
        sub: `${t("dashboard.using")} ${byStatus.ACTIVE || 0} · ${t("dashboard.available")} ${byStatus.AVAILABLE || 0}`,
        icon: Package,
        color: "text-brand-500",
        bg: "bg-brand-500/10",
      },
      {
        label: t("dashboard.currentValue"),
        value: fmt(totalCurrent),
        sub: `${t("dashboard.fromPurchase")} ${fmt(totalOriginal)}`,
        icon: DollarSign,
        color: "text-green-500",
        bg: "bg-green-500/10",
        trend: depreciationPercent >= 50 ? ("up" as const) : ("down" as const),
        trendValue: `${depreciationPercent}%`,
      },
      {
        label: t("dashboard.inRepair"),
        value: byStatus.MAINTENANCE || 0,
        sub: `${fmt(Math.round(totalRepair))} ${t("dashboard.inRepairCost")}`,
        icon: Wrench,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
      },
      {
        label: t("dashboard.activity"),
        value: d?.totalMaintenanceCount ?? serverData.recentMaintenance.length,
        sub: `${d?.totalBookings ?? 0} ${t("dashboard.bookings")} · ${d?.totalAssignments ?? 0} ${t("dashboard.assigned")}`,
        icon: Activity,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
      },
    ],
    [t, totalAssets, byStatus, fmt, totalCurrent, totalOriginal, depreciationPercent, totalRepair, d, serverData.recentMaintenance.length]
  );

  const recentMaint = useMemo(
    () => d?.recentMaintenance ?? serverData.recentMaintenance.map((m) => ({ ...m, type: "REPAIR" })),
    [d, serverData.recentMaintenance]
  );

  // First load: show skeleton instead of zero-flash. Once data arrives,
  // keep showing it during range changes (stale-while-revalidate).
  // After fetch completes — even on failure — fall through so we don't hang.
  if (!chartData && !data && !fetched) return <DashboardLoading />;

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title={t("dashboard.title")}
        subtitle={d?.dateRange
          ? `${formatDate(d.dateRange.from, locale)} — ${formatDate(d.dateRange.to, locale)}`
          : undefined}
        actions={
          <DateRangePicker
            range={range}
            onRangeChange={setRange}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
            onRefresh={fetchChartData}
            loading={loading}
          />
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-stagger">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="card stat-card relative overflow-hidden group"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center ${s.color} flex-shrink-0 transition-transform duration-300 group-hover:scale-105`}>
                <s.icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold leading-snug uppercase tracking-wide line-clamp-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                  {"trend" in s && s.trend && (
                    <div className={`flex items-center gap-0.5 text-xs font-semibold flex-shrink-0 px-1.5 py-0.5 rounded-md ${s.trend === "up" ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"}`}>
                      {s.trend === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {s.trendValue}
                    </div>
                  )}
                </div>
                <p className={`text-2xl font-bold leading-tight mt-1.5 ${s.color} tracking-tight truncate`}>{s.value}</p>
                <p className="text-xs mt-1.5 leading-relaxed line-clamp-2 min-h-[2.2em]" style={{ color: "var(--text-subtle)" }}>{s.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Utilization Gauge + Status Pie + Maintenance Type Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Utilization Gauge */}
        <div className="card flex flex-col items-center justify-center">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)", letterSpacing: "0.08em" }}>
            {t("dashboard.utilizationRate")}
          </h3>
          <div className="w-48 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%" cy="50%" innerRadius="70%" outerRadius="100%"
                barSize={16} data={utilizationData} startAngle={210} endAngle={-30}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={10}
                  background={{ fill: "var(--surface-hover)" }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="-mt-24 text-center">
            <p className="text-4xl font-bold text-green-400 tracking-tight">{utilizationRate}%</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-subtle)" }}>
              {byStatus.ACTIVE || 0}/{totalAssets} {t("dashboard.inUse")}
            </p>
          </div>
        </div>

        {/* Status Distribution Pie */}
        <div className="card">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-4">
            {t("dashboard.assetStatus")}
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {statusPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
            {statusPieData.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                <span className="text-gray-400">{s.name}</span>
                <span className="font-bold" style={{ color: "var(--text-default)" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance Type Pie */}
        <div className="card">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-4">
            {t("dashboard.maintenanceTypes")}
          </h3>
          {maintTypeData.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-gray-500 text-sm">
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : t("dashboard.noDataInRange")}
            </div>
          ) : (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={maintTypeData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {maintTypeData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                {maintTypeData.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-gray-400">{s.name}</span>
                    <span className="font-bold" style={{ color: "var(--text-default)" }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Maintenance Cost Trend */}
      {d && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest">
                {t("dashboard.monthlyMaintTrend")}
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                {t("dashboard.maintSubtitle")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-brand-500">{fmt(Math.round(totalRepair))}</p>
              <p className="text-xs text-gray-500">{t("dashboard.totalLabel")}</p>
            </div>
          </div>
          <div className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={d.maintenanceTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="repairGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="preventGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "var(--text-subtle)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "var(--text-subtle)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : `${v}`} />
                <Tooltip content={<ChartTooltip formatter={(v: number) => fmt(v)} />} />
                <Area type="monotone" dataKey="repair" stackId="1" fill="url(#repairGrad)" stroke="#ef4444" strokeWidth={2} name={t("maintType.REPAIR")} />
                <Area type="monotone" dataKey="preventive" stackId="1" fill="url(#preventGrad)" stroke="#3b82f6" strokeWidth={2} name={t("maintType.PREVENTIVE")} />
                <Bar dataKey="inspection" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={12} name={t("maintType.INSPECTION")} opacity={0.8} />
                <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: "#f59e0b", r: 3 }} name={t("dashboard.totalLineLabel")} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Sunburst + Recent Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Sunburst */}
        <div className="card">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-2">
            {t("dashboard.byCategory")}
          </h3>
          <CategorySunburst />
        </div>

        {/* Recent Maintenance */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest">
              {t("dashboard.recentMaint")}
            </h3>
            <Link href="/maintenance" className="text-xs text-brand-500 hover:underline">{t("dashboard.viewAll")}</Link>
          </div>
          {recentMaint.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Wrench size={32} className="mb-2 opacity-30" />
              <p className="text-sm">{t("dashboard.noMaintHistory")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMaint.map((m) => (
                <div key={m.id} className="rounded-xl p-3 transition-all duration-200 border border-transparent hover:border-[var(--border)]" style={{ background: "var(--surface-hover)" }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-default)" }}>{m.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-brand-500">{m.asset.code}</span>
                        <span className="text-xs text-gray-500">{m.asset.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                          m.type === "REPAIR" ? "bg-red-500/10 text-red-400" :
                          m.type === "PREVENTIVE" ? "bg-blue-500/10 text-blue-400" :
                          "bg-green-500/10 text-green-400"
                        }`}>
                          {m.type === "REPAIR" ? <Wrench size={10} /> : m.type === "PREVENTIVE" ? <Clock size={10} /> : <CheckCircle2 size={10} />}
                          {t(`maintType.${m.type}`)}
                        </span>
                        <span className="text-[10px] text-gray-600">{formatDate(m.date, locale)}</span>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-semibold text-brand-400 ml-3 whitespace-nowrap">{fmt(m.cost)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Maintenance Cost + Asset Depreciation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Maintenance Cost by Asset */}
        <div className="card">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-4">
            {t("dashboard.topRepairCost")}
          </h3>
          {!d || d.topMaintenanceCost.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : t("dashboard.noDataInRange")}
            </div>
          ) : (
            <div className="space-y-3">
              {d.topMaintenanceCost.map((item, i) => {
                const maxCost = d.topMaintenanceCost[0]?.cost || 1;
                const pct = (item.cost / maxCost) * 100;
                return (
                  <div key={item.code}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-brand-500">{item.code}</span>
                        <span className="truncate max-w-[160px]" style={{ color: "var(--text-muted)" }}>{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{item.count}x</span>
                        <span className="font-mono text-sm font-semibold text-brand-400">{fmt(item.cost)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-surface-dark rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}, ${CATEGORY_COLORS[(i + 1) % CATEGORY_COLORS.length]})`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Asset Depreciation Ranking */}
        <div className="card">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-4">
            {t("dashboard.mostDepreciated")}
          </h3>
          {d && d.assetDepreciation.length > 0 ? (
            <div className="space-y-3">
              {d.assetDepreciation.map((item) => (
                <div key={item.code}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-brand-500">{item.code}</span>
                      <span className="truncate max-w-[160px]" style={{ color: "var(--text-muted)" }}>{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 line-through">{fmt(item.original)}</span>
                      <span className="font-mono text-sm font-semibold text-green-400">{fmt(item.current)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-surface-dark rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${item.percent}%`,
                        background: item.percent > 80
                          ? "linear-gradient(90deg, #ef4444, #dc2626)"
                          : item.percent > 50
                          ? "linear-gradient(90deg, #f59e0b, #d97706)"
                          : "linear-gradient(90deg, #22c55e, #16a34a)",
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-gray-600">{t("dashboard.usedLabel")}</span>
                    <span className={`text-[10px] font-semibold ${item.percent > 80 ? "text-red-400" : item.percent > 50 ? "text-amber-400" : "text-green-400"}`}>
                      {item.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : t("dashboard.noData")}
            </div>
          )}

          {/* Total Depreciation Summary */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{t("dashboard.totalPurchase")}</span>
              <span className="font-mono" style={{ color: "var(--text-default)" }}>{fmt(totalOriginal)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">{t("dashboard.currentValue")}</span>
              <span className="font-mono text-green-500">{fmt(totalCurrent)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">{t("dashboard.accDeprec")}</span>
              <span className="font-mono text-red-400">{fmt(totalOriginal - totalCurrent)}</span>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{t("dashboard.remaining")}</span>
                <span>{depreciationPercent}%</span>
              </div>
              <div className="h-2.5 bg-surface-dark rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full animate-progress"
                  style={{
                    width: `${depreciationPercent}%`,
                    background: "linear-gradient(90deg, #22c55e, #f59e0b)",
                  } as React.CSSProperties}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking & Assignment Trends */}
      {d && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Booking Activity */}
          <div className="card">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-4">
              {t("dashboard.monthlyBookingActivity")}
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.bookingTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "var(--text-subtle)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--text-subtle)", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="active" stackId="a" fill="#22c55e" name={t("bookingStatus.ACTIVE")} />
                  <Bar dataKey="returned" stackId="a" fill="#3b82f6" name={t("bookingStatus.RETURNED")} />
                  <Bar dataKey="pending" stackId="a" fill="#f59e0b" name={t("bookingStatus.PENDING")} />
                  <Bar dataKey="cancelled" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} name={t("bookingStatus.CANCELLED")} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Assignment Activity */}
          <div className="card">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-4">
              {t("dashboard.monthlyAssignments")}
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.assignmentTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="assignGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="returnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "var(--text-subtle)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--text-subtle)", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="assigned" fill="url(#assignGrad)" stroke="#f59e0b" strokeWidth={2} name={t("dashboard.assignedLabel")} />
                  <Area type="monotone" dataKey="returned" fill="url(#returnGrad)" stroke="#22c55e" strokeWidth={2} name={t("dashboard.returnedLabel")} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights */}
      <AIInsights />
    </div>
  );
}
