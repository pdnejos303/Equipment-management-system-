// Path: src/app/(features)/reports/ReportsClient.tsx
"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useCategories } from "@/lib/useCategories";
import { formatMoney } from "@/lib/utils";
import { ExportButtons } from "@/components/ExportButtons";
import { AIInsights } from "@/components/AIInsights";
import { BarChart3, TrendingDown, Package, ChevronDown, ChevronRight, ClipboardCheck, Loader2, Filter } from "lucide-react";
import { CategoryBarList } from "@/components/charts/CategoryBarList";
import { ReportsFilters, type ReportFilters } from "./ReportsFilters";

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
  locations: string[];
  filters: ReportFilters;
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
  const { totalAssets, totalOriginal, totalRepair, byStatus, byCategory, assigned, locations, filters } = data;

  const hasFilters = !!(filters.asOf || filters.category || filters.status || filters.location);
  const activeFilterCount =
    (filters.asOf ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.location ? 1 : 0);
  const exportParams: Record<string, string> = {};
  if (filters.asOf) exportParams.asOf = filters.asOf;
  if (filters.category) exportParams.category = filters.category;
  if (filters.status) exportParams.status = filters.status;
  if (filters.location) exportParams.location = filters.location;

  const [filtersOpen, setFiltersOpen] = useState(hasFilters);
  const [auditLoading, setAuditLoading] = useState(false);
  const downloadAudit = async () => {
    if (auditLoading) return;
    setAuditLoading(true);
    try {
      const qs = new URLSearchParams({ ...exportParams, lang: locale, pdf: "1" }).toString();
      const res = await fetch(`/api/export/audit?${qs}`);
      if (!res.ok) throw new Error(`Audit PDF failed (${res.status})`);
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `audit_${new Date().toISOString().slice(0, 10)}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Audit PDF export failed.");
    } finally {
      setAuditLoading(false);
    }
  };

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
      color: "text-green-400",
      borderColor: "border-t-green-500",
      icon: Package,
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
      <div className="flex items-center justify-between mb-6 animate-fade-in flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("reportPage.title")}</h1>
          {filters.asOf && (
            <p className="text-xs text-gray-500 mt-1 font-mono">
              {t("reportPage.asOfDate")}: {filters.asOf}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFiltersOpen(o => !o)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-all duration-200 ${
              filtersOpen || hasFilters
                ? "border-brand-500/40 text-brand-400 bg-brand-500/10"
                : "border-[var(--border)] hover:text-brand-400 hover:bg-brand-500/5"
            }`}
            style={!filtersOpen && !hasFilters ? { color: "var(--text-muted)", background: "var(--surface-hover)" } : undefined}
            aria-expanded={filtersOpen}
            title={t("reportPage.filters")}
          >
            <Filter size={14} />
            <span className="font-medium">
              {activeFilterCount > 0
                ? t("reportPage.activeFilters", activeFilterCount)
                : t("reportPage.filters")}
            </span>
          </button>
          <button
            onClick={downloadAudit}
            disabled={auditLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] hover:text-amber-400 hover:bg-amber-500/5 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
            style={{ color: "var(--text-muted)", background: "var(--surface-hover)" }}
            title={t("reportPage.auditChecklist")}
          >
            {auditLoading ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
            <span className="font-medium">{t("reportPage.auditChecklist")}</span>
          </button>
          <ExportButtons extraParams={exportParams} />
        </div>
      </div>

      {filtersOpen && (
        <ReportsFilters filters={filters} locations={locations} />
      )}

      {hasFilters && (
        <p className="text-xs text-gray-500 mb-3 animate-fade-in">
          {t("reportPage.filtered", totalAssets)}
        </p>
      )}

      <CollapsibleSection
        title={t("reportPage.kpiSummary")}
        defaultOpen={false}
        summary={
          <div className="flex items-center gap-3 text-xs whitespace-nowrap overflow-hidden">
            <span className="text-brand-500 font-mono font-bold">{totalAssets}</span>
            <span className="text-gray-600">·</span>
            <span className="font-mono text-green-400 font-bold">{t("common.baht")}{formatMoney(totalOriginal, locale)}</span>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-stagger">
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
      </CollapsibleSection>

      <div className="h-6" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-stagger">
        {/* Category Sunburst */}
        <CollapsibleSection title={t("reportPage.byCategoryTitle")}>
          <CategoryBarList />
        </CollapsibleSection>

        {/* Category Value Breakdown */}
        <CollapsibleSection title={t("reportPage.categoryValueTitle")} defaultOpen={true}>
          {Object.keys(byCategory).length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
              {t("reportPage.noData")}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(byCategory)
                .filter(([, d]) => d.original > 0)
                .sort(([, a], [, b]) => b.original - a.original)
                .slice(0, 10)
                .map(([cat, d]) => {
                  const pct = totalOriginal > 0 ? Math.round((d.original / totalOriginal) * 100) : 0;
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
                            {t("common.baht")}{formatMoney(Math.round(d.original), locale)}
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
            <span className="text-gray-500">{t("reportPage.totalPurchase")}</span>
            <span className="text-green-400 font-bold font-mono">
              {t("common.baht")}{formatMoney(totalOriginal, locale)}
            </span>
          </div>
        </CollapsibleSection>

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

        {/* AI Insights */}
        <AIInsights />
      </div>
    </div>
  );
}
