// Path: src/components/AssetActions.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useRole } from "@/lib/useRole";
import { useI18n } from "@/lib/i18n";
import { showConfirm, showSuccess, showError } from "@/lib/swal";
import { EditAssetModal } from "@/components/forms/EditAssetModal";

interface CurrentAssignment {
  id: string;
  personName: string;
}

interface Props {
  assetId: string;
  assetName: string;
  assetCode?: string;
  assetStatus?: string;
  assetCategory?: string;
  currentAssignment?: CurrentAssignment | null;
}

export function AssetActions({ assetId, assetName }: Props) {
  const { canEdit, canDelete } = useRole();
  const router = useRouter();
  const { t } = useI18n();

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title: t("actions.deleteTitle"),
      text: t("actions.deleteMsg", assetName),
      confirmText: t("actions.deletePermanent"),
      cancelText: t("confirm.cancel"),
      danger: true,
    });
    if (!confirmed) return;

    const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      showError(t("actions.deleteFailed"), data.error);
      return;
    }
    await showSuccess(t("actions.deleteTitle"), t("actions.deleteFailed").replace("ไม่สำเร็จ", "สำเร็จ"));
    router.push("/assets");
    router.refresh();
  };

  const [showEdit, setShowEdit] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <button onClick={() => setShowEdit(true)} className="btn-ghost text-sm flex items-center gap-1">
            <Pencil size={14} /> {t("actions.edit")}
          </button>
        )}
        {canDelete && (
          <button onClick={handleDelete} className="btn-danger text-sm flex items-center gap-1">
            <Trash2 size={14} /> {t("actions.delete")}
          </button>
        )}
      </div>

      {showEdit && (
        <EditAssetModal
          assetId={assetId}
          open={showEdit}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}
