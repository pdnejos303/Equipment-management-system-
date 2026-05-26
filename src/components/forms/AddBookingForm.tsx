// Path: src/components/forms/AddBookingForm.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { FormFooter } from "@/components/ui/FormFooter";
import { SearchablePicker, type PickerItem } from "@/components/ui/SearchablePicker";
import { BorrowerSelect, type BorrowerValue } from "@/components/forms/BorrowerSelect";
import { useI18n } from "@/lib/i18n";
import { useFormSubmit } from "@/lib/useFormSubmit";
import { useCategories } from "@/lib/useCategories";
import { showError } from "@/lib/swal";

interface Props {
  open: boolean;
  onClose: () => void;
  assets: { id: string; code: string; name: string; category: string }[];
  preselectedAssetId?: string;
}

export function AddBookingForm({ open, onClose, assets, preselectedAssetId }: Props) {
  const { t } = useI18n();
  const { labelFor } = useCategories();
  const [form, setForm] = useState({
    assetId: preselectedAssetId || "",
    userId: undefined as string | undefined,
    personName: "",
    dateStart: "",
    dateEnd: "",
    purpose: "",
    conditionBefore: "",
  });

  useEffect(() => {
    if (open) {
      setForm((f) => ({ ...f, assetId: preselectedAssetId || "" }));
    }
  }, [open, preselectedAssetId]);

  const preselectedAsset = useMemo(
    () => assets.find((a) => a.id === preselectedAssetId),
    [assets, preselectedAssetId]
  );

  const pickerItems: PickerItem[] = useMemo(
    () =>
      assets.map((a) => ({
        id: a.id,
        primary: a.code,
        secondary: a.name,
        tertiary: labelFor(a.category),
        searchText: `${a.code} ${a.name} ${labelFor(a.category)}`,
      })),
    [assets, labelFor]
  );

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setBorrower = (b: BorrowerValue) =>
    setForm((f) => ({ ...f, userId: b.userId, personName: b.personName }));

  const { submit, loading } = useFormSubmit({
    url: "/api/bookings",
    successTitle: t("forms.bookAsset"),
    onSuccess: () => onClose(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assetId) return;
    if (!form.userId && !form.personName.trim()) return;
    if (form.dateStart && form.dateEnd && form.dateEnd < form.dateStart) {
      showError(t("forms.error"), t("forms.dateEndBeforeStart"));
      return;
    }
    submit(form);
  };

  return (
    <Modal open={open} onClose={onClose} title={t("forms.bookAsset")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {preselectedAsset ? (
          <div className="rounded-lg border border-border bg-surface-dark px-3 py-2.5">
            <p className="text-xs text-gray-500 font-semibold mb-0.5">{t("forms.selectEquip")}</p>
            <p className="font-mono text-sm text-brand-500">{preselectedAsset.code}</p>
            <p className="text-sm" style={{ color: "var(--text-default)" }}>{preselectedAsset.name}</p>
          </div>
        ) : (
          <div>
            <label className="block text-xs text-gray-500 font-semibold mb-2">{t("forms.selectEquip")} *</label>
            <SearchablePicker
              items={pickerItems}
              selectedId={form.assetId}
              onSelect={(id) => set("assetId", id)}
              autoFocus
            />
          </div>
        )}
        <BorrowerSelect
          value={{ userId: form.userId, personName: form.personName }}
          onChange={setBorrower}
          externalLabel={t("forms.bookerName")}
        />
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
          disabled={
            !form.assetId ||
            (!form.userId && !form.personName.trim())
          }
        />
      </form>
    </Modal>
  );
}
