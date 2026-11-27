// Small shared controls (doc 07 component inventory).
import { useState, type ReactNode } from 'react';
import { speak } from '../platform/speech';
import { highlightParts, segmentInlineArabic } from '../core/text';
import { Icon } from './icons';

export function SayButton({ text, sm, label = 'تلفظ سنیں' }: { text: string; sm?: boolean; label?: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <button
      type="button"
      className={`say${sm ? ' sm' : ''}${playing ? ' playing' : ''}`}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (speak(text, () => setPlaying(false))) setPlaying(true);
      }}
    >
      <Icon name="speaker" stroke={2} />
    </button>
  );
}

export function SearchField({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <div className="search">
      <Icon name="search" size={20} stroke={2} />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" aria-label={label} />
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, n]) => (
        <button type="button" key={v} aria-pressed={v === value} onClick={() => onChange(v)}>{n}</button>
      ))}
    </div>
  );
}

export function HideToggle({ on, onChange, children, title }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode; title?: string }) {
  return (
    <button type="button" className="iconbtn" aria-pressed={on} title={title} onClick={() => onChange(!on)}>
      <Icon name="eye" size={16} stroke={2} />
      {children}
    </button>
  );
}

export function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <h2 className="sec">
      {title}
      {sub && <span className="muted sec-sub"> · {sub}</span>}
    </h2>
  );
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div>{children}</div>
      {action}
    </div>
  );
}

/** Text with search matches wrapped in <mark>. */
export function Hl({ text, q }: { text: string; q: string }) {
  const parts = highlightParts(text, q);
  if (parts.length === 1 && !parts[0].m) return <>{text}</>;
  return <>{parts.map((p, i) => (p.m ? <mark key={i}>{p.t}</mark> : p.t))}</>;
}

/** Urdu text with Arabic example runs styled (doc 06), plus highlighting. */
export function RichText({ text, q }: { text: string; q: string }) {
  return (
    <>
      {segmentInlineArabic(text).map((s, i) => (s.ex ? <span key={i} className="ex"><Hl text={s.t} q={q} /></span> : <Hl key={i} text={s.t} q={q} />))}
    </>
  );
}
