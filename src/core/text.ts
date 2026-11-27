// Text helpers: normalisers, inline-Arabic segmentation and search highlighting (handoff doc 06).
// Port these exactly — search results and vocabulary links depend on them.
import { stripHarakat } from './sarf/engine';

/** Reference books and hadith (Urdu-heavy text). */
export const gnorm = (s: string): string =>
  stripHarakat(s).replace(/[أإآٱ]/g, 'ا').replace(/ك/g, 'ک').replace(/[يى]/g, 'ی').replace(/[هةۃ]/g, 'ہ').replace(/[ؤئ]/g, 'ء').replace(/\s+/g, ' ');

/** Linking a vocabulary word to a masdar. Keeps vowels; deliberately strict. */
export const vnorm = (s: string): string =>
  s.trim().replace(/^اَلْ?|^ال/, '').replace(/[ً-ٍ]/g, '').replace(/[َ-ِ]$/, '').replace(/[ْـ]/g, '')
    .replace(/ٰ/g, 'َ').replace(/[أإآٱؤئ]/g, 'ء').replace(/ى/g, 'ي').replace(/[ًٌٍ]/g, '');

/** Verb masdar (often accusative in the books) → nominative masdar entry. */
export const toNom = (m: string): string =>
  m.replace(/ةً$/, 'ةٌ').replace(/اءً$/, 'اءٌ').replace(/ئًا$/, 'ئٌ').replace(/ءًا$/, 'ءٌ').replace(/ًا$/, 'ٌ');

/** Masdar inside صرفِ صغیر (accusative). */
export const accus = (m: string): string =>
  m.replace(/ةٌ$/, 'ةً').replace(/اءٌ$/, 'اءً').replace(/ءٌ$/, 'ءً').replace(/ٌ$/, 'ًا');

/** Vocabulary speech: drop [notes], read " ج: " as a pause. */
export const sayText = (a: string): string => a.replace(/\[[^\]]*\]/g, '').replace(/\s*ج:\s*/g, '، ').trim();

export const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---- inline Arabic inside Urdu ----
const HAR = /[ً-ْٰۡۜۢ-ۭ]/g;
/** A token is Arabic if it carries harakat and has 2+ marks, or has at most 2 letters (so an Urdu izafat zer stays plain). */
export const isArabicWord = (w: string): boolean => {
  const k = (w.match(HAR) || []).length;
  if (!k) return false;
  const letters = stripHarakat(w).replace(/[^ء-يٱ-ۓ]/g, '').length;
  return k >= 2 || letters <= 2;
};

export interface Seg { t: string; ex?: boolean }

/** Split item text into plain and Arabic-example runs (neighbouring Arabic words merge into one run). */
export function segmentInlineArabic(txt: string): Seg[] {
  const out: Seg[] = [];
  const plain = (s: string) => { if (!s) return; const last = out[out.length - 1]; if (last && !last.ex) last.t += s; else out.push({ t: s }); };
  let run = '';
  const flush = () => {
    if (!run) return;
    const m = run.match(/^([\s\S]*?)(\s*)$/)!;
    out.push({ t: m[1], ex: true });
    plain(m[2]);
    run = '';
  };
  for (const p of txt.split(/(\s+)/)) {
    if (!p) continue;
    if (/^\s+$/.test(p)) { if (run) run += p; else plain(p); continue; }
    const core = p.replace(/^[(\[«"]+|[)\]»"،؛:؟!.۔,]+$/g, '');
    if (core && isArabicWord(core)) {
      const at = p.indexOf(core);
      const pre = p.slice(0, at), post = p.slice(at + core.length);
      if (pre) { flush(); plain(pre); }
      run += core;
      if (post) { flush(); plain(post); }
    } else { flush(); plain(p); }
  }
  flush();
  return out;
}

/** Split text into [plain, match, plain, match, …] parts for <mark> highlighting. Only for queries of 2+ chars. */
export function highlightParts(text: string, qn: string): { t: string; m?: boolean }[] {
  if (!qn || qn.length < 2) return [{ t: text }];
  const re = new RegExp(escapeRe(qn), 'g');
  const parts: { t: string; m?: boolean }[] = [];
  let last = 0;
  for (let x = re.exec(text); x; x = re.exec(text)) {
    if (x.index > last) parts.push({ t: text.slice(last, x.index) });
    parts.push({ t: x[0], m: true });
    last = x.index + x[0].length;
  }
  if (last < text.length) parts.push({ t: text.slice(last) });
  return parts;
}
