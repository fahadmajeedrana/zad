// Compare embedding models on real student-style questions with known answers.
// Usage: node scripts/eval-search.mjs [model ...]     (models: see MODELS in lib/chunks.mjs)
// Prints hit@1 / hit@5 / MRR per model and the top-3 results per question for review.
import { MODELS, buildChunks, lexiconTexts, loadBuiltData, makeEmbedder } from './lib/chunks.mjs';

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

// Same questions as students might type them in Roman Urdu (same order as Q).
const ROMAN = [
  'wuzu kin cheezon se toot jata hai?', 'wuzu mein kitni cheezein farz hain?', 'namaz kis wajah se fasid ho jati hai?',
  'zakat kin logon ko di ja sakti hai?', 'roze mein kya karne se sirf qaza lazim aati hai?', 'hajj kitni qisam ka hota hai?',
  'nikah sahih hone ke liye gawah zaroori hain?', 'doodh pilane se kaun se rishte haram ho jate hain?', 'talaq sareeh kise kehte hain?',
  'mutawatir hadees ki tareef kya hai?', 'zaeef aur mauzoo hadees mein kya farq hai?', 'kya Nabi ke zamane mein hadeesen likhi gayin?',
  'Quran ko aik kitab ki shakal mein kis ne jama kiya?', 'Quran thora thora kyun nazil hua?', 'apni raye se tafseer karna kaisa hai?',
  'makki aur madani surton ki pehchan kaise hoti hai?', 'lazim aur mutaddi fel mein kya farq hai?', 'mubtada aur khabar kya hote hain?',
  'jama mukassar kise kehte hain?', 'marifa ki kitni qismein hain?', 'amaal ka daromadar niyyaton par hai',
  'parosi ke huqooq ke bare mein hadees', 'sach bolne ki fazeelat', 'maa baap ke sath acha sulook',
];

// A second Roman set with different spellings and phrasings, never used for tuning.
const HELDOUT = [
  ['wazu tootne ki wajuhat', ['fiqh f1b1:20']], ['namaz ke mufsidaat', ['fiqh f1b2:11']], ['zakaat ke masarif', ['fiqh f1b3:8']],
  ['roza kin cheezon se nahi tootta', ['fiqh f1b4:5']], ['hajj e tamattu ka tareeqa', ['fiqh f1b5:9']], ['nikah ke arkan', ['fiqh f2b1:3']],
  ['talaq e kinaya', ['fiqh f2b3:6', 'fiqh f2b3:7']], ['hadis e qudsi kya hoti hai', ['uhadith uhb2:6']], ['sahih bukhari ka taaruf', ['uhadith uhb3:5']],
  ['hazrat usman ne quran kaise jama kiya', ['tafsir utb3:3']], ['wahi ki iqsaam', ['tafsir utb2:1']], ['naskh ki hikmat', ['tafsir utb3:8']],
  ['fail aur mafool', ['guide s1:11']], ['muannas ki alamat', ['guide n1:13']], ['ghusl ka tareeqa', ['fiqh f1b1:24']],
  ['tayammum kaise karte hain', ['fiqh f1b1:26']],
];

// Flags: --roman  use the Roman Urdu questions
//        --index  score the committed index (content/generated/semantic.json) instead of re-embedding
const args = process.argv.slice(2);
const roman = args.includes('--roman');
const useIndex = args.includes('--index');
//        --heldout  use the HELDOUT Roman set
//        --translit convert Roman Urdu to Urdu script first (src/core/roman.js); --noterms skips its term list
const translit = args.includes('--translit');
let questions = args.includes('--heldout') ? HELDOUT : Q.map(([q, expect], i) => [roman ? ROMAN[i] : q, expect]);
if (translit) {
  const { buildLexicon, transliterate } = await import('../src/core/roman.js');
  const lex = buildLexicon(lexiconTexts(data));
  const terms = !args.includes('--noterms');
  questions = questions.map(([q, e]) => [transliterate(lex, q, { terms }), e, q]);
}
const names = args.filter((a) => !a.startsWith('--'));

async function passageVectors(name, E) {
  if (!useIndex) return E.embedPassages(chunks.map((c) => c.text));
  const fs = await import('node:fs');
  const idx = JSON.parse(fs.readFileSync(new URL('../content/generated/semantic.json', import.meta.url), 'utf8'));
  if (idx.model !== MODELS[name].id) throw new Error(`index was built with ${idx.model}, not ${MODELS[name].id}`);
  if (idx.refs.length !== chunks.length) throw new Error('index is stale — run npm run embeddings');
  const q = new Int8Array(Buffer.from(idx.vectors, 'base64').buffer.slice(0));
  return chunks.map((_, i) => Array.from(q.subarray(i * idx.dims, (i + 1) * idx.dims), (x) => x / 127));
}

for (const name of names.length ? names : Object.keys(MODELS)) {
  const t0 = Date.now();
  const E = await makeEmbedder(name);
  const P = await passageVectors(name, E);
  const QV = await E.embedQueries(questions.map((q) => q[0]));
  let h1 = 0, h5 = 0, mrr = 0;
  const lines = [];
  questions.forEach(([q, expect], qi) => {
    const scored = P.map((v, i) => [i, v.reduce((s, x, j) => s + x * QV[qi][j], 0)]).sort((a, b) => b[1] - a[1]);
    // rank by distinct topic (several chunks can come from one topic)
    const seen = [];
    for (const [i] of scored) { const k = topicKey(chunks[i]); if (!seen.some((s) => s.k === k)) seen.push({ k, c: chunks[i] }); if (seen.length >= 20) break; }
    const rank = seen.findIndex((s) => isHit(s.c, expect)) + 1;
    if (rank === 1) h1++;
    if (rank >= 1 && rank <= 5) h5++;
    if (rank) mrr += 1 / rank;
    lines.push(`  ${rank === 1 ? '✓' : rank && rank <= 5 ? '~' : '✗'} [${rank || '>20'}] ${q}${questions[qi][2] ? '   ← ' + questions[qi][2] : ''}\n      ${seen.slice(0, 3).map((s) => s.c.label.slice(0, 70)).join('\n      ')}`);
  });
  console.log(`== ${name} (${MODELS[name].id}, ${MODELS[name].dtype}) — ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log(`   hit@1 ${h1}/${questions.length}   hit@5 ${h5}/${questions.length}   MRR ${(mrr / questions.length).toFixed(2)}${roman || args.includes("--heldout") ? "   (Roman" + (args.includes("--heldout") ? ", held-out" : "") + (translit ? ", transliterated" + (args.includes("--noterms") ? ", no term list" : "") : "") + ")" : ""}`);
  if (process.env.VERBOSE) console.log(lines.join('\n'));
  console.log();
}
