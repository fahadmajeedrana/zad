import { useCallback, useEffect, useRef, useState } from 'react';
import { buildCore, type Core, type PanelOpts } from '../data/core';
import { loadData } from '../data/loader';
import type { SheetTarget } from '../data/types';
import { migrateLegacyKnown } from '../state/known';
import { setPref } from '../state/prefs';
import { navigate, useRoute, type View } from '../router';
import { CoreCtx, SheetCtx } from './context';
import { Header } from './Header';
import { Dock } from './Dock';
import { Toast } from './Toast';
import { UpdatePrompt } from './UpdatePrompt';
import { GardaanPanel } from '../features/gardaan/GardaanPanel';
import { Home } from '../features/home/Home';
import { SUB_OF } from '../features/home/subjects';
import { Masadir } from '../features/masadir/Masadir';
import { Maker } from '../features/maker/Maker';
import { REF_BOOKS, RefBook } from '../features/refbook/RefBook';
import { Ahadith } from '../features/hadith/Ahadith';
import { Vocab } from '../features/vocab/Vocab';
import { Study } from '../features/study/Study';
import { SemanticSearch } from '../features/search/SemanticSearch';

export function App() {
  const [core, setCore] = useState<Core | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    loadData('core').then(
      (raw) => { const c = buildCore(raw); migrateLegacyKnown(c); setCore(c); },
      () => setFailed(true),
    );
  }, []);

  if (!core) {
    return (
      <>
        <Header />
        <main>
          <div className="wrap">
            {failed ? (
              <div className="empty boot">
                <div>ڈیٹا لوڈ نہیں ہو سکا۔ انٹرنیٹ کنکشن چیک کر کے صفحہ دوبارہ کھولیں۔</div>
                <button type="button" className="btn" onClick={() => location.reload()}>دوبارہ کوشش کریں</button>
              </div>
            ) : <div className="empty boot">لوڈ ہو رہا ہے…</div>}
          </div>
        </main>
      </>
    );
  }
  return <CoreCtx.Provider value={core}><Shell core={core} /></CoreCtx.Provider>;
}

function Shell({ core }: { core: Core }) {
  const { view } = useRoute();
  // Screens stay mounted once visited (like the original app), so filters, search text and the
  // flashcard position survive switching tabs.
  const [visited, setVisited] = useState<Set<View>>(() => new Set([view]));
  const [sheet, setSheet] = useState<{ opts: PanelOpts; n: number } | null>(null);
  const lastFocus = useRef<Element | null>(null);

  const openSheet = useCallback((d: SheetTarget) => {
    lastFocus.current = document.activeElement;
    setSheet((s) => ({ n: (s?.n || 0) + 1, opts: { masdar: d.m, meaning: d.u, root: d.root, bab: d.b, entries: core.entriesFor(d.nr), keepBab: true } }));
  }, [core]);
  const closeSheet = useCallback(() => {
    setSheet(null);
    (lastFocus.current as HTMLElement | null)?.focus?.();
  }, []);

  // Route change: remember the screen, close the sheet, scroll to top, remember the subject.
  useEffect(() => {
    setVisited((v) => (v.has(view) ? v : new Set(v).add(view)));
    setSheet(null);
    scrollTo(0, 0);
    const sub = SUB_OF[view];
    if (sub) setPref('sub', sub);
  }, [view]);

  useEffect(() => {
    if (!sheet) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSheet(); };
    addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; removeEventListener('keydown', onKey); };
  }, [sheet, closeSheet]);

  const screen = (v: View, el: React.ReactNode) => visited.has(v) && <section key={v} className="wrap" hidden={view !== v}>{el}</section>;

  return (
    <SheetCtx.Provider value={openSheet}>
      <Header onHome={() => navigate('home')} onSearch={() => navigate('search')} />
      <Dock view={view} />
      <main>
        {screen('home', <Home />)}
        {screen('masadir', <Masadir />)}
        {screen('study', <Study active={view === 'study'} sheetOpen={!!sheet} />)}
        {screen('maker', <Maker />)}
        {screen('vocab', <Vocab />)}
        {screen('qawaid', <RefBook cfg={REF_BOOKS.qawaid} />)}
        {screen('fiqh', <RefBook cfg={REF_BOOKS.fiqh} />)}
        {screen('uhadith', <RefBook cfg={REF_BOOKS.uhadith} />)}
        {screen('tafsir', <RefBook cfg={REF_BOOKS.tafsir} />)}
        {screen('ahadith', <Ahadith />)}
        {screen('search', <SemanticSearch />)}
      </main>
      {sheet && (
        <div className="sheet" role="dialog" aria-modal="true" aria-label="گردان" onClick={(e) => { if (e.target === e.currentTarget) closeSheet(); }}>
          <div className="body">
            <div className="grabber" />
            <GardaanPanel key={sheet.n} id="s" opts={sheet.opts} onClose={closeSheet} />
          </div>
        </div>
      )}
      <Toast />
      <UpdatePrompt />
    </SheetCtx.Provider>
  );
}
