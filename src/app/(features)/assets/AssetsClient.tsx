// Path: src/app/(features)/assets/AssetsClient.tsx
"use client";

import { useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { formatMoney } from "@/lib/utils";
import { useRouter } from "next/navigation";
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
import { showConfirm, showSuccess, showError } from "@/lib/swal";
import { Plus, Settings2, Pencil, Trash2, Printer, ImagePlus } from "lucide-react";

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
  currentValue: number;
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
  const { canCreate, canEdit, canDelete } = useRole();
  const { categories, labelFor, emojiFor } = useCategories();
  const { assets, totalValue, searchParams } = data;
  const { items: pagedAssets, total: assetsTotal } = usePagination(assets, 20);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBatchPrint, setShowBatchPrint] = useState(false);
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [showBatchPhoto, setShowBatchPhoto] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(searchParams.category || "");

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

  return (
    <div className="page-enter">
      <PageHeader
        title={t("assets.title")}
        actions={
          <>
            <ExportButtons />
            {canCreate && (
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 animate-stagger">
        {[
          { label: t("assets.all"), value: assets.length, color: "text-brand-500" },
          { label: t("assets.using"), value: assets.filter((a) => a.status === "ACTIVE").length, color: "text-green-400" },
          { label: t("assets.available"), value: assets.filter((a) => a.status === "AVAILABLE").length, color: "text-blue-400" },
          { label: t("assets.currentValue"), value: `${t("common.baht")}${formatMoney(Math.round(totalValue), locale)}`, color: "text-green-400" },
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

      <form className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4">
        <input name="search" placeholder={t("assets.search")} defaultValue={searchParams.search} className="input sm:max-w-xs" />
        <div className="flex gap-3 flex-1 sm:flex-none">
          <select name="status" defaultValue={searchParams.status || ""} className="select flex-1 sm:w-auto sm:flex-none">
            <option value="">{t("assets.allStatus")}</option>
            {statuses.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </select>
          <SearchableSelect
            name="category"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categoryOptions}
            allLabel={t("assets.allCategory")}
            ariaLabel={t("assets.allCategory")}
            className="flex-1 sm:w-56 sm:flex-none"
          />
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
              <th>{t("assets.photo")}</th>
              <th>{t("assets.code")}</th>
              <th>{t("assets.name")}</th>
              <th className="hidden md:table-cell">{t("assets.type")}</th>
              <th>{t("assets.statusCol")}</th>
              <th className="hidden lg:table-cell">{t("assets.user")}</th>
              <th className="hidden sm:table-cell">{t("assets.purchasePrice")}</th>
              <th className="hidden sm:table-cell">{t("assets.currentVal")}</th>
            </tr>
          </thead>
          <tbody>
            {pagedAssets.map((a) => (
              <tr
                key={a.id}
                className={`cursor-pointer ${selected.has(a.id) ? "bg-brand-500/5" : ""}`}
                onClick={() => router.push(`/assets/${a.id}`)}
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
                <td className="w-14">
                  {a.photo ? (
                    <img src={a.photo} alt="" className="w-9 h-9 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-surface-dark flex items-center justify-center text-lg">{emojiFor(a.category)}</div>
                  )}
                </td>
                <td>
                  <span className="font-mono text-brand-500 font-semibold">{a.code}</span>
                </td>
                <td className="max-w-[200px]">
                  <span className="font-semibold block truncate" style={{ color: "var(--text-default)" }}>{a.name}</span>
                  <span className="text-xs text-gray-500 block truncate">{a.brand} {a.model}</span>
                </td>
                <td className="hidden md:table-cell">{labelFor(a.category)}</td>
                <td><span className={STATUS_BADGE[a.status] ?? "badge-available"}>{t(`status.${a.status}`)}</span></td>
                <td className="hidden lg:table-cell max-w-[120px] truncate">{a.assignedTo || "-"}</td>
                <td className="hidden sm:table-cell font-mono">{t("common.baht")}{formatMoney(a.purchasePrice, locale)}</td>
                <td className={`hidden sm:table-cell font-mono ${a.currentValue < a.purchasePrice * 0.2 ? "text-red-400" : "text-green-400"}`}>
                  {t("common.baht")}{formatMoney(Math.round(a.currentValue), locale)}
                </td>
              </tr>
            ))}
            {assets.length === 0 && <tr><td colSpan={9} className="py-12 text-center text-gray-500">{t("assets.notFound")}</td></tr>}
          </tbody>
        </table>
      </div>

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
