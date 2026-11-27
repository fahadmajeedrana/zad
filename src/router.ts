// Minimal path router (10 flat routes; no library needed). Azure Static Web Apps serves
// index.html for unknown paths (staticwebapp.config.json → navigationFallback).
// Old hash links (#masadir) from the previous app are redirected to paths.
import { useSyncExternalStore } from 'react';

export const VIEWS = ['home', 'masadir', 'vocab', 'qawaid', 'ahadith', 'fiqh', 'uhadith', 'tafsir', 'study', 'maker'] as const;
export type View = (typeof VIEWS)[number];

const BASE = import.meta.env.BASE_URL; // '/' or '/sub/'
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

function parse(): { view: View; params: URLSearchParams } {
  const rest = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : location.pathname.replace(/^\//, '');
  const seg = decodeURIComponent(rest.split('/')[0] || 'home') as View;
  return { view: VIEWS.includes(seg) ? seg : 'home', params: new URLSearchParams(location.search) };
}

// Legacy hash routes → path routes (once, at start-up).
{
  const h = location.hash.slice(1) as View;
  if (h && VIEWS.includes(h)) history.replaceState(null, '', BASE + (h === 'home' ? '' : h));
}

let current = parse();
let key = location.pathname + location.search;
addEventListener('popstate', () => { current = parse(); key = location.pathname + location.search; emit(); });

export function navigate(view: View, params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const url = BASE + (view === 'home' ? '' : view) + qs;
  if (url === location.pathname + location.search) return;
  history.pushState(null, '', url);
  current = parse();
  key = location.pathname + location.search;
  emit();
}

export function useRoute() {
  useSyncExternalStore((fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => key);
  return current;
}
