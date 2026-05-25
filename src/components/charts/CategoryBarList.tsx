"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCategories } from "@/lib/useCategories";

type StatEntry = { category: string; status: string; count: number };

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
      .map(([cat, count]) => ({
        cat,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
    return { rows, total };
  }, [raw]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm" style={{ color: "var(--text-muted)" }}>
        {t("dashboard.noData")}
      </div>
    );
  }

  const maxCount = rows[0]?.count ?? 0;

  return (
    <div className="flex flex-col">
      <div
        className="space-y-3 overflow-y-auto overscroll-contain pr-1 -mr-1"
        style={{ maxHeight: "320px" }}
      >
        {rows.map(({ cat, count, pct }) => {
          const widthPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
                  <span className="text-base leading-none">{emojiFor(cat)}</span>
                  {labelFor(cat)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{pct}%</span>
                  <span className="text-sm font-bold font-mono text-brand-400">{count}</span>
                </div>
              </div>
              <div className="h-1.5 bg-surface-dark rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 animate-progress"
                  style={{ width: `${widthPct}%` } as React.CSSProperties}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-sm">
        <span className="text-gray-500">{t("dashboard.totalAssets")}</span>
        <span className="text-brand-500 font-bold font-mono">{total}</span>
      </div>
    </div>
  );
}
