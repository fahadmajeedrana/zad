import { useCore } from '../../app/context';
import { navigate } from '../../router';
import { Icon } from '../../ui/icons';
import { SectionTitle } from '../../ui/controls';
import { SUBJECTS } from './subjects';

export function Home() {
  const core = useCore();
  return (
    <>
      <SectionTitle title="مضامین" sub="مضمون منتخب کریں" />
      <div className="subjects">
        {SUBJECTS.map((s) => (
          <div key={s.k} className={`subj${s.soon ? ' soon' : ''}`}>
            <div className="sh">
              <span className="si"><Icon name={s.i} /></span>
              <div><h3>{s.n}</h3><p>{s.d}</p></div>
              {s.soon && <span className="badge">جلد آ رہا ہے</span>}
            </div>
            {!s.soon && (
              <div className="secs">
                {s.secs.map((x) => x.soon || !x.v ? (
                  <div key={x.n} className="sec-l soon"><Icon name={x.i} /><span><b>{x.n}</b><small>{x.d}</small></span><span className="badge">جلد آ رہا ہے</span></div>
                ) : (
                  <button key={x.v} type="button" className="sec-l" onClick={() => navigate(x.v!)}>
                    <Icon name={x.i} />
                    <span><b>{x.n}</b><small>{x.d}</small></span>
                    {x.count && <span className="n">{x.count(core)}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
