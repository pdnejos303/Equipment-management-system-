// Path: src/components/forms/AddAssignmentForm.tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { FormFooter } from "@/components/ui/FormFooter";
import { useI18n } from "@/lib/i18n";
import { useFormSubmit } from "@/lib/useFormSubmit";

interface Props {
  open: boolean;
  onClose: () => void;
  assets: { id: string; code: string; name: string; status: string }[];
}

export function AddAssignmentForm({ open, onClose, assets }: Props) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    assetId: "",
    personName: "",
    department: "",
    dateOut: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const available = assets.filter((a) => a.status === "AVAILABLE");
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { submit, loading } = useFormSubmit({
    url: "/api/assignments",
    successTitle: t("forms.assign"),
    onSuccess: () => onClose(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(form);
  };

  return (
    <Modal open={open} onClose={onClose} title={t("forms.assign")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 font-semibold mb-1">{t("forms.availableOnly")} *</label>
          <select value={form.assetId} onChange={(e) => set("assetId", e.target.value)} required className="input">
            <option value="">{t("forms.selectPlaceholder")}</option>
            {available.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
          {available.length === 0 && <p className="text-xs text-amber-400 mt-1">{t("forms.noAvailable")}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 font-semibold mb-1">{t("forms.personName")} *</label>
            <input value={form.personName} onChange={(e) => set("personName", e.target.value)} required maxLength={100} className="input" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 font-semibold mb-1">{t("forms.department")}</label>
            <input value={form.department} onChange={(e) => set("department", e.target.value)} className="input" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-semibold mb-1">{t("forms.dateOut")} *</label>
          <input type="date" value={form.dateOut} onChange={(e) => set("dateOut", e.target.value)} required className="input" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-semibold mb-1">{t("forms.notes")}</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} maxLength={500} className="input" />
        </div>
        <FormFooter
          cancelLabel={t("forms.cancel")}
          onCancel={onClose}
          submitLabel={t("forms.assign")}
          submittingLabel={t("forms.saving")}
          submitting={loading}
          disabled={available.length === 0}
        />
      </form>
    </Modal>
  );
}
