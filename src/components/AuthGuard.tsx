// Path: src/components/AuthGuard.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || !role) {
      const callback = encodeURIComponent(pathname || "/overview");
      signOut({ redirect: false }).finally(() => {
        router.replace(`/login?callbackUrl=${callback}`);
      });
    }
  }, [status, role, router, pathname]);

  if (status === "loading" || !role) return null;
  return <>{children}</>;
}
