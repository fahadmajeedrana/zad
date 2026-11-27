// Semantic search: precomputed int8 passage vectors (scripts/build-embeddings.mjs) + a query
// vector from the same model running in a worker. Ranking is a plain dot product.

export type RefKey = 'guide' | 'fiqh' | 'uhadith' | 'tafsir';
/** [dataKey, sectionKey, topicNo, itemFrom, itemTo] or ['hadith', part, babIndex, hadithNo] */
export type ChunkRef = [RefKey, string, number, number, number] | ['hadith', string, number, number];

export interface SemanticRaw {
  model: string;
  dtype: string;
  queryPrefix: string;
  passagePrefix?: string;
  pooling: 'mean' | 'cls';
  dims: number;
  sources: Record<string, string>;
  refs: ChunkRef[];
  vectors: string;
}

export interface SemanticIndex extends Omit<SemanticRaw, 'vectors'> { vec: Int8Array }

export function decodeIndex(raw: SemanticRaw): SemanticIndex {
  const bin = atob(raw.vectors);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const { vectors: _unused, ...rest } = raw;
  return { ...rest, vec: new Int8Array(bytes.buffer) };
}

export interface Hit { ref: ChunkRef; score: number }

/** The topic (or hadith) a chunk belongs to — several chunks of one long topic count once. */
export const topicKey = (r: ChunkRef) => (r[0] === 'hadith' ? `hadith:${r[1]}:${r[2]}:${r[3]}` : `${r[0]}:${r[1]}:${r[2]}`);

export function rank(idx: SemanticIndex, q: ArrayLike<number>, kinds: Set<string> | null, k = 10): Hit[] {
  const { dims, vec, refs } = idx;
  const scores: [number, number][] = [];
  for (let i = 0; i < refs.length; i++) {
    if (kinds && !kinds.has(refs[i][0])) continue;
    let s = 0;
    const o = i * dims;
    for (let j = 0; j < dims; j++) s += vec[o + j] * q[j];
    scores.push([i, s / 127]);
  }
  scores.sort((a, b) => b[1] - a[1]);
  const out: Hit[] = [], seen = new Set<string>();
  for (const [i, s] of scores) {
    const key = topicKey(refs[i]);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ref: refs[i], score: s });
    if (out.length >= k) break;
  }
  return out;
}

// ---- worker client ----
type Progress = { status?: string; file?: string; loaded?: number; total?: number };
let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
const progressListeners = new Set<(p: Progress) => void>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./embed.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'progress') { progressListeners.forEach((fn) => fn(m.p)); return; }
      const p = pending.get(m.id);
      if (!p) return;
      pending.delete(m.id);
      if (m.type === 'error') p.reject(new Error(m.message));
      else p.resolve(m.type === 'result' ? (m.vecs ?? m.vec) : null);
    };
  }
  return worker;
}

function call<T>(idx: SemanticIndex, type: 'load' | 'embed' | 'embedMany', payload: { text?: string; texts?: string[] } = {}) {
  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    getWorker().postMessage({ id, type, model: idx.model, dtype: idx.dtype, pooling: idx.pooling, ...payload });
  });
}

export const loadModel = (idx: SemanticIndex) => call<null>(idx, 'load');
export const embedQuery = (idx: SemanticIndex, q: string) => call<number[]>(idx, 'embed', { text: idx.queryPrefix + q });
/** Embed passages/sentences (with the model's passage prefix), e.g. for the cited answer. */
export const embedPassages = (idx: SemanticIndex, texts: string[]) =>
  call<number[][]>(idx, 'embedMany', { texts: texts.map((t) => (idx.passagePrefix ?? idx.queryPrefix.replace('query', 'passage')) + t) });
export function onModelProgress(fn: (p: Progress) => void) {
  progressListeners.add(fn);
  return () => { progressListeners.delete(fn); };
}
