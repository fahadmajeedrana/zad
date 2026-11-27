// Fetch versioned data files. Each URL carries a content hash, so the service worker can cache it forever.
// A promise is memoised per key; a failed load is forgotten so a retry works.
import manifest from '../generated/data-manifest.json';
import type { CoreRaw, HadithPart, RefSection } from './types';

export type DataKey = keyof typeof manifest.files;
export const DATA_META = manifest.meta;

export interface DataMap {
  core: CoreRaw;
  guide: RefSection[];
  fiqh: RefSection[];
  uhadith: RefSection[];
  tafsir: RefSection[];
  hadith: HadithPart[];
}

const cache: Partial<Record<DataKey, Promise<unknown>>> = {};
const prepare: Partial<Record<DataKey, (d: never) => void>> = {};

/** Register a one-time transform that runs right after a file loads (builds search keys etc.). */
export function onLoad<K extends DataKey>(k: K, fn: (d: DataMap[K]) => void) {
  prepare[k] = fn as (d: never) => void;
}

export const dataUrl = (k: DataKey) => import.meta.env.BASE_URL + manifest.files[k];

export function loadData<K extends DataKey>(k: K): Promise<DataMap[K]> {
  if (!cache[k]) {
    cache[k] = fetch(dataUrl(k))
      .then((r) => {
        if (!r.ok) throw new Error(`${k} ${r.status}`);
        return r.json();
      })
      .then((d) => {
        prepare[k]?.(d as never);
        return d;
      })
      .catch((e) => {
        delete cache[k];
        throw e;
      });
  }
  return cache[k] as Promise<DataMap[K]>;
}
