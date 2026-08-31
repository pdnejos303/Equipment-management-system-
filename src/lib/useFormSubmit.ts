// Path: src/lib/useFormSubmit.ts
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccess, swal } from "@/lib/swal";
import { useI18n } from "@/lib/i18n";

interface Options {
  url: string;
  method?: "POST" | "PATCH" | "PUT" | "DELETE";
  successTitle: string;
  onSuccess?: (data: any) => void;
  transform?: (body: any) => any;
  /** Maps a field key (Zod path) to its human-readable label, e.g. { purchasePrice: "ราคา" }. */
  fieldLabels?: Record<string, string>;
}

// A single validation problem returned by the API. Zod issues carry `code` plus
// code-specific fields (received/type/minimum); the server may also send custom codes.
interface FieldIssue {
  path?: (string | number)[];
  message?: string;
  code?: string;
  received?: string;
  expected?: string;
  type?: string;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function useFormSubmit<T extends Record<string, any>>({
  url,
  method = "POST",
  successTitle,
  onSuccess,
  transform,
  fieldLabels,
}: Options) {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  // Turn a single field issue into a clear, localized reason.
  const reasonFor = (d: FieldIssue): string => {
    switch (d.code) {
      case "invalid_type":
        // received "undefined"/"null" = field missing; "nan" = empty/non-numeric number field
        if (d.received === "undefined" || d.received === "null") return t("forms.vRequired");
        if (d.received === "nan" || d.expected === "number") return t("forms.vNumber");
        return t("forms.vRequired");
      case "too_small":
        // string min(1) means the field was left blank; number means it must be > 0
        return d.type === "number" ? t("forms.vPositive") : t("forms.vRequired");
      case "invalid_string":
      case "invalid_enum_value":
        return t("forms.vInvalid");
      case "duplicate":
        return t("forms.vDuplicate");
      case "unknownCategory":
        return t("forms.vUnknownCategory");
      default:
        return d.message || t("forms.vInvalid");
    }
  };

  const submit = async (form: T): Promise<boolean> => {
    setLoading(true);
    try {
      const body = transform ? transform(form) : form;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const details: FieldIssue[] = data.details ?? [];
        // When we have field-level issues, lead with a clear instruction and list
        // each offending field by its label and the reason it failed.
        const intro = details.length > 0 ? t("forms.invalidIntro") : (data.error ?? t("forms.error"));
        let html = `<p style="color:#9ca3af;font-size:14px;margin:0">${escapeHtml(intro)}</p>`;
        if (details.length > 0) {
          html += `<ul style="text-align:left;margin:10px 0 0;padding:0;list-style:none">`;
          for (const d of details) {
            const key = String(d.path?.[0] ?? "");
            const label = fieldLabels?.[key] || key || "?";
            html += `<li style="color:#f87171;font-size:13px;padding:3px 0">• <b>${escapeHtml(label)}</b>: ${escapeHtml(reasonFor(d))}</li>`;
          }
          html += `</ul>`;
        }
        swal.fire({ icon: "error", title: t("forms.error"), html });
        setLoading(false);
        return false;
      }
      const data = await res.json().catch(() => ({}));
      showSuccess(successTitle);
      if (onSuccess) onSuccess(data);
      else router.refresh();
      setLoading(false);
      return true;
    } catch {
      swal.fire({ icon: "error", title: t("forms.error") });
      setLoading(false);
      return false;
    }
  };

  return { submit, loading };
}
