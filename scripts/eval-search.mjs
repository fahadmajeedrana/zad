// Compare embedding models on real student-style questions with known answers.
// Usage: node scripts/eval-search.mjs [model ...]     (models: see MODELS in lib/chunks.mjs)
// Prints hit@1 / hit@5 / MRR per model and the top-3 results per question for review.
import { MODELS, buildChunks, loadBuiltData, makeEmbedder } from './lib/chunks.mjs';

// expect: topic keys ("fiqh f1b1:20") or a test on the hadith translation.
const Q = [
  ['وضو کن چیزوں سے ٹوٹ جاتا ہے؟', ['fiqh f1b1:20']],
  ['وضو میں کتنی چیزیں فرض ہیں؟', ['fiqh f1b1:15']],
  ['نماز کس وجہ سے فاسد ہو جاتی ہے؟', ['fiqh f1b2:11']],
  ['زکوٰۃ کن لوگوں کو دی جا سکتی ہے؟', ['fiqh f1b3:8']],
  ['روزے میں کیا کرنے سے صرف قضا لازم آتی ہے؟', ['fiqh f1b4:6']],
  ['حج کتنی قسم کا ہوتا ہے؟', ['fiqh f1b5:6']],
  ['نکاح صحیح ہونے کے لیے گواہ ضروری ہیں؟', ['fiqh f2b1:4', 'fiqh f2b1:3']],
  ['دودھ پلانے سے کون سے رشتے حرام ہو جاتے ہیں؟', ['fiqh f2b2:1', 'fiqh f2b2:2', 'fiqh f2b1:10']],
  ['طلاق صریح کسے کہتے ہیں؟', ['fiqh f2b3:5']],
  ['متواتر حدیث کی تعریف کیا ہے؟', ['uhadith uhb2:4']],
  ['ضعیف اور موضوع حدیث میں کیا فرق ہے؟', ['uhadith uhb2:9']],
  ['کیا نبی ﷺ کے زمانے میں حدیثیں لکھی گئیں؟', ['uhadith uhb1:8', 'uhadith uhb1:9', 'uhadith uhb1:10']],
  ['قرآن کو ایک کتاب کی شکل میں کس نے جمع کیا؟', ['tafsir utb3:2', 'tafsir utb3:3']],
  ['قرآن تھوڑا تھوڑا کیوں نازل ہوا؟', ['tafsir utb2:4']],
  ['اپنی رائے سے تفسیر کرنا کیسا ہے؟', ['tafsir utb4:8']],
  ['مکی اور مدنی سورتوں کی پہچان کیسے ہوتی ہے؟', ['tafsir utb2:8']],
  ['لازم اور متعدی فعل میں کیا فرق ہے؟', ['guide s1:19']],
  ['مبتدا اور خبر کیا ہوتے ہیں؟', ['guide n1:30']],
  ['جمع مکسر کسے کہتے ہیں؟', ['guide n1:17']],
  ['معرفہ کی کتنی قسمیں ہیں؟', ['guide n1:19']],
  ['اعمال کا دارومدار نیتوں پر ہے', (c) => c.meta.d === 'hadith' && c.meta.p === 'h1' && c.meta.b === 0 && c.meta.n === 1],
  ['پڑوسی کے حقوق کے بارے میں حدیث', (c) => c.meta.d === 'hadith' && /پڑوس/.test(c.u)],
  ['سچ بولنے کی فضیلت', (c) => c.meta.d === 'hadith' && /سچ/.test(c.u)],
  ['ماں باپ کے ساتھ اچھا سلوک', (c) => c.meta.d === 'hadith' && /(ماں|والد|باپ)/.test(c.u)],
];

const topicKey = (c) => (c.meta.d === 'hadith' ? `hadith ${c.meta.p}:${c.meta.b}:${c.meta.n}` : `${c.meta.d} ${c.meta.s}:${c.meta.n}`);
const isHit = (c, expect) => (typeof expect === 'function' ? expect(c) : expect.includes(topicKey(c)));

const { data } = loadBuiltData();
const chunks = buildChunks(data);
console.log(`${chunks.length} chunks (${chunks.filter((c) => c.meta.d !== 'hadith').length} topic pieces, ${chunks.filter((c) => c.meta.d === 'hadith').length} ahadith)\n`);

for (const name of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(MODELS)) {
  const t0 = Date.now();
  const E = await makeEmbedder(name);
  const P = await E.embedPassages(chunks.map((c) => c.text));
  const QV = await E.embedQueries(Q.map((q) => q[0]));
  let h1 = 0, h5 = 0, mrr = 0;
  const lines = [];
  Q.forEach(([q, expect], qi) => {
    const scored = P.map((v, i) => [i, v.reduce((s, x, j) => s + x * QV[qi][j], 0)]).sort((a, b) => b[1] - a[1]);
    // rank by distinct topic (several chunks can come from one topic)
    const seen = [];
    for (const [i] of scored) { const k = topicKey(chunks[i]); if (!seen.some((s) => s.k === k)) seen.push({ k, c: chunks[i] }); if (seen.length >= 20) break; }
    const rank = seen.findIndex((s) => isHit(s.c, expect)) + 1;
    if (rank === 1) h1++;
    if (rank >= 1 && rank <= 5) h5++;
    if (rank) mrr += 1 / rank;
    lines.push(`  ${rank === 1 ? '✓' : rank && rank <= 5 ? '~' : '✗'} [${rank || '>20'}] ${q}\n      ${seen.slice(0, 3).map((s) => s.c.label.slice(0, 70)).join('\n      ')}`);
  });
  console.log(`== ${name} (${MODELS[name].id}, ${MODELS[name].dtype}) — ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log(`   hit@1 ${h1}/${Q.length}   hit@5 ${h5}/${Q.length}   MRR ${(mrr / Q.length).toFixed(2)}`);
  if (process.env.VERBOSE) console.log(lines.join('\n'));
  console.log();
}
