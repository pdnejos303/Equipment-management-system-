// Path: src/components/forms/AddAssetForm.tsx
"use client";

import { useState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { FormFooter } from "@/components/ui/FormFooter";
import { useI18n } from "@/lib/i18n";
import { useFormSubmit } from "@/lib/useFormSubmit";
import { useCategories } from "@/lib/useCategories";
import { AISuggestCategory, AISuggestLifespan, AISuggestNotes } from "@/components/AISuggest";
import { CategoryFilter } from "@/components/ui/CategoryFilter";
import { swal } from "@/lib/swal";

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="section-label mb-3">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

type BulkItem = {
  id: string;
  code: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
};

function newItem(id: string): BulkItem {
  return { id, code: "", name: "", brand: "", model: "", serialNumber: "" };
}

const RESET_FIELDS = { code: "", name: "", brand: "", model: "", serialNumber: "", notes: "" };

export function AddAssetForm({ open, onClose }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const { categories } = useCategories();
  const uid = useId();
  
  const [bulkMode, setBulkMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addAnother, setAddAnother] = useState(false);

  // Single mode form
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

  // Bulk mode state
  const [shared, setShared] = useState({
    category: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    purchasePrice: "",
    expectedLife: "4",
    warrantyEnd: "",
    location: "",
  });
  const [items, setItems] = useState<BulkItem[]>([
    newItem(`${uid}-0`),
    newItem(`${uid}-1`),
    newItem(`${uid}-2`),
  ]);

  useEffect(() => {
    if (categories.length > 0) {
      if (!form.category) setForm((f) => ({ ...f, category: categories[0].key }));
      if (!shared.category) setShared((s) => ({ ...s, category: categories[0].key }));
    }
  }, [categories, form.category, shared.category]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setS = (k: string, v: string) => setShared((s) => ({ ...s, [k]: v }));

  const addItem = () =>
    setItems((prev) => [...prev, newItem(`${uid}-${Date.now()}`)]);

  const removeItem = (id: string) =>
    setItems((prev) => prev.length > 1 ? prev.filter((r) => r.id !== id) : prev);

  const updateItem = (id: string, k: keyof Omit<BulkItem, "id">, v: string) =>
    setItems((prev) => prev.map((r) => r.id === id ? { ...r, [k]: v } : r));

  // Single mode submit
  const { submit, loading: singleLoading } = useFormSubmit({
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
    onSuccess: (asset) => {
      if (addAnother) {
        setForm((f) => ({ ...f, ...RESET_FIELDS }));
        setAddAnother(false);
      } else {
        onClose();
      }
      router.refresh();
    },
  });

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(form);
  };

  const handleAddAnother = (e: React.FormEvent) => {
    e.preventDefault();
    setAddAnother(true);
    submit(form);
  };

  // Bulk mode submit
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filled = items
      .map((item, idx) => ({ item, originalIdx: idx }))
      .filter(({ item }) => item.code.trim() && item.name.trim());
    if (filled.length === 0) return;

    setSaving(true);
    const results = await Promise.allSettled(
      filled.map(({ item }) =>
        fetch("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: item.code.trim(),
            name: item.name.trim(),
            brand: item.brand.trim() || undefined,
            model: item.model.trim() || undefined,
            serialNumber: item.serialNumber.trim() || undefined,
            category: shared.category,
            purchaseDate: shared.purchaseDate,
            purchasePrice: parseFloat(shared.purchasePrice),
            expectedLife: parseInt(shared.expectedLife),
            warrantyEnd: shared.warrantyEnd || undefined,
            location: shared.location.trim() || undefined,
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            const msg = data.error ?? "เกิดข้อผิดพลาด";
            const details: { path: string[]; message: string }[] = data.details ?? [];
            const detail = details.length > 0
              ? ` (${details.map((d) => `${d.path.join(".")}: ${d.message}`).join(", ")})`
              : "";
            throw new Error(msg + detail);
          }
          return res.json();
        })
      )
    );
    setSaving(false);

    const okCount = results.filter((r) => r.status === "fulfilled").length;
    const failures = results
      .map((r, i) => ({ r, entry: filled[i] }))
      .filter(({ r }) => r.status === "rejected") as {
        r: PromiseRejectedResult;
        entry: { item: BulkItem; originalIdx: number };
      }[];

    if (failures.length === 0) {
      await swal.fire({
        icon: "success",
        title: t("newAsset.bulkSuccessMsg"),
        text: `${okCount} ${t("newAsset.bulkItems")}`,
        timer: 2000,
        showConfirmButton: false,
      });
      onClose();
      router.refresh();
    } else {
      const failRows = failures
        .map(({ r, entry }) => {
          const rowNum = entry.originalIdx + 1;
          const label = [entry.item.code, entry.item.name].filter(Boolean).join(" — ");
          const reason = r.reason instanceof Error ? r.reason.message : String(r.reason);
          return `<div style="padding:6px 0;border-bottom:1px solid #2a2a2a">
            <span style="color:#f59e0b;font-weight:600;font-size:12px">แถว ${rowNum}</span>
            <span style="color:#ededed;font-size:12px;margin-left:6px">${label}</span>
            <p style="color:#f87171;font-size:12px;margin:3px 0 0">${reason}</p>
          </div>`;
        })
        .join("");

      const summaryLine = okCount > 0
        ? `<p style="color:#9ca3af;font-size:13px;margin-bottom:10px">สำเร็จ ${okCount} ชิ้น · ล้มเหลว ${failures.length} ชิ้น</p>`
        : `<p style="color:#f87171;font-size:13px;margin-bottom:10px">ล้มเหลวทั้งหมด ${failures.length} ชิ้น</p>`;

      await swal.fire({
        icon: failures.length === filled.length ? "error" : "warning",
        title: "บันทึกไม่สำเร็จทั้งหมด",
        html: `${summaryLine}<div style="text-align:left;max-height:240px;overflow-y:auto">${failRows}</div>`,
      });
      if (okCount > 0) {
        onClose();
        router.refresh();
      }
    }
  };

  const filledCount = items.filter((r) => r.code.trim() && r.name.trim()).length;

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title={
        <div className="flex items-center gap-3">
          <span>{t("newAsset.title")}</span>
          <div className="flex items-center gap-1 p-0.5 rounded-lg text-sm font-normal" style={{ background: "var(--surface-2)" }}>
            <button
              type="button"
              onClick={() => setBulkMode(false)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
              style={!bulkMode ? { background: "#f59e0b", color: "#000" } : { color: "var(--text-muted)" }}
            >
              {t("newAsset.singleMode")}
            </button>
            <button
              type="button"
              onClick={() => setBulkMode(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
              style={bulkMode ? { background: "#f59e0b", color: "#000" } : { color: "var(--text-muted)" }}
            >
              {t("newAsset.bulkMode")}
            </button>
          </div>
        </div>
      } 
      width={bulkMode ? "max-w-4xl" : "max-w-2xl"}
    >
      {!bulkMode ? (
        /* ── Single Mode ── */
        <form onSubmit={handleSingleSubmit} className="space-y-5">
          <div>
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
                <CategoryFilter
                  value={form.category}
                  onChange={(val) => set("category", val)}
                  hideAllOption={true}
                  className="w-full"
                />
              </Field>
            </Section>
          </div>

          <div>
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
            submitting={singleLoading}
            extras={
              <button
                type="button"
                onClick={handleAddAnother}
                disabled={singleLoading}
                className="btn-ghost disabled:opacity-50"
              >
                {t("newAsset.saveAndAddAnother")}
              </button>
            }
          />
        </form>
      ) : (
        /* ── Bulk Mode ── */
        <form onSubmit={handleBulkSubmit} className="space-y-6 pt-2">
          {/* Shared fields */}
          <div>
            <Section title={t("newAsset.sharedFields")}>
              <Field label={t("newAsset.category")}>
                <CategoryFilter
                  value={shared.category}
                  onChange={(val) => setS("category", val)}
                  hideAllOption={true}
                  className="w-full"
                />
              </Field>
              <Field label={t("newAsset.purchaseDate")} required>
                <input
                  type="date"
                  value={shared.purchaseDate}
                  onChange={(e) => setS("purchaseDate", e.target.value)}
                  required
                  className="input"
                />
              </Field>
              <Field label={t("newAsset.price")} required>
                <input
                  type="number"
                  value={shared.purchasePrice}
                  onChange={(e) => setS("purchasePrice", e.target.value)}
                  required
                  min="0"
                  placeholder="0"
                  className="input"
                />
              </Field>
              <Field label={t("newAsset.lifespan")} required>
                <input
                  type="number"
                  value={shared.expectedLife}
                  onChange={(e) => setS("expectedLife", e.target.value)}
                  required
                  min="1"
                  className="input"
                />
              </Field>
              <Field label={t("newAsset.warrantyEnd")}>
                <input
                  type="date"
                  value={shared.warrantyEnd}
                  onChange={(e) => setS("warrantyEnd", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label={t("newAsset.location")}>
                <input
                  value={shared.location}
                  onChange={(e) => setS("location", e.target.value)}
                  className="input"
                />
              </Field>
            </Section>
          </div>

          {/* Per-item rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="section-label">{t("newAsset.bulkItems")}</h3>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {filledCount} / {items.length}
              </span>
            </div>

            {/* Column headers */}
            <div
              className="grid gap-2 text-xs font-semibold pb-1 border-b"
              style={{
                gridTemplateColumns: "2rem 1fr 1.5fr 1fr 1fr 1.2fr 2rem",
                color: "var(--text-muted)",
                borderColor: "var(--border)",
              }}
            >
              <span>#</span>
              <span>{t("newAsset.code")} *</span>
              <span>{t("newAsset.name")} *</span>
              <span>{t("newAsset.brand")}</span>
              <span>{t("newAsset.model")}</span>
              <span>{t("newAsset.serialNumber")}</span>
              <span />
            </div>

            {/* Rows */}
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="grid gap-2 items-center"
                  style={{ gridTemplateColumns: "2rem 1fr 1.5fr 1fr 1fr 1.2fr 2rem" }}
                >
                  <span className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                    {idx + 1}
                  </span>
                  <input
                    value={item.code}
                    onChange={(e) => updateItem(item.id, "code", e.target.value)}
                    placeholder="EQ-00x"
                    className="input py-1.5 text-sm"
                  />
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(item.id, "name", e.target.value)}
                    className="input py-1.5 text-sm"
                  />
                  <input
                    value={item.brand}
                    onChange={(e) => updateItem(item.id, "brand", e.target.value)}
                    className="input py-1.5 text-sm"
                  />
                  <input
                    value={item.model}
                    onChange={(e) => updateItem(item.id, "model", e.target.value)}
                    className="input py-1.5 text-sm"
                  />
                  <input
                    value={item.serialNumber}
                    onChange={(e) => updateItem(item.id, "serialNumber", e.target.value)}
                    className="input py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length <= 1}
                    className="flex items-center justify-center w-7 h-7 rounded-md text-xs transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-20"
                    style={{ color: "var(--text-muted)" }}
                    title={t("newAsset.removeRow")}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addItem}
              className="btn-ghost text-sm w-full mt-2"
            >
              {t("newAsset.addRow")}
            </button>
          </div>

          <FormFooter
            cancelLabel={t("newAsset.cancel")}
            onCancel={onClose}
            submitLabel={
              saving
                ? t("newAsset.savingAll")
                : `${t("newAsset.submitAll")} (${filledCount})`
            }
            submitting={saving}
            disabled={filledCount === 0 || !shared.purchasePrice}
          />
        </form>
      )}
    </Modal>
  );
}
