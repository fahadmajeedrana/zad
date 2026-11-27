// Split the reference books and ahadith into passages ("chunks") for semantic search.
// Shared by scripts/build-embeddings.mjs and scripts/eval-search.mjs.
//
// - A topic becomes one or more chunks of ≤ MAX characters of items, each prefixed with
//   "<section> — <topic title>" so a piece of a long topic still knows what it's about.
// - A hadith is one chunk: باب title + Urdu translation + Arabic (harakat stripped).
// Chunk metadata points back into the data files, so the app shows the original text.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripHarakat } from '../../src/core/sarf/engine.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MAX = 600;
const REF_KEYS = ['guide', 'fiqh', 'uhadith', 'tafsir'];

export function loadBuiltData() {
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/generated/data-manifest.json'), 'utf8'));
  const data = {};
  for (const k of [...REF_KEYS, 'hadith']) data[k] = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', man.files[k]), 'utf8'));
  return { data, files: man.files };
}

const clean = (s) => stripHarakat(s).replace(/[﴾﴿]/g, '').replace(/\s+/g, ' ').trim();

/** @returns {{ meta: object, text: string, label: string }[]} */
export function buildChunks(data) {
  const chunks = [];
  for (const d of REF_KEYS) {
    for (const sec of data[d]) {
      sec.x.forEach((t, ti) => {
        const head = `${sec.n} — ${t.t}`;
        let cur = [], len = 0, start = 0;
        const flush = (end) => {
          chunks.push({ meta: { d, s: sec.k, n: ti + 1, a: start, b: end }, text: clean(head + '۔ ' + cur.join(' ')), label: `${d} ${sec.k}:${ti + 1} ${t.t}` });
        };
        t.i.forEach((it, ii) => {
          if (cur.length && len + it[1].length > MAX) { flush(ii); cur = []; len = 0; start = ii; }
          cur.push(it[1]);
          len += it[1].length;
        });
        if (cur.length || !t.i.length) flush(t.i.length);
      });
    }
  }
  for (const p of data.hadith) {
    p.b.forEach((b, bi) => {
      const [title, sub] = b.t.split(' — ');
      const bab = [sub, title].filter(Boolean).join('، ');
      for (const h of b.h) {
        chunks.push({
          meta: { d: 'hadith', p: p.k, b: bi, n: h.n },
          text: clean(`${bab}۔ ${h.u} ${h.a}`).slice(0, 1500),
          label: `hadith ${p.k}:${bi}:${h.n} ${h.u.slice(0, 60)}`,
          u: h.u,
        });
      }
    });
  }
  return chunks;
}

/** Models we can run both at build time (Node) and in the browser (transformers.js). */
export const MODELS = {
  'e5-small': { id: 'Xenova/multilingual-e5-small', dtype: 'q8', query: 'query: ', passage: 'passage: ', pooling: 'mean' },
  'minilm-l12': { id: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', dtype: 'q8', query: '', passage: '', pooling: 'mean' },
  'gemma-300m': { id: 'onnx-community/embeddinggemma-300m-ONNX', dtype: 'q4', query: 'task: search result | query: ', passage: 'title: none | text: ', pooling: 'mean' },
};

export async function makeEmbedder(name) {
  const m = MODELS[name];
  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = path.join(ROOT, '.cache', 'models');
  const ext = await pipeline('feature-extraction', m.id, { dtype: m.dtype });
  const embed = async (texts, prefix, onProgress) => {
    const out = [];
    for (let i = 0; i < texts.length; i += 16) {
      const batch = texts.slice(i, i + 16).map((t) => prefix + t);
      const res = await ext(batch, { pooling: m.pooling, normalize: true });
      out.push(...res.tolist());
      onProgress?.(Math.min(i + 16, texts.length), texts.length);
    }
    return out;
  };
  return { model: m, embedQueries: (t) => embed(t, m.query), embedPassages: (t, p) => embed(t, m.passage, p) };
}
