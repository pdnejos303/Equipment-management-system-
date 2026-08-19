"use client";

import Selecto from "react-selecto";

import { useState, useEffect, useTransition, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { borrowDevice, returnDevice, addTestDevice, removeTestDevice, updateTestDeviceNote, borrowMultipleDevices, returnMultipleDevices } from "./actions";
import { History, Monitor, Plus, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { showConfirm, showError } from "@/lib/swal";
import AddTestDeviceModal from "./components/AddTestDeviceModal";
import TestDeviceHistoryModal from "./components/TestDeviceHistoryModal";
import TestDeviceCard from "./components/TestDeviceCard";
import { PageHeader } from "@/components/ui/PageHeader";

export default function TestDeviceClient({ initialDevices, categories, currentUser }: any) {
  const router = useRouter();
  const { t, locale } = useI18n();
  
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [mainSearch, setMainSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isPending) {
      setLoadingId(null);
    }
  }, [isPending]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleSelection = (id: string, forceSelect?: boolean) => {
    setSelectedDevices(prev => {
      const next = new Set(prev);
      if (forceSelect) {
        next.add(id);
      } else {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const selectedDevicesList = Array.from(selectedDevices).map(id => initialDevices.find((d: any) => d.id === id)).filter(Boolean);
  const devicesToBorrow = selectedDevicesList.filter(d => !d.testDeviceLogs?.length);
  const devicesToReturn = selectedDevicesList.filter(d => d.testDeviceLogs?.length > 0 && (d.testDeviceLogs[0].userId === currentUser.id || currentUser.role === "ADMIN" || !d.testDeviceLogs[0].userId));

  const handleBorrowMultiple = async () => {
    if (devicesToBorrow.length === 0) return;
    try {
      setLoadingId("multi-borrow");
      await borrowMultipleDevices(devicesToBorrow.map(d => d.id));
      setSelectedDevices(prev => {
        const next = new Set(prev);
        devicesToBorrow.forEach(d => next.delete(d.id));
        return next;
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      showError(t("common.error") || "Error", t(e.message));
      setLoadingId(null);
    }
  };

  const handleReturnMultiple = async () => {
    if (devicesToReturn.length === 0) return;
    try {
      setLoadingId("multi-return");
      await returnMultipleDevices(devicesToReturn.map(d => d.id));
      setSelectedDevices(prev => {
        const next = new Set(prev);
        devicesToReturn.forEach(d => next.delete(d.id));
        return next;
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      showError(t("common.error") || "Error", t(e.message));
      setLoadingId(null);
    }
  };

  const filteredDevices = initialDevices.filter((d: any) => {
    const matchCat = activeCategory === "ALL" || d.category === activeCategory;
    const searchLower = mainSearch.toLowerCase();
    const matchSearch = 
      (d.name || "").toLowerCase().includes(searchLower) || 
      (d.code || "").toLowerCase().includes(searchLower) || 
      (d.testDeviceNote || "").toLowerCase().includes(searchLower);
    return matchCat && matchSearch;
  });

  const handleAddDevice = async (id: string) => {
    try {
      setLoadingId(id);
      await addTestDevice(id);
      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      showError(t("common.error") || "Error", t(e.message));
      setLoadingId(null);
    }
  };

  const handleRemoveDevice = async (id: string) => {
    const confirmed = await showConfirm({
      title: t("testDeviceFeat.removeFromTest"),
      text: t("testDeviceFeat.confirmRemove"),
      confirmText: t("common.confirm") || "Confirm",
      cancelText: t("common.cancel") || "Cancel",
      danger: true,
    });
    if (!confirmed) return;
    try {
      setLoadingId(id);
      await removeTestDevice(id);
      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      showError(t("common.error") || "Error", t(e.message));
      setLoadingId(null);
    }
  };

  const handleSaveNote = async (id: string, note: string) => {
    try {
      setLoadingId(id + "-note");
      await updateTestDeviceNote(id, note);
      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      showError(t("common.error") || "Error", t("testDeviceFeat.alertUpdateNoteFail"));
      setLoadingId(null);
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="space-y-6 relative px-2 sm:px-4 md:px-6 max-w-[2000px] mx-auto selecto-container">
      {mounted && containerRef.current && (
        <Selecto
          dragContainer={containerRef.current}
          rootContainer={containerRef.current}
          boundContainer={true}
          selectableTargets={[".selectable-card"]}
          hitRate={0}
          selectByClick={true}
          selectFromInside={true}
          toggleContinueSelect={["shift"]}
          onDragStart={(e) => {
            const target = e.inputEvent.target as HTMLElement;
            // Prevent dragging if clicking on buttons or inputs
            if (target.closest("button") || target.closest("a") || target.tagName === "INPUT") {
              e.stop();
            }
          }}
          onSelect={(e) => {
          e.added.forEach(el => {
            const id = el.getAttribute("data-id");
            if (id) {
              setSelectedDevices(prev => {
                const next = new Set(prev);
                next.add(id);
                return next;
              });
            }
          });
          e.removed.forEach(el => {
            const id = el.getAttribute("data-id");
            if (id) {
              setSelectedDevices(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
            }
          });
        }}
      />
      )}
      
      <PageHeader 
        title={t("testDeviceFeat.pageTitle")} 
        subtitle={t("testDeviceFeat.pageSubtitle")} 
      />
      {/* Top Actions & Categories */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--surface)] p-4 rounded-xl shadow-sm border border-[var(--border)]">
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 flex-1">
          <div className="relative min-w-[200px] flex-1 sm:flex-none">
            <input 
              type="text" 
              placeholder={t("testDeviceFeat.searchAssetPlaceholder")}
              value={mainSearch}
              onChange={(e) => setMainSearch(e.target.value)}
              className="w-full border border-[var(--border)] rounded-xl pl-10 pr-4 py-2 bg-[var(--surface)] text-[var(--text-default)] shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all text-sm"
            />
            <Search className="absolute left-3.5 top-2.5 text-[var(--text-muted)]" size={16} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("ALL")}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
                activeCategory === "ALL" 
                  ? "bg-brand-500 text-white shadow-md" 
                  : "bg-[var(--surface-hover)] text-[var(--text-muted)] hover:bg-gray-200"
              }`}
            >{t("testDeviceFeat.allDevices")}</button>
            {categories.filter((c: any) => initialDevices.some((d: any) => d.category === c.key)).map((c: any) => (
              <button
                key={c.key}
                onClick={() => setActiveCategory(c.key)}
                className={`px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-all duration-200 ${
                  activeCategory === c.key 
                    ? "bg-brand-500 text-white shadow-md" 
                    : "bg-[var(--surface-hover)] text-[var(--text-muted)] hover:bg-gray-200"
                }`}
              >
                {c.emoji && <span>{c.emoji}</span>}
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary rounded-xl shadow-sm text-sm flex items-center gap-1.5"
          >
            <Plus size={16} />{t("testDeviceFeat.addDevice")}
          </button>
          <button 
            onClick={() => setShowHistory(true)}
            className="btn-secondary rounded-xl shadow-sm text-sm flex items-center gap-1.5"
          >
            <History size={16} />{t("testDeviceFeat.viewHistory")}
          </button>
        </div>
      </div>

      {/* Multi-Select ActionBar */}
      {mounted && selectedDevices.size > 0 && createPortal(
        <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[92vw] md:w-auto bg-[var(--surface)] border border-[var(--border)] px-4 py-3 md:px-6 md:py-4 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3 md:gap-8 animate-in fade-in slide-in-from-bottom-8 duration-300">
          <div className="font-semibold text-brand-500 whitespace-nowrap text-sm md:text-base text-center w-full md:w-auto">
            {t("testDeviceFeat.selectedCount")?.replace('{count}', selectedDevices.size.toString())}
          </div>
          <div className="flex flex-wrap md:flex-nowrap gap-2 w-full md:w-auto justify-center">
            <button 
              onClick={() => setSelectedDevices(new Set())}
              className="px-3 py-2 md:px-4 md:py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)] rounded-xl transition-colors"
            >
              {t("common.cancel") || "Cancel"}
            </button>
            
            {devicesToReturn.length > 0 && (
              <button 
                onClick={handleReturnMultiple}
                disabled={loadingId === "multi-return"}
                className="bg-green-500 text-white hover:bg-green-600 rounded-xl shadow-md text-sm font-medium flex-1 md:flex-none flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap px-3 md:px-6 py-2 transition-colors disabled:opacity-50"
              >
                {loadingId === "multi-return" ? t("testDeviceFeat.processing") : `${t("testDeviceFeat.returnDevice") || "Return"} (${devicesToReturn.length})`}
              </button>
            )}

            {devicesToBorrow.length > 0 && (
              <button 
                onClick={handleBorrowMultiple}
                disabled={loadingId === "multi-borrow"}
                className="btn-primary rounded-xl shadow-md text-sm flex-1 md:flex-none flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap px-3 md:px-6 py-2"
              >
                {loadingId === "multi-borrow" ? t("testDeviceFeat.processing") : `${t("testDeviceFeat.borrowSelected") || "Borrow"} (${devicesToBorrow.length})`}
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Device Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 py-4">
        {filteredDevices.map((device: any) => (
          <TestDeviceCard
            key={device.id}
            device={device}
            currentUser={currentUser}
            selectedDevices={selectedDevices}
            loadingId={loadingId}
            toggleSelection={toggleSelection}
            handleRemoveDevice={handleRemoveDevice}
            handleSaveNote={handleSaveNote}
            onActionComplete={async () => {
              startTransition(() => {
                router.refresh();
              });
            }}
          />
        ))}
      </div>

      {filteredDevices.length === 0 && (
        <div className="py-20 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-[var(--surface-hover)] rounded-xl flex items-center justify-center text-[var(--text-muted)] mb-4">
            <Monitor size={24} />
          </div>
          <h3 className="text-lg font-medium text-[var(--text-default)]">{t("testDeviceFeat.noTestDevices")}</h3>
          <p className="text-[var(--text-subtle)] mt-1">{t("testDeviceFeat.tryCategory")}</p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-brand-500/10 text-brand-700 rounded-xl hover:bg-brand-500/20 transition-colors font-medium"
          >
            <Plus size={16} />{t("testDeviceFeat.addDevice")}
          </button>
        </div>
      )}

      {/* Modals */}
      {mounted && showAddModal && (
        <AddTestDeviceModal
          onClose={() => setShowAddModal(false)}
          categories={categories}
          onAddDevice={handleAddDevice}
          loadingId={loadingId}
        />
      )}

      {mounted && showHistory && (
        <TestDeviceHistoryModal
          onClose={() => setShowHistory(false)}
          locale={locale}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
