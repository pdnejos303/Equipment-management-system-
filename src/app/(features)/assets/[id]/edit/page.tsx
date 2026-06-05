// Path: src/app/(features)/assets/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useCategories } from "@/lib/useCategories";
import { showSuccess, showError } from "@/lib/swal";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormFooter } from "@/components/ui/FormFooter";

function Field({
  label, required, children,
}: {
  label: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
        <span>
          {label}
          {required && <span className="text-brand-500 ml-0.5">*</span>}
        </span>
      </label>
      {children}
    </div>
  );
}

export default function EditAssetPage() {
  const router = useRouter(); // royter object สำหรับ navigate ระหว่างหน้า
  const params = useParams(); // ดึง URL params เพื่อรู้ว่ากำลัง edit asset ไหน
  const { t } = useI18n(); // translation function 
  const { categories } = useCategories();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);  
  const [error, setError] = useState("");  // kept for load-time errors only
  const [form, setForm] = useState<any>(null); // any ก็คือไม่สน type 

  useEffect(() => {
    fetch(`/api/assets/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          name: data.name || "",
          brand: data.brand || "",
          model: data.model || "",
          serialNumber: data.serialNumber || "",
          category: data.category || "LAPTOP",
          status: data.status || "AVAILABLE",
          purchaseDate: data.purchaseDate?.slice(0, 10) || "",
          purchasePrice: data.purchasePrice || "",
          expectedLife: data.expectedLife || 4,
          warrantyEnd: data.warrantyEnd?.slice(0, 10) || "",
          nextMaintenance: data.nextMaintenance?.slice(0, 10) || "",
          location: data.location || "",
          notes: data.notes || "",
        });
        setLoading(false);
      })
      .catch(() => { setError(t("editAsset.notFound")); setLoading(false); });
  }, [params.id, t]);

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...form,
        purchasePrice: parseFloat(form.purchasePrice),
        expectedLife: parseInt(form.expectedLife),
        warrantyEnd: form.warrantyEnd || null,
        nextMaintenance: form.nextMaintenance || null,
      };
      const res = await fetch(`/api/assets/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { showError(t("editAsset.saveFailed")); setSaving(false); return; }
      await showSuccess(t("editAsset.title"), t("dashboard.savedSuccess"));
      router.push(`/assets/${params.id}`);
      router.refresh();
    } catch { showError(t("editAsset.error")); setSaving(false); }
  };

  if (loading) return <div className="py-20 text-center text-gray-500">{t("editAsset.loading")}</div>;
  if (!form) return <div className="py-20 text-center text-red-400">{error || t("editAsset.notFound")}</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        backHref={`/assets/${params.id}`}
        backLabel={t("editAsset.back")}
        title={t("editAsset.title")}
      />
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section>
            <h3 className="section-label mb-3">{t("newAsset.basicInfo")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <Field label={t("editAsset.name")} required>
                <input value={form.name} onChange={(e) => set("name", e.target.value)} required className="input" />
              </Field>
              <Field label={t("editAsset.status")}>
                <select value={form.status} onChange={(e) => set("status", e.target.value)} className="select">
                  {["ACTIVE", "AVAILABLE", "MAINTENANCE", "RETIRED"].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                </select>
              </Field>
              <Field label={t("editAsset.brand")}>
                <input value={form.brand} onChange={(e) => set("brand", e.target.value)} className="input" />
              </Field>
              <Field label={t("editAsset.model")}>
                <input value={form.model} onChange={(e) => set("model", e.target.value)} className="input" />
              </Field>
              <Field label={t("editAsset.serialNumber")}>
                <input value={form.serialNumber} onChange={(e) => set("serialNumber", e.target.value)} className="input" />
              </Field>
              <Field label={t("editAsset.category")}>
                <select value={form.category} onChange={(e) => set("category", e.target.value)} className="select">
                  {categories.map((c) => (
                    <option key={c.key} value={c.key}>{c.emoji ? `${c.emoji} ` : ""}{c.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section>
            <h3 className="section-label mb-3">{t("newAsset.purchaseInfo")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <Field label={t("editAsset.purchaseDate")} required>
                <input type="date" value={form.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} required className="input" />
              </Field>
              <Field label={t("editAsset.price")}>
                <input type="number" value={form.purchasePrice} onChange={(e) => set("purchasePrice", e.target.value)} className="input" />
              </Field>
              <Field label={t("editAsset.lifespan")}>
                <input type="number" value={form.expectedLife} onChange={(e) => set("expectedLife", e.target.value)} className="input" />
              </Field>
              <Field label={t("editAsset.warrantyEnd")}>
                <input type="date" value={form.warrantyEnd} onChange={(e) => set("warrantyEnd", e.target.value)} className="input" />
              </Field>
              <Field label={t("editAsset.nextMaint")}>
                <input type="date" value={form.nextMaintenance} onChange={(e) => set("nextMaintenance", e.target.value)} className="input" />
              </Field>
            </div>
          </section>

          <section>
            <h3 className="section-label mb-3">{t("newAsset.extraInfo")}</h3>
            <div className="space-y-3">
              <Field label={t("editAsset.location")}>
                <input value={form.location} onChange={(e) => set("location", e.target.value)} className="input" />
              </Field>
              <Field label={t("editAsset.notes")}>
                <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className="textarea" />
              </Field>
            </div>
          </section>

          <FormFooter
            className="mt-2 pt-4 border-t border-border"
            cancelLabel={t("editAsset.cancel")}
            cancelHref={`/assets/${params.id}`}
            submitLabel={t("editAsset.save")}
            submittingLabel={t("editAsset.saving")}
            submitting={saving}
          />
        </form>
      </div>
    </div>
  );
}
