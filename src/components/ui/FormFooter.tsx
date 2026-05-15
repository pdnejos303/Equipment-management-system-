// Path: src/components/ui/FormFooter.tsx
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  cancelLabel: string;
  cancelHref?: string;
  onCancel?: () => void;
  submitLabel: string;
  submitting?: boolean;
  submittingLabel?: string;
  disabled?: boolean;
  extras?: ReactNode;
  className?: string;
}

export function FormFooter({
  cancelLabel,
  cancelHref,
  onCancel,
  submitLabel,
  submitting,
  submittingLabel,
  disabled,
  extras,
  className,
}: Props) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 justify-end pt-2", className)}>
      {extras}
      {cancelHref ? (
        <Link href={cancelHref} className="btn-ghost">
          {cancelLabel}
        </Link>
      ) : (
        <button type="button" onClick={onCancel} className="btn-ghost">
          {cancelLabel}
        </button>
      )}
      <button
        type="submit"
        disabled={submitting || disabled}
        className="btn-primary disabled:opacity-50"
      >
        {submitting ? (submittingLabel ?? submitLabel) : submitLabel}
      </button>
    </div>
  );
}
