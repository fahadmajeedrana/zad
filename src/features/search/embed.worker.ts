// Runs the embedding model off the main thread. The model (~118 MB, int8) is downloaded from the
// Hugging Face hub once and kept in the browser's Cache Storage by transformers.js, so later
// searches — including offline — reuse it.
import { env, pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';

env.allowLocalModels = false;

type Msg = { id: number; type: 'load' | 'embed'; model: string; dtype: string; pooling: 'mean' | 'cls'; text?: string };

let ext: Promise<FeatureExtractionPipeline> | null = null;

self.onmessage = async (e: MessageEvent<Msg>) => {
  const { id, type, model, dtype, pooling, text } = e.data;
  try {
    ext ??= pipeline('feature-extraction', model, {
      dtype: dtype as 'q8',
      device: 'wasm',
      progress_callback: (p: unknown) => self.postMessage({ type: 'progress', p }),
    }) as Promise<FeatureExtractionPipeline>;
    const fx = await ext;
    if (type === 'load') { self.postMessage({ id, type: 'ready' }); return; }
    const out = await fx(text!, { pooling, normalize: true });
    self.postMessage({ id, type: 'result', vec: Array.from(out.data as Float32Array) });
  } catch (err) {
    ext = null;
    self.postMessage({ id, type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
