// Path: src/lib/useFormSubmit.ts
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccess, showError } from "@/lib/swal";
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
        showError(t("forms.error"), data.error);
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
      showError(t("forms.error"));
      setLoading(false);
      return false;
    }
  };

  return { submit, loading };
}
