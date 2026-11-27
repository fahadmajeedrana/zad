// ذخیرہ الفاظ (doc 02): lesson tables or word/verb cards.
import { useDeferredValue, useMemo, useState } from 'react';
import { BABS } from '../../core/sarf/engine';
import { sayText, toNom } from '../../core/text';
import { BOOKS, BOOK_ORDER, isMz, matchVerb, matchWord, type Core } from '../../data/core';
import type { BookCode, Verb, Word } from '../../data/types';
import { useCore, useOpenSheet } from '../../app/context';
import { usePref } from '../../state/prefs';
import { toast } from '../../platform/toast';
import { Empty, HideToggle, SayButton, SearchField, SectionTitle, Seg } from '../../ui/controls';

type Mode = 'table' | 'cards';
type Kind = 'w' | 'v';
type BookSel = BookCode | 'all';

function lessonOrder(core: Core, book: BookSel): [BookCode, string][] {
  const seen = new Set<string>(), out: [BookCode, string][] = [];
  const add = (bk: BookCode, t: string) => { const k = bk + '|' + t; if (!seen.has(k)) { seen.add(k); out.push([bk, t]); } };
  for (const b of BOOK_ORDER) {
    if (book !== 'all' && b !== book) continue;
    core.WORDS.forEach((w) => w.bk === b && add(b, w.t));
    core.VERBS.forEach((v) => v.bk === b && add(b, v.sec));
  }
  return out;
}

const Qc = ({ c }: { c: number | null }) => (c ? <span className="qc" title="قرآن کریم میں تعداد">{c}</span> : null);

export function Vocab() {
  const core = useCore();
  const openSheet = useOpenSheet();
  const [storedBook, setBook] = usePref<BookSel>('vBook', 'q1');
  const book: BookSel = storedBook === 'all' || BOOKS[storedBook] ? storedBook : 'all';
  const [mode, setMode] = usePref<Mode>('vMode', 'table');
  const [hide, setHide] = usePref('vHide', false);
  const [kind, setKind] = useState<Kind>('w');
  const [topicSel, setTopic] = useState('all');
  const [q, setQ] = useState('');
  const dq = useDeferredValue(q.trim());
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const topics = useMemo(() => mode === 'table'
    ? [...new Set(lessonOrder(core, book).map(([, t]) => t))]
    : [...new Set((kind === 'w' ? core.WORDS : core.VERBS).filter((x) => book === 'all' || x.bk === book).map((x) => ('t' in x ? x.t : x.sec)))],
  [core, book, mode, kind]);
  const topic = topics.includes(topicSel) ? topicSel : 'all';

  const openVerb = (v: Verb) => {
    if (!v.b) { toast('اس فعل کی گردان (رباعی / خلافِ قیاس) یہاں دستیاب نہیں'); return; }
    openSheet({ m: toNom(v.ms.split('/')[0].trim()), u: v.u, root: v.root, b: v.b, nr: v.nr });
  };
  const openWord = (w: Word) => { if (w.g) openSheet(w.g); };
  const reveal = (id: string) => hide && setRevealed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const keyOpen = (fn: () => void) => (e: React.KeyboardEvent) => { if (e.key === 'Enter' && e.target === e.currentTarget) fn(); };

  let count = '';
  let body: React.ReactNode;
  if (mode === 'table') {
    let nW = 0, nV = 0;
    const lessons = lessonOrder(core, book).filter(([, t]) => topic === 'all' || t === topic).map(([bk, t]) => {
      const vs = core.VERBS.filter((v) => v.bk === bk && v.sec === t && matchVerb(v, dq));
      const ws = core.WORDS.filter((w) => w.bk === bk && w.t === t && matchWord(w, dq));
      nW += ws.length; nV += vs.length;
      return { bk, t, vs, ws };
    }).filter((l) => l.vs.length || l.ws.length);
    count = `${nV} افعال · ${nW} اسماء`;
    body = lessons.length === 0 ? <Empty>کچھ نہیں ملا۔</Empty> : lessons.map(({ bk, t, vs, ws }) => {
      const amr = vs.some((v) => v.amr), vc = vs.some((v) => v.c), wc = ws.some((w) => w.c), pl = ws.some((w) => / ج: /.test(w.a));
      const date = core.lessonDates[t] ? ' · ' + core.lessonDates[t] : '';
      return (
        <section key={bk + '|' + t} className="lesson">
          <div className="lhead"><h3>{t}</h3><span>{BOOKS[bk]}{date}</span></div>
          {vs.length > 0 && (<>
            <div className="ltitle">أفعال</div>
            <div className="tw"><table className="vt">
              <thead><tr><th>#</th><th>الفعل الماضي</th><th>الفعل المضارع</th>{amr && <th>الأمر</th>}<th>المصدر</th><th>معنی (اردو)</th>{vc && <th>تعداد</th>}<th></th></tr></thead>
              <tbody>{vs.map((v, k) => (
                <tr key={v.i} className={`${v.b ? 'lnk' : ''}${revealed.has('v' + v.i) ? ' revealed' : ''}`} title={v.b ? 'گردان دیکھیں' : undefined}
                  onClick={() => (v.b ? openVerb(v) : reveal('v' + v.i))}>
                  <td className="n">{k + 1}</td><td className="a">{v.madi}</td><td className="a">{v.mud}</td>{amr && <td className="a">{v.amr || '—'}</td>}
                  <td className="a">{v.ms}</td><td className="m">{v.u}</td>{vc && <td className="c">{v.c || ''}</td>}
                  <td className="sp"><SayButton sm text={v.madi + '، ' + v.mud.split('/')[0] + '، ' + v.ms.split('/')[0]} /></td>
                </tr>))}
              </tbody>
            </table></div>
          </>)}
          {ws.length > 0 && (<>
            <div className="ltitle">أسماء</div>
            <div className="tw"><table className="vt">
              <thead><tr><th>#</th><th>الاسم</th>{pl && <th>جمعه</th>}<th>معنی (اردو)</th>{wc && <th>تعداد</th>}<th></th></tr></thead>
              <tbody>{ws.map((w, k) => { const [sg, p] = w.a.split(' ج: '); return (
                <tr key={w.id} className={`${w.g ? 'lnk' : 'wr'}${revealed.has(w.id) ? ' revealed' : ''}`} title={w.g ? 'گردان دیکھیں' : undefined}
                  onClick={() => (w.g ? openWord(w) : reveal(w.id))}>
                  <td className="n">{k + 1}</td><td className="a">{sg}</td>{pl && <td className="a">{p || '—'}</td>}<td className="m">{w.u}</td>{wc && <td className="c">{w.c || ''}</td>}
                  <td className="sp"><SayButton sm text={sayText(w.a)} /></td>
                </tr>); })}
              </tbody>
            </table></div>
          </>)}
        </section>
      );
    });
  } else if (kind === 'w') {
    const list = core.WORDS.filter((w) => (book === 'all' || w.bk === book) && (topic === 'all' || w.t === topic) && matchWord(w, dq));
    count = `${list.length} الفاظ`;
    body = list.length === 0 ? <div className="grid-full"><Empty>کوئی لفظ نہیں ملا۔</Empty></div> : list.map((w) => (
      <div key={w.id} className={`card vcard${w.g ? ' haslink' : ''}${revealed.has(w.id) ? ' revealed' : ''}`} tabIndex={0}
        {...(w.g ? { role: 'button', 'aria-label': `${w.a} کی گردان`, onKeyDown: keyOpen(() => openWord(w)) } : {})}
        onClick={() => (w.g ? openWord(w) : reveal(w.id))}>
        <div className="masdar">{w.a}</div>
        <div className="meaning">{w.u}</div>
        <div className="foot"><span className="vtopic">{w.t}</span>{w.g && <span className="glink">گردان ›</span>}<Qc c={w.c} /><SayButton sm text={sayText(w.a)} /></div>
      </div>
    ));
  } else {
    const list = core.VERBS.filter((v) => (book === 'all' || v.bk === book) && (topic === 'all' || v.sec === topic) && matchVerb(v, dq));
    count = `${list.length} افعال`;
    body = list.length === 0 ? <div className="grid-full"><Empty>کوئی فعل نہیں ملا۔</Empty></div> : list.map((v) => (
      <div key={v.i} className="card vcard isverb" role="button" tabIndex={0} aria-label={`${v.madi} کی گردان`} onClick={() => openVerb(v)} onKeyDown={keyOpen(() => openVerb(v))}>
        <div className="masdar">{v.madi}</div>
        <div className="vforms ar">{[v.mud, v.amr, v.ms].filter(Boolean).join(' · ')}</div>
        <div className="meaning">{v.u}</div>
        <div className="foot">
          <span className={`dot${v.b && isMz(v.b) ? ' mz' : ''}`} />
          <span className="vtopic">{v.b ? BABS[v.b].ur : v.sec}</span>
          <Qc c={v.c} />
          <SayButton sm text={v.madi + '، ' + v.mud.split('/')[0]} />
        </div>
      </div>
    ));
  }

  return (
    <>
      <SectionTitle title="ذخیرہ الفاظ" sub="قصص النبیین، کتاب الصرف، کتاب النحو" />
      <SearchField value={q} onChange={setQ} placeholder="عربی لفظ، مادہ یا اردو معنی تلاش کریں" label="ذخیرہ میں تلاش" />
      <div className="filters">
        <Seg<Mode> label="انداز" value={mode} onChange={(m) => { setMode(m); setTopic('all'); }} options={[['table', 'جدول'], ['cards', 'کارڈ']]} />
        {mode === 'cards' && <Seg<Kind> label="قسم" value={kind} onChange={(k) => { setKind(k); setTopic('all'); }} options={[['w', 'الفاظ'], ['v', 'افعال']]} />}
        <select className="sel" aria-label="کتاب" value={book} onChange={(e) => setBook(e.target.value as BookSel)}>
          <option value="all">تمام کتابیں</option>
          {BOOK_ORDER.map((k) => <option key={k} value={k}>{BOOKS[k]}</option>)}
        </select>
        <select className="sel" aria-label="عنوان" value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="all">تمام عنوانات</option>
          {topics.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <HideToggle on={hide} onChange={setHide}>معنی چھپائیں</HideToggle>
        <span className="count">{count}</span>
      </div>
      <div className={`${mode === 'table' ? 'vtables' : 'grid'}${hide ? ' hide' : ''}`}>{body}</div>
    </>
  );
}
