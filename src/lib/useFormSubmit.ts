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
}

export function useFormSubmit<T extends Record<string, any>>({
  url,
  method = "POST",
  successTitle,
  onSuccess,
  transform,
}: Options) {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

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
        const msg = data.error ?? t("forms.error");
        const details: { path: string[]; message: string }[] = data.details ?? [];
        let html = `<p style="color:#9ca3af;font-size:14px;margin:0">${msg}</p>`;
        if (details.length > 0) {
          html += `<ul style="text-align:left;margin:10px 0 0;padding:0;list-style:none">`;
          for (const d of details) {
            const field = d.path.join(".") || "?";
            html += `<li style="color:#f87171;font-size:12px;padding:3px 0">• <b>${field}</b>: ${d.message}</li>`;
          }
          html += `</ul>`;
        }
        swal.fire({ icon: "error", title: t("forms.error"), html });
        setLoading(false);
        return false;
      }
      const data = await res.json().catch(() => ({}));
      await showSuccess(successTitle);
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
