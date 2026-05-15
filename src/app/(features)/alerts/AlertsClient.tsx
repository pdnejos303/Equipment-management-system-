// Path: src/app/(features)/alerts/AlertsClient.tsx
"use client";

import { useI18n } from "@/lib/i18n";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { Alert } from "@/lib/alerts";
import { Pagination } from "@/components/Pagination";
import { usePagination } from "@/lib/usePagination";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  Send,
  Search,
  X,
} from "lucide-react";
import { swal } from "@/lib/swal";

const colorMap: Record<string, string> = {
  danger: "border-red-500/30 bg-red-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  info: "border-blue-500/30 bg-blue-500/5",
};
const textColor: Record<string, string> = {
  danger: "text-red-400",
  warning: "text-amber-400",
  info: "text-blue-400",
};
const leftBorder: Record<string, string> = {
  danger: "border-l-red-500",
  warning: "border-l-amber-500",
  info: "border-l-blue-500",
};
const SeverityIcon: Record<string, typeof AlertCircle> = {
  danger: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};
const cardBorderTop: Record<string, string> = {
  danger: "border-t-red-500",
  warning: "border-t-amber-500",
  info: "border-t-blue-500",
};
const cardIconBg: Record<string, string> = {
  danger: "bg-red-500/10",
  warning: "bg-amber-500/10",
  info: "bg-blue-500/10",
};

type SeverityTab = "danger" | "warning" | "info" | "all";
type TypeFilter = "all" | Alert["type"];

type AssetGroup = {
  assetCode: string;
  assetName: string;
  alerts: Alert[];
  topSeverity: Alert["severity"];
};

const severityRank: Record<Alert["severity"], number> = {
  danger: 0,
  warning: 1,
  info: 2,
};

function groupByAsset(alerts: Alert[]): AssetGroup[] {
  const map = new Map<string, AssetGroup>();
  for (const a of alerts) {
    const g = map.get(a.assetCode);
    if (g) {
      g.alerts.push(a);
      if (severityRank[a.severity] < severityRank[g.topSeverity]) {
        g.topSeverity = a.severity;
      }
    } else {
      map.set(a.assetCode, {
        assetCode: a.assetCode,
        assetName: a.assetName,
        alerts: [a],
        topSeverity: a.severity,
      });
    }
  }
  return Array.from(map.values()).sort((x, y) => {
    const r = severityRank[x.topSeverity] - severityRank[y.topSeverity];
    if (r !== 0) return r;
    const dx = Math.min(...x.alerts.map((a) => a.daysRemaining));
    const dy = Math.min(...y.alerts.map((a) => a.daysRemaining));
    return dx - dy;
  });
}

export function AlertsClient({ alerts }: { alerts: Alert[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sending, setSending] = useState(false);

  // When any filter changes, drop the ?page= param so we don't land on an empty page
  const resetPage = () => {
    if (!searchParams.has("page")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const dangerCount = alerts.filter((a) => a.severity === "danger").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;
  const infoCount = alerts.filter((a) => a.severity === "info").length;

  const [tab, setTab] = useState<SeverityTab>(dangerCount > 0 ? "danger" : "all");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const severityKey: Record<string, string> = {
    danger: "alertPage.urgent",
    warning: "alertPage.warning",
    info: "alertPage.info",
  };

  async function handleSendTestEmail() {
    setSending(true);
    try {
      const res = await fetch("/api/alerts/send-test", { method: "POST" });
      const data = await res.json();
      if (data.ok && data.sent) {
        swal.fire({ icon: "success", title: t("alertPage.sentTitle"), text: t("alertPage.sentMsg", data.alertCount) });
      } else if (data.ok && !data.sent) {
        swal.fire({ icon: "info", title: t("alertPage.noAlertsTitle"), text: t("alertPage.noAlertsMsg") });
      } else {
        swal.fire({ icon: "error", title: t("alertPage.errorTitle"), text: data.error || t("alertPage.errorEnvMsg") });
      }
    } catch {
      swal.fire({ icon: "error", title: t("alertPage.errorTitle"), text: t("alertPage.errorConnectMsg") });
    } finally {
      setSending(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return alerts.filter((a) => {
      if (tab !== "all" && a.severity !== tab) return false;
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (q && !(`${a.assetCode} ${a.assetName}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [alerts, tab, typeFilter, query]);

  const groups = useMemo(() => groupByAsset(filtered), [filtered]);
  const { items: pagedGroups, total: groupsTotal } = usePagination(groups, 15);

  const toggleExpanded = (code: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const clearFilters = () => {
    setQuery("");
    setTypeFilter("all");
    setTab("all");
    resetPage();
  };

  const filtersActive = query !== "" || typeFilter !== "all" || tab !== "all";

  const statCards = [
    { key: "danger", count: dangerCount, labelKey: "alertPage.urgent" },
    { key: "warning", count: warningCount, labelKey: "alertPage.warning" },
    { key: "info", count: infoCount, labelKey: "alertPage.info" },
  ];

  const tabs: { key: SeverityTab; labelKey: string; count: number }[] = [
    { key: "danger", labelKey: "alertPage.urgent", count: dangerCount },
    { key: "warning", labelKey: "alertPage.warning", count: warningCount },
    { key: "info", labelKey: "alertPage.info", count: infoCount },
    { key: "all", labelKey: "alertPage.tabAll", count: alerts.length },
  ];

  const typeOptions: { value: TypeFilter; labelKey: string }[] = [
    { value: "all", labelKey: "alertPage.filterAllTypes" },
    { value: "warranty", labelKey: "alertPage.typeWarranty" },
    { value: "maintenance", labelKey: "alertPage.typeMaintenance" },
    { value: "end_of_life", labelKey: "alertPage.typeEndOfLife" },
  ];

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold">{t("alertPage.title")}</h1>
        <button
          onClick={handleSendTestEmail}
          disabled={sending}
          className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <Send size={14} />
          {sending ? t("alertPage.sending") : t("alertPage.sendTest")}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 animate-stagger">
        {statCards.map(({ key, count, labelKey }) => {
          const Icon = SeverityIcon[key];
          return (
            <div key={key} className={`card stat-card border-t-2 ${cardBorderTop[key]} pt-4`}>
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-gray-500 uppercase">{t(labelKey)}</p>
                <div className={`w-8 h-8 rounded-lg ${cardIconBg[key]} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} className={textColor[key]} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${textColor[key]}`}>{count}</p>
            </div>
          );
        })}
      </div>

      {alerts.length === 0 ? (
        <div className="card text-center py-16 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-400" />
          </div>
          <p className="text-lg font-semibold mb-1" style={{ color: "var(--text-muted)" }}>{t("alertPage.noAlerts")}</p>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="flex flex-col gap-3 mb-4 animate-fade-in">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {tabs.map(({ key, labelKey, count }) => {
                const isActive = tab === key;
                const activeColor =
                  key === "danger"
                    ? "bg-red-500/10 text-red-300 border-red-500/40"
                    : key === "warning"
                    ? "bg-amber-500/10 text-amber-300 border-amber-500/40"
                    : key === "info"
                    ? "bg-blue-500/10 text-blue-300 border-blue-500/40"
                    : "bg-brand-500/10 text-brand-400 border-brand-500/40";
                return (
                  <button
                    key={key}
                    onClick={() => { setTab(key); resetPage(); }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all whitespace-nowrap ${
                      isActive
                        ? activeColor
                        : "bg-transparent text-gray-400 border-white/5 hover:border-white/15 hover:text-gray-200"
                    }`}
                  >
                    {t(labelKey)}
                    <span
                      className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                        isActive ? "bg-black/30" : "bg-white/5 text-gray-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search + Type filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); resetPage(); }}
                  placeholder={t("alertPage.searchPlaceholder")}
                  className="input w-full pl-9 pr-9"
                />
                {query && (
                  <button
                    onClick={() => { setQuery(""); resetPage(); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    aria-label="clear"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value as TypeFilter); resetPage(); }}
                className="input sm:w-52"
              >
                {typeOptions.map(({ value, labelKey }) => (
                  <option key={value} value={value}>
                    {t(labelKey)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results count + clear */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <span>{t("alertPage.itemsCount", filtered.length)}</span>
            {filtersActive && (
              <button onClick={clearFilters} className="hover:text-gray-300 underline-offset-2 hover:underline">
                {t("alertPage.clearFilters")}
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="card text-center py-12 animate-fade-in">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {query || typeFilter !== "all" ? t("alertPage.noMatch") : t("alertPage.noneInTab")}
              </p>
              {filtersActive && (
                <button
                  onClick={clearFilters}
                  className="mt-3 text-xs text-brand-500 hover:text-brand-400 underline-offset-2 hover:underline"
                >
                  {t("alertPage.clearFilters")}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 animate-list">
              {pagedGroups.map((g) => {
                const isMulti = g.alerts.length > 1;
                const isOpen = expanded.has(g.assetCode);
                const top = g.alerts[0];
                const Icon = SeverityIcon[g.topSeverity] || Info;
                const soonest = Math.min(...g.alerts.map((a) => a.daysRemaining));

                return (
                  <div
                    key={g.assetCode}
                    className={`rounded-xl border ${colorMap[g.topSeverity]} border-l-4 ${leftBorder[g.topSeverity]} overflow-hidden`}
                  >
                    {/* Header row */}
                    <div
                      className="flex items-start gap-0 cursor-pointer hover:brightness-110 transition-all"
                      onClick={() =>
                        isMulti ? toggleExpanded(g.assetCode) : router.push(`/assets/${g.assetCode}`)
                      }
                      onMouseEnter={() => { if (!isMulti) router.prefetch(`/assets/${g.assetCode}`); }}
                    >
                      <div className="flex items-start justify-center pt-4 pl-4 pr-3 flex-shrink-0">
                        <Icon size={18} className={textColor[g.topSeverity]} />
                      </div>

                      <div className="flex-1 py-3.5 pr-4">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono text-[11px] font-bold text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                              {g.assetCode}
                            </span>
                            <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                              {g.assetName}
                            </span>
                            {isMulti && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${colorMap[g.topSeverity]} ${textColor[g.topSeverity]} border ${
                                  g.topSeverity === "danger"
                                    ? "border-red-500/40"
                                    : g.topSeverity === "warning"
                                    ? "border-amber-500/40"
                                    : "border-blue-500/40"
                                }`}
                              >
                                {t("alertPage.issuesCount", g.alerts.length)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {soonest < 0
                                ? t("alertPage.overdue", Math.abs(soonest))
                                : t("alertPage.daysLeft", soonest)}
                            </span>
                            {isMulti ? (
                              <ChevronDown
                                size={14}
                                className={`text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                              />
                            ) : (
                              <ChevronRight size={14} className="text-gray-600" />
                            )}
                          </div>
                        </div>
                        {!isMulti && (
                          <p className={`text-sm ${textColor[top.severity]}`}>{top.message}</p>
                        )}
                        {isMulti && !isOpen && (
                          <p className="text-sm text-gray-500">
                            {g.alerts
                              .map((a) => t(severityKey[a.severity]))
                              .filter((v, i, arr) => arr.indexOf(v) === i)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Expanded sub-alerts */}
                    {isMulti && isOpen && (
                      <div className="border-t border-white/5 bg-black/20">
                        {g.alerts.map((a, i) => {
                          const SubIcon = SeverityIcon[a.severity] || Info;
                          return (
                            <div
                              key={i}
                              className="flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/5 cursor-pointer transition-colors"
                              onClick={() => router.push(`/assets/${a.assetCode}`)}
                              onMouseEnter={() => router.prefetch(`/assets/${a.assetCode}`)}
                            >
                              <SubIcon size={14} className={`${textColor[a.severity]} mt-0.5 flex-shrink-0`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-wide ${textColor[a.severity]}`}
                                  >
                                    {t(severityKey[a.severity])}
                                  </span>
                                  <span className="text-[10px] text-gray-600">·</span>
                                  <span className="text-[11px] text-gray-500 whitespace-nowrap">
                                    {a.daysRemaining < 0
                                      ? t("alertPage.overdue", Math.abs(a.daysRemaining))
                                      : t("alertPage.daysLeft", a.daysRemaining)}
                                  </span>
                                </div>
                                <p className={`text-sm ${textColor[a.severity]}`}>{a.message}</p>
                              </div>
                              <ChevronRight size={12} className="text-gray-600 mt-1 flex-shrink-0" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              <Pagination total={groupsTotal} pageSize={15} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
