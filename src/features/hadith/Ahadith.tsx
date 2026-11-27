// کتاب الحدیث (doc 02): parts, ابواب with کتاب dividers, glossary chips, hide-translation.
import { useDeferredValue, useMemo, useState } from 'react';
import { gnorm } from '../../core/text';
import { onLoad } from '../../data/loader';
import type { Hadith, HadithPart } from '../../data/types';
import { useData } from '../../app/context';
import { usePref } from '../../state/prefs';
import { Empty, HideToggle, Hl, SayButton, SearchField, SectionTitle } from '../../ui/controls';

onLoad('hadith', (d) => d.forEach((p) => p.b.forEach((bb, i) => {
  bb.i = i;
  bb.h.forEach((x) => { x.s2 = gnorm(x.a + ' ' + x.u + ' ' + x.s + ' ' + x.w.map((w) => w.join(' ')).join(' ')); });
})));

const PLACEHOLDER = 'حدیث، لفظ، ترجمہ یا حوالہ تلاش کریں';
const last = (s: string) => s.split(' — ').pop() || '';

export function Ahadith() {
  const st = useData('hadith');
  return (
    <>
      <SectionTitle title="کتاب الحدیث" sub="حصہ اول، دوم و سوم" />
      {st.status === 'ready' ? <Body data={st.data} /> : (
        <>
          <SearchField value="" onChange={() => {}} placeholder={PLACEHOLDER} label="احادیث میں تلاش" />
          {st.status === 'loading' ? <Empty>لوڈ ہو رہا ہے…</Empty>
            : <Empty action={<button type="button" className="btn" onClick={st.retry}>دوبارہ کوشش کریں</button>}>ڈیٹا لوڈ نہیں ہو سکا۔</Empty>}
        </>
      )}
    </>
  );
}

function Body({ data }: { data: HadithPart[] }) {
  const [storedPart, setPart] = usePref('hBook', 'h1');
  const part = storedPart === 'all' || data.some((p) => p.k === storedPart) ? storedPart : 'h1';
  const [babSel, setBab] = useState('all');
  const [hide, setHide] = usePref('hHide', false);
  const [q, setQ] = useState('');
  const qn = gnorm(useDeferredValue(q).trim()).trim();
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const parts = data.filter((p) => part === 'all' || p.k === part);
  const babOpts = useMemo(() => {
    const out: { v?: string; label: string }[] = [];
    for (const p of parts) {
      let kit: string | null = null;
      for (const bb of p.b) {
        if (bb.k !== kit) { kit = bb.k; if (kit) out.push({ label: `── ${last(kit)} ──` }); }
        out.push({ v: `${p.k}:${bb.i}`, label: `${last(bb.t)} (${bb.h.length})` });
      }
    }
    return out;
  }, [parts]);
  const bab = babSel !== 'all' && babOpts.some((o) => o.v === babSel) ? babSel : 'all';

  const groups = useMemo(() => {
    const g: { key: string; part: HadithPart; title: string; sub: string; hs: Hadith[] }[] = [];
    for (const p of parts) for (const bb of p.b) {
      if (bab !== 'all' && bab !== `${p.k}:${bb.i}`) continue;
      const hs = bb.h.filter((x) => !qn || x.s2!.includes(qn));
      if (!hs.length) continue;
      const title = bb.t.split(' — ');
      g.push({ key: `${p.k}:${bb.i}`, part: p, title: title[0], sub: [last(bb.k), title[1]].filter(Boolean).join(' · '), hs });
    }
    return g;
  }, [parts, bab, qn]);
  const n = groups.reduce((a, x) => a + x.hs.length, 0);

  const toggleReveal = (id: string) => setRevealed((s) => { const n2 = new Set(s); if (n2.has(id)) n2.delete(id); else n2.add(id); return n2; });

  return (
    <>
      <SearchField value={q} onChange={setQ} placeholder={PLACEHOLDER} label="احادیث میں تلاش" />
      <div className="filters">
        <select className="sel" aria-label="کتاب" value={part} onChange={(e) => { setPart(e.target.value); setBab('all'); scrollTo(0, 0); }}>
          {data.map((p) => <option key={p.k} value={p.k}>{p.n}</option>)}
          <option value="all">تمام حصے</option>
        </select>
        <select className="sel" aria-label="باب" value={bab} onChange={(e) => { setBab(e.target.value); scrollTo(0, 0); }}>
          <option value="all">تمام ابواب</option>
          {babOpts.map((o, i) => o.v ? <option key={o.v} value={o.v}>{o.label}</option> : <option key={'d' + i} disabled>{o.label}</option>)}
        </select>
        <HideToggle on={hide} onChange={setHide}>ترجمہ چھپائیں</HideToggle>
        <span className="count">{n} احادیث</span>
      </div>
      <div className={`vtables hlist${hide ? ' hide' : ''}`}>
        {groups.length === 0 ? <Empty>کوئی حدیث نہیں ملی۔</Empty> : groups.map((g) => (
          <div key={g.key} className="hbab">
            <div className="lhead">
              <h3 className="ar">{g.title}{g.sub && <small>{g.sub}</small>}</h3>
              <span>{part === 'all' ? g.part.n.split(' · ')[1] + ' · ' : ''}{g.hs.length} احادیث</span>
            </div>
            {g.hs.map((x) => {
              const id = `${g.key}:${x.n}`;
              return (
                <article key={id} className={`hcard${revealed.has(id) ? ' revealed' : ''}`}>
                  <div className="hh">
                    <span className="hn">{x.n}</span>
                    <span className="hs">{x.s}</span>
                    <SayButton text={x.a.replace(/[﴾﴿]/g, '')} sm label="حدیث سنیں" />
                  </div>
                  <div className="ha" lang="ar" dir="rtl"><Hl text={x.a} q={qn} /></div>
                  {x.w.length > 0 && (
                    <details key={String(!!qn && x.w.some((w) => gnorm(w.join(' ')).includes(qn)))} open={!!qn && x.w.some((w) => gnorm(w.join(' ')).includes(qn))}>
                      <summary>لفظی ترجمہ ({x.w.length} الفاظ)</summary>
                      <div className="hww">{x.w.map(([a, u], i) => <span key={i}><i>{a}</i><Hl text={u} q={qn} /></span>)}</div>
                    </details>
                  )}
                  <div className="hu" onClick={() => hide && toggleReveal(id)}><b>ترجمہ:</b><Hl text={x.u} q={qn} /></div>
                </article>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
