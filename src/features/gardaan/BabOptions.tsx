import { BABS, BAB_ORDER, type BabCode } from '../../core/sarf/engine';
import { isMz } from '../../data/core';

/** Bab <option>s grouped into ثلاثی مجرد / ثلاثی مزید فیہ. `only` limits to one group (masadir filter). */
export function BabOptions({ withAll, allowed, only }: { withAll?: boolean; allowed?: BabCode[] | null; only?: 'mujarrad' | 'mazeed' }) {
  const ok = (b: BabCode) => !allowed || allowed.includes(b);
  const muj = BAB_ORDER.filter((b) => !isMz(b) && ok(b));
  const mz = BAB_ORDER.filter((b) => isMz(b) && ok(b));
  return (
    <>
      {withAll && <option value="all">تمام ابواب</option>}
      {muj.length > 0 && only !== 'mazeed' && (
        <optgroup label="ثلاثی مجرد">{muj.map((b) => <option key={b} value={b}>{BABS[b].ar}</option>)}</optgroup>
      )}
      {mz.length > 0 && only !== 'mujarrad' && (
        <optgroup label="ثلاثی مزید فیہ">{mz.map((b) => <option key={b} value={b}>{BABS[b].ur} · {BABS[b].ar}</option>)}</optgroup>
      )}
    </>
  );
}
