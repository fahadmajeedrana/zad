// Opt-in check of the cited answer ("کتابوں سے جواب") with the real model.
// Run: ANSWER_EVAL=1 npx vitest run tests/answer.eval.test.ts   (prints the picked sentences)
import { describe, expect, it } from 'vitest';
import { collectUnits, pickAnswer, type Books } from '../src/features/search/answer';
import { decodeIndex, rank, type SemanticRaw } from '../src/features/search/semantic';
import { buildLexicon, hasLatin, lexiconTexts, transliterate } from '../src/core/roman';
import type { HadithPart, RefSection } from '../src/data/types';
import { readData } from './helpers';

const QUESTIONS = [
  'وضو کن چیزوں سے ٹوٹ جاتا ہے؟', 'زکوٰۃ کن لوگوں کو دی جا سکتی ہے؟', 'نماز کس وجہ سے فاسد ہو جاتی ہے؟',
  'قرآن کو ایک کتاب کی شکل میں کس نے جمع کیا؟', 'متواتر حدیث کی تعریف کیا ہے؟', 'مبتدا اور خبر کیا ہوتے ہیں؟',
  'ماں باپ کے ساتھ اچھا سلوک', 'tayammum kaise karte hain', 'roza kin cheezon se toot jata hai',
];

describe.skipIf(!process.env.ANSWER_EVAL)('cited answer (model)', () => {
  it('prints answers', async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.cacheDir = '.cache/models';
    const raw = readData<SemanticRaw>('semantic');
    const idx = decodeIndex(raw);
    const fx = await pipeline('feature-extraction', raw.model, { dtype: 'q8' });
    const emb = async (t: string[]) => (await fx(t, { pooling: 'mean', normalize: true })).tolist() as number[][];
    const books: Books = { guide: readData<RefSection[]>('guide'), fiqh: readData('fiqh'), uhadith: readData('uhadith'), tafsir: readData('tafsir'), hadith: readData<HadithPart[]>('hadith') };
    const lex = buildLexicon(lexiconTexts([books.guide!, books.fiqh!, books.uhadith!, books.tafsir!], books.hadith!));
    for (const q0 of QUESTIONS) {
      const q = hasLatin(q0) ? transliterate(lex, q0) : q0;
      const t0 = Date.now();
      const [qv] = await emb([raw.queryPrefix + q]);
      const hits = rank(idx, qv, null, 10);
      const units = collectUnits(hits, books);
      const vecs = await emb(units.map((u) => raw.passagePrefix + u.embed));
      const picked = pickAnswer(units, vecs, qv);
      console.log(`\n■ ${q0}  (${units.length} sentences, ${Date.now() - t0} ms)`);
      for (const p of picked) console.log(`  [${p.unit.hit + 1}] ${p.score.toFixed(3)} ${p.unit.text.slice(0, 140)}`);
      expect(picked.length).toBeGreaterThan(0);
    }
  }, 600_000);
});
