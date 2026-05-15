// Path: src/app/(features)/bookings/BookingsClient.tsx
"use client";

import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { BookingActions } from "@/components/PageActions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/Pagination";
import { usePagination } from "@/lib/usePagination";
import { useRole } from "@/lib/useRole";
import { useRouter } from "next/navigation";
import { showError } from "@/lib/swal";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Calendar } from "lucide-react";

interface Asset {
  id: string;
  code: string;
  name: string;
  status: string;
  category: string;
}

interface Booking {
  id: string;
  personName: string;
  dateStart: string;
  dateEnd: string;
  purpose: string | null;
  status: string;
  asset: { id: string; code: string; name: string };
}

interface BookingsData {
  bookings: Booking[];
  assets: Asset[];
  activeCount: number;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: Record<string, string> }> = {
  PENDING:   { color: "text-amber-400",  bg: "bg-amber-500/10",  label: { th: "รออนุมัติ", en: "Pending",   ja: "承認待ち" } },
  APPROVED:  { color: "text-green-400",  bg: "bg-green-500/10",  label: { th: "อนุมัติ",   en: "Approved",  ja: "承認済み" } },
  ACTIVE:    { color: "text-blue-400",   bg: "bg-blue-500/10",   label: { th: "กำลังยืม",  en: "Active",    ja: "使用中"   } },
  RETURNED:  { color: "text-gray-400",   bg: "bg-gray-500/10",   label: { th: "คืนแล้ว",   en: "Returned",  ja: "返却済み" } },
  CANCELLED: { color: "text-red-400",    bg: "bg-red-500/10",    label: { th: "ยกเลิก",    en: "Cancelled", ja: "キャンセル" } },
};

// Next valid status transitions
const NEXT_STATUS: Record<string, string | null> = {
  PENDING:  "APPROVED",
  APPROVED: "ACTIVE",
  ACTIVE:   "RETURNED",
  RETURNED: null,
  CANCELLED: null,
};

const NEXT_LABEL: Record<string, Record<string, string>> = {
  APPROVED: { th: "อนุมัติ",    en: "Approve",       ja: "承認" },
  ACTIVE:   { th: "เริ่มยืม",   en: "Mark Active",   ja: "開始" },
  RETURNED: { th: "คืนแล้ว",    en: "Mark Returned", ja: "返却" },
};

function StatusButton({ booking, locale, onDone }: { booking: Booking; locale: string; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const next = NEXT_STATUS[booking.status];

  if (!next) return null;

  const label = NEXT_LABEL[next]?.[locale] ?? NEXT_LABEL[next]?.en;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) { showError("Error"); return; }
      onDone();
    } catch {
      showError("Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="btn-brand-outline text-[11px] py-0.5 px-2.5 whitespace-nowrap"
    >
      {loading ? "..." : label}
    </button>
  );
}

function CancelButton({ booking, locale, onDone }: { booking: Booking; locale: string; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const cancelLabel: Record<string, string> = { th: "ยกเลิก", en: "Cancel", ja: "取消" };

  if (!["PENDING", "APPROVED"].includes(booking.status)) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (!res.ok) { showError("Error"); return; }
      onDone();
    } catch {
      showError("Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="btn-danger text-[11px] py-0.5 px-2.5 whitespace-nowrap"
    >
      {loading ? "..." : (cancelLabel[locale] ?? cancelLabel.en)}
    </button>
  );
}

export function BookingsClient({ data }: { data: BookingsData }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { canCreate } = useRole();
  const { bookings, assets, activeCount } = data;
  const { items: pagedBookings, total: bookingsTotal } = usePagination(bookings, 20);

  const returnedCount = bookings.filter((b) => b.status === "RETURNED").length;

  return (
    <div className="page-enter">
      <PageHeader
        title={t("bookingPage.title")}
        actions={<BookingActions assets={assets} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 animate-stagger">
        <div className="card stat-card">
          <p className="text-xs text-gray-500 uppercase">{t("bookingPage.activeBookings")}</p>
          <p className="text-2xl font-bold text-blue-400">{activeCount}</p>
        </div>
        <div className="card stat-card">
          <p className="text-xs text-gray-500 uppercase">{t("bookingPage.returned") ?? "Returned"}</p>
          <p className="text-2xl font-bold text-gray-400">{returnedCount}</p>
        </div>
        <div className="card stat-card">
          <p className="text-xs text-gray-500 uppercase">{t("bookingPage.total")}</p>
          <p className="text-2xl font-bold text-brand-500">{bookings.length}</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <p className="text-gray-500 text-center py-12">{t("bookingPage.noHistory")}</p>
      ) : (
        <div className="table-container animate-fade-in-up">
          <table className="table table-row-hover animate-table-rows">
            <thead>
              <tr>
                <th>{t("bookingPage.equipment")}</th>
                <th>{t("bookingPage.booker")}</th>
                <th>{t("bookingPage.dateStart")}</th>
                <th>{t("bookingPage.dateEnd")}</th>
                <th>{t("bookingPage.purpose")}</th>
                <th>{t("bookingPage.status")}</th>
                <th />
                {canCreate && <th />}
              </tr>
            </thead>
            <tbody>
              {pagedBookings.map((b) => {
                const st = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.PENDING;
                return (
                  <tr
                    key={b.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/assets/${b.asset.id}`)}
                    onMouseEnter={() => router.prefetch(`/assets/${b.asset.id}`)}
                  >
                    <td className="max-w-[200px]">
                      <span className="font-mono text-brand-500">{b.asset.code}</span>
                      <span className="ml-2 truncate inline-block max-w-[120px] align-bottom">{b.asset.name}</span>
                    </td>
                    <td style={{ color: "var(--text-default)" }}>{b.personName}</td>
                    <td>{formatDate(b.dateStart, locale)}</td>
                    <td>{formatDate(b.dateEnd, locale)}</td>
                    <td className="text-xs max-w-[180px] truncate">{b.purpose || "-"}</td>
                    <td>
                      <span className={cn("badge", st.bg, st.color)}>
                        {st.label[locale] ?? st.label.en}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/calendar?date=${new Date(b.dateStart).toISOString().slice(0, 10)}`}
                        title={t("common.viewInCalendar")}
                        className="btn-icon"
                      >
                        <Calendar size={14} />
                      </Link>
                    </td>
                    {canCreate && (
                      <td>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <StatusButton booking={b} locale={locale} onDone={() => router.refresh()} />
                          <CancelButton booking={b} locale={locale} onDone={() => router.refresh()} />
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination total={bookingsTotal} pageSize={20} />
        </div>
      )}
    </div>
  );
}
