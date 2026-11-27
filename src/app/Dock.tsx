import { Fragment } from 'react';
import { navigate, type View } from '../router';
import { Icon, type IconName } from '../ui/icons';

const TABS: [View, string, IconName][] = [
  ['home', 'ہوم', 'home'],
  ['masadir', 'مصادر', 'grid'],
  ['study', 'فلیش کارڈ', 'cards'],
  ['maker', 'گردان ساز', 'pen'],
  ['vocab', 'ذخیرہ', 'book'],
  ['qawaid', 'قواعد', 'rules'],
];

export function Dock({ view }: { view: View }) {
  return (
    <nav className="dock" role="tablist" aria-label="مینو">
      {TABS.map(([v, label, icon], i) => (
        <Fragment key={v}>
          <button type="button" role="tab" aria-selected={view === v} onClick={() => navigate(v)}>
            <span className="ico"><Icon name={icon} /></span>
            <span className="lbl">{label}</span>
          </button>
          {i === 0 && <span className="dsep" aria-hidden="true" />}
        </Fragment>
      ))}
    </nav>
  );
}
