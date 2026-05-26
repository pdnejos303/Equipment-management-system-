// Path: src/app/(features)/calendar/CalendarClient.tsx
"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Package,
  Users, Wrench, CalendarClock, X, MapPin, DollarSign,
  ChevronDown, Eye, Layers, Grid3X3, List, ArrowRight,
} from "lucide-react";
import { useI18n, type Locale } from "@/lib/i18n";
import { cn, formatMoney } from "@/lib/utils";
import Link from "next/link";

// ── Types ──

interface BookingEvent {
  id: string;
  type: "booking";
  title: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  category: string;
  personName: string;
  start: string;
  end: string;
  status: string;
  purpose: string | null;
}

interface MaintenanceEvent {
  id: string;
  type: "maintenance";
  title: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  category: string;
  date: string;
  description: string;
  cost: number;
  maintType: string;
  vendor: string | null;
}

interface AssignmentEvent {
  id: string;
  type: "assignment";
  title: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  category: string;
  personName: string;
  department: string | null;
  start: string;
  end: string | null;
}

type CalendarEvent = BookingEvent | MaintenanceEvent | AssignmentEvent;

interface CalendarData {
  bookings: BookingEvent[];
  maintenance: MaintenanceEvent[];
  assignments: AssignmentEvent[];
}

type ViewMode = "month" | "week" | "list";

// ── Constants ──

const EVENT_STYLES: Record<string, { bg: string; border: string; text: string; dot: string; lightBg: string }> = {
  booking: {
    bg: "bg-blue-500/15",
    border: "border-blue-500/30",
    text: "text-blue-400",
    dot: "bg-blue-500",
    lightBg: "bg-blue-500/10",
  },
  maintenance: {
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    text: "text-amber-400",
    dot: "bg-amber-500",
    lightBg: "bg-amber-500/10",
  },
  assignment: {
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    dot: "bg-emerald-500",
    lightBg: "bg-emerald-500/10",
  },
};

const BOOKING_STATUS_COLOR: Record<string, string> = {
  PENDING: "text-yellow-400 bg-yellow-500/10",
  APPROVED: "text-blue-400 bg-blue-500/10",
  ACTIVE: "text-green-400 bg-green-500/10",
  RETURNED: "text-gray-400 bg-gray-500/10",
  CANCELLED: "text-red-400 bg-red-500/10",
};

const MAINT_TYPE_COLOR: Record<string, string> = {
  REPAIR: "text-red-400 bg-red-500/10",
  PREVENTIVE: "text-blue-400 bg-blue-500/10",
  INSPECTION: "text-green-400 bg-green-500/10",
};

// ── Date helpers ──

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function startOfWeek(d: Date) {
  const day = d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}
function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isToday(d: Date) {
  return isSameDay(d, new Date());
}
function formatDateShort(d: Date, locale: string) {
  return d.toLocaleDateString(locale === "th" ? "th-TH" : locale === "ja" ? "ja-JP" : "en-US", {
    month: "short", day: "numeric",
  });
}
function formatDateFull(d: Date, locale: string) {
  return d.toLocaleDateString(locale === "th" ? "th-TH" : locale === "ja" ? "ja-JP" : "en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}
function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// ── Translations ──

const T: Record<string, Record<string, string>> = {
  th: {
    title: "ปฏิทิน",
    today: "วันนี้",
    month: "เดือน",
    week: "สัปดาห์",
    list: "รายการ",
    booking: "การจอง",
    maintenance: "ซ่อมบำรุง",
    assignment: "มอบหมาย",
    allTypes: "ทุกประเภท",
    noEvents: "ไม่มีกิจกรรม",
    events: "กิจกรรม",
    person: "ผู้รับผิดชอบ",
    department: "แผนก",
    purpose: "วัตถุประสงค์",
    cost: "ค่าใช้จ่าย",
    vendor: "ผู้ให้บริการ",
    status: "สถานะ",
    ongoing: "กำลังดำเนินการ",
    detail: "ดูรายละเอียด",
    goToDate: "ไปที่วันนั้นในปฏิทิน",
    sun: "อา", mon: "จ", tue: "อ", wed: "พ", thu: "พฤ", fri: "ศ", sat: "ส",
  },
  en: {
    title: "Calendar",
    today: "Today",
    month: "Month",
    week: "Week",
    list: "List",
    booking: "Booking",
    maintenance: "Maintenance",
    assignment: "Assignment",
    allTypes: "All Types",
    noEvents: "No events",
    events: "events",
    person: "Person",
    department: "Department",
    purpose: "Purpose",
    cost: "Cost",
    vendor: "Vendor",
    status: "Status",
    ongoing: "Ongoing",
    detail: "View detail",
    goToDate: "Go to this date",
    sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat",
  },
  ja: {
    title: "カレンダー",
    today: "今日",
    month: "月",
    week: "週",
    list: "リスト",
    booking: "予約",
    maintenance: "メンテナンス",
    assignment: "割り当て",
    allTypes: "すべて",
    noEvents: "イベントなし",
    events: "イベント",
    person: "担当者",
    department: "部署",
    purpose: "目的",
    cost: "費用",
    vendor: "業者",
    status: "ステータス",
    ongoing: "進行中",
    detail: "詳細を見る",
    goToDate: "この日付へ移動",
    sun: "日", mon: "月", tue: "火", wed: "水", thu: "木", fri: "金", sat: "土",
  },
};

const MONTH_NAMES: Record<string, string[]> = {
  th: ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ja: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
};

// ── Event Detail Modal ──

function EventModal({ event, locale, onClose, onGoToDate }: { event: CalendarEvent; locale: string; onClose: () => void; onGoToDate: (date: Date) => void }) {
  const { t } = useI18n();
  const style = EVENT_STYLES[event.type];
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const eventDate = event.type === "maintenance"
    ? new Date((event as MaintenanceEvent).date)
    : new Date((event as any).start);

  const typeLabel = t(`calendarPage.${event.type}`);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-overlay-in" />
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl animate-modal-in overflow-hidden"
      >
        {/* Header */}
        <div className={cn("px-5 py-4 flex items-center justify-between", style.lightBg)}>
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", style.bg)}>
              {event.type === "booking" && <CalendarClock size={18} className={style.text} />}
              {event.type === "maintenance" && <Wrench size={18} className={style.text} />}
              {event.type === "assignment" && <Users size={18} className={style.text} />}
            </div>
            <div>
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", style.text)}>{typeLabel}</span>
              <h3 className="text-base font-bold -mt-0.5" style={{ color: "var(--text-default)" }}>{event.assetCode}</h3>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-dark/50 flex items-center justify-center text-gray-500 hover:text-gray-300 transition">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Asset info */}
          <div className="flex items-center gap-2">
            <Package size={14} className="text-gray-500" />
            <span className="text-sm font-medium" style={{ color: "var(--text-default)" }}>{event.assetName}</span>
            <span className="text-[10px] text-gray-600 bg-surface-dark px-1.5 py-0.5 rounded">{event.category}</span>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <CalendarIcon size={14} className="text-gray-500" />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {event.type === "maintenance"
                ? formatDateFull(new Date((event as MaintenanceEvent).date), locale)
                : `${formatDateShort(new Date((event as any).start), locale)} → ${(event as any).end ? formatDateShort(new Date((event as any).end), locale) : t("calendarPage.ongoing")}`
              }
            </span>
          </div>

          {/* Type-specific fields */}
          {event.type === "booking" && (
            <>
              <div className="flex items-center gap-2">
                <Users size={14} className="text-gray-500" />
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>{(event as BookingEvent).personName}</span>
              </div>
              {(event as BookingEvent).purpose && (
                <div className="flex items-start gap-2">
                  <Eye size={14} className="text-gray-500 mt-0.5" />
                  <span className="text-sm text-gray-400">{(event as BookingEvent).purpose}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", BOOKING_STATUS_COLOR[(event as BookingEvent).status])}>
                  {(event as BookingEvent).status}
                </span>
              </div>
            </>
          )}

          {event.type === "maintenance" && (
            <>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>{(event as MaintenanceEvent).description}</div>
              <div className="flex items-center gap-3">
                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", MAINT_TYPE_COLOR[(event as MaintenanceEvent).maintType])}>
                  {(event as MaintenanceEvent).maintType}
                </span>
                <span className="text-sm text-brand-500 font-mono">
                  ฿{formatMoney((event as MaintenanceEvent).cost, locale as Locale)}
                </span>
              </div>
              {(event as MaintenanceEvent).vendor && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-gray-500" />
                  <span className="text-sm text-gray-400">{(event as MaintenanceEvent).vendor}</span>
                </div>
              )}
            </>
          )}

          {event.type === "assignment" && (
            <>
              <div className="flex items-center gap-2">
                <Users size={14} className="text-gray-500" />
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>{(event as AssignmentEvent).personName}</span>
              </div>
              {(event as AssignmentEvent).department && (
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-gray-500" />
                  <span className="text-sm text-gray-400">{(event as AssignmentEvent).department}</span>
                </div>
              )}
              {!(event as AssignmentEvent).end && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-500/10">
                  {t("calendarPage.ongoing")}
                </span>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface-dark/30 flex gap-2">
          <button
            onClick={() => { onGoToDate(eventDate); onClose(); }}
            className="flex-1 flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-[var(--text-default)] font-medium transition py-1.5 rounded-lg hover:bg-surface-hover"
          >
            <CalendarIcon size={14} />
            {t("calendarPage.goToDate")}
          </button>
          <div className="w-px bg-border" />
          <Link
            href={`/assets/${event.assetId}?from=${encodeURIComponent("/calendar")}`}
            className="flex-1 flex items-center justify-center gap-2 text-sm text-brand-500 hover:text-brand-400 font-medium transition py-1.5 rounded-lg hover:bg-surface-hover"
          >
            {t("calendarPage.detail")}
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Mini Event Pill (for month grid) ──

function EventPill({ event, locale, onClick }: { event: CalendarEvent; locale: string; onClick: () => void }) {
  const style = EVENT_STYLES[event.type];
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate border transition-all hover:scale-[1.02] active:scale-[0.98]",
        style.bg, style.border, style.text
      )}
    >
      <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1 flex-shrink-0", style.dot)} />
      {event.assetCode}
    </button>
  );
}

// ── List Row ──

function EventListRow({ event, locale, onClick }: { event: CalendarEvent; locale: string; onClick: () => void }) {
  const style = EVENT_STYLES[event.type];
  const { t } = useI18n();

  const dateStr = event.type === "maintenance"
    ? formatDateShort(new Date((event as MaintenanceEvent).date), locale)
    : formatDateShort(new Date((event as any).start), locale);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-3 rounded-xl border transition-all hover:scale-[1.005] active:scale-[0.995]",
        "bg-surface hover:bg-surface-hover", style.border
      )}
    >
      {/* Date badge */}
      <div className="flex-shrink-0 w-12 text-center">
        <div className="text-xs text-gray-500">{dateStr.split(" ")[0]}</div>
        <div className="text-lg font-bold" style={{ color: "var(--text-default)" }}>{new Date(event.type === "maintenance" ? (event as MaintenanceEvent).date : (event as any).start).getDate()}</div>
      </div>

      {/* Dot */}
      <div className={cn("w-2 h-8 rounded-full flex-shrink-0", style.dot)} />

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-brand-500">{event.assetCode}</span>
          <span className="text-sm font-medium truncate" style={{ color: "var(--text-default)" }}>{event.assetName}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn("text-[10px] font-semibold uppercase tracking-wider", style.text)}>{t(`calendarPage.${event.type}`)}</span>
          {event.type === "booking" && (
            <span className={cn("text-[10px] px-1.5 py-0 rounded-full", BOOKING_STATUS_COLOR[(event as BookingEvent).status])}>
              {(event as BookingEvent).status}
            </span>
          )}
          {event.type === "maintenance" && (
            <span className="text-[10px] text-brand-500 font-mono">฿{formatMoney((event as MaintenanceEvent).cost, locale as Locale)}</span>
          )}
          {event.type === "assignment" && (
            <span className="text-[10px] text-gray-500">{(event as AssignmentEvent).personName}</span>
          )}
        </div>
      </div>

      {/* End date */}
      <div className="flex-shrink-0 text-right">
        {event.type !== "maintenance" && (
          <span className="text-[10px] text-gray-600">
            → {(event as any).end ? formatDateShort(new Date((event as any).end), locale) : t("calendarPage.ongoing")}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Main Calendar ──

export function CalendarClient({ data }: { data: CalendarData }) {
  const { locale, t } = useI18n();
  const months = MONTH_NAMES[locale] || MONTH_NAMES.en;
  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((d) => t(`calendarPage.${d}`));

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filter, setFilter] = useState<"all" | "booking" | "maintenance" | "assignment">("all");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Read ?date=YYYY-MM-DD from URL and jump to that date
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get("date");
    if (dateParam) {
      const d = new Date(dateParam + "T00:00:00");
      if (!isNaN(d.getTime())) {
        setCurrentDate(d);
        setSelectedDay(d);
      }
    }
  }, []);

  const goToDate = (date: Date) => {
    setCurrentDate(date);
    setSelectedDay(date);
    setView("month");
    setSelectedEvent(null);
  };

  // Merge all events
  const allEvents = useMemo(() => {
    let events: CalendarEvent[] = [...data.bookings, ...data.maintenance, ...data.assignments];
    if (filter !== "all") events = events.filter((e) => e.type === filter);
    return events;
  }, [data, filter]);

  // Get events for a specific day
  const getEventsForDay = useCallback((day: Date) => {
    return allEvents.filter((event) => {
      if (event.type === "maintenance") {
        return isSameDay(new Date((event as MaintenanceEvent).date), day);
      }
      const start = new Date((event as any).start);
      const end = (event as any).end ? new Date((event as any).end) : new Date(9999, 0);
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
      return start <= dayEnd && end >= dayStart;
    });
  }, [allEvents]);

  // Calendar grid for month view
  const calendarGrid = useMemo(() => {
    const first = startOfMonth(currentDate);
    const last = endOfMonth(currentDate);
    const gridStart = startOfWeek(first);
    const weeks: Date[][] = [];
    let current = gridStart;

    while (current <= last || weeks.length < 6) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(current));
        current = addDays(current, 1);
      }
      weeks.push(week);
      if (weeks.length >= 6) break;
    }
    return weeks;
  }, [currentDate]);

  // Week view days
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  // List view events (current month)
  const listEvents = useMemo(() => {
    const first = startOfMonth(currentDate);
    const last = endOfMonth(currentDate);
    return allEvents
      .filter((event) => {
        const d = new Date(event.type === "maintenance" ? (event as MaintenanceEvent).date : (event as any).start);
        return d >= first && d <= last;
      })
      .sort((a, b) => {
        const da = new Date(a.type === "maintenance" ? (a as MaintenanceEvent).date : (a as any).start);
        const db = new Date(b.type === "maintenance" ? (b as MaintenanceEvent).date : (b as any).start);
        return da.getTime() - db.getTime();
      });
  }, [allEvents, currentDate]);

  // Navigation
  const navigate = (dir: -1 | 1) => {
    if (view === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + dir, 1));
    } else if (view === "week") {
      setCurrentDate(addDays(currentDate, dir * 7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + dir, 1));
    }
  };

  const goToday = () => setCurrentDate(new Date());

  // Event counts
  const eventCounts = useMemo(() => ({
    booking: data.bookings.length,
    maintenance: data.maintenance.length,
    assignment: data.assignments.length,
    total: data.bookings.length + data.maintenance.length + data.assignments.length,
  }), [data]);

  // Day detail panel events
  const dayDetailEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
            <CalendarIcon size={20} className="text-brand-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-default)" }}>{t("calendarPage.title")}</h1>
            <p className="text-xs text-gray-500">{eventCounts.total} {t("calendarPage.events")}</p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2">
          <div className="flex bg-surface border border-border rounded-xl p-1">
            {(["month", "week", "list"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  view === v ? "bg-brand-500 text-black" : "text-gray-500 hover:text-gray-300"
                )}
              >
                {v === "month" && <Grid3X3 size={12} />}
                {v === "week" && <Layers size={12} />}
                {v === "list" && <List size={12} />}
                {t(`calendarPage.${v}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {(["booking", "maintenance", "assignment"] as const).map((type) => {
          const style = EVENT_STYLES[type];
          const active = filter === type;
          return (
            <button
              key={type}
              onClick={() => setFilter(filter === type ? "all" : type)}
              className={cn(
                "relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                active ? `${style.bg} ${style.border}` : "bg-surface border-border hover:border-gray-700"
              )}
            >
              <div className={cn("w-2 h-8 rounded-full", style.dot)} />
              <div className="text-left">
                <div className={cn("text-lg font-bold", active ? style.text : "")} style={!active ? { color: "var(--text-default)" } : undefined}>
                  {eventCounts[type]}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{t(`calendarPage.${type}`)}</div>
              </div>
              {active && (
                <div className="absolute top-2 right-2">
                  <X size={10} className="text-gray-500" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Navigation bar */}
      <div className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg bg-surface-dark flex items-center justify-center text-gray-400 hover:text-[var(--text-default)] transition">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => navigate(1)} className="w-8 h-8 rounded-lg bg-surface-dark flex items-center justify-center text-gray-400 hover:text-[var(--text-default)] transition">
            <ChevronRight size={16} />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 rounded-lg bg-surface-dark text-xs font-medium text-gray-400 hover:text-brand-500 transition">
            {t("calendarPage.today")}
          </button>
        </div>

        <h2 className="text-base font-bold" style={{ color: "var(--text-default)" }}>
          {view === "week"
            ? `${formatDateShort(weekDays[0], locale)} — ${formatDateShort(weekDays[6], locale)}`
            : `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`
          }
        </h2>

        <div className="w-[120px]" /> {/* spacer */}
      </div>

      {/* Calendar Content */}
      <div className="flex gap-4">
        {/* Main calendar area */}
        <div className="flex-1">
          {/* MONTH VIEW */}
          {view === "month" && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-border">
                {dayNames.map((name, i) => (
                  <div key={i} className={cn(
                    "px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider",
                    i === 0 || i === 6 ? "text-gray-600" : "text-gray-500"
                  )}>
                    {name}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              {calendarGrid.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
                  {week.map((day, di) => {
                    const inMonth = day.getMonth() === currentDate.getMonth();
                    const today = isToday(day);
                    const events = getEventsForDay(day);
                    const isSelected = selectedDay && isSameDay(day, selectedDay);
                    const hasEvents = events.length > 0;

                    return (
                      <div
                        key={di}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedDay(isSelected ? null : day)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedDay(isSelected ? null : day); } }}
                        className={cn(
                          "relative min-h-[90px] lg:min-h-[110px] p-1.5 text-left border-r border-border last:border-r-0 transition-all cursor-pointer",
                          inMonth ? "bg-transparent" : "bg-surface-dark/40",
                          isSelected && "ring-1 ring-brand-500/50 bg-brand-500/5",
                          !isSelected && hasEvents && "hover:bg-surface-hover",
                          !isSelected && !hasEvents && "hover:bg-surface-dark/60"
                        )}
                      >
                        {/* Day number */}
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold mb-1 transition-all",
                          today ? "bg-brand-500 text-black" : "",
                          !today && inMonth ? "text-[var(--text-muted)]" : "",
                          !today && !inMonth ? "text-gray-700" : "",
                        )}>
                          {day.getDate()}
                        </div>

                        {/* Event pills */}
                        <div className="space-y-0.5">
                          {events.slice(0, 3).map((event) => (
                            <EventPill
                              key={event.id}
                              event={event}
                              locale={locale}
                              onClick={() => { setSelectedEvent(event); }}
                            />
                          ))}
                          {events.length > 3 && (
                            <div className="text-[9px] text-gray-500 font-medium px-1.5">
                              +{events.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* WEEK VIEW */}
          {view === "week" && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-7">
                {weekDays.map((day, i) => {
                  const today = isToday(day);
                  const events = getEventsForDay(day);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);

                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={cn(
                        "min-h-[400px] p-2 text-left border-r border-border last:border-r-0 transition-all",
                        isSelected && "ring-1 ring-brand-500/50 bg-brand-500/5",
                        !isSelected && "hover:bg-surface-hover"
                      )}
                    >
                      {/* Day header */}
                      <div className="text-center mb-3">
                        <div className="text-[10px] text-gray-500 uppercase font-medium">{dayNames[i]}</div>
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold mx-auto mt-1",
                          today ? "bg-brand-500 text-black" : "text-[var(--text-muted)]"
                        )}>
                          {day.getDate()}
                        </div>
                      </div>

                      {/* Events */}
                      <div className="space-y-1">
                        {events.map((event) => {
                          const style = EVENT_STYLES[event.type];
                          return (
                            <div
                              key={event.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                              className={cn(
                                "px-2 py-1.5 rounded-lg border text-[10px] cursor-pointer transition-all hover:scale-[1.02]",
                                style.bg, style.border
                              )}
                            >
                              <div className={cn("font-bold", style.text)}>{event.assetCode}</div>
                              <div className="text-gray-400 truncate mt-0.5">{event.assetName}</div>
                              {event.type === "maintenance" && (
                                <div className="text-brand-500 font-mono mt-0.5">฿{formatMoney((event as MaintenanceEvent).cost, locale as Locale)}</div>
                              )}
                            </div>
                          );
                        })}
                        {events.length === 0 && (
                          <div className="text-[10px] text-gray-700 text-center py-4">{t("calendarPage.noEvents")}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* LIST VIEW */}
          {view === "list" && (
            <div className="space-y-2">
              {listEvents.length === 0 ? (
                <div className="bg-surface border border-border rounded-xl py-16 text-center">
                  <CalendarIcon size={32} className="text-gray-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">{t("calendarPage.noEvents")}</p>
                </div>
              ) : (
                listEvents.map((event) => (
                  <EventListRow
                    key={event.id}
                    event={event}
                    locale={locale}
                    onClick={() => setSelectedEvent(event)}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Day detail sidebar (desktop) */}
        {selectedDay && (
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="bg-surface border border-border rounded-xl sticky top-8 overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-surface-dark/50 flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500">{dayNames[selectedDay.getDay()]}</div>
                  <div className="text-lg font-bold" style={{ color: "var(--text-default)" }}>{formatDateFull(selectedDay, locale)}</div>
                </div>
                <button onClick={() => setSelectedDay(null)} className="text-gray-600 hover:text-gray-400 transition">
                  <X size={14} />
                </button>
              </div>

              <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                {dayDetailEvents.length === 0 ? (
                  <div className="py-8 text-center">
                    <CalendarIcon size={24} className="text-gray-700 mx-auto mb-2" />
                    <p className="text-xs text-gray-600">{t("calendarPage.noEvents")}</p>
                  </div>
                ) : (
                  dayDetailEvents.map((event) => {
                    const style = EVENT_STYLES[event.type];
                    return (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-lg border transition-all hover:scale-[1.01]",
                          style.bg, style.border
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", style.dot)} />
                          <span className="text-xs font-mono text-brand-500">{event.assetCode}</span>
                          <span className={cn("text-[10px] font-semibold uppercase", style.text)}>{t(`calendarPage.${event.type}`)}</span>
                        </div>
                        <div className="text-sm mt-1 truncate" style={{ color: "var(--text-default)" }}>{event.assetName}</div>
                        {event.type === "booking" && (
                          <div className="text-[10px] text-gray-500 mt-0.5">{(event as BookingEvent).personName}</div>
                        )}
                        {event.type === "maintenance" && (
                          <div className="text-[10px] text-brand-500 font-mono mt-0.5">฿{formatMoney((event as MaintenanceEvent).cost, locale as Locale)}</div>
                        )}
                        {event.type === "assignment" && (
                          <div className="text-[10px] text-gray-500 mt-0.5">{(event as AssignmentEvent).personName}</div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventModal event={selectedEvent} locale={locale} onClose={() => setSelectedEvent(null)} onGoToDate={goToDate} />
      )}
    </div>
  );
}
