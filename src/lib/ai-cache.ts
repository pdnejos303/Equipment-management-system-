// Path: src/lib/ai-cache.ts
// ============================================================
// Server-side in-memory AI cache
// Cache จะถูกเก็บไว้จนกว่าจะ force refresh หรือหมดอายุ
// ============================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

// Default TTL: 24 hours (ยาวมากเพราะจะ invalidate ด้วย force เท่านั้น)
const DEFAULT_TTL = 24 * 60 * 60 * 1000;

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > DEFAULT_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearCache(key: string): void {
  cache.delete(key);
}

export function clearAllAICache(): void {
  cache.clear();
}
