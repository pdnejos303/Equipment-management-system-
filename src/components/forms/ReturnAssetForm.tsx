// Path: src/components/forms/ReturnAssetForm.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { FormFooter } from "@/components/ui/FormFooter";
import { SearchablePicker, type PickerItem } from "@/components/ui/SearchablePicker";
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
  preselectedAssignmentId?: string;
}

export function ReturnAssetForm({ open, onClose, assignments, preselectedAssignmentId }: Props) {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState(preselectedAssignmentId || "");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedId(preselectedAssignmentId || "");
      setNotes("");
    }
  }, [open, preselectedAssignmentId]);

  const pickerItems: PickerItem[] = useMemo(
    () =>
      assignments.map((a) => ({
        id: a.id,
        primary: a.assetCode,
        secondary: a.assetName,
        tertiary: a.personName,
        searchText: `${a.assetCode} ${a.assetName} ${a.personName}`,
      })),
    [assignments]
  );

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
          <label className="block text-xs text-gray-500 font-semibold mb-2">{t("forms.selectReturn")} *</label>
          <SearchablePicker
            items={pickerItems}
            selectedId={selectedId}
            onSelect={setSelectedId}
            autoFocus={!preselectedAssignmentId}
          />
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
