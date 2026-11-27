// Parse core.json into typed records and build the indexes, lexicon lookups, search
// matchers and Maker resolution (handoff docs 04 and 06). Everything here is pure.
import { BABS, BAB_ORDER, detectMasdar, normRoot, normalize, type BabCode } from '../core/sarf/engine';
import { toNom, vnorm } from '../core/text';
import type { BookCode, CoreRaw, Masdar, Verb, Word } from './types';

export const BOOKS: Record<BookCode, string> = { q1: 'قصص النبیین 1', s1: 'کتاب الصرف 1', s2: 'کتاب الصرف 2', n1: 'کتاب النحو 1', n2: 'کتاب النحو 2' };
export const BOOK_ORDER = Object.keys(BOOKS) as BookCode[];
export const isMz = (b: BabCode) => BABS[b].group === 'mazeed';

/** What a مزید bab usually means; shown when no meaning is recorded. */
export const BAB_HINT: Partial<Record<BabCode, string>> = {
  if: 'عموماً تعدیہ (لازم کو متعدی بنانا)', tf: 'عموماً تعدیہ یا تکثیر', mf: 'عموماً مشارکت (ایک دوسرے کے ساتھ کرنا)',
  ft: 'عموماً مطاوعت یا اہتمام', nf: 'مطاوعت (اثر قبول کرنا)', tfl: 'عموماً تفعیل کی مطاوعت یا تکلف',
  tfa: 'عموماً باہمی عمل یا دکھاوا', st: 'عموماً طلب، یا کسی صفت والا سمجھنا', fl: 'رنگ یا عیب میں مبالغہ', fy: 'مجرد سے زیادہ مبالغہ',
};

/** Short, stable hash for word ids (FNV-1a, base 36). */
const hash = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
};

export const rootKey = (R: string[]) => R.join('').replace(/[أإؤئآ]/g, 'ء').replace(/ى/g, 'ي');
const variants = (k: string) => [k, k.replace(/ا/g, 'و'), k.replace(/[وا]$/, 'ي'), k.replace(/ي$/, 'و')];

export type Core = ReturnType<typeof buildCore>;

export function buildCore(raw: CoreRaw) {
  const DATA: Masdar[] = raw.masadir.map(([m, r, b, u], i) => ({ id: `${r}:${b}`, idx: i, m, root: [...r], b, u, nm: normalize(m), nr: r }));
  const VERBS: Verb[] = raw.verbs.map(([bk, sec, madi, mud, amr, ms, r, u, c, b], i) => ({
    i, bk, sec, madi, mud, amr, ms, root: [...r], nr: r, u, c, b, n: normalize(madi + ' ' + mud + ' ' + ms) + ' ' + r,
  }));
  const ownCount = DATA.length;
  // Merge rule: a verb with a bab and a 3-letter root adds a masdar entry if root+bab isn't listed yet.
  for (const v of VERBS) {
    if (!v.b || v.root.length !== 3 || DATA.some((d) => d.nr === v.nr && d.b === v.b)) continue;
    const m = toNom(v.ms.split('/')[0].trim());
    DATA.push({ id: `${v.nr}:${v.b}`, idx: DATA.length, m, root: v.root, b: v.b, u: v.u, nm: normalize(m), nr: v.nr, src: v.bk });
  }

  const seen = new Map<string, number>();
  const WORDS: Word[] = raw.vocab.map(([bk, t, a, u, c], i) => {
    const base = `${bk}:${hash(a + '|' + u)}`;
    const k = (seen.get(base) || 0) + 1;
    seen.set(base, k);
    return { id: k > 1 ? `${base}~${k}` : base, idx: i, bk, t, a, u, c, na: normalize(a) };
  });

  const byNorm = new Map(DATA.map((d) => [d.nm.replace(/[ٌٍ]/g, ''), d]));
  const byVowelled = new Map(DATA.map((d) => [vnorm(d.m), d]));
  // A word links to a conjugation only when it is exactly a masdar we know (single token).
  for (const w of WORDS) {
    if (/[\s:\[]/.test(w.a.trim())) continue;
    const hit = byVowelled.get(vnorm(w.a));
    if (hit) w.g = hit;
  }

  const BY_ROOT = new Map<string, Map<BabCode, Masdar>>();
  for (const d of DATA) {
    if (!BY_ROOT.has(d.nr)) BY_ROOT.set(d.nr, new Map());
    const m = BY_ROOT.get(d.nr)!;
    if (!m.has(d.b)) m.set(d.b, d);
  }
  const LEX = new Map(raw.roots.map(([r, bs]) => [r, bs.split(',').map((x) => x.split('.')[0] as BabCode)]));
  const MEAN = new Map(raw.meanings.map(([r, b, m]) => [r + '|' + b, m]));
  const byId = new Map(DATA.map((d) => [d.id, d]));
  const wordById = new Map(WORDS.map((w) => [w.id, w]));

  const entriesFor = (nr: string) => BY_ROOT.get(nr) || new Map<BabCode, Masdar>();

  /** Abwab a root occurs in (lexicon + our own list, trying root variants), in display order. Empty = unknown root. */
  function allowedFor(R: string[]): BabCode[] {
    const set = new Set<BabCode>();
    for (const a of variants(rootKey(R))) {
      (LEX.get(a) || []).forEach((b) => set.add(b));
      (BY_ROOT.get(a) || new Map()).forEach((_, b) => set.add(b));
    }
    return BAB_ORDER.filter((b) => set.has(b));
  }

  function meaningFor(R: string[], b: BabCode): string | null {
    for (const a of variants(rootKey(R))) {
      const m = MEAN.get(a + '|' + b);
      if (m) return m;
      const e = BY_ROOT.get(a)?.get(b);
      if (e) return e.u;
    }
    return null;
  }

  return { DATA, VERBS, WORDS, ownCount, byNorm, byVowelled, BY_ROOT, LEX, MEAN, byId, wordById, lessonDates: raw.lessonDates, entriesFor, allowedFor, meaningFor };
}

// ---- search (doc 06) ----
export type Group = 'all' | 'mujarrad' | 'mazeed';

export function matchMasdar(d: Masdar, q: string, group: Group = 'all', bab: BabCode | 'all' = 'all'): boolean {
  if (group !== 'all' && BABS[d.b].group !== group) return false;
  if (bab !== 'all' && d.b !== bab) return false;
  if (!q) return true;
  const qa = normalize(q), qr = normRoot(q);
  return d.nm.includes(qa) || (qr.length >= 2 && d.nr.replace(/ا/g, 'و').includes(qr)) || d.u.includes(q);
}
export const matchWord = (w: Word, q: string) => !q || w.na.includes(normalize(q)) || w.u.includes(q);
export function matchVerb(v: Verb, q: string): boolean {
  if (!q) return true;
  const qr = normRoot(q);
  return v.n.includes(normalize(q)) || (qr.length >= 2 && v.nr.includes(qr)) || v.u.includes(q);
}

// ---- conjugation panel options + Maker (doc 02) ----
export interface PanelOpts {
  masdar?: string;
  meaning?: string;
  root: string[];
  bab?: BabCode;
  /** other masadir of the same root, so changing bab can show our own entry */
  entries?: Map<BabCode, Masdar>;
  /** keep the opener's bab in the list even if the lexicon doesn't have it */
  keepBab?: boolean;
  editableRoot?: boolean;
  guessed?: boolean;
  rubai?: boolean;
}

export function resolveMaker(core: Core, input: string): PanelOpts | null {
  const v = input.trim();
  if (!v) return null;
  const hit = core.byNorm.get(normalize(v).replace(/[ٌٍ]/g, ''));
  if (hit) return { masdar: hit.m, meaning: hit.u, root: hit.root, bab: hit.b, editableRoot: true };
  const det = detectMasdar(v);
  let bab = det.bab, guessed = det.guessed, meaning = '';
  const lex = core.allowedFor(det.root);
  if (!bab) {
    const same = core.DATA.find((d) => d.nr === det.root.join('') && !isMz(d.b));
    const muj = lex.filter((b) => !isMz(b));
    if (same) { bab = same.b; meaning = `اسی مادہ سے: ${same.m} (${same.u})`; guessed = false; }
    else if (muj.length) {
      bab = muj[0]; guessed = false;
      meaning = muj.length > 1 ? `لغت میں اس مادہ کا مجرد ${muj.length} ابواب میں آتا ہے؛ معنی کے مطابق باب منتخب کریں۔` : `لغت کے مطابق: ${BABS[bab].ar}`;
    }
  }
  const notInLex = lex.length > 0 && !!bab && !lex.includes(bab);
  return {
    masdar: v, meaning: notInLex ? 'یہ باب اس مادہ کے لیے لغت میں نہیں ملا۔' : meaning, root: det.root, bab: bab || 'n',
    guessed: guessed && !lex.length, editableRoot: true, keepBab: true, rubai: det.rubai,
  };
}

// ---- flashcard progress: legacy list positions → stable ids (doc 10 §A) ----
export function migrateKnown(core: Core, legacy: unknown): string[] {
  if (!Array.isArray(legacy)) return [];
  const out = new Set<string>();
  for (const x of legacy) {
    if (typeof x === 'number') { const d = core.DATA[x]; if (d) out.add(d.id); }
    else if (typeof x === 'string' && /^w\d+$/.test(x)) { const w = core.WORDS[+x.slice(1)]; if (w) out.add(w.id); }
  }
  return [...out];
}
