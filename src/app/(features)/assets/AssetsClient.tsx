// Path: src/app/(features)/assets/AssetsClient.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { cn, formatMoney } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { ExportButtons } from "@/components/ExportButtons";
import { Pagination } from "@/components/Pagination";
import { usePagination } from "@/lib/usePagination";
import { AISmartSearch } from "@/components/AISmartSearch";
import { BatchLabelDialog } from "@/components/labels";
import type { LabelAsset } from "@/components/labels";
import { PageHeader } from "@/components/ui/PageHeader";
import { AddAssetForm } from "@/components/forms/AddAssetForm";
import { BatchEditAssetsForm } from "@/components/forms/BatchEditAssetsForm";
import { BatchPhotoForm } from "@/components/forms/BatchPhotoForm";
import { CategoriesManagerDialog } from "@/components/settings/CategoriesManagerDialog";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useRole } from "@/lib/useRole";
import { useCategories } from "@/lib/useCategories";
import { useAssetColumns } from "@/lib/useAssetColumns";
import { showConfirm, showSuccess, showError } from "@/lib/swal";
import {
  Plus,
  Settings2,
  Pencil,
  Trash2,
  Printer,
  ImagePlus,
  LayoutGrid,
  Rows3,
  User as UserIcon,
} from "lucide-react";

const VIEW_STORAGE_KEY = "assets-view-mode";
type ViewMode = "table" | "card";

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "badge-active",
  AVAILABLE: "badge-available",
  MAINTENANCE: "badge-maintenance",
  RETIRED: "badge-retired",
};

interface AssetRow {
  id: string;
  code: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  status: string;
  purchasePrice: number;
  serialNumber: string | null;
  photo: string | null;
  assignedTo: string | null;
}

interface AssetsData {
  assets: AssetRow[];
  totalValue: number;
  searchParams: { status?: string; category?: string; search?: string };
}

export function AssetsClient({ data }: { data: AssetsData }) {

  const { t, locale } = useI18n(); // t ได้ฟังชั่นมา local ได้ค่ามา

  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const { canCreate, canEdit, canDelete } = useRole();
  const { categories, labelFor, emojiFor } = useCategories();
  const { isVisible } = useAssetColumns();
  const { assets, totalValue, searchParams } = data;
  const { items: pagedAssets, total: assetsTotal } = usePagination(assets, 20);

  const buildDetailHref = useCallback((id: string) => {
    const qs = urlSearchParams.toString();
    const fromPath = qs ? `/assets?${qs}` : "/assets";
    return `/assets/${id}?from=${encodeURIComponent(fromPath)}`;
  }, [urlSearchParams]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBatchPrint, setShowBatchPrint] = useState(false);
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [showBatchPhoto, setShowBatchPhoto] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(searchParams.category || "");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === "card" || saved === "table") setViewMode(saved);
  }, []);

  const changeView = useCallback((next: ViewMode) => {
    setViewMode(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // localStorage might be unavailable (private mode); ignore
    }
  }, []);

  const statuses = ["ACTIVE", "AVAILABLE", "MAINTENANCE", "RETIRED"];

  const categoryOptions = categories.map((c) => ({
    value: c.key,
    label: c.label,
    prefix: c.emoji || undefined,
  }));

  const isAllSelected = assets.length > 0 && selected.size === assets.length;
  const isSomeSelected = selected.size > 0;

  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(assets.map((a) => a.id)));
    }
  }, [isAllSelected, assets]);

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next; 
    });
  }, []);

  const selectedAssets: LabelAsset[] = assets
    .filter((a) => selected.has(a.id))
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      brand: a.brand || undefined,
      model: a.model || undefined,
      serial: a.serialNumber || undefined,
      category: labelFor(a.category) || undefined,
    }));

  const selectedIds = Array.from(selected);

  const handleBatchDelete = async () => {
    const confirmed = await showConfirm({
      title: t("labels.batchDeleteTitle", selected.size),
      text: t("labels.batchDeleteMsg", selected.size),
      confirmText: t("actions.deletePermanent"),
      cancelText: t("confirm.cancel"),
      danger: true,
    });
    if (!confirmed) return;

    setBulkDeleting(true);
    const results = await Promise.allSettled(
      selectedIds.map((id) =>
        fetch(`/api/assets/${id}`, { method: "DELETE" }).then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r;
        })
      )
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const fail = results.length - ok;
    setBulkDeleting(false);

    if (fail === 0) {
      await showSuccess(t("labels.batchDeleteTitle", ok), t("labels.batchDeletedSuccess", ok));
    } else if (ok === 0) {
      showError(t("labels.batchDeleteTitle", selected.size), t("labels.batchDeleteFailed"));
    } else {
      await showSuccess(t("labels.batchDeleteTitle", ok), t("labels.batchPartialSuccess", ok, fail));
    }

    setSelected(new Set());
    router.refresh();
  };

  const handleSearchSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get("search") as string;
    const status = formData.get("status") as string;
    
    const params = new URLSearchParams(urlSearchParams.toString());
    if (search) params.set("search", search);
    else params.delete("search");
    
    if (status) params.set("status", status);
    else params.delete("status");

    if (categoryFilter) params.set("category", categoryFilter);
    else params.delete("category");

    router.push(`/assets?${params.toString()}`);
  }, [urlSearchParams, categoryFilter, router]);

  return (
    <div className="page-enter">
      <PageHeader
        title={t("assets.title")}
        actions={
          <>
          {/* Export Buttons */}
            <ExportButtons />
            {canCreate && (
              // Add New Asset Button
              <button
                onClick={() => setShowAddAsset(true)}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <Plus size={14} />
                {t("assets.addNew")}
              </button>
            )}
          </>
        }
      />
      {/* top 4 card */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 animate-stagger">
        {[
          { label: t("assets.all"), value: assets.length, color: "text-brand-500" },
          { label: t("assets.using"), value: assets.filter((a) => a.status === "ACTIVE").length, color: "text-green-400" },
          { label: t("assets.available"), value: assets.filter((a) => a.status === "AVAILABLE").length, color: "text-blue-400" },
          { label: t("assets.purchaseValue"), value: `${t("common.baht")}${formatMoney(Math.round(totalValue), locale)}`, color: "text-green-400" },
        ].map((s) => (
          <div key={s.label} className="card stat-card">
            <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)", letterSpacing: "0.06em" }}>{s.label}</p>
            <p className={`text-2xl font-bold ${s.color} tracking-tight mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* AI Smart Search */}
      <div className="mb-4">
        <AISmartSearch onResults={() => {}} />
      </div>

      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4">
        {/* Search */}
        <input name="search" placeholder={t("assets.search")} defaultValue={searchParams.search} className="input sm:max-w-xs" />
        <div className="flex gap-3 flex-1 sm:flex-none">
          {/* status */}
          <select name="status" defaultValue={searchParams.status || ""} className="select flex-1 sm:w-auto sm:flex-none">
            <option value="">{t("assets.allStatus")}</option>
            {statuses.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </select>
          {/* Category */}
          <SearchableSelect
            name="category"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categoryOptions}
            allLabel={t("assets.allCategory")}
            ariaLabel={t("assets.allCategory")}
            className="flex-1 sm:w-56 sm:flex-none"
          />
          {/* Manage Categories */}
          {canCreate && (
            <button
              type="button"
              onClick={() => setShowManageCategories(true)}
              className="btn-ghost text-sm flex items-center gap-1.5 min-h-[40px] flex-shrink-0"
              title={t("assets.manageCategories")}
              aria-label={t("assets.manageCategories")}
            >
              <Settings2 size={14} />
              <span className="hidden sm:inline">{t("assets.manageCategories")}</span>
            </button>
          )}
        </div>
        <button type="submit" className="btn-ghost text-sm min-h-[40px]">{t("assets.searchBtn")}</button>
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0 ml-auto sm:ml-0">
          <button
            type="button"
            onClick={() => changeView("table")}
            aria-label={t("assets.viewAriaTable")}
            aria-pressed={viewMode === "table"}
            title={t("assets.viewTable")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors min-h-[40px]",
              viewMode === "table"
                ? "bg-brand-500/10 text-brand-500"
                : "text-gray-400 hover:text-gray-200 hover:bg-surface-hover"
            )}
          >
            <Rows3 size={14} />
            <span className="hidden sm:inline">{t("assets.viewTable")}</span>
          </button>
          <button
            type="button"
            onClick={() => changeView("card")}
            aria-label={t("assets.viewAriaCard")}
            aria-pressed={viewMode === "card"}
            title={t("assets.viewCard")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-border min-h-[40px]",
              viewMode === "card"
                ? "bg-brand-500/10 text-brand-500"
                : "text-gray-400 hover:text-gray-200 hover:bg-surface-hover"
            )}
          >
            <LayoutGrid size={14} />
            <span className="hidden sm:inline">{t("assets.viewCard")}</span>
          </button>
        </div>
      </form>

      {/* Batch action bar */}
      {isSomeSelected && (
        <div className="flex flex-wrap items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-brand-500/10 border border-brand-500/20 animate-fade-in">
          <span className="text-sm font-semibold text-brand-400">
            {t("labels.selected", selected.size)}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setShowBatchPrint(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-black font-semibold text-sm hover:bg-brand-400 transition"
          >
            <Printer size={14} />
            {t("labels.printLabels")}
          </button>
          {canEdit && (
            <button
              onClick={() => setShowBatchPhoto(true)}
              className="btn-ghost text-sm flex items-center gap-1.5 min-h-[40px]"
            >
              <ImagePlus size={14} />
              {t("labels.batchPhoto")}
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => setShowBatchEdit(true)}
              className="btn-ghost text-sm flex items-center gap-1.5 min-h-[40px]"
            >
              <Pencil size={14} />
              {t("labels.batchEdit")}
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleBatchDelete}
              disabled={bulkDeleting}
              className="btn-danger text-sm flex items-center gap-1.5 min-h-[40px] disabled:opacity-50"
            >
              <Trash2 size={14} />
              {bulkDeleting ? t("confirm.processing") : t("labels.batchDelete")}
            </button>
          )}
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-gray-400 hover:text-gray-200 transition px-2"
          >
            {t("labels.clearSelection")}
          </button>
        </div>
      )}

      {viewMode === "card" ? (
        assets.length === 0 ? (
          <div className="py-16 text-center text-gray-500">{t("assets.notFound")}</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-stagger">
            {pagedAssets.map((a, idx) => {
              const isSelected = selected.has(a.id);
              return (
                <div
                  key={a.id}
                  onClick={() => router.push(buildDetailHref(a.id))}
                  onMouseEnter={() => router.prefetch(`/assets/${a.id}`)}
                  className={cn(
                    "group relative card !p-0 overflow-hidden cursor-pointer transition-all duration-200 hover:border-brand-500/40 hover:-translate-y-0.5 animate-fade-in-up flex flex-col",
                    isSelected && "border-brand-500/60 ring-1 ring-brand-500/30"
                  )}
                  style={{ animationDelay: `${idx * 25}ms` }}
                >
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "absolute top-2 left-2 z-10 flex items-center justify-center w-7 h-7 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 cursor-pointer transition-opacity",
                      isSelected
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(a.id)}
                      className="w-4 h-4 rounded border-gray-600 bg-surface-dark text-brand-500 focus:ring-brand-500 focus:ring-offset-0 cursor-pointer"
                    />
                  </label>

                  <div className="relative w-full aspect-[16/10] bg-surface-dark overflow-hidden border-b border-border">
                    {a.photo ? (
                      <img
                        src={a.photo}
                        alt={a.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-600">
                        <span className="text-4xl">{emojiFor(a.category)}</span>
                        <span className="text-[10px] uppercase tracking-wider">{t("assets.noPhoto")}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-1.5 p-3">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <span className="font-mono text-brand-500 font-semibold text-sm truncate">{a.code}</span>
                      <span className={cn("shrink-0 text-[10px] !px-1.5 !py-0.5", STATUS_BADGE[a.status] ?? "badge-available")}>
                        {t(`status.${a.status}`)}
                      </span>
                    </div>
                    <p
                      className="font-semibold text-sm leading-snug line-clamp-2"
                      style={{ color: "var(--text-default)" }}
                      title={a.name}
                    >
                      {a.name}
                    </p>
                    {(a.brand || a.model) && (
                      <p className="text-xs text-gray-500 truncate">{[a.brand, a.model].filter(Boolean).join(" ")}</p>
                    )}
                    <div className="mt-auto pt-2 flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1 text-gray-400 min-w-0">
                        <UserIcon size={11} className="shrink-0" />
                        <span className="truncate">{a.assignedTo || "-"}</span>
                      </span>
                      <span className="font-mono text-green-400 shrink-0">
                        {t("common.baht")}{formatMoney(a.purchasePrice, locale)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
      <div className="table-container">
        <table className="table table-row-hover animate-table-rows">
          <thead>
            <tr>
              <th className="w-10">
                <label className="flex items-center justify-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => { if (el) el.indeterminate = isSomeSelected && !isAllSelected; }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-600 bg-surface-dark text-brand-500 focus:ring-brand-500 focus:ring-offset-0 cursor-pointer"
                  />
                </label>
              </th>
              {isVisible("photo") && <th>{t("assets.photo")}</th>}
              {isVisible("code") && <th>{t("assets.code")}</th>}
              {isVisible("name") && <th>{t("assets.name")}</th>}
              {isVisible("type") && <th>{t("assets.type")}</th>}
              {isVisible("status") && <th>{t("assets.statusCol")}</th>}
              {isVisible("user") && <th>{t("assets.user")}</th>}
              {isVisible("purchasePrice") && <th>{t("assets.purchasePrice")}</th>}
            </tr>
          </thead>
          <tbody>
            {pagedAssets.map((a) => (
              <tr
                key={a.id}
                className={`cursor-pointer ${selected.has(a.id) ? "bg-brand-500/5" : ""}`}
                onClick={() => router.push(buildDetailHref(a.id))}
                onMouseEnter={() => router.prefetch(`/assets/${a.id}`)}
              >
                <td className="w-10" onClick={(e) => e.stopPropagation()}>
                  <label className="flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      onChange={() => toggleOne(a.id)}
                      className="w-4 h-4 rounded border-gray-600 bg-surface-dark text-brand-500 focus:ring-brand-500 focus:ring-offset-0 cursor-pointer"
                    />
                  </label>
                </td>
                {isVisible("photo") && (
                  <td className="w-16">
                    {a.photo ? (
                      <img src={a.photo} alt="" className="w-12 h-12 rounded-lg object-cover border border-border" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-surface-dark flex items-center justify-center text-xl">{emojiFor(a.category)}</div>
                    )}
                  </td>
                )}
                {isVisible("code") && (
                  <td>
                    <span className="font-mono text-brand-500 font-semibold">{a.code}</span>
                  </td>
                )}
                {isVisible("name") && (
                  <td className="max-w-[200px]">
                    <span className="font-semibold block truncate" style={{ color: "var(--text-default)" }}>{a.name}</span>
                    <span className="text-xs text-gray-500 block truncate">{a.brand} {a.model}</span>
                  </td>
                )}
                {isVisible("type") && <td>{labelFor(a.category)}</td>}
                {isVisible("status") && (
                  <td><span className={STATUS_BADGE[a.status] ?? "badge-available"}>{t(`status.${a.status}`)}</span></td>
                )}
                {isVisible("user") && <td className="max-w-[120px] truncate">{a.assignedTo || "-"}</td>}
                {isVisible("purchasePrice") && (
                  <td className="font-mono text-green-400">{t("common.baht")}{formatMoney(a.purchasePrice, locale)}</td>
                )}
              </tr>
            ))}
            {assets.length === 0 && <tr><td colSpan={8} className="py-12 text-center text-gray-500">{t("assets.notFound")}</td></tr>}
          </tbody>
        </table>
      </div>
      )}

      <Pagination total={assetsTotal} pageSize={20} />

      {/* Batch Label Print Dialog */}
      {showBatchPrint && (
        <BatchLabelDialog
          assets={selectedAssets}
          open={showBatchPrint}
          onClose={() => setShowBatchPrint(false)}
        />
      )}

      {/* Batch Edit Dialog */}
      {showBatchEdit && (
        <BatchEditAssetsForm
          open={showBatchEdit}
          onClose={() => setShowBatchEdit(false)}
          assetIds={selectedIds}
        />
      )}

      {/* Batch Photo Dialog */}
      {showBatchPhoto && (
        <BatchPhotoForm
          open={showBatchPhoto}
          onClose={() => setShowBatchPhoto(false)}
          assetIds={selectedIds}
        />
      )}

      <AddAssetForm open={showAddAsset} onClose={() => setShowAddAsset(false)} />

      <CategoriesManagerDialog
        open={showManageCategories}
        onClose={() => setShowManageCategories(false)}
      />
    </div>
  );
}
