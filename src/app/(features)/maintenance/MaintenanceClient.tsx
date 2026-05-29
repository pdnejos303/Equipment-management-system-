// Path: src/app/(features)/maintenance/MaintenanceClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useRole } from "@/lib/useRole";
import { showSuccess, showError, showConfirm } from "@/lib/swal";
import { formatMoney, formatDate, cn } from "@/lib/utils";
import { MaintenanceActions } from "@/components/PageActions";
import { AIPredictMaintenance } from "@/components/AIPredictMaintenance";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/Pagination";
import { usePagination } from "@/lib/usePagination";
import Link from "next/link";
import { Calendar, ChevronDown, ChevronRight, Trash2 } from "lucide-react";

interface Asset {
  id: string;
  code: string;
  name: string;
  status: string;
  category: string;
}

interface MaintRecord {
  id: string;
  description: string;
  vendor: string | null;
  cost: number;
  date: string;
  type: string;
  asset: { code: string; name: string; purchasePrice: number };
}

const MAINT_TYPE_BADGE: Record<string, { color: string; bg: string }> = {
  REPAIR:      { color: "text-red-400",   bg: "bg-red-500/10"   },
  PREVENTIVE:  { color: "text-blue-400",  bg: "bg-blue-500/10"  },
  INSPECTION:  { color: "text-green-400", bg: "bg-green-500/10" },
};

interface UpcomingAsset {
  code: string;
  name: string;
  nextMaintenance: string;
}

interface MaintenanceData {
  records: MaintRecord[];
  assets: Asset[];
  upcoming: UpcomingAsset[];
  totalCost: number;
  byAsset: Record<string, MaintRecord[]>;
}

export function MaintenanceClient({ data }: { data: MaintenanceData }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { isAdmin } = useRole();
  const { records, assets, upcoming, totalCost, byAsset } = data;
  const byAssetEntries = Object.entries(byAsset);
  const { items: pagedEntries, total: groupsTotal } = usePagination(byAssetEntries, 10);
  // collapsed[code] = true means that asset group is collapsed
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toggle = (code: string) => setCollapsed(prev => ({ ...prev, [code]: !prev[code] }));

  const handleDelete = async (r: MaintRecord) => {
    const confirmed = await showConfirm({
      title: t("maintPage.deleteTitle"),
      text: t("maintPage.deleteMsg", r.description),
      confirmText: t("common.delete"),
      cancelText: t("confirm.cancel"),
      danger: true,
    });
    if (!confirmed) return;

    setDeletingId(r.id);
    try {
      const res = await fetch(`/api/maintenance/${r.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      await showSuccess(t("maintPage.deleted"));
      router.refresh();
    } catch {
      showError(t("maintPage.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="page-enter">
      <PageHeader
        title={t("maintPage.title")}
        actions={<MaintenanceActions assets={assets} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 animate-stagger">
        <div className="card stat-card"><p className="text-xs text-gray-500 uppercase">{t("maintPage.totalRepairs")}</p><p className="text-2xl font-bold text-brand-500">{records.length} {t("maintPage.times")}</p></div>
        <div className="card stat-card"><p className="text-xs text-gray-500 uppercase">{t("maintPage.totalCost")}</p><p className="text-2xl font-bold text-red-400">{t("common.baht")}{formatMoney(totalCost, locale)}</p></div>
        <div className="card stat-card"><p className="text-xs text-gray-500 uppercase">{t("maintPage.upcoming30")}</p><p className="text-2xl font-bold text-blue-400">{upcoming.length}</p></div>
      </div>

      {/* AI Predictive Maintenance */}
      <div className="mb-6">
        <AIPredictMaintenance />
      </div>

      {upcoming.length > 0 && (
        <div className="card mb-6 animate-fade-in-up">
          <h2 className="font-semibold text-blue-400 mb-3">📅 {t("maintPage.upcomingTitle")}</h2>
          {upcoming.map((a) => (
            <div key={a.code} className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
              <div><span className="font-mono text-brand-500">{a.code}</span> <span style={{ color: "var(--text-muted)" }}>{a.name}</span></div>
              <span className="text-gray-400">{formatDate(a.nextMaintenance, locale)}</span>
            </div>
          ))}
        </div>
      )}

      {pagedEntries.map(([code, recs]) => {
        const asset = recs[0].asset;
        const total = recs.reduce((s, r) => s + r.cost, 0);
        const pp = asset.purchasePrice;
        const ratio = pp > 0 ? Math.round((total / pp) * 100) : 0;
        const isOpen = !collapsed[code];
        return (
          <div key={code} className={cn("mb-3 animate-fade-in border border-border rounded-xl bg-surface transition-all duration-200", isOpen ? "p-5" : "px-4 py-3")}>
            {/* Collapsible header */}
            <button
              onClick={() => toggle(code)}
              className="w-full flex items-center justify-between gap-3 text-left hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-2">
                {isOpen
                  ? <ChevronDown size={15} className="text-gray-500 flex-shrink-0" />
                  : <ChevronRight size={15} className="text-gray-500 flex-shrink-0" />
                }
                <span className="font-mono text-brand-500 text-sm">{code}</span>
                <span className="font-semibold" style={{ color: "var(--text-default)" }}>{asset.name}</span>
                <span className="text-xs text-gray-600">({recs.length})</span>
              </div>
              <div className="text-sm text-right flex-shrink-0">
                <span className={`font-mono font-semibold ${ratio > 50 ? "text-red-400" : ""}`} style={ratio <= 50 ? { color: "var(--text-muted)" } : undefined}>{t("common.baht")}{formatMoney(total, locale)}</span>
                <span className={`ml-2 text-xs ${ratio > 50 ? "text-red-400" : "text-gray-500"}`}>({ratio}%)</span>
              </div>
            </button>

            {/* Records — collapse/expand */}
            {isOpen && (
              <div className="mt-3">
                {recs.map((r) => {
                  const typeBadge = MAINT_TYPE_BADGE[r.type] ?? MAINT_TYPE_BADGE.REPAIR;
                  return (
                    <div key={r.id} className="flex justify-between items-start py-1.5 border-t border-border text-sm gap-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className={cn("badge mt-0.5 flex-shrink-0 text-[10px]", typeBadge.bg, typeBadge.color)}>{t(`maintType.${r.type}`)}</span>
                        <div className="min-w-0">
                          <span style={{ color: "var(--text-muted)" }}>{r.description}</span>
                          {r.vendor && <span className="text-gray-500 text-xs ml-2">{r.vendor}</span>}
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap flex-shrink-0 flex items-center gap-2">
                        <span className="text-gray-500">{formatDate(r.date, locale)}</span>
                        <span className="font-mono text-brand-500">{t("common.baht")}{formatMoney(r.cost, locale)}</span>
                        <Link
                          href={`/calendar?date=${new Date(r.date).toISOString().slice(0, 10)}`}
                          title={t("common.viewInCalendar")}
                          className="btn-icon"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Calendar size={13} />
                        </Link>
                        {isAdmin && (
                          <button
                            type="button"
                            title={t("common.delete")}
                            onClick={(e) => { e.stopPropagation(); handleDelete(r); }}
                            disabled={deletingId === r.id}
                            className="btn-icon text-red-400 hover:text-red-300 disabled:opacity-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <Pagination total={groupsTotal} pageSize={10} />

      {records.length === 0 && <p className="text-gray-500 text-center py-12">{t("maintPage.noHistory")}</p>}
    </div>
  );
}
