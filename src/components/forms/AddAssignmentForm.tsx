// Path: src/components/forms/AddAssignmentForm.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { FormFooter } from "@/components/ui/FormFooter";
import { SearchablePicker, type PickerItem } from "@/components/ui/SearchablePicker";
import { BorrowerSelect, type BorrowerValue } from "@/components/forms/BorrowerSelect";
import { useI18n } from "@/lib/i18n";
import { useFormSubmit } from "@/lib/useFormSubmit";
import { useCategories } from "@/lib/useCategories";

interface Asset {
  id: string;
  code: string;
  name: string;
  status: string;
  category?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  assets: Asset[];
  preselectedAssetId?: string;
}

export function AddAssignmentForm({ open, onClose, assets, preselectedAssetId }: Props) {
  const { t } = useI18n();
  const { labelFor } = useCategories();
  const [form, setForm] = useState({
    assetId: preselectedAssetId || "",
    userId: undefined as string | undefined,
    personName: "",
    dateOut: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  useEffect(() => {
    if (open) {
      setForm((f) => ({ ...f, assetId: preselectedAssetId || "" }));
    }
  }, [open, preselectedAssetId]);

  const available = useMemo(() => assets.filter((a) => a.status === "AVAILABLE"), [assets]);
  const preselectedAsset = useMemo(
    () => assets.find((a) => a.id === preselectedAssetId),
    [assets, preselectedAssetId]
  );

  const pickerItems: PickerItem[] = useMemo(
    () =>
      available.map((a) => ({
        id: a.id,
        primary: a.code,
        secondary: a.name,
        tertiary: a.category ? labelFor(a.category) : undefined,
        searchText: `${a.code} ${a.name} ${a.category ? labelFor(a.category) : ""}`,
      })),
    [available, labelFor]
  );

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setBorrower = (b: BorrowerValue) =>
    setForm((f) => ({ ...f, userId: b.userId, personName: b.personName }));

  const { submit, loading } = useFormSubmit({
    url: "/api/assignments",
    successTitle: t("forms.assign"),
    onSuccess: () => onClose(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assetId) return;
    if (!form.userId && !form.personName.trim()) return;
    submit(form);
  };

  return (
    <Modal open={open} onClose={onClose} title={t("forms.assign")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {preselectedAsset ? (
          <div className="rounded-lg border border-border bg-surface-dark px-3 py-2.5">
            <p className="text-xs text-gray-500 font-semibold mb-0.5">{t("forms.availableOnly")}</p>
            <p className="font-mono text-sm text-brand-500">{preselectedAsset.code}</p>
            <p className="text-sm" style={{ color: "var(--text-default)" }}>{preselectedAsset.name}</p>
          </div>
        ) : (
          <div>
            <label className="block text-xs text-gray-500 font-semibold mb-2">
              {t("forms.availableOnly")} *
            </label>
            <SearchablePicker
              items={pickerItems}
              selectedId={form.assetId}
              onSelect={(id) => set("assetId", id)}
              emptyText={t("forms.noAvailable")}
              autoFocus
            />
          </div>
        )}
        <BorrowerSelect
          value={{ userId: form.userId, personName: form.personName }}
          onChange={setBorrower}
        />
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
          disabled={
            available.length === 0 ||
            !form.assetId ||
            (!form.userId && !form.personName.trim())
          }
        />
      </form>
    </Modal>
  );
}
