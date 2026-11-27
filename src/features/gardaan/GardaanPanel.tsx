// Conjugation panel (doc 02): used inline on the Maker and inside the bottom sheet.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { BABS, BAB_ORDER, GARDAAN_TYPES, ISM_LABELS, SIGHA, gardaan, rootKind, sarfSagheer, type BabCode, type GardaanType } from '../../core/sarf/engine';
import { BAB_INFO } from '../../core/sarf/babinfo';
import { accus } from '../../core/text';
import { BAB_HINT, isMz, type PanelOpts } from '../../data/core';
import { useCore } from '../../app/context';
import { usePref } from '../../state/prefs';
import { toast } from '../../platform/toast';
import { SayButton } from '../../ui/controls';
import { BabOptions } from './BabOptions';

type TypeSel = GardaanType | 'all';
const normLetter = (v: string) => v.replace(/[ً-ٟ]/g, '').replace(/[أإؤئآ]/g, 'ء').replace(/ى/g, 'ي').replace(/ا/g, 'و');

export function GardaanPanel({ id, opts, onClose }: { id: string; opts: PanelOpts; onClose?: () => void }) {
  const core = useCore();
  const [root, setRoot] = useState<string[]>(() => opts.root.slice());
  const [type, setType] = usePref<TypeSel>('gtype', 'madiA');
  const [babOpen, setBabOpen] = usePref<boolean>('babOpen', false);
  const calcAllowed = (R: string[]): BabCode[] | null => {
    const a = core.allowedFor(R);
    if (a.length && opts.bab && !a.includes(opts.bab) && opts.keepBab) a.push(opts.bab);
    return a.length ? BAB_ORDER.filter((b) => a.includes(b)) : null;
  };
  const [allowed, setAllowed] = useState(() => calcAllowed(opts.root));
  const [babSel, setBab] = useState<BabCode>(opts.bab || 'n');
  const bab = allowed && !allowed.includes(babSel) ? allowed[0] : babSel;
  const rootRefs = useRef<(HTMLInputElement | null)[]>([]);

  const onRootInput = (i: number, raw: string) => {
    const v = normLetter(raw).slice(-1);
    const next = root.slice();
    next[i] = v;
    setRoot(next);
    if (next.every(Boolean)) setAllowed(calcAllowed(next));
    if (v && i < 2) rootRefs.current[i + 1]?.focus();
  };

  const ok = root.length === 3 && root.every((x) => x && /[ء-ي]/.test(x));
  const S0 = useMemo(() => (ok ? sarfSagheer(bab, root) : null), [ok, bab, root]);
  const ent = opts.entries?.get(bab);
  const ownMasdar = !!ent || (!!opts.masdar && (!opts.bab || opts.bab === bab));
  const masdar = ent ? ent.m : ownMasdar ? opts.masdar! : S0?.masdar || '';
  const title = masdar || (S0 ? S0.madi : '');
  const other = !ent && !ownMasdar ? core.meaningFor(root, bab) : null;
  const isHint = !ent && !ownMasdar && !other;
  const meaning = ent ? ent.u : ownMasdar ? opts.meaning || '' : other || 'معنی درج نہیں · ' + (BAB_HINT[bab] || 'مجرد کا دوسرا باب، معنی لغت میں دیکھیں');
  const kind = ok ? rootKind(root) : '';

  const sagheer = useMemo(() => {
    if (!S0) return '';
    const ms = masdar ? accus(masdar) : '';
    const lz = BABS[bab].lazim || bab === 'k';
    return `${S0.madi} ${S0.mudari}${ms ? ' ' + ms : ''} فَهُوَ ${S0.faail}${lz ? '' : `، وَ${S0.madiP} ${S0.mudariP} فَهُوَ ${S0.mafool}`}، الأَمْرُ مِنْهُ ${S0.amr} وَالنَّهْيُ عَنْهُ ${S0.nahi}`;
  }, [S0, masdar, bab]);

  const I = BAB_INFO[bab], B = BABS[bab];
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (onClose) closeRef.current?.focus(); }, [onClose]);

  return (
    <div className="gp">
      <div className="gp-head">
        <div className="t">
          <div className="titlerow">
            <span className="ar">{title}</span>
            {title && <SayButton text={title} label="مصدر سنیں" />}
          </div>
          <div className={`mean${isHint ? ' hint' : ''}`}>{meaning}</div>
          <div className="meta">
            <span className="pill root">{root.join(' ')}</span>
            {ok && <span className="pill">{kind}</span>}
          </div>
        </div>
        {onClose && <button ref={closeRef} type="button" className="close" aria-label="بند کریں" onClick={onClose}>✕</button>}
      </div>

      {opts.rubai && <div className="warn">یہ رباعی (چار حرفی) مصدر لگتا ہے۔ یہ ایپ صرف ثلاثی مجرد و مزید فیہ کی گردان بناتی ہے، اس لیے نیچے کی گردان درست نہیں ہوگی۔</div>}
      {opts.guessed && <div className="warn">یہ مصدر فہرست میں نہیں۔ ثلاثی مجرد کا باب سماعی ہوتا ہے، اس لیے لغت دیکھ کر درست باب منتخب کریں۔</div>}

      {opts.editableRoot && (
        <div className="pick">
          <label>مادہ (درست کرنا ہو تو حرف بدلیں)</label>
          <div className="rootin">
            {[0, 1, 2].map((i) => (
              <input key={i} ref={(el) => { rootRefs.current[i] = el; }} maxLength={2} aria-label={`حرف ${i + 1}`} value={root[i] || ''} onChange={(e) => onRootInput(i, e.target.value)} />
            ))}
          </div>
        </div>
      )}

      <div className="pickers">
        <div className="pick">
          <label htmlFor={`bab-${id}`}>باب <span className="muted">{allowed ? `(اس مادہ کے ${allowed.length} ابواب)` : '(لغت میں مادہ نہیں ملا، تمام ابواب)'}</span></label>
          <select id={`bab-${id}`} className="ar" value={bab} disabled={!!allowed && allowed.length === 1} onChange={(e) => setBab(e.target.value as BabCode)}>
            <BabOptions allowed={allowed} />
          </select>
        </div>
        <div className="pick">
          <label htmlFor={`typ-${id}`}>گردان</label>
          <select id={`typ-${id}`} value={type} onChange={(e) => setType(e.target.value as TypeSel)}>
            {GARDAAN_TYPES.map((g) => <option key={g.k} value={g.k}>{g.ur}</option>)}
            <option value="all">تمام گردانیں ایک ساتھ</option>
          </select>
        </div>
      </div>

      <div className={`babcard${isMz(bab) ? ' mz' : ''}`}>
        <div className="row1">
          <span className="wz">{I.wazn[0]} {I.wazn[1]}{isMz(bab) ? ' ' + I.wazn[2] : ''}</span>
          <span className="use">{B.ur} · {I.use}</span>
        </div>
        <div className="sign">{I.sign}</div>
        <details open={babOpen} onToggle={(e) => { const o = e.currentTarget.open; if (o !== babOpen) setBabOpen(o); }}>
          <summary>خاصیات اور مثالیں</summary>
          <ul>{I.khas.map((k, i) => <li key={i}>{k}</li>)}</ul>
          <div className="ex">مثالیں: <span className="ar">{I.ex}</span></div>
        </details>
      </div>

      {!ok ? (
        <div className="tables"><div className="warn">مادہ کے تینوں حروف درج کریں۔</div></div>
      ) : (
        <>
          <div className="sagheer">
            <SayButton text={sagheer} label="صرفِ صغیر سنیں" />
            <span className="k">صرفِ صغیر</span>
            <b>{S0!.madi}</b>{sagheer.slice(S0!.madi.length)}
          </div>
          <div className={type === 'all' ? 'tables multi' : 'tables'}>
            {(type === 'all' ? GARDAAN_TYPES.map((g) => g.k) : [type]).map((k) => <Table key={k} type={k} bab={bab} root={root} />)}
          </div>
          <div className="note">{kind !== 'صحیح' ? 'معتل، مضاعف اور مہموز مادوں کی گردان قواعدِ تعلیل سے بنتی ہے؛ نادر الفاظ لغت سے ملا لیں۔' : ''}</div>
        </>
      )}
    </div>
  );
}

function Table({ type, bab, root }: { type: GardaanType; bab: BabCode; root: string[] }) {
  const g = GARDAAN_TYPES.find((x) => x.k === type)!;
  const forms = gardaan(type, bab, root);
  const isIsm = type === 'faail' || type === 'mafool';
  const all = forms.join('، ');
  const groupAt: Record<number, string> = isIsm ? { 0: 'مذکر', 3: 'مؤنث' } : { 0: 'غائب', 6: 'حاضر', 12: 'متکلم' };
  const copy = () => {
    if (!navigator.clipboard) { toast('کاپی نہیں ہو سکا'); return; }
    navigator.clipboard.writeText(all).then(() => toast('کاپی ہو گیا'), () => toast('کاپی نہیں ہو سکا'));
  };
  return (
    <div className="tbl">
      <h3>
        <span>{g.ur}</span>
        <span className="tbl-tools">
          <SayButton text={all} sm label="پوری گردان سنیں" />
          <button type="button" className="copy" onClick={copy}>کاپی</button>
        </span>
      </h3>
      {forms.map((f, i) => (
        <Fragment key={i}>
          {groupAt[i] && <div className="grp">{groupAt[i]}</div>}
          <div className="r">
            <SayButton text={f} sm />
            <span className="fm">{f}</span>
            <span className="lb">
              {isIsm ? ISM_LABELS[i][0] : SIGHA[i][0].replace(/ (غائب|حاضر)$/, '')}
              {!isIsm && <span className="ar">{SIGHA[i][1]}</span>}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
