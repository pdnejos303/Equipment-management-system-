// Path: src/components/forms/AddAssetForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { FormFooter } from "@/components/ui/FormFooter";
import { useI18n } from "@/lib/i18n";
import { useFormSubmit } from "@/lib/useFormSubmit";
import { useCategories } from "@/lib/useCategories";
import { AISuggestCategory, AISuggestLifespan, AISuggestNotes } from "@/components/AISuggest";

interface Props {
  open: boolean;
  onClose: () => void;
}

function Field({
  label, required, hint, children,
}: {
  label: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
        <span>
          {label}
          {required && <span className="text-brand-500 ml-0.5">*</span>}
        </span>
        {hint}
      </label>
      {children}
    </div>
  );
}

const RESET_FIELDS = { code: "", name: "", brand: "", model: "", serialNumber: "", notes: "" };

export function AddAssetForm({ open, onClose }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const { categories } = useCategories();
  const [addAnother, setAddAnother] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    brand: "",
    model: "",
    serialNumber: "",
    category: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    purchasePrice: "",
    expectedLife: "4",
    warrantyEnd: "",
    location: "",
    notes: "",
  });

  useEffect(() => {
    if (!form.category && categories.length > 0) {
      setForm((f) => ({ ...f, category: categories[0].key }));
    }
  }, [categories, form.category]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { submit, loading } = useFormSubmit({
    url: "/api/assets",
    successTitle: t("newAsset.title"),
    fieldLabels: {
      code: t("newAsset.code"),
      name: t("newAsset.name"),
      brand: t("newAsset.brand"),
      model: t("newAsset.model"),
      serialNumber: t("newAsset.serialNumber"),
      category: t("newAsset.category"),
      purchaseDate: t("newAsset.purchaseDate"),
      purchasePrice: t("newAsset.price"),
      expectedLife: t("newAsset.lifespan"),
      warrantyEnd: t("newAsset.warrantyEnd"),
      location: t("newAsset.location"),
      notes: t("newAsset.notes"),
    },
    transform: (f) => ({
      ...f,
      purchasePrice: parseFloat(f.purchasePrice),
      expectedLife: parseInt(f.expectedLife),
      warrantyEnd: f.warrantyEnd || undefined,
    }),
    onSuccess: () => {
      if (addAnother) {
        setForm((f) => ({ ...f, ...RESET_FIELDS }));
        setAddAnother(false);
      } else {
        onClose();
      }
      router.refresh();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(form);
  };

  const handleAddAnother = (e: React.FormEvent) => {
    e.preventDefault();
    setAddAnother(true);
    submit(form);
  };

  return (
    <Modal open={open} onClose={onClose} title={t("newAsset.title")} width="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <h3 className="section-label mb-3">{t("newAsset.basicInfo")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t("newAsset.code")} required>
              <input
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                required
                placeholder={t("newAsset.codePlaceholder")}
                className="input"
              />
            </Field>
            <Field label={t("newAsset.name")} required>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                className="input"
              />
            </Field>
            <Field label={t("newAsset.brand")}>
              <input value={form.brand} onChange={(e) => set("brand", e.target.value)} className="input" />
            </Field>
            <Field label={t("newAsset.model")}>
              <input value={form.model} onChange={(e) => set("model", e.target.value)} className="input" />
            </Field>
            <Field label={t("newAsset.serialNumber")}>
              <input
                value={form.serialNumber}
                onChange={(e) => set("serialNumber", e.target.value)}
                className="input"
              />
            </Field>
            <Field
              label={t("newAsset.category")}
              hint={
                <AISuggestCategory
                  name={form.name}
                  brand={form.brand}
                  model={form.model}
                  onSuggest={(cat) => set("category", cat)}
                />
              }
            >
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="select"
              >
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.emoji ? `${c.emoji} ` : ""}{c.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div>
          <h3 className="section-label mb-3">{t("newAsset.purchaseInfo")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t("newAsset.purchaseDate")} required>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => set("purchaseDate", e.target.value)}
                required
                className="input"
              />
            </Field>
            <Field label={t("newAsset.price")} required>
              <input
                type="number"
                value={form.purchasePrice}
                onChange={(e) => set("purchasePrice", e.target.value)}
                required
                min="0"
                className="input"
              />
            </Field>
            <Field
              label={t("newAsset.lifespan")}
              required
              hint={
                <AISuggestLifespan
                  name={form.name}
                  category={form.category}
                  brand={form.brand}
                  onSuggest={(years) => set("expectedLife", years)}
                />
              }
            >
              <input
                type="number"
                value={form.expectedLife}
                onChange={(e) => set("expectedLife", e.target.value)}
                required
                min="1"
                className="input"
              />
            </Field>
            <Field label={t("newAsset.warrantyEnd")}>
              <input
                type="date"
                value={form.warrantyEnd}
                onChange={(e) => set("warrantyEnd", e.target.value)}
                className="input"
              />
            </Field>
          </div>
        </div>

        <div>
          <h3 className="section-label mb-3">{t("newAsset.extraInfo")}</h3>
          <div className="space-y-3">
            <Field label={t("newAsset.location")}>
              <input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                className="input"
              />
            </Field>
            <Field
              label={t("newAsset.notes")}
              hint={
                <AISuggestNotes
                  name={form.name}
                  category={form.category}
                  brand={form.brand}
                  model={form.model}
                  onSuggest={(notes) => set("notes", notes)}
                />
              }
            >
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                className="textarea"
              />
            </Field>
          </div>
        </div>

        <FormFooter
          cancelLabel={t("newAsset.cancel")}
          onCancel={onClose}
          submitLabel={t("newAsset.submit")}
          submittingLabel={t("newAsset.saving")}
          submitting={loading}
          extras={
            <button
              type="button"
              onClick={handleAddAnother}
              disabled={loading}
              className="btn-ghost disabled:opacity-50"
            >
              {t("newAsset.saveAndAddAnother")}
            </button>
          }
        />
      </form>
    </Modal>
  );
}
