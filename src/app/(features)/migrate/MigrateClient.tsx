// Path: src/app/(features)/migrate/MigrateClient.tsx
"use client";

import { useI18n } from "@/lib/i18n";
import { BackupClient } from "./BackupClient";

export function MigrateClient() {
  const { t } = useI18n();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("migrate.pageTitle")}</h1>
      <BackupClient />
    </div>
  );
}
