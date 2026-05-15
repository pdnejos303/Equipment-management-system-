// Path: src/components/TranslatedText.tsx
"use client";

import { useI18n } from "@/lib/i18n";
import { useCategories } from "@/lib/useCategories";

export function T({ k, args = [] }: { k: string; args?: (string | number)[] }) {
  const { t } = useI18n();
  return <>{t(k, ...args)}</>;
}

export function TStatus({ status }: { status: string }) {
  const { t } = useI18n();
  return <>{t(`status.${status}`)}</>;
}

export function TCategory({ category }: { category: string }) {
  const { t } = useI18n();
  const { labelFor } = useCategories();
  // Fall back to DB label if i18n doesn't have this key (user-added category)
  const translated = t(`category.${category}`);
  return <>{translated === `category.${category}` ? labelFor(category) : translated}</>;
}

export function useT() {
  return useI18n().t;
}
