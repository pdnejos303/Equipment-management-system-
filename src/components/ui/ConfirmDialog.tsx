// Path: src/components/ui/ConfirmDialog.tsx
// ============================================================
// File: ConfirmDialog.tsx
// Path: equip-track/src/components/ui/ConfirmDialog.tsx
// Desc: Confirm dialog — ยืนยันก่อนลบ/ดำเนินการ
// ============================================================

"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText, danger = false }: Props) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // handled by caller
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-sm">
      <div className="flex gap-3 mb-6">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? "bg-red-500/10" : "bg-amber-500/10"}`}>
          <AlertTriangle size={20} className={danger ? "text-red-400" : "text-amber-400"} />
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{message}</p>
      </div>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} disabled={loading} className="btn-ghost">{t("confirm.cancel")}</button>
        <button onClick={handleConfirm} disabled={loading} className={danger ? "btn-danger" : "btn-primary"}>
          {loading ? t("confirm.processing") : (confirmText || t("confirm.ok"))}
        </button>
      </div>
    </Modal>
  );
}