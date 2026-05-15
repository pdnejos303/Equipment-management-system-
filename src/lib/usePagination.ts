// Path: src/lib/usePagination.ts
"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

/**
 * Client-side slice pagination driven by a URL query param.
 * Multiple lists on one page can use different keys (e.g. "page_active", "page_returned").
 */
export function usePagination<T>(items: T[], pageSize = 20, key = "page") {
  const searchParams = useSearchParams();
  const rawPage = Math.max(1, Number(searchParams.get(key) || 1));

  return useMemo(() => {
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(rawPage, totalPages);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      items: items.slice(start, end),
      total,
      page,
      pageSize,
      totalPages,
    };
  }, [items, rawPage, pageSize]);
}
