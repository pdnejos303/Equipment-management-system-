// Path: src/app/(features)/assets/[id]/AssetDetailClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, RotateCcw, CalendarPlus, Wrench } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/utils";
import { AssetSticker } from "@/components/AssetSticker";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { BarcodeDisplay } from "@/components/BarcodeDisplay";
import { PhotoUpload } from "@/components/PhotoUpload";
import { AddAssignmentForm } from "@/components/forms/AddAssignmentForm";
import { ReturnAssetForm } from "@/components/forms/ReturnAssetForm";
import { AddBookingForm } from "@/components/forms/AddBookingForm";
import { AddMaintenanceForm } from "@/components/forms/AddMaintenanceForm";
import { useI18n } from "@/lib/i18n";
import { useRole } from "@/lib/useRole";
import type { DepreciationResult } from "@/lib/depreciation";
import { AIAssetAnalysis } from "@/components/AIAssetAnalysis";
import type { AssetPhoto } from "@/types";

interface Props {
  asset: any;
  depreciation: DepreciationResult;
  totalRepair: number;
  repairRatio: number;
}

type Tab = "info" | "assignments" | "maintenance" | "bookings" | "sticker";

export function AssetDetailClient({ asset, depreciation, totalRepair, repairRatio }: Props) {
  const [tab, setTab] = useState<Tab>("info");
  const [photos, setPhotos] = useState<AssetPhoto[]>(asset.photos ?? []);
  const [showAssign, setShowAssign] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showBook, setShowBook] = useState(false);
  const [showMaint, setShowMaint] = useState(false);
  const { t, locale } = useI18n();
  const { canEdit, canCreate } = useRole();
  const router = useRouter();

  // Use the open assignment as source of truth — `status` can drift out of sync.
  const currentAssignment = asset.assignments.find((a: any) => !a.dateIn) || null;
  const canBorrow = !currentAssignment && asset.status !== "RETIRED" && asset.status !== "MAINTENANCE";

  const assetForForm = {
    id: asset.id,
    code: asset.code,
    name: asset.name,
    status: "AVAILABLE",
    category: asset.category || "OTHER",
  };

  const closeAndRefresh = (setter: (v: boolean) => void) => () => {
    setter(false);
    router.refresh();
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "info", label: t("assetDetail.info") },
    { key: "assignments", label: t("assetDetail.assignments") },
    { key: "maintenance", label: t("assetDetail.maintenance") },
    { key: "bookings", label: t("assetDetail.bookings") },
    { key: "sticker", label: t("assetDetail.sticker") },
  ];

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition border-b-2 ${
              tab === tb.key ? "text-brand-500 border-brand-500" : "text-gray-500 border-transparent hover:text-gray-300"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div className="space-y-6 animate-stagger">

          {/* ── Photo section ── */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold" style={{ color: "var(--text-default)" }}>
                {t("assetDetail.equipmentPhotos")}
              </h3>
              {photos.length > 0 && (
                <span className="text-xs text-gray-600">{t("assetDetail.photoCount", photos.length)}</span>
              )}
            </div>
            <PhotoUpload
              assetId={asset.id}
              photos={photos}
              onPhotosChange={setPhotos}
              readOnly={!canEdit}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold mb-3" style={{ color: "var(--text-default)" }}>{t("assetDetail.qrBarcode")}</h3>
              <div className="flex items-center gap-4">
                <QRCodeDisplay assetCode={asset.code} size={120} />
                <BarcodeDisplay value={asset.code} height={50} />
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold mb-3" style={{ color: "var(--text-default)" }}>{t("assetDetail.depreciation")}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">{t("assetDetail.purchasePrice")}</span>
                  <span className="font-mono">{t("common.baht")}{formatMoney(asset.purchasePrice, locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t("assetDetail.currentValue")}</span>
                  <span className="font-mono text-green-500">{t("common.baht")}{formatMoney(Math.round(depreciation.currentValue), locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t("assetDetail.accDeprec")}</span>
                  <span className="font-mono text-red-400">{t("common.baht")}{formatMoney(Math.round(depreciation.totalDepreciation), locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t("assetDetail.annualDeprec")}</span>
                  <span className="font-mono">{t("common.baht")}{formatMoney(Math.round(depreciation.annualDepreciation), locale)}</span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{t("assetDetail.usedYears", depreciation.yearsUsed.toFixed(1))}</span>
                    <span>{depreciation.percentUsed}%</span>
                  </div>
                  <div className="h-2 bg-surface-dark rounded-full overflow-hidden">
                    <div className="h-full rounded-full animate-progress" style={{ width: `${depreciation.percentUsed}%`, background: "linear-gradient(90deg, #22c55e, #f59e0b, #ef4444)" } as React.CSSProperties} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold mb-3" style={{ color: "var(--text-default)" }}>{t("assetDetail.details")}</h3>
              <div className="space-y-2 text-sm">
                {[
                  [t("assetDetail.purchaseDate"), formatDate(asset.purchaseDate, locale)],
                  [t("assetDetail.warrantyEnd"), formatDate(asset.warrantyEnd, locale)],
                  [t("assetDetail.nextMaint"), formatDate(asset.nextMaintenance, locale)],
                  [t("assetDetail.lifespan"), t("assetDetail.lifespanYears", asset.expectedLife)],
                  [t("assetDetail.location"), asset.location || "-"],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between">
                    <span className="text-gray-400">{label}</span>
                    <span style={{ color: "var(--text-default)" }}>{val}</span>
                  </div>
                ))}
              </div>
              {asset.notes && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-gray-500 mb-1">{t("assetDetail.notes")}</p>
                  <p className="text-sm break-words" style={{ color: "var(--text-muted)" }}>{asset.notes}</p>
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="font-semibold mb-3" style={{ color: "var(--text-default)" }}>{t("assetDetail.repairCost")}</h3>
              <p className={`text-2xl font-bold font-mono ${repairRatio > 50 ? "text-red-400" : "text-brand-500"}`}>
                {t("common.baht")}{formatMoney(totalRepair, locale)}
              </p>
              <p className={`text-sm ${repairRatio > 50 ? "text-red-400" : "text-gray-500"}`}>
                {t("assetDetail.ofPurchase", Math.round(repairRatio))}
              </p>
            </div>

            {/* AI Analysis */}
            <div className="lg:col-span-2">
              <AIAssetAnalysis assetId={asset.id} />
            </div>
          </div>
        </div>
      )}

      {tab === "assignments" && (
        <div className="card tab-content">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <h3 className="font-semibold" style={{ color: "var(--text-default)" }}>{t("assetDetail.assignHistory")}</h3>
            <div className="flex gap-2">
              {canCreate && canBorrow && (
                <button
                  onClick={() => setShowAssign(true)}
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  <UserPlus size={14} /> {t("forms.assign")}
                </button>
              )}
              {canCreate && currentAssignment && (
                <button
                  onClick={() => setShowReturn(true)}
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  <RotateCcw size={14} /> {t("forms.returnBtn")}
                </button>
              )}
            </div>
          </div>
          {asset.assignments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t("assetDetail.noHistory")}</p>
          ) : (
            <div className="space-y-2">
              {asset.assignments.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-default)" }}>{a.personName}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(a.dateOut, locale)} → {a.dateIn ? formatDate(a.dateIn, locale) : <span className="text-green-400">{t("assetDetail.notReturned")}</span>}
                    </p>
                  </div>
                  {a.notes && <p className="text-xs text-gray-500 max-w-[200px] truncate">{a.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "maintenance" && (
        <div className="card tab-content">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <h3 className="font-semibold" style={{ color: "var(--text-default)" }}>{t("assetDetail.maintHistory")}</h3>
            {canCreate && (
              <button
                onClick={() => setShowMaint(true)}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <Wrench size={14} /> {t("forms.addMaint")}
              </button>
            )}
          </div>
          {asset.maintenanceRecords.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t("assetDetail.noHistory")}</p>
          ) : (
            <div className="space-y-2">
              {asset.maintenanceRecords.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm break-words" style={{ color: "var(--text-default)" }}>{m.description}</p>
                    <p className="text-xs text-gray-500">{formatDate(m.date, locale)} {m.vendor && `• ${m.vendor}`}</p>
                  </div>
                  <span className="font-mono text-sm text-brand-500">{t("common.baht")}{formatMoney(m.cost, locale)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "bookings" && (
        <div className="card tab-content">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <h3 className="font-semibold" style={{ color: "var(--text-default)" }}>{t("assetDetail.bookingHistory")}</h3>
            {canCreate && canBorrow && (
              <button
                onClick={() => setShowBook(true)}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <CalendarPlus size={14} /> {t("forms.bookBtn")}
              </button>
            )}
          </div>
          {asset.bookings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t("assetDetail.noHistory")}</p>
          ) : (
            <div className="space-y-2">
              {asset.bookings.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-default)" }}>{b.personName}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(b.dateStart, locale)} → {formatDate(b.dateEnd, locale)}
                      {b.purpose && ` • ${b.purpose}`}
                    </p>
                  </div>
                  <span className={`badge text-xs ${
                    b.status === "APPROVED" ? "bg-green-500/10 text-green-400" :
                    b.status === "PENDING" ? "bg-amber-500/10 text-amber-400" :
                    b.status === "ACTIVE" ? "bg-blue-500/10 text-blue-400" :
                    b.status === "RETURNED" ? "bg-gray-500/10 text-gray-400" :
                    "bg-red-500/10 text-red-400"
                  }`}>
                    {t(`bookingStatus.${b.status}`)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "sticker" && (
        <div className="max-w-sm">
          <AssetSticker code={asset.code} name={asset.name} brand={asset.brand || undefined} model={asset.model || undefined} serial={asset.serialNumber || undefined} />
        </div>
      )}

      <AddAssignmentForm
        open={showAssign}
        onClose={closeAndRefresh(setShowAssign)}
        assets={[assetForForm]}
        preselectedAssetId={asset.id}
      />

      {currentAssignment && (
        <ReturnAssetForm
          open={showReturn}
          onClose={closeAndRefresh(setShowReturn)}
          assignments={[
            {
              id: currentAssignment.id,
              assetCode: asset.code,
              assetName: asset.name,
              personName: currentAssignment.personName,
            },
          ]}
          preselectedAssignmentId={currentAssignment.id}
        />
      )}

      <AddBookingForm
        open={showBook}
        onClose={closeAndRefresh(setShowBook)}
        assets={[assetForForm]}
        preselectedAssetId={asset.id}
      />

      <AddMaintenanceForm
        open={showMaint}
        onClose={closeAndRefresh(setShowMaint)}
        assets={[assetForForm]}
        preselectedAssetId={asset.id}
      />
    </div>
  );
}
