// Path: src/components/forms/BatchEditAssetsForm.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { FormFooter } from "@/components/ui/FormFooter";
import { useI18n } from "@/lib/i18n";
import { useCategories } from "@/lib/useCategories";
import { showSuccess, showError } from "@/lib/swal";

interface Props {
  open: boolean;
  onClose: () => void;
  assetIds: string[];
}

type FieldKey =
  | "status"
  | "category"
  | "location"
  | "expectedLife"
  | "warrantyEnd"
  | "nextMaintenance"
  | "notes";

const STATUSES = ["ACTIVE", "AVAILABLE", "MAINTENANCE", "RETIRED"] as const;

function FieldRow({
  on,
  label,
  onToggle,
  children,
}: {
  on: boolean;
  label: string;
  onToggle: () => void;
  children: (disabled: boolean) => React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-3 transition-colors ${
        on
          ? "border-brand-500/40 bg-brand-500/5"
          : "border-border bg-surface-dark/40"
      }`}
    >
      <label className="flex items-center gap-2 text-xs font-semibold mb-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={on}
          onChange={onToggle}
          className="w-4 h-4 rounded border-gray-600 bg-surface-dark text-brand-500 focus:ring-brand-500 focus:ring-offset-0 cursor-pointer"
        />
        <span style={{ color: on ? "var(--text-default)" : "var(--text-muted)" }}>
          {label}
        </span>
      </label>
      <div className={on ? "" : "opacity-50 pointer-events-none"}>
        {children(!on)}
      </div>
    </div>
  );
}

export function BatchEditAssetsForm({ open, onClose, assetIds }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const { categories } = useCategories();

  const [enabled, setEnabled] = useState<Record<FieldKey, boolean>>({
    status: false,
    category: false,
    location: false,
    expectedLife: false,
    warrantyEnd: false,
    nextMaintenance: false,
    notes: false,
  });

  const [values, setValues] = useState({
    status: "AVAILABLE",
    category: "",
    location: "",
    expectedLife: "4",
    warrantyEnd: "",
    nextMaintenance: "",
    notes: "",
  });

  const [saving, setSaving] = useState(false);

  const anyEnabled = useMemo(
    () => Object.values(enabled).some(Boolean),
    [enabled]
  );

  const toggle = (k: FieldKey) =>
    setEnabled((prev) => ({ ...prev, [k]: !prev[k] }));

  const setVal = (k: keyof typeof values, v: string) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const reset = () => {
    setEnabled({
      status: false,
      category: false,
      location: false,
      expectedLife: false,
      warrantyEnd: false,
      nextMaintenance: false,
      notes: false,
    });
    setSaving(false);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anyEnabled || assetIds.length === 0) return;

    const payload: Record<string, unknown> = {};
    if (enabled.status) payload.status = values.status;
    if (enabled.category) payload.category = values.category || categories[0]?.key;
    if (enabled.location) payload.location = values.location;
    if (enabled.expectedLife) payload.expectedLife = parseInt(values.expectedLife, 10);
    if (enabled.warrantyEnd) payload.warrantyEnd = values.warrantyEnd || undefined;
    if (enabled.nextMaintenance) payload.nextMaintenance = values.nextMaintenance || undefined;
    if (enabled.notes) payload.notes = values.notes;

    setSaving(true);
    const results = await Promise.allSettled(
      assetIds.map((id) =>
        fetch(`/api/assets/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r;
        })
      )
    );

    const ok = results.filter((r) => r.status === "fulfilled").length;
    const fail = results.length - ok;

    if (fail === 0) {
      await showSuccess(t("labels.batchEditTitle"), t("labels.batchUpdatedSuccess", ok));
    } else if (ok === 0) {
      showError(t("labels.batchEditTitle"), t("labels.batchUpdateFailed"));
    } else {
      await showSuccess(t("labels.batchEditTitle"), t("labels.batchPartialSuccess", ok, fail));
    }

    reset();
    onClose();
    router.refresh();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t("labels.batchEditTitle", assetIds.length)}
      width="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {t("labels.batchEditHelp")}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldRow on={enabled.status} onToggle={() => toggle("status")} label={t("editAsset.status")}>
            {(disabled) => (
              <select
                value={values.status}
                onChange={(e) => setVal("status", e.target.value)}
                disabled={disabled}
                className="select w-full"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`status.${s}`)}
                  </option>
                ))}
              </select>
            )}
          </FieldRow>

          <FieldRow on={enabled.category} onToggle={() => toggle("category")} label={t("editAsset.category")}>
            {(disabled) => (
              <select
                value={values.category || categories[0]?.key || ""}
                onChange={(e) => setVal("category", e.target.value)}
                disabled={disabled}
                className="select w-full"
              >
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.emoji ? `${c.emoji} ` : ""}
                    {c.label}
                  </option>
                ))}
              </select>
            )}
          </FieldRow>

          <FieldRow on={enabled.location} onToggle={() => toggle("location")} label={t("editAsset.location")}>
            {(disabled) => (
              <input
                value={values.location}
                onChange={(e) => setVal("location", e.target.value)}
                disabled={disabled}
                className="input w-full"
              />
            )}
          </FieldRow>

          <FieldRow on={enabled.expectedLife} onToggle={() => toggle("expectedLife")} label={t("editAsset.lifespan")}>
            {(disabled) => (
              <input
                type="number"
                min="1"
                value={values.expectedLife}
                onChange={(e) => setVal("expectedLife", e.target.value)}
                disabled={disabled}
                className="input w-full"
              />
            )}
          </FieldRow>

          <FieldRow on={enabled.warrantyEnd} onToggle={() => toggle("warrantyEnd")} label={t("editAsset.warrantyEnd")}>
            {(disabled) => (
              <input
                type="date"
                value={values.warrantyEnd}
                onChange={(e) => setVal("warrantyEnd", e.target.value)}
                disabled={disabled}
                className="input w-full"
              />
            )}
          </FieldRow>

          <FieldRow on={enabled.nextMaintenance} onToggle={() => toggle("nextMaintenance")} label={t("editAsset.nextMaint")}>
            {(disabled) => (
              <input
                type="date"
                value={values.nextMaintenance}
                onChange={(e) => setVal("nextMaintenance", e.target.value)}
                disabled={disabled}
                className="input w-full"
              />
            )}
          </FieldRow>
        </div>

        <FieldRow on={enabled.notes} onToggle={() => toggle("notes")} label={t("editAsset.notes")}>
          {(disabled) => (
            <textarea
              value={values.notes}
              onChange={(e) => setVal("notes", e.target.value)}
              disabled={disabled}
              rows={3}
              className="textarea w-full"
            />
          )}
        </FieldRow>

        <FormFooter
          cancelLabel={t("editAsset.cancel")}
          onCancel={handleClose}
          submitLabel={t("labels.batchEditApply", assetIds.length)}
          submittingLabel={t("editAsset.saving")}
          submitting={saving}
          disabled={!anyEnabled}
        />
      </form>
    </Modal>
  );
}
