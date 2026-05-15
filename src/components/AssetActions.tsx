// Path: src/components/AssetActions.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useRole } from "@/lib/useRole";
import { useI18n } from "@/lib/i18n";
import { showConfirm, showSuccess, showError } from "@/lib/swal";

interface Props {
  assetId: string;
  assetName: string;
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

  return (
    <div className="flex gap-2">
      {canEdit && (
        <Link href={`/assets/${assetId}/edit`} className="btn-ghost text-sm flex items-center gap-1">
          <Pencil size={14} /> {t("actions.edit")}
        </Link>
      )}
      {canDelete && (
        <button onClick={handleDelete} className="btn-danger text-sm flex items-center gap-1">
          <Trash2 size={14} /> {t("actions.delete")}
        </button>
      )}
    </div>
  );
}
