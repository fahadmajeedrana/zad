// فلیش کارڈ (doc 02): deck from masadir or vocabulary, 3D flip, known set, keyboard and swipe.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BABS, sarfSagheer, type BabCode } from '../../core/sarf/engine';
import { sayText } from '../../core/text';
import { BOOKS, BOOK_ORDER, isMz } from '../../data/core';
import type { BookCode, Masdar, Word } from '../../data/types';
import { useCore, useOpenSheet } from '../../app/context';
import { useKnown } from '../../state/known';
import { speak } from '../../platform/speech';
import { toast } from '../../platform/toast';
import { SectionTitle } from '../../ui/controls';
import { BabOptions } from '../gardaan/BabOptions';

type Card = Masdar | Word;
const isWord = (d: Card): d is Word => 'a' in d;

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function Study({ active, sheetOpen }: { active: boolean; sheetOpen: boolean }) {
  const core = useCore();
  const openSheet = useOpenSheet();
  const { known, toggle } = useKnown();
  const [src, setSrc] = useState<'m' | 'w'>('m');
  const [filter, setFilter] = useState<string>('all');
  const [mode, setMode] = useState<'all' | 'unknown'>('all');
  const [front, setFront] = useState<'ar' | 'ur'>('ar');
  const [shuffles, setShuffles] = useState(0);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sayPlaying, setSayPlaying] = useState(false);

  // The deck is rebuilt (and reshuffled) only when the settings change — not when a card is marked known.
  const knownRef = useRef(known);
  knownRef.current = known;
  const deck: Card[] = useMemo(() => {
    const k = knownRef.current;
    const list: Card[] = src === 'w'
      ? core.WORDS.filter((d) => (filter === 'all' || d.bk === filter) && (mode === 'all' || !k.has(d.id)))
      : core.DATA.filter((d) => (filter === 'all' || d.b === filter) && (mode === 'all' || !k.has(d.id)));
    return shuffle(list.slice());
  }, [core, src, filter, mode, shuffles]);
  useEffect(() => { setPos(0); setFlipped(false); }, [deck]);

  const d = deck[pos] as Card | undefined;
  const flip = useCallback(() => setFlipped((f) => !f), []);
  const step = useCallback((n: number) => {
    if (!deck.length) return;
    setPos((p) => (p + n + deck.length) % deck.length);
    setFlipped(false);
  }, [deck.length]);

  useEffect(() => {
    if (!active || sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (/INPUT|SELECT|TEXTAREA/.test((document.activeElement as HTMLElement | null)?.tagName || '')) return;
      if (e.key === 'ArrowLeft') step(1);
      else if (e.key === 'ArrowRight') step(-1);
      else if (e.key === ' ') { e.preventDefault(); flip(); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [active, sheetOpen, step, flip]);

  const tx = useRef<number | null>(null);
  const books = BOOK_ORDER.filter((k) => core.WORDS.some((w) => w.bk === k));

  let frontEl: React.ReactNode, backEl: React.ReactNode = null;
  if (!d) {
    frontEl = <div className="um">اس انتخاب میں کوئی کارڈ نہیں</div>;
  } else if (isWord(d)) {
    const arW = <><div className="big">{d.a}</div><span className="tag">{d.t} · {BOOKS[d.bk]}</span></>;
    const urW = <><div className="um">{d.u}</div>{d.c ? <div className="sub">قرآن کریم میں: {d.c} بار</div> : null}</>;
    frontEl = front === 'ar' ? arW : urW;
    backEl = front === 'ar' ? urW : arW;
  } else {
    const S0 = sarfSagheer(d.b, d.root);
    const tag = <span className="tag"><span className={`dot${isMz(d.b) ? ' mz' : ''}`} />{BABS[d.b].ur}</span>;
    const arSide = <><div className="big">{d.m}</div><div className="sub">{S0.madi} · {S0.mudari}</div>{tag}</>;
    const urSide = <><div className="um">{d.u}</div><div className="sub">{d.root.join(' ')}</div></>;
    frontEl = front === 'ar' ? arSide : urSide;
    backEl = front === 'ar' ? <>{urSide}{tag}</> : arSide;
  }

  return (
    <>
      <SectionTitle title="فلیش کارڈ سے دہرائی" />
      <div className="study">
        <div className="settings">
          <select className="sel" aria-label="ذریعہ" value={src} onChange={(e) => { setSrc(e.target.value as 'm' | 'w'); setFilter('all'); }}>
            <option value="m">مصادر</option><option value="w">ذخیرہ الفاظ</option>
          </select>
          <select className="sel" aria-label="باب" value={filter} onChange={(e) => setFilter(e.target.value as BabCode | BookCode | 'all')}>
            {src === 'w'
              ? <><option value="all">تمام کتابیں</option>{books.map((k) => <option key={k} value={k}>{BOOKS[k]}</option>)}</>
              : <BabOptions withAll />}
          </select>
          <select className="sel" aria-label="کارڈ" value={mode} onChange={(e) => setMode(e.target.value as 'all' | 'unknown')}>
            <option value="all">تمام کارڈ</option><option value="unknown">جو یاد نہیں</option>
          </select>
          <select className="sel" aria-label="سامنے" value={front} onChange={(e) => { setFront(e.target.value as 'ar' | 'ur'); setFlipped(false); }}>
            <option value="ar">سامنے عربی</option><option value="ur">سامنے اردو</option>
          </select>
        </div>
        <button type="button" className={`flip${flipped ? ' on' : ''}`} aria-label="کارڈ پلٹیں" onClick={flip}
          onTouchStart={(e) => { tx.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (tx.current == null) return;
            const dx = e.changedTouches[0].clientX - tx.current;
            tx.current = null;
            if (Math.abs(dx) > 50) { e.preventDefault(); step(dx < 0 ? 1 : -1); }
          }}>
          <div className="flip-inner">
            <div className="face front">{frontEl}{d && <span className="hint">پلٹنے کے لیے ٹیپ کریں</span>}</div>
            <div className="face back">{backEl}</div>
          </div>
        </button>
        <div className="progress">
          <span>{d ? `${pos + 1} / ${deck.length}` : '0 / 0'}</span>
          <span className="bar"><i style={{ width: d ? `${((pos + 1) / deck.length) * 100}%` : 0 }} /></span>
        </div>
        <div className="ctrls">
          <button type="button" className="btn" onClick={() => step(-1)}>پچھلا</button>
          <button type="button" className="btn primary" onClick={flip}>پلٹیں</button>
          <button type="button" className="btn" onClick={() => step(1)}>اگلا</button>
        </div>
        <div className="ctrls">
          <button type="button" className="btn good" aria-pressed={!!d && known.has(d.id)} onClick={() => d && toggle(d.id)}>✓ یاد ہے</button>
          <button type="button" className={`btn${sayPlaying ? ' playing' : ''}`} onClick={() => { if (d && speak(isWord(d) ? sayText(d.a) : d.m, () => setSayPlaying(false))) setSayPlaying(true); }}>🔊 سنیں</button>
          {d && !isWord(d) && <button type="button" className="btn accent" onClick={() => openSheet(d)}>گردان</button>}
          <button type="button" className="btn ghost" onClick={() => { setShuffles((n) => n + 1); toast('ترتیب بدل دی گئی'); }}>ترتیب بدلیں</button>
        </div>
      </div>
    </>
  );
}
