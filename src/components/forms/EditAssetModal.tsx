// Path: src/components/forms/EditAssetModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useCategories } from "@/lib/useCategories";
import { CategoryFilter } from "@/components/ui/CategoryFilter";
import { showSuccess, showError } from "@/lib/swal";
import { Modal } from "@/components/ui/Modal";

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

export function EditAssetModal({
  assetId,
  open,
  onClose,
}: {
  assetId: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const { categories } = useCategories();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/assets/${assetId}`)
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
  }, [assetId, open, t]);

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...form,
        purchasePrice: parseFloat(form.purchasePrice) || 0,
        expectedLife: parseInt(form.expectedLife) || 0,
        warrantyEnd: form.warrantyEnd || null,
        nextMaintenance: form.nextMaintenance || null,
      };
      const res = await fetch(`/api/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { showError(t("editAsset.saveFailed")); setSaving(false); return; }
      showSuccess(t("editAsset.title"), t("dashboard.savedSuccess"));
      router.refresh();
      onClose();
      setSaving(false);
    } catch { showError(t("editAsset.error")); setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("editAsset.title")} width="max-w-2xl">
      {loading ? (
        <div className="py-20 text-center text-[var(--text-muted)]">{t("editAsset.loading")}</div>
      ) : !form ? (
        <div className="py-20 text-center text-red-400">{error || t("editAsset.notFound")}</div>
      ) : (
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
                <CategoryFilter
                  value={form.category}
                  onChange={(val) => set("category", val)}
                  hideAllOption={true}
                  className="w-full"
                />
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

          <div className="pt-4 mt-2 flex justify-end gap-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn-ghost"
            >
              {t("editAsset.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? t("editAsset.saving") : t("editAsset.save")}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
