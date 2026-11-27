// "کتابوں سے جواب": an extractive, cited answer. From the top passages, pick the few sentences
// that best answer the question — word for word from the books, each with its source.
// Nothing is generated, so nothing outside the books can creep in.
import { stripHarakat } from '../../core/sarf/engine';
import type { HadithPart, RefSection } from '../../data/types';
import type { Hit, RefKey } from './semantic';

export type Books = Partial<Record<RefKey, RefSection[]>> & { hadith?: HadithPart[] };

/** One answerable unit: a list item (or one sentence of a long item), or a sentence of a hadith translation. */
export interface Unit {
  /** index into hits (= result card) */
  hit: number;
  /** item index within the topic, or -1 for a hadith translation */
  item: number;
  /** text shown in the answer (original, with harakat) */
  text: string;
  /** text given to the model: context title + sentence, harakat stripped */
  embed: string;
}

const MIN = 20;
// A line ending in ':' introduces a list ("ان چیزوں سے وضو ٹوٹ جاتا ہے:") — it doesn't answer anything itself.
const useful = (x: string) => x.length >= MIN && !/[:：]\s*$/.test(x);
const splitSentences = (s: string) => s.split(/(?<=[۔؟!])\s+/).map((x) => x.trim()).filter(useful);
const clean = (s: string) => stripHarakat(s).replace(/[﴾﴿]/g, '').replace(/\s+/g, ' ').trim();

export function collectUnits(hits: Hit[], books: Books, maxHits = 4, maxUnits = 48): Unit[] {
  const units: Unit[] = [];
  hits.slice(0, maxHits).forEach((h, hi) => {
    const r = h.ref;
    if (r[0] === 'hadith') {
      const bab = books.hadith?.find((p) => p.k === r[1])?.b[r[2]];
      const hd = bab?.h.find((x) => x.n === r[3]);
      if (!bab || !hd) return;
      const title = bab.t.split(' — ').pop() || '';
      for (const s of splitSentences(hd.u)) units.push({ hit: hi, item: -1, text: s, embed: clean(`${title}۔ ${s}`) });
      return;
    }
    const [d, s, n, a, b] = r;
    const t = books[d]?.find((x) => x.k === s)?.x[n - 1];
    if (!t) return;
    t.i.slice(a, b).forEach(([, text], k) => {
      const parts = text.length > 220 ? splitSentences(text) : useful(text) ? [text] : [];
      for (const p of parts) units.push({ hit: hi, item: a + k, text: p, embed: clean(`${t.t}۔ ${p}`) });
    });
  });
  return units.slice(0, maxUnits);
}

export interface Picked { unit: Unit; score: number }

/**
 * Best sentences: highest similarity to the question, slightly favouring higher-ranked passages,
 * keeping only those close to the best one (so weak matches don't pad the answer).
 */
export function pickAnswer(units: Unit[], vecs: number[][], q: ArrayLike<number>, k = 3, margin = 0.03): Picked[] {
  const scored = units.map((unit, i) => {
    let s = 0;
    for (let j = 0; j < q.length; j++) s += vecs[i][j] * q[j];
    return { unit, score: s - 0.01 * unit.hit };
  }).sort((x, y) => y.score - x.score);
  if (!scored.length) return [];
  const best = scored[0].score;
  const out: Picked[] = [];
  for (const p of scored) {
    if (p.score < best - margin || out.length >= k) break;
    if (out.some((o) => o.unit.text === p.unit.text)) continue;
    out.push(p);
  }
  return out;
}
