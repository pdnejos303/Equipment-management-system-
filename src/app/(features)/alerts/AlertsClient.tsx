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
  ShieldX,
  Wrench,
  Hourglass,
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
type TypeTab = "all" | Alert["type"];

const TYPE_META: Record<Alert["type"], { labelKey: string; color: string; rgb: string; Icon: typeof AlertCircle }> = {
  warranty:    { labelKey: "alertPage.typeWarranty",   color: "#ef4444", rgb: "239 68 68",  Icon: ShieldX },
  end_of_life: { labelKey: "alertPage.typeEndOfLife",  color: "#d97706", rgb: "245 158 11", Icon: Hourglass },
  maintenance: { labelKey: "alertPage.typeMaintenance",color: "#2563eb", rgb: "59 130 246", Icon: Wrench },
};
const TYPE_ORDER: Alert["type"][] = ["warranty", "end_of_life", "maintenance"];

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

  const typeCounts: Record<Alert["type"], number> = {
    warranty:    alerts.filter((a) => a.type === "warranty").length,
    end_of_life: alerts.filter((a) => a.type === "end_of_life").length,
    maintenance: alerts.filter((a) => a.type === "maintenance").length,
  };
  const firstNonEmpty = TYPE_ORDER.find((tp) => typeCounts[tp] > 0);

  const [tab, setTab] = useState<TypeTab>(firstNonEmpty ?? "all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
      if (tab !== "all" && a.type !== tab) return false;
      if (q && !(`${a.assetCode} ${a.assetName}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [alerts, tab, query]);

  const groups = useMemo(() => groupByAsset(filtered), [filtered]);
  const { items: pagedGroups, total: groupsTotal } = usePagination(groups, 10);

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
    setTab("all");
    resetPage();
  };

  const filtersActive = query !== "" || tab !== "all";

  const tabs: { key: TypeTab; labelKey: string; count: number; color?: string; rgb?: string }[] = [
    ...TYPE_ORDER.map((tp) => ({
      key: tp,
      labelKey: TYPE_META[tp].labelKey,
      count: typeCounts[tp],
      color: TYPE_META[tp].color,
      rgb: TYPE_META[tp].rgb,
    })),
    { key: "all" as const, labelKey: "alertPage.tabAll", count: alerts.length, color: "rgb(var(--brand-rgb))", rgb: "var(--brand-rgb)" },
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
        {TYPE_ORDER.map((tp) => {
          const meta = TYPE_META[tp];
          const Icon = meta.Icon;
          const count = typeCounts[tp];
          return (
            <button
              key={tp}
              onClick={() => { setTab(tp); resetPage(); }}
              className="card stat-card border-t-2 pt-4 text-left transition-all hover:brightness-110"
              style={{ borderTopColor: meta.color }}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs uppercase" style={{ color: "var(--text-muted)" }}>{t(meta.labelKey)}</p>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `rgb(${meta.rgb} / 0.10)` }}
                >
                  <Icon size={16} style={{ color: meta.color }} />
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color: meta.color }}>{count}</p>
            </button>
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
            <div
              className="inline-flex items-center gap-1 overflow-x-auto scrollbar-none p-1 rounded-xl border border-border/60 self-start"
              style={{ background: "var(--surface-hover)" }}
            >
              {tabs.map(({ key, labelKey, count, color, rgb }) => {
                const isActive = tab === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setTab(key); resetPage(); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap min-h-[32px]"
                    style={
                      isActive
                        ? { background: `rgb(${rgb} / 0.15)`, color }
                        : { color: "var(--text-muted)" }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = "var(--text-default)";
                        e.currentTarget.style.background = "var(--surface-active)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = "var(--text-muted)";
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {t(labelKey)}
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums"
                      style={
                        isActive
                          ? { background: `rgb(${rgb} / 0.28)`, color: "inherit" }
                          : { background: "var(--surface-active)", color: "var(--text-subtle)" }
                      }
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative">
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
                {query ? t("alertPage.noMatch") : t("alertPage.noneInTab")}
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
                        isMulti ? toggleExpanded(g.assetCode) : router.push(`/assets/${g.assetCode}?from=${encodeURIComponent("/alerts")}`)
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
                              .map((a) => t(TYPE_META[a.type].labelKey))
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
                              onClick={() => router.push(`/assets/${a.assetCode}?from=${encodeURIComponent("/alerts")}`)}
                              onMouseEnter={() => router.prefetch(`/assets/${a.assetCode}`)}
                            >
                              <SubIcon size={14} className={`${textColor[a.severity]} mt-0.5 flex-shrink-0`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span
                                    className="text-[10px] font-bold uppercase tracking-wide"
                                    style={{ color: TYPE_META[a.type].color }}
                                  >
                                    {t(TYPE_META[a.type].labelKey)}
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
              <Pagination total={groupsTotal} pageSize={10} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
