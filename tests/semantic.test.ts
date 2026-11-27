// Integrity of the precomputed semantic-search index (content/generated/semantic.json).
import { describe, expect, it } from 'vitest';
import { decodeIndex, rank, type SemanticRaw } from '../src/features/search/semantic';
import type { HadithPart, RefSection } from '../src/data/types';
import { readData } from './helpers';

const raw = readData<SemanticRaw>('semantic');
const idx = decodeIndex(raw);

describe('semantic index', () => {
  it('is built from the current data files (else run: npm run embeddings)', () => {
    for (const [k, f] of Object.entries(raw.sources)) expect(f, k).toMatch(new RegExp(`^data/${k}\.[0-9a-f]{10}\.json$`));
  });
  it('has one int8 vector per chunk', () => {
    expect(idx.vec.length).toBe(idx.refs.length * idx.dims);
    expect(idx.dims).toBe(384);
  });
  it('every chunk points at real content', () => {
    const books: Record<string, RefSection[]> = { guide: readData('guide'), fiqh: readData('fiqh'), uhadith: readData('uhadith'), tafsir: readData('tafsir') };
    const hadith = readData<HadithPart[]>('hadith');
    for (const r of idx.refs) {
      if (r[0] === 'hadith') {
        const b = hadith.find((p) => p.k === r[1])?.b[r[2]];
        expect(b?.h.some((h) => h.n === r[3]), JSON.stringify(r)).toBe(true);
      } else {
        const t = books[r[0]].find((s) => s.k === r[1])?.x[r[2] - 1];
        expect(t && r[3] < r[4] + (t.i.length ? 0 : 1) && r[4] <= t.i.length, JSON.stringify(r)).toBe(true);
      }
    }
  });
  it('ranking returns distinct topics, best first', () => {
    // A stored passage vector used as the query must rank its own topic first.
    const i = 100;
    const q = Array.from(idx.vec.slice(i * idx.dims, (i + 1) * idx.dims), (x) => x / 127);
    const hits = rank(idx, q, null, 5);
    expect(hits[0].ref.slice(0, 3)).toEqual(idx.refs[i].slice(0, 3));
    expect(new Set(hits.map((h) => JSON.stringify(h.ref.slice(0, 3)))).size).toBe(hits.length);
    expect(hits.every((h, j) => j === 0 || h.score <= hits[j - 1].score)).toBe(true);
  });
});
