"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Search, Laptop, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getAvailableAssets } from "../actions";

export default function AddTestDeviceModal({
  onClose,
  categories,
  onAddDevice,
  loadingId,
}: {
  onClose: () => void;
  categories: any[];
  onAddDevice: (id: string) => Promise<void>;
  loadingId: string | null;
}) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [addActiveCategory, setAddActiveCategory] = useState("ALL");
  const [addPage, setAddPage] = useState(1);
  const [addTotalPages, setAddTotalPages] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAvailableAssets = async (p = 1, s = "", c = "ALL") => {
    setLoadingAssets(true);
    try {
      const res = await getAvailableAssets(p, 12, s, c);
      setAvailableAssets(res.items);
      setAddTotalPages(res.totalPages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAvailableAssets(addPage, addSearchQuery, addActiveCategory);
    }, 300);
    return () => clearTimeout(timer);
  }, [addSearchQuery, addActiveCategory, addPage]);

  const handleAdd = async (id: string) => {
    await onAddDevice(id);
    setAvailableAssets(prev => prev.filter(a => a.id !== id));
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex justify-center items-center p-4 md:p-6 transition-opacity">
      <div className="bg-[var(--surface)] rounded-xl w-full max-w-3xl h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-hover)]">
          <h2 className="text-xl font-bold text-[var(--text-default)] flex items-center gap-2">
            <Plus className="text-brand-600" />{t("testDeviceFeat.selectEquip")}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-muted)] hover:bg-[var(--surface-hover)] rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-6 space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder={t("testDeviceFeat.searchAssetPlaceholder")}
                value={addSearchQuery}
                onChange={(e) => {
                  setAddSearchQuery(e.target.value);
                  setAddPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-[var(--border-strong)] rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm"
              />
              <Search className="absolute left-3.5 top-3 text-[var(--text-muted)]" size={18} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setAddActiveCategory("ALL"); setAddPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  addActiveCategory === "ALL"
                    ? "bg-brand-500 text-white shadow-sm"
                    : "bg-[var(--surface-hover)] text-[var(--text-muted)] hover:bg-gray-200"
                }`}
              >
                {t("testDeviceFeat.all")}
              </button>
              {categories.map((c: any) => (
                <button
                  key={c.key}
                  onClick={() => { setAddActiveCategory(c.key); setAddPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    addActiveCategory === c.key
                      ? "bg-brand-500 text-white shadow-sm"
                      : "bg-[var(--surface-hover)] text-[var(--text-muted)] hover:bg-gray-200"
                  }`}
                >
                  {c.emoji && <span>{c.emoji}</span>}
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {loadingAssets ? (
            <div className="py-12 flex justify-center items-center gap-2 text-[var(--text-subtle)]">
              <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
              {t("testDeviceFeat.loadingAssets")}
            </div>
          ) : availableAssets.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-subtle)] bg-[var(--surface-raised)] rounded-xl border border-dashed border-[var(--border-strong)]">
              <div className="w-12 h-12 bg-[var(--surface)] rounded-xl flex items-center justify-center text-[var(--text-muted)] mx-auto mb-3">
                <Laptop size={20} />
              </div>
              {t("testDeviceFeat.noAvailableAssets")}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {availableAssets.map((asset: any) => (
                <div key={asset.id} className="border border-[var(--border)] rounded-xl p-3 flex items-center gap-4 hover:border-brand-300 hover:shadow-sm transition-all bg-[var(--surface)] group">
                  <div className="w-16 h-16 bg-[var(--surface-hover)] rounded-xl overflow-hidden shrink-0 border border-[var(--border)]">
                    {asset.photos?.[0] ? (
                      <img src={asset.photos[0].url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Laptop size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-brand-600 mb-0.5 truncate">{asset.code}</div>
                    <div className="font-semibold text-[var(--text-default)] truncate text-sm">{asset.name}</div>
                  </div>
                  <button
                    disabled={loadingId === asset.id}
                    onClick={() => handleAdd(asset.id)}
                    className="px-4 py-2 bg-brand-50 text-brand-700 hover:bg-brand-500 hover:text-white font-semibold text-sm rounded-xl transition-colors shrink-0 disabled:opacity-50"
                  >
                    {loadingId === asset.id ? "..." : t("testDeviceFeat.addBtn")}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {availableAssets.length > 0 && addTotalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button 
                onClick={() => setAddPage(p => Math.max(1, p - 1))}
                disabled={addPage === 1 || loadingAssets}
                className="px-4 py-2 bg-[var(--surface-hover)] rounded-xl disabled:opacity-50 text-sm font-medium hover:bg-gray-200"
              >
                {t("testDeviceFeat.prevPage")}
              </button>
              <span className="text-sm font-medium text-[var(--text-muted)]">
                {t("testDeviceFeat.pageOf")?.replace('{page}', addPage.toString()).replace('{total}', addTotalPages.toString())}
              </span>
              <button 
                onClick={() => setAddPage(p => Math.min(addTotalPages, p + 1))}
                disabled={addPage === addTotalPages || loadingAssets}
                className="px-4 py-2 bg-[var(--surface-hover)] rounded-xl disabled:opacity-50 text-sm font-medium hover:bg-gray-200"
              >
                {t("testDeviceFeat.nextPage")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
