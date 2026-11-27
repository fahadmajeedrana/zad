// Text-to-speech with the browser's Arabic voice (doc 02). One utterance at a time; the
// caller gets an onEnd callback so its speaker button can show a "playing" state.
import { toast } from './toast';

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
let arVoice: SpeechSynthesisVoice | null = null;
let voiceWarned = false;
let stopCurrent: (() => void) | null = null;

function pickVoice() {
  if (!supported) return;
  const vs = speechSynthesis.getVoices();
  arVoice = vs.find((v) => /^ar[-_]SA/i.test(v.lang)) || vs.find((v) => /^ar/i.test(v.lang)) || null;
}
if (supported) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

export function speak(text: string, onEnd?: () => void): boolean {
  if (!supported) { toast('یہ براؤزر آواز نہیں چلا سکتا'); return false; }
  try {
    speechSynthesis.cancel();
    stopCurrent?.();
    if (!arVoice) pickVoice();
    if (!arVoice && !voiceWarned && speechSynthesis.getVoices().length) {
      voiceWarned = true;
      toast('اس ڈیوائس پر عربی آواز انسٹال نہیں؛ سیٹنگز میں عربی آواز شامل کریں');
    }
    const u = new SpeechSynthesisUtterance(text);
    if (arVoice) u.voice = arVoice;
    u.lang = arVoice ? arVoice.lang : 'ar-SA';
    u.rate = 0.8;
    let done = false;
    const end = () => { if (done) return; done = true; if (stopCurrent === end) stopCurrent = null; onEnd?.(); };
    stopCurrent = end;
    u.onend = end;
    u.onerror = end;
    speechSynthesis.speak(u);
    return true;
  } catch {
    toast('آواز نہیں چل سکی');
    return false;
  }
}
