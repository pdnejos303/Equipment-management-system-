// Path: src/components/forms/AddBookingForm.tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { FormFooter } from "@/components/ui/FormFooter";
import { useI18n } from "@/lib/i18n";
import { useFormSubmit } from "@/lib/useFormSubmit";
import { showError } from "@/lib/swal";

interface Props {
  open: boolean;
  onClose: () => void;
  assets: { id: string; code: string; name: string; category: string }[];
}

export function AddBookingForm({ open, onClose, assets }: Props) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    assetId: "",
    personName: "",
    dateStart: "",
    dateEnd: "",
    purpose: "",
    conditionBefore: "",
  });

  const bookable = assets.filter((a) => ["CAMERA", "PROJECTOR", "VEHICLE"].includes(a.category));
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { submit, loading } = useFormSubmit({
    url: "/api/bookings",
    successTitle: t("forms.bookAsset"),
    onSuccess: () => onClose(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.dateStart && form.dateEnd && form.dateEnd < form.dateStart) {
      showError(t("forms.error"), t("forms.dateEndBeforeStart"));
      return;
    }
    submit(form);
  };

  return (
    <Modal open={open} onClose={onClose} title={t("forms.bookAsset")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 font-semibold mb-1">{t("forms.selectEquip")} *</label>
          <select value={form.assetId} onChange={(e) => set("assetId", e.target.value)} required className="input">
            <option value="">{t("forms.selectPlaceholder")}</option>
            {bookable.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-semibold mb-1">{t("forms.bookerName")} *</label>
          <input value={form.personName} onChange={(e) => set("personName", e.target.value)} required maxLength={100} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 font-semibold mb-1">{t("forms.dateStart")} *</label>
            <input type="date" value={form.dateStart} onChange={(e) => set("dateStart", e.target.value)} required className="input" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 font-semibold mb-1">{t("forms.dateEnd")} *</label>
            <input type="date" value={form.dateEnd} onChange={(e) => set("dateEnd", e.target.value)} required className="input" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-semibold mb-1">{t("forms.purpose")}</label>
          <input value={form.purpose} onChange={(e) => set("purpose", e.target.value)} placeholder={t("forms.purposePlaceholder")} maxLength={200} className="input" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-semibold mb-1">{t("forms.conditionBefore")}</label>
          <input value={form.conditionBefore} onChange={(e) => set("conditionBefore", e.target.value)} placeholder={t("forms.conditionPlaceholder")} className="input" />
        </div>
        <FormFooter
          cancelLabel={t("forms.cancel")}
          onCancel={onClose}
          submitLabel={t("forms.bookBtn")}
          submittingLabel={t("forms.booking")}
          submitting={loading}
        />
      </form>
    </Modal>
  );
}
