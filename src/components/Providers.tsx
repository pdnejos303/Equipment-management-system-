// Path: src/components/Providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { AssetColumnsProvider } from "@/lib/useAssetColumns";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <I18nProvider>
          <AssetColumnsProvider>{children}</AssetColumnsProvider>
        </I18nProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
