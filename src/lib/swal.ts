// Path: src/lib/swal.ts
// ============================================================
// File: swal.ts
// Path: equip-track/src/lib/swal.ts
// Desc: SweetAlert2 wrapper — dark theme, reusable helpers
// ============================================================

import Swal from "sweetalert2";

// Dark theme defaults matching the app's premium design
const darkTheme = {
  background: "#111111",
  color: "#ededed",
  confirmButtonColor: "#f59e0b",
  cancelButtonColor: "#2a2a2a",
  customClass: {
    popup: "!rounded-2xl !border !border-[#222] !shadow-2xl",
    title: "!text-[#ededed] !text-lg !font-bold",
    htmlContainer: "!text-[#6b7280] !text-sm",
    confirmButton: "!rounded-xl !font-semibold !px-6 !py-2.5 !text-sm",
    cancelButton: "!rounded-xl !font-semibold !px-6 !py-2.5 !text-sm !text-[#9ca3af]",
  },
};

export const swal = Swal.mixin(darkTheme);

/** แสดง success */
export function showSuccess(title: string, text?: string) {
  return swal.fire({
    icon: "success",
    title,
    text,
    timer: 2000,
    showConfirmButton: false,
  });
}

/** แสดง error */
export function showError(title: string, text?: string) {
  return swal.fire({
    icon: "error",
    title,
    text,
  });
}

/** แสดง warning */
export function showWarning(title: string, text?: string) {
  return swal.fire({
    icon: "warning",
    title,
    text,
  });
}

/** confirm dialog — return true if confirmed */
export async function showConfirm({
  title,
  text,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  danger = false,
}: {
  title: string;
  text: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}): Promise<boolean> {
  const result = await swal.fire({
    icon: danger ? "warning" : "question",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: danger ? "#ef4444" : "#f59e0b",
    reverseButtons: true,
  });
  return result.isConfirmed;
}