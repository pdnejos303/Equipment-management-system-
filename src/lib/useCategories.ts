// Path: src/lib/useCategories.ts
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export interface Category {
  id: string;
  key: string;
  label: string;
  emoji: string | null;
  order: number;
  isDefault: boolean;
}

// ── Tiny shared store so every consumer stays in sync ────────
let cache: Category[] | null = null;
let inflight: Promise<Category[]> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export async function fetchCategories(force = false): Promise<Category[]> {
  if (cache && !force) return cache;
  if (inflight) return inflight;
  inflight = fetch("/api/categories")
    .then((r) => r.json())
    .then((json) => {
      cache = json.data || [];
      inflight = null;
      notify();
      return cache!;
    })
    .catch((e) => {
      inflight = null;
      throw e;
    });
  return inflight;
}

export function invalidateCategories() {
  cache = null;
  notify();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return cache;
}

export function useCategories() {
  const data = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) {
      setLoading(false);
      return;
    }
    let alive = true;
    fetchCategories()
      .then(() => alive && setLoading(false))
      .catch(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const categories = data || [];
  const labelFor = (key: string) => categories.find((c) => c.key === key)?.label || key;
  const emojiFor = (key: string) => categories.find((c) => c.key === key)?.emoji || "📦";

  return { categories, loading, labelFor, emojiFor, refresh: () => fetchCategories(true) };
}
