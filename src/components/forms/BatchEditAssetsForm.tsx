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

const STATUSES = ["ACTIVE", "AVAILABLE", "MAINTENANCE", "RETIRED"] as const;
const UNCHANGED = "__unchanged__";

interface FormValues {
  status: string;
  category: string;
  location: string;
  expectedLife: string;
  warrantyEnd: string;
  nextMaintenance: string;
  notes: string;
}

const EMPTY: FormValues = {
  status: UNCHANGED,
  category: UNCHANGED,
  location: "",
  expectedLife: "",
  warrantyEnd: "",
  nextMaintenance: "",
  notes: "",
};

export function BatchEditAssetsForm({ open, onClose, assetIds }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const { categories } = useCategories();

  const [values, setValues] = useState<FormValues>(EMPTY);
  const [saving, setSaving] = useState(false);

  const hasChanges = useMemo(() => {
    return (
      values.status !== UNCHANGED ||
      values.category !== UNCHANGED ||
      values.location.trim() !== "" ||
      values.expectedLife.trim() !== "" ||
      values.warrantyEnd !== "" ||
      values.nextMaintenance !== "" ||
      values.notes.trim() !== ""
    );
  }, [values]);

  const setVal = <K extends keyof FormValues>(k: K, v: FormValues[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const reset = () => {
    setValues(EMPTY);
    setSaving(false);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges || assetIds.length === 0) return;

    const payload: Record<string, unknown> = {};
    if (values.status !== UNCHANGED) payload.status = values.status;
    if (values.category !== UNCHANGED) payload.category = values.category;
    if (values.location.trim() !== "") payload.location = values.location.trim();
    if (values.expectedLife.trim() !== "") {
      const n = parseInt(values.expectedLife, 10);
      if (!Number.isNaN(n)) payload.expectedLife = n;
    }
    if (values.warrantyEnd !== "") payload.warrantyEnd = values.warrantyEnd;
    if (values.nextMaintenance !== "") payload.nextMaintenance = values.nextMaintenance;
    if (values.notes.trim() !== "") payload.notes = values.notes;

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

  const fieldLabelCls = "text-xs font-semibold mb-1.5 block";
  const fieldLabelStyle = { color: "var(--text-muted)" };

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
          <div>
            <label className={fieldLabelCls} style={fieldLabelStyle}>
              {t("editAsset.status")}
            </label>
            <select
              value={values.status}
              onChange={(e) => setVal("status", e.target.value)}
              className="select w-full"
            >
              <option value={UNCHANGED}>{t("labels.leaveUnchanged")}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={fieldLabelCls} style={fieldLabelStyle}>
              {t("editAsset.category")}
            </label>
            <select
              value={values.category}
              onChange={(e) => setVal("category", e.target.value)}
              className="select w-full"
            >
              <option value={UNCHANGED}>{t("labels.leaveUnchanged")}</option>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.emoji ? `${c.emoji} ` : ""}
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={fieldLabelCls} style={fieldLabelStyle}>
              {t("editAsset.location")}
            </label>
            <input
              value={values.location}
              onChange={(e) => setVal("location", e.target.value)}
              placeholder={t("labels.leaveUnchanged")}
              className="input w-full"
            />
          </div>

          <div>
            <label className={fieldLabelCls} style={fieldLabelStyle}>
              {t("editAsset.lifespan")}
            </label>
            <input
              type="number"
              min="1"
              value={values.expectedLife}
              onChange={(e) => setVal("expectedLife", e.target.value)}
              placeholder={t("labels.leaveUnchanged")}
              className="input w-full"
            />
          </div>

          <div>
            <label className={fieldLabelCls} style={fieldLabelStyle}>
              {t("editAsset.warrantyEnd")}
            </label>
            <input
              type="date"
              value={values.warrantyEnd}
              onChange={(e) => setVal("warrantyEnd", e.target.value)}
              className="input w-full"
            />
          </div>

          <div>
            <label className={fieldLabelCls} style={fieldLabelStyle}>
              {t("editAsset.nextMaint")}
            </label>
            <input
              type="date"
              value={values.nextMaintenance}
              onChange={(e) => setVal("nextMaintenance", e.target.value)}
              className="input w-full"
            />
          </div>
        </div>

        <div>
          <label className={fieldLabelCls} style={fieldLabelStyle}>
            {t("editAsset.notes")}
          </label>
          <textarea
            value={values.notes}
            onChange={(e) => setVal("notes", e.target.value)}
            placeholder={t("labels.leaveUnchanged")}
            rows={3}
            className="textarea w-full"
          />
        </div>

        <FormFooter
          cancelLabel={t("editAsset.cancel")}
          onCancel={handleClose}
          submitLabel={t("labels.batchEditApply", assetIds.length)}
          submittingLabel={t("editAsset.saving")}
          submitting={saving}
          disabled={!hasChanges}
        />
      </form>
    </Modal>
  );
}
