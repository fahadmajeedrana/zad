// تلاش بالمعنی (experimental): ask in your own words, get the books' own passages back.
// Retrieval only — no AI-written answers. Runs fully in the browser; works offline once the
// model has been downloaded.
import { useEffect, useRef, useState } from 'react';
import { loadData } from '../../data/loader';
import type { HadithPart, RefSection } from '../../data/types';
import { navigate, type View } from '../../router';
import { usePref } from '../../state/prefs';
import { Empty, RichText, SayButton, SectionTitle } from '../../ui/controls';
import { buildLexicon, hasLatin, lexiconTexts, transliterate, type LexEntry } from '../../core/roman';
import { decodeIndex, embedQuery, loadModel, onModelProgress, rank, type Hit, type RefKey, type SemanticIndex } from './semantic';

const KINDS: [string, string, string[] | null][] = [
  ['all', 'سب', null], ['fiqh', 'فقہ', ['fiqh']], ['hadith', 'احادیث', ['hadith']], ['uhadith', 'اصول حدیث', ['uhadith']],
  ['tafsir', 'اصول تفسیر', ['tafsir']], ['guide', 'قواعد', ['guide']],
];
const EXAMPLES = ['وضو کن چیزوں سے ٹوٹ جاتا ہے؟', 'زکوٰۃ کن لوگوں کو دی جا سکتی ہے؟', 'قرآن کو ایک کتاب کی شکل میں کس نے جمع کیا؟', 'ضعیف اور موضوع حدیث میں فرق', 'ماں باپ کے ساتھ اچھا سلوک', 'لازم اور متعدی فعل میں فرق', 'wuzu kin cheezon se toot jata hai?'];
const VIEW_OF: Record<RefKey, View> = { guide: 'qawaid', fiqh: 'fiqh', uhadith: 'uhadith', tafsir: 'tafsir' };
const BOOK_NAME: Record<RefKey, string> = { guide: 'قواعد', fiqh: 'کتاب الفقہ', uhadith: 'اصول حدیث', tafsir: 'اصول تفسیر' };

type Books = Partial<Record<RefKey, RefSection[]>> & { hadith?: HadithPart[] };
type ModelState = 'unknown' | 'loading' | 'ready' | 'error';

let indexPromise: Promise<SemanticIndex> | null = null;
const getIndex = () => (indexPromise ??= loadData('semantic').then(decodeIndex).catch((e) => { indexPromise = null; throw e; }));

// Roman Urdu support: vocabulary learned from the books themselves (built once, ~100 ms).
let lexPromise: Promise<LexEntry[]> | null = null;
const getLexicon = () => (lexPromise ??= Promise.all([loadData('guide'), loadData('fiqh'), loadData('uhadith'), loadData('tafsir'), loadData('hadith')])
  .then(([g, f, u, t, h]) => buildLexicon(lexiconTexts([g, f, u, t], h)))
  .catch((e) => { lexPromise = null; throw e; }));

export function SemanticSearch() {
  const [modelOk, setModelOk] = usePref('semModel', false);
  const [model, setModel] = useState<ModelState>('unknown');
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [asked, setAsked] = useState('');
  const [understood, setUnderstood] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [books, setBooks] = useState<Books>({});
  const [ms, setMs] = useState(0);
  const files = useRef(new Map<string, { loaded: number; total: number }>());

  useEffect(() => onModelProgress((p) => {
    if (p.status === 'progress' && p.file && p.total) {
      files.current.set(p.file, { loaded: p.loaded || 0, total: p.total });
      let loaded = 0, total = 0;
      files.current.forEach((f) => { loaded += f.loaded; total += f.total; });
      setProgress({ loaded, total });
    }
  }), []);

  const startModel = async () => {
    setModel('loading');
    setError('');
    try {
      await loadModel(await getIndex());
      setModel('ready');
      setModelOk(true);
    } catch (e) {
      setModel('error');
      setError(navigator.onLine ? `ماڈل لوڈ نہیں ہو سکا: ${(e as Error).message}` : 'ماڈل ڈاؤن لوڈ کرنے کے لیے انٹرنیٹ درکار ہے۔');
    }
  };
  // Already downloaded on this device before: load it straight away (from cache, works offline).
  useEffect(() => { if (modelOk && model === 'unknown') startModel(); }, [modelOk]);

  const search = async (text: string) => {
    const query = text.trim();
    if (!query || model !== 'ready') return;
    setBusy(true);
    setError('');
    try {
      const t0 = performance.now();
      const idx = await getIndex();
      // Roman Urdu → Urdu script (the model only understands Urdu script).
      const urdu = hasLatin(query) ? transliterate(await getLexicon(), query) : query;
      setUnderstood(urdu !== query ? urdu : '');
      const qv = await embedQuery(idx, urdu);
      const k = KINDS.find((x) => x[0] === kind)![2];
      const found = rank(idx, qv, k ? new Set(k) : null, 10);
      // Load the books the results come from (precached, so this is instant offline).
      const need = new Set(found.map((h) => h.ref[0]));
      const loaded: Books = { ...books };
      await Promise.all([...need].filter((d) => !loaded[d as keyof Books]).map(async (d) => {
        if (d === 'hadith') loaded.hadith = await loadData('hadith');
        else loaded[d as RefKey] = await loadData(d as RefKey);
      }));
      setBooks(loaded);
      setHits(found);
      setAsked(query);
      setMs(Math.round(performance.now() - t0));
    } catch (e) {
      setError(`تلاش نہیں ہو سکی: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };
  // Re-run when the filter changes.
  useEffect(() => { if (asked) search(asked); }, [kind]);

  const pct = progress && progress.total ? Math.round((progress.loaded / progress.total) * 100) : 0;
  const mb = (n: number) => (n / 1e6).toFixed(0);

  return (
    <>
      <SectionTitle title="تلاش بالمعنی" sub="تجرباتی · اپنے الفاظ میں سوال لکھیں" />
      <div className="note sem-note">
        یہ صفحہ آپ کے سوال کے مطلب سے ملتے جلتے حصے کتابوں سے ڈھونڈ کر دکھاتا ہے؛ جواب خود نہیں لکھتا۔ ہر نتیجہ کتاب کا اپنا متن ہے، حوالے کے ساتھ۔
      </div>

      {model !== 'ready' && (
        <div className="sem-model">
          {model === 'loading' ? (
            <>
              <div>ماڈل لوڈ ہو رہا ہے… {progress && progress.total > 1e6 ? `${mb(progress.loaded)} / ${mb(progress.total)} MB` : ''}</div>
              <div className="progress"><span className="bar"><i style={{ width: `${pct}%` }} /></span><span>{pct}%</span></div>
            </>
          ) : (
            <>
              <div>اس تلاش کے لیے ایک دفعہ تقریباً <b>120 MB</b> کا ماڈل ڈاؤن لوڈ ہوگا (وائی فائی بہتر ہے)۔ اس کے بعد یہ بغیر انٹرنیٹ کے بھی چلے گا۔</div>
              <button type="button" className="btn primary" onClick={startModel}>ماڈل ڈاؤن لوڈ کریں</button>
            </>
          )}
        </div>
      )}

      <div className="maker">
        <div className="row">
          <input className="sem-input" dir="auto" placeholder="مثلاً: وضو کن چیزوں سے ٹوٹ جاتا ہے؟ یا wuzu kin cheezon se toot jata hai" autoComplete="off" aria-label="سوال" value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') search(q); }} disabled={model !== 'ready'} />
          <button type="button" className="btn accent" onClick={() => search(q)} disabled={model !== 'ready' || busy}>{busy ? '…' : 'تلاش'}</button>
        </div>
        <div className="examples sem-examples">
          <span>مثالیں:</span>
          {EXAMPLES.map((x) => <button type="button" key={x} disabled={model !== 'ready'} onClick={() => { setQ(x); search(x); }}>{x}</button>)}
        </div>
        <div className="filters">
          <div className="seg sem-kinds" role="group" aria-label="کتاب">
            {KINDS.map(([k, n]) => <button type="button" key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>{n}</button>)}
          </div>
          {hits && <span className="count">{hits.length} نتائج · {ms} ms</span>}
        </div>
      </div>

      {understood && hits && <div className="note sem-understood">رومن اردو سے: <b>{understood}</b> <span className="muted">(غلط ہو تو اردو میں لکھیں)</span></div>}
      {error && <div className="warn">{error}</div>}
      {hits && hits.length === 0 && <Empty>کچھ نہیں ملا۔</Empty>}
      {hits && hits.length > 0 && (
        <div className="vtables sem-results">
          {hits.map((h, i) => <Result key={i} rank={i + 1} hit={h} books={books} />)}
        </div>
      )}
    </>
  );
}

function Result({ rank, hit, books }: { rank: number; hit: Hit; books: Books }) {
  const r = hit.ref;
  const score = <span className="pill sem-score" title="مطابقت">{Math.round(hit.score * 100)}%</span>;
  if (r[0] === 'hadith') {
    const [, p, bi, n] = r;
    const part = books.hadith?.find((x) => x.k === p);
    const bab = part?.b[bi];
    const h = bab?.h.find((x) => x.n === n);
    if (!part || !bab || !h) return null;
    return (
      <article className="hcard sem-card">
        <div className="hh">
          <span className="hn">{rank}</span>
          <span className="sem-src">{part.n} · <span className="ar">{bab.t.split(' — ')[0]}</span> · حدیث {n}</span>
          {score}
        </div>
        <div className="ha" lang="ar" dir="rtl">{h.a}</div>
        <div className="hu"><b>ترجمہ:</b>{h.u}</div>
        <div className="sem-foot">
          <span className="hs">{h.s}</span>
          <SayButton text={h.a.replace(/[﴾﴿]/g, '')} sm label="حدیث سنیں" />
          <button type="button" className="btn ghost sem-open" onClick={() => navigate('ahadith', { b: `${p}:${bi}` })}>باب کھولیں ›</button>
        </div>
      </article>
    );
  }
  const [d, s, n, a, b] = r;
  const sec = books[d]?.find((x) => x.k === s);
  const t = sec?.x[n - 1];
  if (!sec || !t) return null;
  const items = t.i.slice(a, b);
  return (
    <article className="rule sem-card sem-topic">
      <div className="sem-head">
        <span className="rn">{rank}</span>
        <div className="sem-title">
          <b>{t.t}</b>
          <small>{BOOK_NAME[d]} · {sec.n}{t.p ? ` · ص ${t.p}` : ''}</small>
        </div>
        {score}
      </div>
      <ul>
        {a > 0 && <li className="l0 sem-more">…</li>}
        {items.map(([l, x, num], i) => (
          <li key={i} className={`${l ? 'l1' : 'l0'}${num ? ' num' : ''}`}>
            {num ? <b className="k">{num}.</b> : null}
            <RichText text={x} q="" />
          </li>
        ))}
        {b < t.i.length && <li className="l0 sem-more">…</li>}
      </ul>
      <div className="sem-foot">
        <button type="button" className="btn ghost sem-open" onClick={() => navigate(VIEW_OF[d], { t: `${s}:${n}` })}>پورا عنوان کھولیں ›</button>
      </div>
    </article>
  );
}

