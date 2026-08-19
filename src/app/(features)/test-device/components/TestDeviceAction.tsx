"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { MonitorDown, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n";
// Adjust the import path since this is inside (features)/test-device/components
import { borrowDevice, returnDevice } from "../actions";
import { showError, showSuccess, showInputPrompt } from "@/lib/swal";

interface TestDeviceActionProps {
  assetId: string;
  testDeviceLogs?: any[];
  onActionComplete?: () => void;
  showBorrowedBadge?: boolean;
  fullWidth?: boolean;
  className?: string;
  buttonClassName?: string;
  currentUser?: any;
}

export function TestDeviceAction({
  assetId,
  testDeviceLogs = [],
  onActionComplete,
  showBorrowedBadge = false,
  fullWidth = true,
  className = "",
  buttonClassName = "",
  currentUser: propUser,
}: TestDeviceActionProps) {
  const { t } = useI18n();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const isLoadingSession = !propUser && status === "loading";

  const currentUser = propUser || (session?.user as any);
  const isBorrowed = testDeviceLogs.length > 0;
  const currentLog = isBorrowed ? testDeviceLogs[0] : null;
  const isMyBorrow = currentLog?.userId && currentUser && currentLog.userId === currentUser.id;
  const isAdmin = currentUser?.role === "ADMIN";
  // A device can be returned if it was borrowed by a guest (no userId), or by the current user, or by an admin
  const canReturn = !currentLog?.userId || isMyBorrow || isAdmin;

  const handleBorrowClick = async () => {
    let guestName = undefined;
    if (!currentUser) {
      const name = await showInputPrompt({
        title: t("testDeviceFeat.enterGuestName") || "Please enter your name:",
        placeholder: t("testDeviceFeat.guestNamePlaceholder") || "Guest Name",
        confirmText: t("common.confirm") || "Confirm",
        cancelText: t("common.cancel") || "Cancel",
      });
      if (!name || name.trim() === "") return;
      guestName = name;
    }

    try {
      setLoading(true);
      await borrowDevice(assetId, guestName);
      showSuccess(t("common.success") || "Success", t("testDeviceFeat.alertBorrowSuccess") || "Device borrowed successfully");
      if (onActionComplete) onActionComplete();
    } catch (e: any) {
      showError(t("common.error") || "Error", t(e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleReturnClick = async () => {
    try {
      setLoading(true);
      await returnDevice(assetId);
      showSuccess(t("common.success") || "Success", t("testDeviceFeat.alertReturnSuccess") || "Device returned successfully");
      if (onActionComplete) onActionComplete();
    } catch (e: any) {
      showError(t("common.error") || "Error", t(e.message));
    } finally {
      setLoading(false);
    }
  };

  const baseBtnClass = `py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${fullWidth ? "w-full" : "flex-1"} ${buttonClassName}`;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {isBorrowed && showBorrowedBadge && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-center justify-center shadow-sm">
          <span className="font-semibold mr-1">{t("testDeviceFeat.borrowed")}: </span>
          {currentLog?.guestName || currentLog?.user?.name || currentLog?.user?.email || t("testDeviceFeat.someone")}
        </div>
      )}

      {!isBorrowed ? (
        <button
          onClick={handleBorrowClick}
          disabled={loading || isLoadingSession}
          className={`${baseBtnClass} bg-brand-500 hover:bg-brand-600 text-white`}
        >
          <MonitorDown size={18} />
          {loading || isLoadingSession ? t("testDeviceFeat.processing") : t("testDeviceFeat.borrowDevice")}
        </button>
      ) : canReturn ? (
        <button
          onClick={handleReturnClick}
          disabled={loading || isLoadingSession}
          className={`${baseBtnClass} bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]`}
        >
          <RotateCcw size={18} />
          {loading || isLoadingSession ? t("testDeviceFeat.processing") : t("testDeviceFeat.returnDevice")}
        </button>
      ) : (
        <button
          disabled
          className={`${baseBtnClass} bg-gray-200 text-[var(--text-subtle)] px-2`}
        >
          {t("testDeviceFeat.borrowedByOthers")}
        </button>
      )}
    </div>
  );
}
