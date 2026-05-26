// Path: src/app/(features)/in-use/InUseClient.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  LayoutList,
  Users,
  Search,
  X,
  ExternalLink,
  Building2,
  Clock,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { useI18n, type Locale } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/Pagination";
import { usePagination } from "@/lib/usePagination";
import { cn } from "@/lib/utils";

interface InUseItem {
  key: string;
  personName: string;
  department: string | null;
  source: "assignment" | "booking";
  since: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  assetCategory: string;
}

function daysSince(isoDate: string) {
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function SourceBadge({ source, t }: { source: "assignment" | "booking"; t: (k: string) => string }) {
  return source === "assignment" ? (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-500/15 text-green-400">
      {t("inUsePage.sourceAssign")}
    </span>
  ) : (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-400">
      {t("inUsePage.sourceBooking")}
    </span>
  );
}

function DurationChip({ days, t }: { days: number; t: (k: string) => string }) {
  const color = days > 30 ? "text-red-400" : days > 7 ? "text-amber-400" : "text-gray-400";
  return (
    <span className={cn("flex items-center gap-1 text-xs tabular-nums", color)}>
      <Clock size={11} />
      {days} {t("inUsePage.days")}
    </span>
  );
}

interface PersonGroup {
  personName: string;
  department: string | null;
  items: InUseItem[];
  longestDays: number;
}

export function InUseClient({ items }: { items: InUseItem[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"person" | "asset">("person");
  const [search, setSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);

  const resetPage = () => {
    if (!searchParams.has("page")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.personName.toLowerCase().includes(q) ||
        (i.department?.toLowerCase().includes(q) ?? false) ||
        i.assetCode.toLowerCase().includes(q) ||
        i.assetName.toLowerCase().includes(q)
    );
  }, [items, search]);

  const personGroups = useMemo<PersonGroup[]>(() => {
    const map = new Map<string, PersonGroup>();
    for (const item of filtered) {
      const d = daysSince(item.since);
      const existing = map.get(item.personName);
      if (existing) {
        existing.items.push(item);
        if (d > existing.longestDays) existing.longestDays = d;
      } else {
        map.set(item.personName, {
          personName: item.personName,
          department: item.department,
          items: [item],
          longestDays: d,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (b.items.length !== a.items.length) return b.items.length - a.items.length;
      return b.longestDays - a.longestDays;
    });
  }, [filtered]);

  const { items: pagedGroups, total: groupsTotal } = usePagination(personGroups, 12);

  const selectedGroup = useMemo<PersonGroup | undefined>(
    () => (selectedPerson ? personGroups.find((g) => g.personName === selectedPerson) : undefined),
    [personGroups, selectedPerson]
  );

  const uniquePeople = new Set(items.map((i) => i.personName)).size;

  const onSearchChange = (v: string) => {
    setSearch(v);
    setSelectedPerson(null);
    resetPage();
  };

  const onViewChange = (next: "person" | "asset") => {
    setView(next);
    setSelectedPerson(null);
    resetPage();
  };

  return (
    <div className="page-enter">
      <PageHeader title={t("inUsePage.title")} subtitle={t("inUsePage.subtitle")} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6 animate-stagger">
        <div className="card stat-card">
          <p className="text-xs text-gray-500 uppercase">{t("inUsePage.people")}</p>
          <p className="text-2xl font-bold text-brand-500">{uniquePeople}</p>
        </div>
        <div className="card stat-card">
          <p className="text-xs text-gray-500 uppercase">{t("inUsePage.items")}</p>
          <p className="text-2xl font-bold text-green-400">{items.length}</p>
        </div>
      </div>

      {/* Toolbar (hidden in person-detail view) */}
      {!selectedGroup && (
        <div className="flex flex-col sm:flex-row gap-3 mb-5 animate-fade-in-up">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("inUsePage.search")}
              className="input w-full pl-8 pr-8"
            />
            {search && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
            <button
              onClick={() => onViewChange("person")}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
                view === "person"
                  ? "bg-brand-500/10 text-brand-500"
                  : "text-gray-400 hover:text-gray-200 hover:bg-surface-hover"
              )}
            >
              <Users size={14} />
              <span className="hidden sm:inline">{t("inUsePage.byPerson")}</span>
            </button>
            <button
              onClick={() => onViewChange("asset")}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-l border-border",
                view === "asset"
                  ? "bg-brand-500/10 text-brand-500"
                  : "text-gray-400 hover:text-gray-200 hover:bg-surface-hover"
              )}
            >
              <LayoutList size={14} />
              <span className="hidden sm:inline">{t("inUsePage.byAsset")}</span>
            </button>
          </div>
        </div>
      )}

      {/* Empty states */}
      {items.length === 0 && (
        <p className="text-gray-500 text-center py-16">{t("inUsePage.noActive")}</p>
      )}
      {items.length > 0 && filtered.length === 0 && (
        <p className="text-gray-500 text-center py-16">{t("inUsePage.noResults")}</p>
      )}

      {/* === BY PERSON: detail view === */}
      {view === "person" && selectedGroup && (
        <div className="animate-fade-in-up">
          <button
            onClick={() => setSelectedPerson(null)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 mb-4 transition-colors"
          >
            <ArrowLeft size={14} />
            {t("inUsePage.back")}
          </button>

          <div className="card">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 font-bold text-base flex-shrink-0">
                  {selectedGroup.personName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-lg truncate">{selectedGroup.personName}</p>
                  {selectedGroup.department ? (
                    <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                      <Building2 size={10} />
                      {selectedGroup.department}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-600">{t("inUsePage.noDept")}</p>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-500 shrink-0 mt-1">
                {selectedGroup.items.length} {t("inUsePage.items")}
              </span>
            </div>

            <div className="space-y-2">
              {selectedGroup.items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border hover:bg-surface-hover transition-all duration-150 cursor-pointer group"
                  onClick={() => router.push(`/assets/${item.assetId}?from=${encodeURIComponent("/in-use")}`)}
                  onMouseEnter={() => router.prefetch(`/assets/${item.assetId}`)}
                >
                  <span className="font-mono text-brand-500 text-sm shrink-0 w-[72px] truncate">
                    {item.assetCode}
                  </span>
                  <span className="flex-1 min-w-0 text-sm truncate">{item.assetName}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <DurationChip days={daysSince(item.since)} t={t} />
                    <SourceBadge source={item.source} t={t} />
                    <Link
                      href={`/assets/${item.assetId}?from=${encodeURIComponent("/in-use")}`}
                      onClick={(e) => e.stopPropagation()}
                      className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
                      title={t("inUsePage.viewAsset")}
                    >
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === BY PERSON: list view (paginated) === */}
      {view === "person" && !selectedGroup && filtered.length > 0 && (
        <div className="animate-fade-in-up">
          <div className="space-y-2 animate-stagger">
            {pagedGroups.map((group, gi) => {
              const longestColor =
                group.longestDays > 30
                  ? "text-red-400"
                  : group.longestDays > 7
                  ? "text-amber-400"
                  : "text-gray-400";
              return (
                <button
                  key={group.personName}
                  type="button"
                  onClick={() => setSelectedPerson(group.personName)}
                  className="w-full text-left card hover:border-brand-500/30 hover:bg-surface-hover transition-all duration-150 group animate-fade-in-up flex items-center gap-3"
                  style={{ animationDelay: `${gi * 30}ms` }}
                >
                  <div className="w-10 h-10 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 font-bold text-sm flex-shrink-0">
                    {group.personName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{group.personName}</p>
                    {group.department ? (
                      <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                        <Building2 size={10} />
                        {group.department}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-600">{t("inUsePage.noDept")}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {group.items.length}
                        <span className="text-xs text-gray-500 font-normal ml-1">
                          {t("inUsePage.items")}
                        </span>
                      </p>
                      <p className={cn("text-[11px] tabular-nums flex items-center gap-1 justify-end", longestColor)}>
                        <Clock size={10} />
                        {t("inUsePage.longestHeld", group.longestDays)}
                      </p>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-gray-600 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                </button>
              );
            })}
          </div>
          <Pagination total={groupsTotal} pageSize={12} />
        </div>
      )}

      {/* === BY ASSET: flat table === */}
      {view === "asset" && filtered.length > 0 && (
        <AssetTableView filtered={filtered} t={t} locale={locale} router={router} />
      )}
    </div>
  );
}

function AssetTableView({
  filtered,
  t,
  locale,
  router,
}: {
  filtered: InUseItem[];
  t: (k: string, ...a: (string | number)[]) => string;
  locale: Locale;
  router: ReturnType<typeof useRouter>;
}) {
  const sorted = useMemo(
    () => filtered.slice().sort((a, b) => a.assetCode.localeCompare(b.assetCode)),
    [filtered]
  );
  const { items: pagedRows, total } = usePagination(sorted, 20);

  return (
    <div className="animate-fade-in-up">
      <div className="border border-border rounded-xl bg-surface overflow-hidden">
        <div className="table-container">
          <table className="table table-row-hover animate-table-rows">
            <thead>
              <tr>
                <th>{t("inUsePage.code")}</th>
                <th>{t("inUsePage.equipment")}</th>
                <th>{t("inUsePage.person")}</th>
                <th className="hidden sm:table-cell">{t("inUsePage.dept")}</th>
                <th className="hidden md:table-cell">{t("inUsePage.since")}</th>
                <th>{t("inUsePage.duration")}</th>
                <th>{t("inUsePage.source")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((item) => (
                <tr
                  key={item.key}
                  className="cursor-pointer"
                  onClick={() => router.push(`/assets/${item.assetId}?from=${encodeURIComponent("/in-use")}`)}
                  onMouseEnter={() => router.prefetch(`/assets/${item.assetId}`)}
                >
                  <td>
                    <span className="font-mono text-brand-500">{item.assetCode}</span>
                  </td>
                  <td className="max-w-[160px] truncate">{item.assetName}</td>
                  <td className="font-semibold">{item.personName}</td>
                  <td className="hidden sm:table-cell text-gray-400">
                    {item.department || "-"}
                  </td>
                  <td className="hidden md:table-cell text-gray-400">
                    {formatDate(item.since, locale)}
                  </td>
                  <td>
                    <DurationChip days={daysSince(item.since)} t={t} />
                  </td>
                  <td>
                    <SourceBadge source={item.source} t={t} />
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/assets/${item.assetId}?from=${encodeURIComponent("/in-use")}`}
                      className="btn-icon"
                      title={t("inUsePage.viewAsset")}
                    >
                      <ExternalLink size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination total={total} pageSize={20} />
    </div>
  );
}
