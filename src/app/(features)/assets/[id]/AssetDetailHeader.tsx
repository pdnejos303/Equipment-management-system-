// Path: src/app/(features)/assets/[id]/AssetDetailHeader.tsx
"use client";

import { useI18n } from "@/lib/i18n";
import { AssetActions } from "@/components/AssetActions";
import { PageHeader } from "@/components/ui/PageHeader";

interface Props {
  assetId: string;
  assetName: string;
  assetCode: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: string;
  category: string;
  statusBg: string;
  statusColor: string;
  assignedTo: string | null;
  currentAssignment: { id: string; personName: string } | null;
}

export function AssetDetailHeader({
  assetId, assetName, assetCode, brand, model, serialNumber,
  status, category, statusBg, statusColor, assignedTo, currentAssignment,
}: Props) {
  const { t } = useI18n();

  return (
    <>
      <PageHeader
        backHref="/assets"
        backLabel={t("assets.back")}
        title={
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-brand-500 text-sm font-bold">{assetCode}</span>
            <h1 className="text-2xl font-bold truncate" style={{ color: "var(--text-default)" }}>
              {assetName}
            </h1>
            <span className={`badge ${statusBg} ${statusColor} text-sm`}>{t(`status.${status}`)}</span>
          </div>
        }
        subtitle={
          <>
            <span>{brand} {model}</span>
            <span className="font-mono text-xs block">S/N: {serialNumber || "-"}</span>
          </>
        }
        actions={
          <AssetActions
            assetId={assetId}
            assetName={assetName}
            assetCode={assetCode}
            assetStatus={status}
            assetCategory={category}
            currentAssignment={currentAssignment}
          />
        }
      />

      {assignedTo && (
        <div
          className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mb-6 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          <span className="text-xs text-green-500">{t("assets.assignedTo")}</span>
          <p className="text-green-400 font-semibold">{assignedTo}</p>
        </div>
      )}
    </>
  );
}
