// Path: src/components/forms/ReturnAssetForm.tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { FormFooter } from "@/components/ui/FormFooter";
import { useI18n } from "@/lib/i18n";
import { useFormSubmit } from "@/lib/useFormSubmit";

interface CurrentAssignment {
  id: string;
  assetCode: string;
  assetName: string;
  personName: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  assignments: CurrentAssignment[];
}

export function ReturnAssetForm({ open, onClose, assignments }: Props) {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState("");
  const [notes, setNotes] = useState("");

  const { submit, loading } = useFormSubmit({
    url: selectedId ? `/api/assignments/${selectedId}` : "",
    method: "PATCH",
    successTitle: t("forms.returnAsset"),
    onSuccess: () => onClose(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    submit({ dateIn: new Date().toISOString(), notes: notes || undefined });
  };

  return (
    <Modal open={open} onClose={onClose} title={t("forms.returnAsset")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 font-semibold mb-1">{t("forms.selectReturn")} *</label>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} required className="input">
            <option value="">{t("forms.selectReturnPlaceholder")}</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>{a.assetCode} {a.assetName} — {a.personName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-semibold mb-1">{t("forms.notes")}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t("forms.returnNote")} className="input" />
        </div>
        <FormFooter
          cancelLabel={t("forms.cancel")}
          onCancel={onClose}
          submitLabel={t("forms.returnBtn")}
          submittingLabel={t("forms.returning")}
          submitting={loading}
          disabled={!selectedId}
        />
      </form>
    </Modal>
  );
}
