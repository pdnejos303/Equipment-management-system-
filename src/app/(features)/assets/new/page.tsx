// Path: src/app/(features)/assets/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useFormSubmit } from "@/lib/useFormSubmit";
import { useCategories } from "@/lib/useCategories";
import { AISuggestCategory, AISuggestLifespan, AISuggestNotes } from "@/components/AISuggest";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormFooter } from "@/components/ui/FormFooter";

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="section-label mb-3">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

export default function NewAssetPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { categories } = useCategories();
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

  const { submit, loading: saving } = useFormSubmit({
    url: "/api/assets",
    successTitle: t("newAsset.title"),
    transform: (f) => ({
      ...f,
      purchasePrice: parseFloat(f.purchasePrice),
      expectedLife: parseInt(f.expectedLife),
      warrantyEnd: f.warrantyEnd || undefined,
    }),
    onSuccess: (asset) => router.push(`/assets/${asset.id}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(form);
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        backHref="/assets"
        backLabel={t("newAsset.back")}
        title={t("newAsset.title")}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-6">
          <Section title={t("newAsset.basicInfo")}>
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
          </Section>
        </div>

        <div className="card space-y-6">
          <Section title={t("newAsset.purchaseInfo")}>
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
          </Section>
        </div>

        <div className="card space-y-4">
          <h2 className="section-label mb-1">{t("newAsset.extraInfo")}</h2>
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

        <FormFooter
          cancelLabel={t("newAsset.cancel")}
          cancelHref="/assets"
          submitLabel={t("newAsset.submit")}
          submittingLabel={t("newAsset.saving")}
          submitting={saving}
        />
      </form>
    </div>
  );
}
