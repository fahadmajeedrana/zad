import { useEffect, useState } from 'react';
import { resolveMaker, type PanelOpts } from '../../data/core';
import { useCore } from '../../app/context';
import { useRoute } from '../../router';
import { SectionTitle } from '../../ui/controls';
import { GardaanPanel } from '../gardaan/GardaanPanel';

const EXAMPLES = ['اِسْتِغْفَار', 'تَعَلُّم', 'إِرْسَال', 'اِنْكِسَار', 'مُرَاسَلَة', 'نُصْرَة'];

export function Maker() {
  const core = useCore();
  const { view, params } = useRoute();
  const [input, setInput] = useState('');
  const [run, setRun] = useState<{ opts: PanelOpts | null; n: number }>({ opts: null, n: 0 });
  const go = (v: string) => { setInput(v); setRun((r) => ({ opts: resolveMaker(core, v), n: r.n + 1 })); };

  // Prefilled with اِسْتِغْفَار on first open; `?q=` (from the masadir empty state) runs that instead.
  const q = view === 'maker' ? params.get('q') : null;
  // Runs only when the query param changes (go/run are intentionally not dependencies).
  useEffect(() => { if (q || run.n === 0) go(q || 'اِسْتِغْفَار'); }, [q]);

  return (
    <>
      <div className="maker">
        <SectionTitle title="کسی بھی مصدر کی گردان" />
        <div className="row">
          <input dir="rtl" placeholder="مثلاً اِسْتِغْفَار" autoComplete="off" aria-label="مصدر" value={input}
            onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') go(input); }} />
          <button type="button" className="btn accent" onClick={() => go(input)}>بنائیں</button>
        </div>
        <div className="examples">
          <span>مثالیں:</span>
          {EXAMPLES.map((x) => <button type="button" key={x} onClick={() => go(x)}>{x}</button>)}
        </div>
        <div className="note">ابواب کی جانچ <a href="https://github.com/linuxscout/arramooz" target="_blank" rel="noopener">Arramooz</a> لغت (GPL) کے تقریباً ۵۳۰۰ مادوں سے ہوتی ہے۔</div>
      </div>
      <div>{run.opts && <GardaanPanel key={run.n} id="m" opts={run.opts} />}</div>
    </>
  );
}
