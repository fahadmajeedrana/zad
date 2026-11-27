// Flashcard "known" set, stored by stable content id (masdar `root:bab`, word `book:hash`).
// The legacy key `sm:known` held list positions; it is migrated once and left in place.
import { useMemo } from 'react';
import { migrateKnown, type Core } from '../data/core';
import { getPref, hasPref, setPref, usePref } from './prefs';

const KEY = 'knownIds';
const EMPTY: string[] = [];

export function migrateLegacyKnown(core: Core) {
  if (hasPref(KEY) || !hasPref('known')) return;
  setPref(KEY, migrateKnown(core, getPref<unknown>('known', [])));
}

export function useKnown() {
  const [ids, setIds] = usePref<string[]>(KEY, EMPTY);
  const set = useMemo(() => new Set(ids), [ids]);
  const toggle = (id: string) => {
    const next = new Set(getPref<string[]>(KEY, EMPTY));
    if (next.has(id)) next.delete(id); else next.add(id);
    setIds([...next]);
  };
  return { known: set, toggle };
}
