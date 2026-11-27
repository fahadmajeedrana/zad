import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Core } from '../data/core';
import { loadData, type DataKey, type DataMap } from '../data/loader';
import type { SheetTarget } from '../data/types';

export const CoreCtx = createContext<Core | null>(null);
export function useCore(): Core {
  const c = useContext(CoreCtx);
  if (!c) throw new Error('core data not loaded');
  return c;
}

export const SheetCtx = createContext<(d: SheetTarget) => void>(() => {});
export const useOpenSheet = () => useContext(SheetCtx);

type Loaded<T> = { status: 'loading' } | { status: 'error'; retry: () => void } | { status: 'ready'; data: T };

/** Load a lazy data file on first use, with a retry after failure. */
export function useData<K extends DataKey>(k: K): Loaded<DataMap[K]> {
  type T = DataMap[K];
  const [state, setState] = useState<Loaded<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    loadData(k).then(
      (data) => { if (live) setState({ status: 'ready', data }); },
      () => { if (live) setState({ status: 'error', retry }); },
    );
    return () => { live = false; };
  }, [k, attempt, retry]);
  return state;
}
