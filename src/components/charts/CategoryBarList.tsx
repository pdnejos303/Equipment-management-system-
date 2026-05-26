"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import { useCategories } from "@/lib/useCategories";

type StatEntry = { category: string; status: string; count: number };

const AMBER_SCALE = [
  "#f59e0b",
  "#d97706",
  "#b45309",
  "#fbbf24",
  "#92400e",
  "#fcd34d",
  "#78350f",
  "#fde68a",
  "#6b7280",
];

export function CategoryBarList() {
  const { t } = useI18n();
  const { labelFor, emojiFor } = useCategories();
  const [raw, setRaw] = useState<StatEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/assets/category-stats")
      .then((r) => r.json())
      .then(setRaw)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { rows, total } = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of raw) totals[e.category] = (totals[e.category] ?? 0) + e.count;
    const total = Object.values(totals).reduce((s, n) => s + n, 0);
    const rows = Object.entries(totals)
      .filter(([, n]) => n > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, count], i) => ({
        cat,
        label: labelFor(cat),
        emoji: emojiFor(cat),
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
        color: AMBER_SCALE[i] ?? AMBER_SCALE[AMBER_SCALE.length - 1],
      }));
    return { rows, total };
  }, [raw, labelFor, emojiFor]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm" style={{ color: "var(--text-muted)" }}>
        {t("dashboard.noData")}
      </div>
    );
  }

  const maxCount = Math.max(...rows.map((r) => r.count));

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Header strip — total */}
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-brand-500 leading-none">{total}</span>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            {t("dashboard.totalAssets")}
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-subtle)" }}>
          {rows.length} {rows.length === 1 ? "category" : "categories"}
        </span>
      </div>

      {/* Vertical bar chart — candle-style; scrolls horizontally when many categories */}
      <div className="flex-1 min-h-[240px] overflow-x-auto overflow-y-hidden">
        <div className="h-full" style={{ minWidth: `${Math.max(rows.length * 56, 0)}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            margin={{ top: 18, right: 8, left: 0, bottom: 4 }}
            barCategoryGap="28%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
              opacity={0.35}
            />
            <XAxis
              dataKey="cat"
              tick={{ fontSize: 16, fill: "var(--text-muted)" }}
              tickFormatter={(cat: string) => rows.find((r) => r.cat === cat)?.emoji ?? ""}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "var(--text-subtle)", fontFamily: "ui-monospace, monospace" }}
              tickLine={false}
              axisLine={false}
              width={28}
              domain={[0, Math.ceil(maxCount * 1.15)]}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-hover)", opacity: 0.4 }}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                padding: "8px 12px",
              }}
              labelStyle={{ color: "var(--text-default)", fontWeight: 600, marginBottom: 2 }}
              formatter={(value, _name, item) => {
                const pct = (item?.payload as { pct?: number } | undefined)?.pct ?? 0;
                return [`${value} (${pct}%)`, t("dashboard.totalAssets")];
              }}
              labelFormatter={(_label, payload) => {
                const p = payload?.[0]?.payload as { emoji: string; label: string } | undefined;
                return p ? `${p.emoji} ${p.label}` : "";
              }}
              separator=" "
            />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
              isAnimationActive={true}
              animationDuration={550}
            >
              {rows.map((r) => (
                <Cell key={r.cat} fill={r.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
