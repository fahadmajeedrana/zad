// Persisted preferences: localStorage, JSON values, key prefix `sm:` (kept from the original app so
// existing users keep their settings). One place to read and write them; components subscribe.
import { useCallback, useSyncExternalStore } from 'react';

const PREFIX = 'sm:';
const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();

export function getPref<T>(k: string, d: T): T {
  if (!cache.has(k)) {
    let v: unknown = undefined;
    try {
      const raw = localStorage.getItem(PREFIX + k);
      if (raw) v = JSON.parse(raw);
    } catch { /* storage blocked or bad JSON: use the default */ }
    cache.set(k, v);
  }
  const v = cache.get(k);
  return v === undefined || v === null ? d : (v as T);
}

export function setPref<T>(k: string, v: T) {
  cache.set(k, v);
  try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch { /* ignore */ }
  listeners.get(k)?.forEach((fn) => fn());
}

export function hasPref(k: string): boolean {
  try { return localStorage.getItem(PREFIX + k) !== null; } catch { return false; }
}

export function usePref<T>(k: string, d: T): [T, (v: T) => void] {
  const subscribe = useCallback((fn: () => void) => {
    if (!listeners.has(k)) listeners.set(k, new Set());
    listeners.get(k)!.add(fn);
    return () => { listeners.get(k)!.delete(fn); };
  }, [k]);
  const value = useSyncExternalStore(subscribe, () => getPref(k, d));
  const set = useCallback((v: T) => setPref(k, v), [k]);
  return [value, set];
}
