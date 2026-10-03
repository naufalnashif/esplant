/**
 * ─────────────────────────────────────────────────────────────
 *  sheetsCache.ts — Stale-While-Revalidate read cache for
 *  Google Sheets API calls.
 *
 *  Prevents redundant readState calls within a TTL window.
 *  Background revalidation keeps data fresh without blocking
 *  the UI. This is the primary quota defense for read
 *  operations (writes are already debounced in dataStore.ts).
 * ─────────────────────────────────────────────────────────────
 */

import type { FinanceState } from "./localDb";

/** How long a cached read is considered "fresh" (no refetch needed). */
const READ_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: FinanceState;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Returns true if the cached entry is still within the TTL window.
 */
export function isCacheFresh(spreadsheetId: string): boolean {
  const entry = cache.get(spreadsheetId);
  if (!entry) return false;
  return (Date.now() - entry.timestamp) < READ_CACHE_TTL;
}

/**
 * Returns the cached state if available (regardless of freshness).
 * Returns null if never cached.
 */
export function getCachedState(spreadsheetId: string): FinanceState | null {
  return cache.get(spreadsheetId)?.data ?? null;
}

/**
 * Stores a fresh read result in the in-memory cache.
 */
export function setCachedState(spreadsheetId: string, data: FinanceState): void {
  cache.set(spreadsheetId, { data, timestamp: Date.now() });
}

/**
 * Invalidates the cache for a specific spreadsheet (e.g., after a write).
 */
export function invalidateCache(spreadsheetId: string): void {
  cache.delete(spreadsheetId);
}

/**
 * Clears all cached entries.
 */
export function clearCache(): void {
  cache.clear();
}
