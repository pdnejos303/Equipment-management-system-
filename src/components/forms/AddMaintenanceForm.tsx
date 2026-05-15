// Path: src/components/forms/AddMaintenanceForm.tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { FormFooter } from "@/components/ui/FormFooter";
import { useI18n } from "@/lib/i18n";
import { useFormSubmit } from "@/lib/useFormSubmit";
import { AISuggestMaintenance } from "@/components/AISuggest";

interface Props {
  open: boolean;
  onClose: () => void;
  assets: { id: string; code: string; name: string; category?: string }[];
  preselectedAssetId?: string;
}

export function AddMaintenanceForm({ open, onClose, assets, preselectedAssetId }: Props) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    assetId: preselectedAssetId || "",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    cost: "",
    vendor: "",
    type: "REPAIR",
    notes: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { submit, loading } = useFormSubmit({
    url: "/api/maintenance",
    successTitle: t("forms.addMaint"),
    onSuccess: () => onClose(),
    transform: (f) => ({ ...f, cost: parseFloat(f.cost) }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(form);
  };

  const selectedAsset = assets.find((a) => a.id === form.assetId);

  return (
    <Modal open={open} onClose={onClose} title={t("forms.addMaint")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 font-semibold mb-1">{t("forms.selectEquip")} *</label>
          <select value={form.assetId} onChange={(e) => set("assetId", e.target.value)} required className="input">
            <option value="">{t("forms.selectPlaceholder")}</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 font-semibold mb-1">{t("forms.date")} *</label>
            <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required className="input" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 font-semibold mb-1">{t("forms.type")}</label>
            <select value={form.type} onChange={(e) => set("type", e.target.value)} className="input">
              <option value="REPAIR">{t("maintType.REPAIR")}</option>
              <option value="PREVENTIVE">{t("maintType.PREVENTIVE")}</option>
              <option value="INSPECTION">{t("maintType.INSPECTION")}</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-semibold mb-1 flex items-center gap-2">
            {t("forms.description")} *
            {form.assetId && (
              <AISuggestMaintenance
                assetName={selectedAsset?.name || ""}
                category={selectedAsset?.category || "OTHER"}
                type={form.type}
                onSuggest={(desc, cost) => {
                  set("description", desc);
                  if (cost && !form.cost) set("cost", cost);
                }}
              />
            )}
          </label>
          <input value={form.description} onChange={(e) => set("description", e.target.value)} required maxLength={300} placeholder={t("forms.descPlaceholder")} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 font-semibold mb-1">{t("forms.cost")} *</label>
            <input type="number" value={form.cost} onChange={(e) => set("cost", e.target.value)} required min="0" className="input" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 font-semibold mb-1">{t("forms.vendor")}</label>
            <input value={form.vendor} onChange={(e) => set("vendor", e.target.value)} className="input" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-semibold mb-1">{t("forms.notes")}</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} maxLength={500} className="input" />
        </div>
        <FormFooter
          cancelLabel={t("forms.cancel")}
          onCancel={onClose}
          submitLabel={t("forms.save")}
          submittingLabel={t("forms.saving")}
          submitting={loading}
        />
      </form>
    </Modal>
  );
}
