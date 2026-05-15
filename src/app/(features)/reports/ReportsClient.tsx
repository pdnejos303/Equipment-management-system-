// Path: src/app/(features)/reports/ReportsClient.tsx
"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useCategories } from "@/lib/useCategories";
import { formatMoney } from "@/lib/utils";
import { ExportButtons } from "@/components/ExportButtons";
import { AIInsights } from "@/components/AIInsights";
import { BarChart3, TrendingUp, TrendingDown, Package, ChevronDown, ChevronRight } from "lucide-react";

function CollapsibleSection({
  title,
  summary,
  children,
  defaultOpen = true,
}: {
  title: React.ReactNode;
  summary?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border border-border rounded-xl bg-surface transition-all duration-200 ${open ? "p-5" : "px-4 py-3"}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
      >
        {open
          ? <ChevronDown size={15} className="text-gray-500 flex-shrink-0" />
          : <ChevronRight size={15} className="text-gray-500 flex-shrink-0" />
        }
        <span className="font-semibold flex-1" style={{ color: "var(--text-default)" }}>{title}</span>
        {!open && summary && (
          <span className="animate-fade-in">{summary}</span>
        )}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}


interface CategoryData {
  count: number;
  original: number;
  current: number;
  repair: number;
}

interface ReportsData {
  totalAssets: number;
  totalOriginal: number;
  totalCurrent: number;
  totalRepair: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, CategoryData>;
  assigned: number;
}

const STATUS_COLORS: Record<string, { bar: string; text: string }> = {
  ACTIVE: { bar: "bg-green-500", text: "text-green-400" },
  AVAILABLE: { bar: "bg-blue-500", text: "text-blue-400" },
  MAINTENANCE: { bar: "bg-amber-500", text: "text-amber-400" },
  RETIRED: { bar: "bg-red-500", text: "text-red-400" },
};

export function ReportsClient({ data }: { data: ReportsData }) {
  const { t, locale } = useI18n();
  const { labelFor, emojiFor } = useCategories();
  const { totalAssets, totalOriginal, totalCurrent, totalRepair, byStatus, byCategory, assigned } = data;

  const statCards = [
    {
      label: t("reportPage.totalAssets"),
      value: String(totalAssets),
      color: "text-brand-500",
      borderColor: "border-t-brand-500",
      icon: BarChart3,
      iconColor: "text-brand-500",
      bgIcon: "bg-brand-500/10",
    },
    {
      label: t("reportPage.purchaseValue"),
      value: `${t("common.baht")}${formatMoney(totalOriginal, locale)}`,
      color: "text-[var(--text-default)]",
      borderColor: "border-t-gray-400",
      icon: Package,
      iconColor: "text-gray-400",
      bgIcon: "bg-gray-500/10",
    },
    {
      label: t("reportPage.currentValue"),
      value: `${t("common.baht")}${formatMoney(Math.round(totalCurrent), locale)}`,
      color: "text-green-400",
      borderColor: "border-t-green-500",
      icon: TrendingUp,
      iconColor: "text-green-400",
      bgIcon: "bg-green-500/10",
    },
    {
      label: t("reportPage.totalRepair"),
      value: `${t("common.baht")}${formatMoney(totalRepair, locale)}`,
      color: "text-red-400",
      borderColor: "border-t-red-500",
      icon: TrendingDown,
      iconColor: "text-red-400",
      bgIcon: "bg-red-500/10",
    },
  ];

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold">{t("reportPage.title")}</h1>
        <ExportButtons />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 animate-stagger">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`card stat-card border-t-2 ${card.borderColor} pt-4`}>
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-gray-500 uppercase leading-tight">{card.label}</p>
                <div className={`w-8 h-8 rounded-lg ${card.bgIcon} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} className={card.iconColor} />
                </div>
              </div>
              <p className={`text-2xl font-bold font-mono ${card.color}`}>{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-stagger">
        {/* By Status */}
        <CollapsibleSection title={t("reportPage.statusTitle")}>
          <div className="space-y-4">
            {Object.entries(byStatus).map(([status, count]) => {
              const pct = totalAssets > 0 ? Math.round((count / totalAssets) * 100) : 0;
              const sc = STATUS_COLORS[status] || { bar: "bg-gray-500", text: "text-gray-400" };
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-medium ${sc.text}`}>{t(`status.${status}`)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{pct}%</span>
                      <span className={`text-sm font-bold ${sc.text}`}>{count}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-surface-dark rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${sc.bar} animate-progress transition-all`}
                      style={{ width: `${pct}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-sm">
            <span className="text-gray-500">{t("reportPage.assigned")}</span>
            <span className="text-brand-500 font-bold">{assigned} / {totalAssets}</span>
          </div>
        </CollapsibleSection>

        {/* By Category */}
        <CollapsibleSection title={t("reportPage.byCategoryTitle")}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-xs text-gray-500 uppercase">{t("reportPage.type")}</th>
                  <th className="text-right py-2 px-2 text-xs text-gray-500 uppercase">{t("reportPage.count")}</th>
                  <th className="text-right py-2 px-2 text-xs text-gray-500 uppercase">{t("reportPage.currentVal")}</th>
                  <th className="text-right py-2 px-2 text-xs text-gray-500 uppercase">{t("reportPage.repairCost")}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byCategory).map(([cat, d], idx) => (
                  <tr key={cat} className={`border-b border-border transition-colors ${idx % 2 === 0 ? "" : "bg-surface-dark/40"}`}>
                    <td className="py-2.5 px-2">
                      <span className="inline-flex items-center gap-1.5 bg-surface-dark px-2 py-0.5 rounded-full text-xs" style={{ color: "var(--text-muted)" }}>
                        <span>{emojiFor(cat)}</span>
                        <span>{labelFor(cat)}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-brand-500 font-bold">{d.count}</td>
                    <td className="py-2.5 px-2 text-right font-mono text-green-400 text-xs">{t("common.baht")}{formatMoney(Math.round(d.current), locale)}</td>
                    <td className="py-2.5 px-2 text-right font-mono text-red-400 text-xs">{t("common.baht")}{formatMoney(d.repair, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>

        {/* AI Insights */}
        <AIInsights />

        {/* Category Value Breakdown */}
        <CollapsibleSection title={t("reportPage.categoryValueTitle")} defaultOpen={true}>
          {Object.keys(byCategory).length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
              {t("reportPage.noData")}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(byCategory)
                .filter(([, d]) => d.current > 0)
                .sort(([, a], [, b]) => b.current - a.current)
                .map(([cat, d]) => {
                  const pct = totalCurrent > 0 ? Math.round((d.current / totalCurrent) * 100) : 0;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
                          <span className="text-base leading-none">{emojiFor(cat)}</span>
                          {labelFor(cat)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{pct}%</span>
                          <span className="text-xs font-mono text-green-400">
                            {t("common.baht")}{formatMoney(Math.round(d.current), locale)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-surface-dark rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 animate-progress"
                          style={{ width: `${pct}%` } as React.CSSProperties}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
          <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-sm">
            <span className="text-gray-500">{t("reportPage.totalCurrentShort")}</span>
            <span className="text-green-400 font-bold font-mono">
              {t("common.baht")}{formatMoney(Math.round(totalCurrent), locale)}
            </span>
          </div>
        </CollapsibleSection>

        {/* Depreciation */}
        <div className="lg:col-span-2 animate-fade-in">
          {(() => {
            const remainingPct = totalOriginal > 0 ? Math.round((totalCurrent / totalOriginal) * 100) : 0;
            const deprecPct = 100 - remainingPct;
            const depreciationSummary = (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500">{t("reportPage.remaining")}</span>
                <span className="font-mono font-bold text-green-400">{t("common.baht")}{formatMoney(Math.round(totalCurrent), locale)}</span>
                <span className="text-gray-600">·</span>
                <span className="text-gray-500">{t("reportPage.accDeprec")}</span>
                <span className="font-mono font-bold text-red-400">{deprecPct}%</span>
              </div>
            );
            return (
              <CollapsibleSection
                title={t("reportPage.depreciationTitle")}
                summary={depreciationSummary}
                defaultOpen={true}
              >
                <div className="grid grid-cols-3 gap-6 mb-6">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{t("reportPage.totalPurchase")}</p>
                    <p className="text-xl font-mono font-bold" style={{ color: "var(--text-default)" }}>{t("common.baht")}{formatMoney(totalOriginal, locale)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{t("reportPage.remaining")}</p>
                    <p className="text-xl font-mono font-bold text-green-400">{t("common.baht")}{formatMoney(Math.round(totalCurrent), locale)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{t("reportPage.accDeprec")}</p>
                    <p className="text-xl font-mono font-bold text-red-400">{t("common.baht")}{formatMoney(Math.round(totalOriginal - totalCurrent), locale)}</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>{t("reportPage.remaining")}</span>
                    <span className="font-semibold" style={{ color: "var(--text-muted)" }}>{remainingPct}%</span>
                  </div>
                  <div className="h-3 bg-surface-dark rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full animate-progress"
                      style={{
                        width: `${remainingPct}%`,
                        background: "linear-gradient(90deg, #22c55e, #f59e0b)",
                      } as React.CSSProperties}
                    />
                  </div>
                </div>
              </CollapsibleSection>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
