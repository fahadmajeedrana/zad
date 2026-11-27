import { useEffect, useRef, useState } from 'react';
import { onToast } from '../platform/toast';

export function Toast() {
  const [msg, setMsg] = useState('');
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => onToast((m) => {
    setMsg(m);
    setOn(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOn(false), 1600);
  }), []);
  return <div className={`toast${on ? ' on' : ''}`} role="status" aria-live="polite">{msg}</div>;
}
