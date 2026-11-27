// Minimal path router (flat routes; no library needed). On GitHub Pages, unknown paths are
// served by 404.html (a copy of index.html, see scripts/postbuild.mjs).
// Old hash links (#masadir) from the previous app are redirected to paths.
// Query params carry deep links, e.g. /fiqh?t=f1b1:20 or /ahadith?b=h1:0.
import { useSyncExternalStore } from 'react';

export const VIEWS = ['home', 'masadir', 'vocab', 'qawaid', 'ahadith', 'fiqh', 'uhadith', 'tafsir', 'study', 'maker', 'search'] as const;
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
