"use client";

import { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useI18n } from "@/lib/i18n";
import { useCategories } from "@/lib/useCategories";
import { Loader2 } from "lucide-react";

const CATEGORY_COLORS = [
  "#f59e0b", "#3b82f6", "#22c55e", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#6366f1",
];
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#22c55e",
  AVAILABLE: "#60a5fa",
  MAINTENANCE: "#f59e0b",
  RETIRED: "#f87171",
};
const STATUSES = ["ACTIVE", "AVAILABLE", "MAINTENANCE", "RETIRED"];

type StatEntry = { category: string; status: string; count: number };

type HoveredInner = { type: "inner"; cat: string; label: string; emoji: string; value: number; fill: string };
type HoveredOuter = { type: "outer"; cat: string; status: string; value: number; fill: string; catColor: string };
type Hovered = HoveredInner | HoveredOuter | null;

export function CategorySunburst() {
  const { t } = useI18n();
  const { labelFor, emojiFor } = useCategories();
  const [raw, setRaw] = useState<StatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<Hovered>(null);

  useEffect(() => {
    fetch("/api/assets/category-stats")
      .then((r) => r.json())
      .then(setRaw)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { innerData, outerData, total } = useMemo(() => {
    const catTotals: Record<string, number> = {};
    const catStatus: Record<string, Record<string, number>> = {};

    for (const e of raw) {
      catTotals[e.category] = (catTotals[e.category] ?? 0) + e.count;
      if (!catStatus[e.category]) catStatus[e.category] = {};
      catStatus[e.category][e.status] = e.count;
    }

    const cats = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);
    const total = Object.values(catTotals).reduce((s, n) => s + n, 0);

    const catColors: Record<string, string> = {};
    cats.forEach((cat, i) => { catColors[cat] = CATEGORY_COLORS[i % CATEGORY_COLORS.length]; });

    const innerData: HoveredInner[] = cats.map((cat) => ({
      type: "inner" as const,
      cat,
      label: labelFor(cat),
      emoji: emojiFor(cat),
      value: catTotals[cat],
      fill: catColors[cat],
    }));

    const outerData: HoveredOuter[] = cats.flatMap((cat) =>
      STATUSES
        .filter((s) => (catStatus[cat]?.[s] ?? 0) > 0)
        .map((s) => ({
          type: "outer" as const,
          cat,
          status: s,
          value: catStatus[cat][s],
          fill: STATUS_COLORS[s],
          catColor: catColors[cat],
        }))
    );

    return { innerData, outerData, total, catColors };
  }, [raw, labelFor, emojiFor]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[380px] sm:h-[420px]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  if (innerData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[380px] sm:h-[420px] text-sm" style={{ color: "var(--text-muted)" }}>
        {t("dashboard.noData")}
      </div>
    );
  }

  const hoveredCat = hovered?.cat ?? null;

  return (
    <div className="relative h-[380px] sm:h-[420px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* Inner ring — categories */}
          <Pie
            data={innerData}
            cx="50%" cy="50%"
            innerRadius={75} outerRadius={125}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
            isAnimationActive={true}
            animationDuration={600}
            onMouseEnter={(_, i) => setHovered(innerData[i])}
            onMouseLeave={() => setHovered(null)}
          >
            {innerData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.fill}
                style={{
                  opacity: hoveredCat && hoveredCat !== entry.cat ? 0.25 : 1,
                  transition: "opacity 0.15s",
                  cursor: "pointer",
                  filter: hoveredCat === entry.cat ? `drop-shadow(0 0 8px ${entry.fill}88)` : "none",
                }}
              />
            ))}
          </Pie>

          {/* Outer ring — status per category */}
          <Pie
            data={outerData}
            cx="50%" cy="50%"
            innerRadius={135} outerRadius={180}
            paddingAngle={1}
            dataKey="value"
            stroke="none"
            isAnimationActive={true}
            animationBegin={150}
            animationDuration={600}
            onMouseEnter={(_, i) => setHovered(outerData[i])}
            onMouseLeave={() => setHovered(null)}
          >
            {outerData.map((entry, i) => {
              const dimmed = hoveredCat && hoveredCat !== entry.cat;
              const highlighted = hovered?.type === "outer" && hovered.cat === entry.cat && hovered.status === entry.status;
              return (
                <Cell
                  key={i}
                  fill={entry.fill}
                  style={{
                    opacity: dimmed ? 0.15 : highlighted ? 1 : 0.85,
                    transition: "opacity 0.15s",
                    cursor: "pointer",
                    filter: highlighted ? `drop-shadow(0 0 6px ${entry.fill}aa)` : "none",
                  }}
                />
              );
            })}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Center overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {hovered === null ? (
          <div className="text-center">
            <div className="text-5xl font-bold leading-none tracking-tight" style={{ color: "var(--text-default)" }}>
              {total}
            </div>
            <div className="text-[10px] uppercase tracking-widest mt-1.5" style={{ color: "var(--text-muted)" }}>
              {t("dashboard.totalAssets")}
            </div>
          </div>
        ) : hovered.type === "inner" ? (
          <div className="text-center">
            <div className="text-3xl leading-none">{hovered.emoji}</div>
            <div className="text-sm font-bold mt-1.5 leading-tight" style={{ color: "var(--text-default)" }}>
              {hovered.label}
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: hovered.fill }}>
              {hovered.value}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              {total > 0 ? Math.round((hovered.value / total) * 100) : 0}%
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: hovered.catColor }}>
              {emojiFor(hovered.cat)} {labelFor(hovered.cat)}
            </div>
            <div className="text-sm font-bold mt-0.5" style={{ color: hovered.fill }}>
              {t(`status.${hovered.status}`)}
            </div>
            <div className="text-3xl font-bold leading-tight mt-0.5" style={{ color: "var(--text-default)" }}>
              {hovered.value}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              {total > 0 ? Math.round((hovered.value / total) * 100) : 0}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
