"use client";

// Link removed to prevent navigation during drag selection
import { Laptop, Clock, Trash2, Edit2, Save, X, User as UserIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";

export default function TestDeviceCard({
  device,
  currentUser,
  selectedDevices,
  loadingId,
  toggleSelection,
  handleRemoveDevice,
  handleSaveNote,
  handleBorrow,
  handleReturn,
}: {
  device: any;
  currentUser: any;
  selectedDevices: Set<string>;
  loadingId: string | null;
  toggleSelection: (id: string, forceSelect?: boolean) => void;
  handleRemoveDevice: (id: string) => Promise<void>;
  handleSaveNote: (id: string, note: string) => Promise<void>;
  handleBorrow: (id: string) => Promise<void>;
  handleReturn: (id: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteValue, setEditNoteValue] = useState("");

  const isBorrowed = device.testDeviceLogs?.length > 0;
  const currentLog = isBorrowed ? device.testDeviceLogs[0] : null;
  const isMyBorrow = currentLog?.userId === currentUser.id;
  const isAdmin = currentUser.role === "ADMIN";
  const isSelectable = !isBorrowed || isMyBorrow || isAdmin;

  const onSaveNote = async () => {
    await handleSaveNote(device.id, editNoteValue);
    setEditingNoteId(null);
  };

  return (
    <div 
      data-id={device.id}
      className={`${isSelectable ? "selectable-card" : ""} relative flex flex-col rounded-xl overflow-hidden transition-all duration-300 border-2 select-none ${
        selectedDevices.has(device.id)
          ? "border-brand-500 bg-brand-50 ring-4 ring-brand-500/20 shadow-md transform scale-[0.98]"
          : isBorrowed 
            ? "border-amber-400 bg-amber-50/30 shadow-md" 
            : "border-[var(--border)] bg-[var(--surface)] hover:shadow-xl hover:-translate-y-1 hover:border-brand-100 cursor-pointer"
      }`}
    >
      {/* Image Section */}
      <div className="h-48 bg-[var(--surface-hover)] relative overflow-hidden flex items-center justify-center block hover:opacity-90 transition-opacity">
        {device.photos?.[0] ? (
          <img 
            src={device.photos[0].url} 
            alt={device.name} 
            className={`w-full h-full object-cover ${isBorrowed ? "opacity-60 grayscale-[30%]" : ""}`}
            draggable={false}
          />
        ) : (
          <div className="text-gray-300">
            <Laptop size={64} />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end max-w-[85%]">
          {isBorrowed ? (
            <span className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 backdrop-blur-sm max-w-full">
              <Clock size={12} className="shrink-0" />
              <span className="truncate block">
                {t("testDeviceFeat.borrowed")} ({currentLog?.user?.name || currentLog?.user?.email || t("testDeviceFeat.someone")})
              </span>
            </span>
          ) : (
            <>
              <span className="px-4 py-1.5 bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-sm">{t("testDeviceFeat.available")}</span>
              <button 
                onClick={(e) => { e.preventDefault(); handleRemoveDevice(device.id); }}
                disabled={loadingId === device.id}
                className="p-2 bg-red-500 text-white rounded-xl shadow-sm hover:bg-red-600 transition-colors"
                title={t("testDeviceFeat.removeFromTest")}
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="text-xs font-semibold text-[var(--text-subtle)] mb-1">{device.code}</div>
        <div className="hover:text-brand-600 transition-colors">
          <h3 className="font-bold text-lg text-[var(--text-default)] mb-2 line-clamp-2">{device.name}</h3>
        </div>

        {/* Nickname / Note Section */}
        <div className="mb-4">
          {editingNoteId === device.id ? (
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={editNoteValue}
                onChange={e => setEditNoteValue(e.target.value)}
                placeholder={t("testDeviceFeat.nicknamePlaceholder")}
                className="flex-1 text-sm border border-[var(--border-strong)] rounded-xl px-2 py-1 outline-none focus:border-brand-500"
                autoFocus
              />
              <button onClick={onSaveNote} disabled={loadingId === device.id + "-note"} className="p-1.5 bg-brand-500/10 text-brand-700 rounded-xl hover:bg-brand-500/20 disabled:opacity-50">
                <Save size={14} />
              </button>
              <button onClick={() => setEditingNoteId(null)} className="p-1.5 bg-[var(--surface-hover)] text-[var(--text-muted)] rounded-xl hover:bg-gray-200">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between group/note gap-2">
              <div className="text-sm text-[var(--text-muted)] bg-[var(--surface-raised)] px-2.5 py-1.5 rounded-xl border border-[var(--border)] flex-1 min-h-[32px] break-words shadow-sm">
                {device.testDeviceNote ? (
                  <span className="font-semibold text-brand-700">{device.testDeviceNote}</span>
                ) : (
                  <span className="text-[var(--text-muted)] italic text-xs">{t("testDeviceFeat.noNickname")}</span>
                )}
              </div>
              <button 
                onClick={() => { setEditingNoteId(device.id); setEditNoteValue(device.testDeviceNote || ""); }}
                className="p-1.5 text-[var(--text-muted)] hover:text-brand-600 opacity-0 group-hover/note:opacity-100 transition-opacity"
                title={t("testDeviceFeat.editNickname")}
              >
                <Edit2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Removed amber box based on user feedback */}

        <div className="mt-auto pt-2">
          {!isBorrowed ? (
            <button
              disabled={loadingId === device.id}
              onClick={() => handleBorrow(device.id)}
              className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loadingId === device.id ? t("testDeviceFeat.processing") : t("testDeviceFeat.borrowNow")}
            </button>
          ) : (isMyBorrow || isAdmin) ? (
            <button
              disabled={loadingId === device.id}
              onClick={() => handleReturn(device.id)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(5,150,105,0.3)] flex justify-center items-center gap-2 disabled:opacity-70"
            >
              {loadingId === device.id ? t("testDeviceFeat.processing") : t("testDeviceFeat.returnDevice")}
            </button>
          ) : (
            <button
              disabled
              className="w-full py-2.5 bg-gray-200 text-[var(--text-subtle)] rounded-xl font-medium cursor-not-allowed flex justify-center items-center px-2"
            >
              {t("testDeviceFeat.borrowedByOthers")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
