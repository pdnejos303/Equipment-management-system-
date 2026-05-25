// Path: src/lib/useAssetColumns.tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type AssetColumnKey =
  | "photo"
  | "code"
  | "name"
  | "type"
  | "status"
  | "user"
  | "purchasePrice"
  | "currentValue";

export const ASSET_COLUMNS: { key: AssetColumnKey; required?: boolean }[] = [
  { key: "photo" },
  { key: "code", required: true },
  { key: "name", required: true },
  { key: "type" },
  { key: "status" },
  { key: "user" },
  { key: "purchasePrice" },
  { key: "currentValue" },
];

const DEFAULT_VISIBILITY: Record<AssetColumnKey, boolean> = {
  photo: true,
  code: true,
  name: true,
  type: true,
  status: true,
  user: true,
  purchasePrice: true,
  currentValue: true,
};

const STORAGE_KEY = "equip-asset-columns-v1";

interface ColumnsContextType {
  columns: Record<AssetColumnKey, boolean>;
  isVisible: (key: AssetColumnKey) => boolean;
  toggle: (key: AssetColumnKey) => void;
  reset: () => void;
}

const ColumnsContext = createContext<ColumnsContextType>({
  columns: DEFAULT_VISIBILITY,
  isVisible: () => true,
  toggle: () => {},
  reset: () => {},
});

export function AssetColumnsProvider({ children }: { children: React.ReactNode }) {
  const [columns, setColumns] = useState<Record<AssetColumnKey, boolean>>(DEFAULT_VISIBILITY);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setColumns({ ...DEFAULT_VISIBILITY, ...parsed });
      }
    } catch {
      // ignore
    }
  }, []);

  const persist = useCallback((next: Record<AssetColumnKey, boolean>) => {
    setColumns(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const toggle = useCallback((key: AssetColumnKey) => {
    const meta = ASSET_COLUMNS.find((c) => c.key === key);
    if (meta?.required) return;
    setColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const reset = useCallback(() => persist(DEFAULT_VISIBILITY), [persist]);

  const isVisible = useCallback((key: AssetColumnKey) => columns[key] ?? true, [columns]);

  return (
    <ColumnsContext.Provider value={{ columns, isVisible, toggle, reset }}>
      {children}
    </ColumnsContext.Provider>
  );
}

export function useAssetColumns() {
  return useContext(ColumnsContext);
}
