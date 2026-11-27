import { useDeferredValue, useMemo, useState } from 'react';
import { BABS, type BabCode } from '../../core/sarf/engine';
import { isMz, matchMasdar, type Group } from '../../data/core';
import { useCore, useOpenSheet } from '../../app/context';
import { navigate } from '../../router';
import { usePref } from '../../state/prefs';
import { useKnown } from '../../state/known';
import { Empty, HideToggle, SayButton, SearchField, SectionTitle, Seg } from '../../ui/controls';
import { BabOptions } from '../gardaan/BabOptions';

export function Masadir() {
  const core = useCore();
  const openSheet = useOpenSheet();
  const { known } = useKnown();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<Group>('all');
  const [bab, setBab] = useState<BabCode | 'all'>('all');
  const [hide, setHide] = usePref('hideM', false);
  const dq = useDeferredValue(q.trim());
  const list = useMemo(() => core.DATA.filter((d) => matchMasdar(d, dq, group, bab)), [core, dq, group, bab]);

  const pickGroup = (g: Group) => {
    setGroup(g);
    if (bab !== 'all' && g !== 'all' && BABS[bab].group !== g) setBab('all');
  };

  return (
    <>
      <SectionTitle title="مصادر کی فہرست" />
      <SearchField value={q} onChange={setQ} placeholder="مصدر، مادہ یا معنی تلاش کریں" label="تلاش" />
      <div className="filters">
        <Seg<Group> label="قسم" value={group} onChange={pickGroup} options={[['all', 'سب'], ['mujarrad', 'مجرد'], ['mazeed', 'مزید فیہ']]} />
        <select className="sel" aria-label="باب" value={bab} onChange={(e) => setBab(e.target.value as BabCode | 'all')}>
          <BabOptions withAll only={group === 'all' ? undefined : group} />
        </select>
        <HideToggle on={hide} onChange={setHide} title="معنی چھپا کر خود کو آزمائیں">معنی چھپائیں</HideToggle>
        <span className="count">{list.length} مصادر</span>
      </div>
      <div className={`grid${hide ? ' hide' : ''}`}>
        {list.length === 0 ? (
          <div className="grid-full">
            <Empty action={<button type="button" className="btn accent" onClick={() => navigate('maker', { q: dq })}>اس کی گردان بنائیں</button>}>
              «{dq}» فہرست میں نہیں ملا۔
            </Empty>
          </div>
        ) : list.map((d) => (
          <div key={d.id} className="card" role="button" tabIndex={0} onClick={() => openSheet(d)} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) openSheet(d); }}>
            <div className="masdar">{d.m}</div>
            <div className="meaning">{d.u}</div>
            <div className="foot">
              <span className={`dot${isMz(d.b) ? ' mz' : ''}`} />
              {BABS[d.b].ur}
              {known.has(d.id) && <span className="known">✓</span>}
              <SayButton text={d.m} sm />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
