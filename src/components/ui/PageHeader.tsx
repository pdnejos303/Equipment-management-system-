// Path: src/components/ui/PageHeader.tsx
"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  /** When true (default when `actions` is provided), header sticks below the app header while the page scrolls. */
  sticky?: boolean;
}

export function PageHeader({ title, subtitle, actions, backHref, backLabel, sticky }: Props) {
  const isSticky = sticky ?? Boolean(actions);

  return (
    <div
      className={cn(
        "animate-fade-in mb-6",
        isSticky &&
          "sticky top-14 z-20 -mx-3 sm:-mx-5 lg:-mx-8 -mt-3 sm:-mt-5 lg:-mt-8 px-3 sm:px-5 lg:px-8 pt-3 sm:pt-4 pb-3 border-b",
      )}
      style={
        isSticky
          ? {
              background: "color-mix(in srgb, var(--background) 92%, transparent)",
              backdropFilter: "blur(12px) saturate(140%)",
              WebkitBackdropFilter: "blur(12px) saturate(140%)",
              borderColor: "var(--border)",
            }
          : undefined
      }
    >
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 mb-2 transition-colors"
        >
          <ArrowLeft size={14} />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          {typeof title === "string" ? (
            <h1 className="text-2xl font-bold truncate">{title}</h1>
          ) : (
            title
          )}
          {subtitle && (
            <div className="text-sm mt-1" style={{ color: "var(--text-subtle)" }}>
              {subtitle}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
