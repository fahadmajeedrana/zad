// One component for the four topic-summary screens: قواعد, کتاب الفقہ, اصول حدیث, اصول تفسیر (doc 02).
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { gnorm } from '../../core/text';
import { onLoad } from '../../data/loader';
import type { RefSection, RefTopic } from '../../data/types';
import { useData } from '../../app/context';
import { usePref } from '../../state/prefs';
import { Empty, Hl, RichText, SearchField, SectionTitle } from '../../ui/controls';

export interface RefBookConfig {
  dataKey: 'guide' | 'fiqh' | 'uhadith' | 'tafsir';
  storeKey: string;
  defaultSection: string;
  allLabel: string;
  sectionLabel: string;
  shortLabel: (s: RefSection) => string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  searchLabel: string;
}

export const REF_BOOKS: Record<'qawaid' | 'fiqh' | 'uhadith' | 'tafsir', RefBookConfig> = {
  qawaid: { dataKey: 'guide', storeKey: 'gBook', defaultSection: 's1', allLabel: 'تمام کتابیں', sectionLabel: 'کتاب',
    shortLabel: (b) => b.n.split(' · ')[0].replace('کتاب ', '') + ' ' + '١٢٣'[+b.k[1] - 1],
    title: 'قواعد کا خلاصہ', subtitle: 'کتاب الصرف اور کتاب النحو، حصہ اول، دوم و سوم', searchPlaceholder: 'قاعدہ، اصطلاح یا مثال تلاش کریں', searchLabel: 'قواعد میں تلاش' },
  fiqh: { dataKey: 'fiqh', storeKey: 'fBook', defaultSection: 'f1b1', allLabel: 'تمام ابواب', sectionLabel: 'باب',
    shortLabel: (b) => b.n.split(':')[0].replace('حصہ ', ''),
    title: 'کتاب الفقہ', subtitle: 'حصہ اول (عبادات)، حصہ دوم (نکاح و طلاق)', searchPlaceholder: 'مسئلہ، اصطلاح یا حکم تلاش کریں', searchLabel: 'فقہ میں تلاش' },
  uhadith: { dataKey: 'uhadith', storeKey: 'uBook', defaultSection: 'uhb1', allLabel: 'تمام ابواب', sectionLabel: 'باب',
    shortLabel: (b) => b.n.split(':')[0],
    title: 'اصول حدیث', subtitle: 'حجیتِ حدیث، اصطلاحات، کتبِ حدیث اور اصول', searchPlaceholder: 'اصطلاح، کتاب یا اصول تلاش کریں', searchLabel: 'اصول حدیث میں تلاش' },
  tafsir: { dataKey: 'tafsir', storeKey: 'tBook', defaultSection: 'utb1', allLabel: 'تمام حصے', sectionLabel: 'باب',
    shortLabel: (b) => b.n.split('،')[0],
    title: 'اصول تفسیر', subtitle: 'قرآن، وحی، جمعِ قرآن، قراءات اور مآخذِ تفسیر', searchPlaceholder: 'اصطلاح، عنوان یا تفسیر تلاش کریں', searchLabel: 'اصول تفسیر میں تلاش' },
};

// Derived fields, built once when a file loads: topic number within its section and the search key.
const prepareRef = (d: RefSection[]) => d.forEach((b) => b.x.forEach((t, i) => { t.n = i + 1; t.s = gnorm(t.t + ' ' + t.i.map((x) => x[1]).join(' ')); }));
for (const k of ['guide', 'fiqh', 'uhadith', 'tafsir'] as const) onLoad(k, prepareRef);

export function RefBook({ cfg }: { cfg: RefBookConfig }) {
  const st = useData(cfg.dataKey);
  return (
    <>
      <SectionTitle title={cfg.title} sub={cfg.subtitle} />
      {st.status === 'ready' ? <RefBookBody cfg={cfg} data={st.data} /> : (
        <>
          <SearchField value="" onChange={() => {}} placeholder={cfg.searchPlaceholder} label={cfg.searchLabel} />
          {st.status === 'loading' ? <Empty>لوڈ ہو رہا ہے…</Empty>
            : <Empty action={<button type="button" className="btn" onClick={st.retry}>دوبارہ کوشش کریں</button>}>ڈیٹا لوڈ نہیں ہو سکا۔</Empty>}
        </>
      )}
    </>
  );
}

function RefBookBody({ cfg, data }: { cfg: RefBookConfig; data: RefSection[] }) {
  const [storedBook, setBook] = usePref<string>(cfg.storeKey, cfg.defaultSection);
  const book = storedBook === 'all' || data.some((b) => b.k === storedBook) ? storedBook : cfg.defaultSection;
  const [topicSel, setTopic] = useState('all');
  const [q, setQ] = useState('');
  const qn = gnorm(useDeferredValue(q).trim()).trim();
  const listRef = useRef<HTMLDivElement>(null);

  const sections = data.filter((b) => book === 'all' || b.k === book);
  const topic = topicSel !== 'all' && sections.some((b) => b.x.some((t) => `${b.k}:${t.n}` === topicSel)) ? topicSel : 'all';

  const groups = useMemo(() => sections
    .map((b) => ({ b, ts: b.x.filter((t) => (topic === 'all' || topic === `${b.k}:${t.n}`) && (!qn || t.s!.includes(qn))) }))
    .filter((g) => g.ts.length), [sections, topic, qn]);
  const n = groups.reduce((a, g) => a + g.ts.length, 0);
  const open = !!qn || topic !== 'all';
  const setAll = (v: boolean) => listRef.current?.querySelectorAll('details').forEach((d) => { d.open = v; });

  return (
    <>
      <SearchField value={q} onChange={setQ} placeholder={cfg.searchPlaceholder} label={cfg.searchLabel} />
      <div className="filters">
        <select className="sel" aria-label={cfg.sectionLabel} value={book} onChange={(e) => { setBook(e.target.value); setTopic('all'); scrollTo(0, 0); }}>
          {data.map((b) => <option key={b.k} value={b.k}>{b.n}</option>)}
          <option value="all">{cfg.allLabel}</option>
        </select>
        <select className="sel" aria-label="عنوان" value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="all">تمام عنوانات</option>
          {sections.map((b) => b.x.map((t) => <option key={`${b.k}:${t.n}`} value={`${b.k}:${t.n}`}>{book === 'all' ? cfg.shortLabel(b) + ' — ' : ''}{t.n}. {t.t}</option>))}
        </select>
        <div className="gtools">
          <button type="button" className="iconbtn" onClick={() => setAll(true)}>سب کھولیں</button>
          <button type="button" className="iconbtn" onClick={() => setAll(false)}>سب بند کریں</button>
        </div>
        <span className="count">{n} عنوانات</span>
      </div>
      <div className="vtables" ref={listRef}>
        {groups.length === 0 ? <Empty>کوئی عنوان نہیں ملا۔</Empty> : groups.map(({ b, ts }) => (
          <div key={b.k} className="gbook">
            <div className="lhead"><h3>{b.n}</h3><span>{ts.length} عنوانات</span></div>
            {ts.map((t) => <Topic key={`${b.k}:${t.n}:${open}`} t={t} open={open} qn={qn} />)}
          </div>
        ))}
      </div>
    </>
  );
}

function Topic({ t, open, qn }: { t: RefTopic; open: boolean; qn: string }) {
  return (
    <details className="rule" open={open}>
      <summary>
        <span className="rn">{t.n}</span>
        <span className="rt"><Hl text={t.t} q={qn} /></span>
        {t.p && <span className="pg">ص {t.p}</span>}
      </summary>
      <ul>
        {t.i.map(([l, x, num], i) => (
          <li key={i} className={`${l ? 'l1' : 'l0'}${num ? ' num' : ''}`}>
            {num ? <b className="k">{num}.</b> : null}
            <RichText text={x} q={qn} />
          </li>
        ))}
      </ul>
    </details>
  );
}
