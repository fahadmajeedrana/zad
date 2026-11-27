// Service worker registration. A new version waits until the user taps "تازہ کریں", so a content
// update never reloads the page in the middle of a flashcard session.
import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

let update: ((reload?: boolean) => Promise<void>) | null = null;
const listeners = new Set<() => void>();
let needRefresh = false;

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  update = registerSW({
    immediate: true,
    onNeedRefresh() { needRefresh = true; listeners.forEach((fn) => fn()); },
  });
}

export function UpdatePrompt() {
  const [show, setShow] = useState(needRefresh);
  useEffect(() => {
    const fn = () => setShow(true);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  if (!show) return null;
  return (
    <div className="update" role="status">
      <span>نیا ورژن دستیاب ہے</span>
      <button type="button" className="btn primary" onClick={() => update?.(true)}>تازہ کریں</button>
      <button type="button" className="btn ghost" onClick={() => setShow(false)}>بعد میں</button>
    </div>
  );
}
