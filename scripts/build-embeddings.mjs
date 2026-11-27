// Precompute passage embeddings for "تلاش بالمعنی" (semantic search).
// Usage: npm run embeddings   (after content changes; downloads the model once into .cache/)
//
// Output: content/generated/semantic.json — committed, so CI never needs the model.
// build-content.mjs copies it into public/data with a content hash and warns when it is stale.
// Vectors are L2-normalised and stored as int8 (×127), base64-encoded: ~0.4 KB per chunk.
import fs from 'node:fs';
import path from 'node:path';
import { MODELS, ROOT, buildChunks, loadBuiltData, makeEmbedder } from './lib/chunks.mjs';

const NAME = process.argv[2] || 'e5-small';
const { data, files } = loadBuiltData();
const chunks = buildChunks(data);
console.log(`${chunks.length} chunks, model ${MODELS[NAME].id} (${MODELS[NAME].dtype})`);

const E = await makeEmbedder(NAME);
const t0 = Date.now();
const vecs = await E.embedPassages(chunks.map((c) => c.text), (n, total) => {
  if (n % 160 === 0 || n === total) process.stdout.write(`\r  embedded ${n}/${total}`);
});
console.log(`\n  ${((Date.now() - t0) / 1000).toFixed(0)}s`);

const dims = vecs[0].length;
const q = new Int8Array(chunks.length * dims);
vecs.forEach((v, i) => v.forEach((x, j) => { q[i * dims + j] = Math.max(-127, Math.min(127, Math.round(x * 127))); }));

// Compact chunk refs: [dataKey, sectionKey, topicNo, itemFrom, itemTo] or ['hadith', part, babIndex, hadithNo]
const refs = chunks.map(({ meta: m }) => (m.d === 'hadith' ? ['hadith', m.p, m.b, m.n] : [m.d, m.s, m.n, m.a, m.b]));
const out = {
  model: MODELS[NAME].id,
  dtype: MODELS[NAME].dtype,
  queryPrefix: MODELS[NAME].query,
  pooling: MODELS[NAME].pooling,
  dims,
  // The data files these chunks were built from; build-content warns if they change.
  sources: Object.fromEntries(['guide', 'fiqh', 'uhadith', 'tafsir', 'hadith'].map((k) => [k, files[k]])),
  refs,
  vectors: Buffer.from(q.buffer).toString('base64'),
};
const file = path.join(ROOT, 'content', 'generated', 'semantic.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(out));
console.log(`wrote ${path.relative(ROOT, file)} (${(fs.statSync(file).size / 1024).toFixed(0)} KB, ${dims} dims)`);
