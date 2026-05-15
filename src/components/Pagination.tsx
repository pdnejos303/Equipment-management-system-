// Path: src/components/Pagination.tsx
// ============================================================
// File: Pagination.tsx
// Path: equip-track/src/components/Pagination.tsx
// Desc: Pagination — ปุ่มเปลี่ยนหน้า + แสดงข้อมูลหน้าปัจจุบัน
// ============================================================

"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface Props {
  total: number;
  pageSize?: number;
  paramKey?: string;
}

export function Pagination({ total, pageSize = 20, paramKey = "page" }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(
    Math.max(1, Number(searchParams.get(paramKey) || 1)),
    totalPages
  );

  if (totalPages <= 1) return null;

  const goTo = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramKey, String(page));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  // Build page number array with ellipsis
  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "...")[] = [];
    const delta = 2;

    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);
    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push("...");
    pages.push(totalPages);

    return pages;
  };

  const pageNumbers = getPageNumbers();
  const showFirstLast = totalPages > 7;

  return (
    <div className="flex items-center justify-between py-4">
      <p className="text-xs" style={{ color: "var(--text-subtle)" }}>
        {t("pagination.showing", start, end, total)}
      </p>
      <div className="flex items-center gap-0.5 p-1 rounded-xl border border-[var(--border)]/60" style={{ background: "var(--surface-hover)" }}>
        {showFirstLast && (
          <button
            onClick={() => goTo(1)}
            disabled={currentPage <= 1}
            className={cn("p-1.5 rounded-lg transition-all duration-200", currentPage <= 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-[var(--surface-active)]")}
            style={{ color: "var(--text-muted)" }}
            title="First page"
          >
            <ChevronsLeft size={15} />
          </button>
        )}

        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage <= 1}
          className={cn("p-1.5 rounded-lg transition-all duration-200", currentPage <= 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-[var(--surface-active)]")}
          style={{ color: "var(--text-muted)" }}
        >
          <ChevronLeft size={16} />
        </button>

        {pageNumbers.map((page, idx) =>
          page === "..." ? (
            <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs select-none" style={{ color: "var(--text-subtle)" }}>
              &hellip;
            </span>
          ) : (
            <button
              key={page}
              onClick={() => goTo(page)}
              className={cn(
                "h-8 rounded-lg text-xs font-semibold transition-all duration-200",
                page === currentPage
                  ? "bg-brand-500 text-black w-9"
                  : "w-8 hover:bg-[var(--surface-active)]"
              )}
              style={page === currentPage ? { boxShadow: "0 0 8px rgb(var(--brand-rgb) / 0.15)" } : { color: "var(--text-muted)" }}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={cn("p-1.5 rounded-lg transition-all duration-200", currentPage >= totalPages ? "opacity-30 cursor-not-allowed" : "hover:bg-[var(--surface-active)]")}
          style={{ color: "var(--text-muted)" }}
        >
          <ChevronRight size={16} />
        </button>

        {showFirstLast && (
          <button
            onClick={() => goTo(totalPages)}
            disabled={currentPage >= totalPages}
            className={cn("p-1.5 rounded-lg transition-all duration-200", currentPage >= totalPages ? "opacity-30 cursor-not-allowed" : "hover:bg-[var(--surface-active)]")}
            style={{ color: "var(--text-muted)" }}
            title="Last page"
          >
            <ChevronsRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
