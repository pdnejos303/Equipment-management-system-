// Path: src/components/settings/CategoriesManagerDialog.tsx
"use client";

import { Modal } from "@/components/ui/Modal";
import { CategoriesManager } from "@/components/settings/CategoriesManager";
import { useI18n } from "@/lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CategoriesManagerDialog({ open, onClose }: Props) {
  const { t } = useI18n();

  return (
    <Modal open={open} onClose={onClose} title={t("assets.manageCategories")} width="max-w-xl">
      <CategoriesManager />
    </Modal>
  );
}
