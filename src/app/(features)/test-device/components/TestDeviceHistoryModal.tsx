"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { History, X, Search, User as UserIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { showError } from "@/lib/swal";
import { Pagination } from "@/components/Pagination";
import { getMonthlyLogs } from "../actions";

export default function TestDeviceHistoryModal({
  onClose,
  locale
}: {
  onClose: () => void;
  locale: any;
}) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyMonth, setHistoryMonth] = useState(new Date().getMonth() + 1);
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");
  const [historyExactDate, setHistoryExactDate] = useState("");
  const [historyBorrowers, setHistoryBorrowers] = useState<{id: string; name: string}[]>([]);
  const [borrowerSearchInput, setBorrowerSearchInput] = useState("");
  const [showBorrowerDropdown, setShowBorrowerDropdown] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset page to 1 when filters change
  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, historyStatusFilter, historyExactDate, historyBorrowers, historyMonth, historyYear]);

  // Scroll to top when page changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [historyPage]);

  const loadHistory = async (year: number, month: number) => {
    setLoadingHistory(true);
    try {
      const logs = await getMonthlyLogs(year, month);
      setHistoryLogs(logs);
    } catch (e: any) {
      showError(t("common.error") || "Error", t("testDeviceFeat.alertLoadHistoryFail"));
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadHistory(historyYear, historyMonth);
  }, []);

  const uniqueBorrowers = useMemo(() => {
    const map = new Map<string, {id: string; name: string}>();
    historyLogs.forEach(log => {
      if (log.user) {
        map.set(log.user.id, {
          id: log.user.id,
          name: log.user.name || log.user.email
        });
      }
    });
    return Array.from(map.values());
  }, [historyLogs]);

  const filteredBorrowerOptions = uniqueBorrowers.filter(u => 
    u.name.toLowerCase().includes(borrowerSearchInput.toLowerCase()) && 
    !historyBorrowers.find(b => b.id === u.id)
  );

  const filteredHistoryLogs = historyLogs.filter((log: any) => {
    const searchLower = historySearch.toLowerCase();
    const userName = (log.user?.name || "").toLowerCase();
    const userEmail = (log.user?.email || "").toLowerCase();
    const assetName = (log.asset?.name || "").toLowerCase();
    const assetCode = (log.asset?.code || "").toLowerCase();
    const assetNote = (log.asset?.testDeviceNote || "").toLowerCase();
    const matchSearch = userName.includes(searchLower) || userEmail.includes(searchLower) || assetName.includes(searchLower) || assetCode.includes(searchLower) || assetNote.includes(searchLower);
    
    const isReturned = !!log.returnedAt;
    const matchStatus = historyStatusFilter === "ALL" 
      ? true 
      : historyStatusFilter === "RETURNED" ? isReturned : !isReturned;

    const matchDate = historyExactDate ? (
      (log.borrowedAt && log.borrowedAt.startsWith(historyExactDate)) ||
      (log.returnedAt && log.returnedAt.startsWith(historyExactDate))
    ) : true;

    const matchBorrower = historyBorrowers.length > 0 ? (
      historyBorrowers.some(b => log.user?.id === b.id)
    ) : true;

    return matchSearch && matchStatus && matchDate && matchBorrower;
  }).sort((a: any, b: any) => new Date(b.borrowedAt).getTime() - new Date(a.borrowedAt).getTime());

  const historyTotal = filteredHistoryLogs.length;
  const totalPages = Math.max(1, Math.ceil(historyTotal / 10));
  const currentSafePage = Math.min(historyPage, totalPages);
  
  const pagedHistoryLogs = filteredHistoryLogs.slice((currentSafePage - 1) * 10, currentSafePage * 10);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex justify-center items-center p-4 md:p-6 transition-opacity">
      <div className="bg-[var(--surface)] rounded-xl w-full max-w-[95vw] lg:max-w-7xl h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-hover)]">
          <h2 className="text-xl font-bold text-[var(--text-default)] flex items-center gap-2">
            <History className="text-brand-600" />{t("testDeviceFeat.historyLog")}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-muted)] hover:bg-[var(--surface-hover)] rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div ref={scrollRef} className="flex-1 overflow-auto p-6 flex flex-col">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="flex gap-2">
              <div className="flex flex-col flex-1">
                <label className="text-xs font-semibold text-[var(--text-subtle)] mb-1 ml-1 uppercase tracking-wider">{t("testDeviceFeat.month")}</label>
                <select 
                  value={historyMonth} 
                  onChange={(e) => {
                    const m = parseInt(e.target.value);
                    setHistoryMonth(m);
                    loadHistory(historyYear, m);
                  }}
                  className="border border-[var(--border)] rounded-xl px-2 py-2.5 bg-[var(--surface)] text-[var(--text-default)] shadow-sm focus:border-brand-500 focus:ring-2 outline-none transition-all text-sm w-full"
                >
                  {Array.from({length: 12}).map((_, i) => {
                    const m = i + 1;
                    const isCurrent = m === new Date().getMonth() + 1 && historyYear === new Date().getFullYear();
                    return (
                      <option key={m} value={m}>
                        {new Date(2000, i, 1).toLocaleString(locale, { month: 'short' })} {isCurrent ? t("testDeviceFeat.thisMonth") : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="flex flex-col flex-1">
                <label className="text-xs font-semibold text-[var(--text-subtle)] mb-1 ml-1 uppercase tracking-wider">{t("testDeviceFeat.year")}</label>
                <select 
                  value={historyYear} 
                  onChange={(e) => {
                    const y = parseInt(e.target.value);
                    setHistoryYear(y);
                    loadHistory(y, historyMonth);
                  }}
                  className="border border-[var(--border)] rounded-xl px-2 py-2.5 bg-[var(--surface)] text-[var(--text-default)] shadow-sm focus:border-brand-500 focus:ring-2 outline-none transition-all text-sm w-full"
                >
                  {yearOptions.map(y => {
                    return <option key={y} value={y}>{y}</option>;
                  })}
                </select>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-[var(--text-subtle)] mb-1 ml-1 uppercase tracking-wider">{t("testDeviceFeat.dateBorrowed")}</label>
              <input 
                type="date"
                value={historyExactDate}
                onChange={(e) => setHistoryExactDate(e.target.value)}
                className="border border-[var(--border)] rounded-xl px-4 py-2.5 bg-[var(--surface)] text-[var(--text-default)] shadow-sm focus:border-brand-500 focus:ring-2 outline-none transition-all text-sm w-full"
              />
            </div>

            <div className="flex flex-col relative">
              <label className="text-xs font-semibold text-[var(--text-subtle)] mb-1 ml-1 uppercase tracking-wider">{t("testDeviceFeat.user")}</label>
              <div 
                className="w-full min-h-[42px] border border-[var(--border)] rounded-xl px-2 py-1 bg-[var(--surface)] text-[var(--text-default)] shadow-sm focus-within:border-brand-500 focus-within:ring-2 flex flex-wrap gap-1 items-center cursor-text transition-all"
                onClick={() => setShowBorrowerDropdown(true)}
              >
                {historyBorrowers.map(b => (
                  <span key={b.id} className="bg-brand-500/10 text-brand-700 text-xs px-2 py-1 rounded flex items-center gap-1 font-medium">
                    {b.name}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setHistoryBorrowers(prev => prev.filter(x => x.id !== b.id));
                      }}
                      className="hover:text-brand-900 focus:outline-none"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input 
                  type="text" 
                  placeholder={historyBorrowers.length === 0 ? t("testDeviceFeat.searchBorrower") : ""}
                  value={borrowerSearchInput}
                  onChange={(e) => setBorrowerSearchInput(e.target.value)}
                  onFocus={() => setShowBorrowerDropdown(true)}
                  onBlur={() => setTimeout(() => setShowBorrowerDropdown(false), 200)}
                  className="flex-1 bg-transparent min-w-[60px] outline-none text-sm text-[var(--text-default)] py-1"
                />
              </div>
              {showBorrowerDropdown && (
                <div className="absolute top-[100%] mt-1 left-0 right-0 max-h-48 overflow-y-auto bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl shadow-xl z-50">
                  {filteredBorrowerOptions.length === 0 ? (
                    <div className="p-3 text-xs text-[var(--text-muted)] text-center">
                      {t("testDeviceFeat.noBorrowerFound")}
                    </div>
                  ) : (
                    filteredBorrowerOptions.map(u => (
                      <div 
                        key={u.id}
                        className="p-2.5 text-sm hover:bg-brand-50 cursor-pointer text-[var(--text-default)] border-b border-[var(--border)] last:border-b-0"
                        onMouseDown={(e) => e.preventDefault()} // prevent blur
                        onClick={() => {
                          setHistoryBorrowers(prev => [...prev, u]);
                          setBorrowerSearchInput("");
                        }}
                      >
                        {u.name}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-[var(--text-subtle)] mb-1 ml-1 uppercase tracking-wider">{t("testDeviceFeat.search")}</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder={t("testDeviceFeat.searchPlaceholder")}
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 bg-[var(--surface)] text-[var(--text-default)] shadow-sm focus:border-brand-500 focus:ring-2 outline-none transition-all text-sm"
                />
                <Search className="absolute left-3.5 top-3 text-[var(--text-muted)]" size={18} />
              </div>
            </div>
            
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-[var(--text-subtle)] mb-1 ml-1 uppercase tracking-wider">{t("testDeviceFeat.status")}</label>
              <select 
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="border border-[var(--border)] rounded-xl px-4 py-2.5 bg-[var(--surface)] text-[var(--text-default)] shadow-sm focus:border-brand-500 focus:ring-2 outline-none transition-all text-sm w-full"
              >
                <option value="ALL">{t("testDeviceFeat.all")}</option>
                <option value="BORROWED">{t("testDeviceFeat.borrowed")}</option>
                <option value="RETURNED">{t("testDeviceFeat.returned")}</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="border border-[var(--border)] rounded-xl overflow-x-auto bg-[var(--surface)] shadow-sm">
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead>
                <tr className="bg-[var(--surface-raised)] border-b border-[var(--border)] text-sm">
                  <th className="px-6 py-4 font-semibold text-[var(--text-muted)] w-16">{t("testDeviceFeat.no")}</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-muted)]">{t("testDeviceFeat.user")}</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-muted)]">{t("testDeviceFeat.device")}</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-muted)]">{t("testDeviceFeat.serialNumber")}</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-muted)]">{t("testDeviceFeat.dateBorrowed")}</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-muted)]">{t("testDeviceFeat.dateReturned")}</th>
                  <th className="px-6 py-4 font-semibold text-[var(--text-muted)]">{t("testDeviceFeat.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[var(--text-subtle)]">
                      <div className="flex justify-center items-center gap-2">
                        <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>{t("testDeviceFeat.loadingAssets")}</div>
                    </td>
                  </tr>
                ) : filteredHistoryLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[var(--text-subtle)]">{t("testDeviceFeat.noHistory")}</td>
                  </tr>
                ) : (
                  pagedHistoryLogs.map((log: any, index: number) => {
                    const trueIndex = (currentSafePage - 1) * 10 + index + 1;
                    
                    return (
                    <tr key={log.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-[var(--text-subtle)]">
                        {trueIndex}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-[var(--text-default)]">{log.user?.name || log.user?.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-[var(--text-default)]">{log.asset?.name}</div>
                        <div className="text-xs text-[var(--text-subtle)]">
                          {log.asset?.code} 
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-default)] font-mono">
                        {log.asset?.serialNumber || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                        {new Date(log.borrowedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                        {log.returnedAt ? new Date(log.returnedAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {log.returnedAt ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold">
                            {t("testDeviceFeat.returned")}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-xl text-xs font-semibold">{t("testDeviceFeat.borrowed")}</span>
                        )}
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="mt-4">
            <Pagination 
              total={historyTotal} 
              pageSize={10} 
              currentPage={currentSafePage}
              onPageChange={setHistoryPage}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
