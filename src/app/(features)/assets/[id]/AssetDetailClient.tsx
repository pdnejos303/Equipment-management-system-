// Path: src/app/(features)/assets/[id]/AssetDetailClient.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus, RotateCcw, CalendarPlus, Wrench, AlertTriangle, Clock,
  Tag, Calendar, ShieldCheck, MapPin, Hash, Package, Building2, Timer,
} from "lucide-react";
import { formatMoney, formatDate, CATEGORY_CONFIG } from "@/lib/utils";
import { LabelTemplate } from "@/components/labels/LabelTemplate";
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

type Tab = "info" | "assignments" | "maintenance" | "bookings";

type WarrantyState = "expired" | "expiring" | "active";
interface WarrantyInfo {
  state: WarrantyState;
  days: number;
  date: Date;
}

function getWarrantyInfo(warrantyEnd: string | null): WarrantyInfo | null {
  if (!warrantyEnd) return null;
  const date = new Date(warrantyEnd);
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (days < 0) return { state: "expired", days: Math.abs(days), date };
  if (days < 90) return { state: "expiring", days, date };
  return { state: "active", days, date };
}

export function AssetDetailClient({ asset, totalRepair, repairRatio }: Props) {
  const [tab, setTab] = useState<Tab>("info");
  const [photos, setPhotos] = useState<AssetPhoto[]>(asset.photos ?? []);
  const [showAssign, setShowAssign] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showBook, setShowBook] = useState(false);
  const [showMaint, setShowMaint] = useState(false);
  const { t, locale } = useI18n();
  const { canEdit, canCreate } = useRole();
  const router = useRouter();

  const warranty = useMemo(() => getWarrantyInfo(asset.warrantyEnd), [asset.warrantyEnd]);
  const categoryEmoji =
    CATEGORY_CONFIG[asset.category as keyof typeof CATEGORY_CONFIG]?.emoji || "📦";

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
  ];

  const handlePrintSticker = () => {
    const container = document.getElementById(`sticker-print-area-${asset.id}`);
    if (!container) return;
    const w = window.open("", "_blank", "width=800,height=600");
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${asset.code} - Label</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
@page{size:80mm 50mm;margin:0}
body{font-family:'Sarabun',sans-serif;width:80mm;height:50mm}
.label-template-root>div{border:none !important}
</style></head>
<body>${container.innerHTML}</body>
<script>window.onload=function(){setTimeout(function(){window.print();window.close()},300)};</script>
</html>`);
    w.document.close();
  };

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
        <div className="space-y-4 animate-stagger">

          {/* ── Warranty alert banner ── */}
          {warranty?.state === "expired" && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-3 animate-fade-in">
              <AlertTriangle className="text-red-400 shrink-0" size={20} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-red-400">{t("assetDetail.warrantyExpired")}</p>
                <p className="text-xs text-red-300/70 mt-0.5">
                  {t("assetDetail.expiredDaysAgo", warranty.days)} · {formatDate(asset.warrantyEnd, locale)}
                </p>
              </div>
            </div>
          )}
          {warranty?.state === "expiring" && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-center gap-3 animate-fade-in">
              <Clock className="text-amber-400 shrink-0" size={20} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-400">{t("assetDetail.warrantyExpiringSoon")}</p>
                <p className="text-xs text-amber-300/70 mt-0.5">
                  {t("assetDetail.daysRemaining", warranty.days)} · {formatDate(asset.warrantyEnd, locale)}
                </p>
              </div>
            </div>
          )}

          {/* ── Hero grid: Photo+QR (left, 1 col) / Details+Numbers (right, 2 cols) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* LEFT: Photo + QR/Barcode */}
            <div className="space-y-4 lg:col-span-1">
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm" style={{ color: "var(--text-default)" }}>
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

              <div className="card overflow-hidden">
                <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--text-default)" }}>
                  {t("assetDetail.qrBarcode")}
                </h3>
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    <QRCodeDisplay assetCode={asset.code} size={88} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="w-full overflow-hidden flex justify-center [&_svg]:!w-full [&_svg]:!h-auto [&_svg]:!max-w-full">
                      <BarcodeDisplay value={asset.code} height={36} />
                    </div>
                    <button
                      onClick={handlePrintSticker}
                      className="w-full text-xs text-gray-400 hover:text-brand-500 transition border border-border rounded-md py-1.5"
                    >
                      {t("assetDetail.printSticker")}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Overview details + bottom number cards */}
            <div className="lg:col-span-2 space-y-4">

              {/* Overview — every key field in one place */}
              <div className="card">
                <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--text-default)" }}>
                  {t("assetDetail.overview")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <DetailRow icon={<Tag size={14} />} label={t("assetDetail.category")}
                    value={<span>{categoryEmoji} {asset.category}</span>} />
                  <DetailRow icon={<Calendar size={14} />} label={t("assetDetail.purchaseDate")}
                    value={formatDate(asset.purchaseDate, locale)} />
                  <DetailRow icon={<Building2 size={14} />} label={t("assetDetail.brand")}
                    value={asset.brand || "-"} />
                  <DetailRow icon={<ShieldCheck size={14} />} label={t("assetDetail.warrantyEnd")}
                    value={
                      <span className="flex items-center gap-2 flex-wrap justify-end">
                        <span>{formatDate(asset.warrantyEnd, locale)}</span>
                        {warranty && <WarrantyBadge warranty={warranty} t={t} />}
                      </span>
                    } />
                  <DetailRow icon={<Package size={14} />} label={t("assetDetail.model")}
                    value={asset.model || "-"} />
                  <DetailRow icon={<Wrench size={14} />} label={t("assetDetail.nextMaint")}
                    value={formatDate(asset.nextMaintenance, locale)} />
                  <DetailRow icon={<Hash size={14} />} label={t("assetDetail.serial")}
                    value={<span className="font-mono text-xs">{asset.serialNumber || "-"}</span>} />
                  <DetailRow icon={<Timer size={14} />} label={t("assetDetail.lifespan")}
                    value={t("assetDetail.lifespanYears", asset.expectedLife)} />
                  <DetailRow icon={<MapPin size={14} />} label={t("assetDetail.location")}
                    value={asset.location || "-"} />
                </div>
                {asset.notes && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-xs text-gray-500 mb-1">{t("assetDetail.notes")}</p>
                    <p className="text-sm break-words" style={{ color: "var(--text-muted)" }}>{asset.notes}</p>
                  </div>
                )}
              </div>

              {/* Purchase Price + Repair side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card flex flex-col">
                  <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--text-default)" }}>{t("assetDetail.purchasePrice")}</h3>
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="text-3xl font-bold font-mono text-green-500">
                      {t("common.baht")}{formatMoney(asset.purchasePrice, locale)}
                    </p>
                    <p className="text-sm mt-1 text-gray-500">
                      {formatDate(asset.purchaseDate, locale)}
                    </p>
                  </div>
                </div>

                <div className="card flex flex-col">
                  <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--text-default)" }}>{t("assetDetail.repairCost")}</h3>
                  <div className="flex-1 flex flex-col justify-center">
                    <p className={`text-3xl font-bold font-mono ${repairRatio > 50 ? "text-red-400" : "text-brand-500"}`}>
                      {t("common.baht")}{formatMoney(totalRepair, locale)}
                    </p>
                    <p className={`text-sm mt-1 ${repairRatio > 50 ? "text-red-400" : "text-gray-500"}`}>
                      {t("assetDetail.ofPurchase", Math.round(repairRatio))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Analysis — full width */}
          <AIAssetAnalysis assetId={asset.id} />
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

      {/* Hidden label for print — kept in DOM so handlePrintSticker can grab it */}
      <div id={`sticker-print-area-${asset.id}`} style={{ position: "absolute", left: "-9999px", top: 0, pointerEvents: "none" }} aria-hidden="true">
        <LabelTemplate
          asset={{
            id: asset.code,
            code: asset.code,
            name: asset.name,
            brand: asset.brand || undefined,
            model: asset.model || undefined,
            serial: asset.serialNumber || undefined,
          }}
          template="full"
          widthMm={80}
          heightMm={50}
          scale={1}
          showBorder={false}
        />
      </div>

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

// ── Helpers ─────────────────────────────────────────────────

function DetailRow({
  icon, label, value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 min-w-0">
      <span className="text-gray-400 flex items-center gap-1.5 shrink-0">
        <span className="text-gray-500">{icon}</span>
        {label}
      </span>
      <span className="text-right truncate" style={{ color: "var(--text-default)" }}>
        {value}
      </span>
    </div>
  );
}

function WarrantyBadge({
  warranty, t,
}: {
  warranty: WarrantyInfo;
  t: (key: string, ...args: any[]) => string;
}) {
  if (warranty.state === "expired") {
    return (
      <span className="badge bg-red-500/10 text-red-400 text-[10px] px-2 py-0.5">
        {t("assetDetail.expiredDaysAgo", warranty.days)}
      </span>
    );
  }
  if (warranty.state === "expiring") {
    return (
      <span className="badge bg-amber-500/10 text-amber-400 text-[10px] px-2 py-0.5">
        {t("assetDetail.daysRemaining", warranty.days)}
      </span>
    );
  }
  return (
    <span className="badge bg-green-500/10 text-green-400 text-[10px] px-2 py-0.5">
      {t("assetDetail.warrantyActive")}
    </span>
  );
}
