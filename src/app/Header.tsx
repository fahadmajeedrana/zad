import { useEffect, useState } from 'react';
import { usePref } from '../state/prefs';
import { BrandMark, Icon } from '../ui/icons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<unknown>;
}

// Captured as early as possible: the event can fire before React mounts.
let deferred: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<() => void>();
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as BeforeInstallPromptEvent;
  installListeners.forEach((fn) => fn());
});

export function Header({ onHome }: { onHome?: () => void }) {
  const [theme, setTheme] = usePref<'light' | 'dark' | null>('theme', null);
  const [canInstall, setCanInstall] = useState(!!deferred);
  useEffect(() => {
    const fn = () => setCanInstall(!!deferred);
    installListeners.add(fn);
    return () => { installListeners.delete(fn); };
  }, []);
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
  }, [theme]);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => {});
    deferred = null;
    setCanInstall(false);
  };

  return (
    <header className="top">
      <div className="brand" role="link" tabIndex={0} title="ہوم" onClick={onHome} onKeyDown={(e) => { if (e.key === 'Enter') onHome?.(); }}>
        <div className="mark" aria-hidden="true"><BrandMark /></div>
        <div><h1>زادُ الطالب</h1><p className="sub">طالب علم کا زادِ راہ</p></div>
      </div>
      {canInstall && <button type="button" className="install" onClick={install}>انسٹال کریں</button>}
      <button type="button" className="hbtn" aria-label="تھیم بدلیں" title="تھیم بدلیں" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        <Icon name="moon" size={20} />
      </button>
    </header>
  );
}
