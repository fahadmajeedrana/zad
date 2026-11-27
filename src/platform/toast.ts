// A tiny event bus so any module (speech, copy, study) can show the toast.
type Listener = (msg: string) => void;
const listeners = new Set<Listener>();

export function toast(msg: string) {
  listeners.forEach((fn) => fn(msg));
}
export function onToast(fn: Listener) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
