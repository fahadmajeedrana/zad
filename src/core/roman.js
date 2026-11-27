// Roman Urdu → Urdu script, using the books' own vocabulary (no model, no network).
//
// Each Urdu word from the content is reduced to a sound sketch (consonants + و/ی/ا/ع as vowel
// carriers), and each Roman word likewise ("wuzu" → w u z u). A small edit distance that knows
// Urdu spelling habits — short vowels are unwritten, و/ی double as u/i, ع/ء are often silent,
// "kh"/"gh"/"ch" may be خ/غ/چ or کھ/گھ/چھ — picks the closest word, nudged towards frequent ones.
// Short grammar words come from a fixed list because they are too ambiguous to guess.
// Plain JS (typed by roman.d.ts) so Node scripts can import it too.

const STRIP = /[ً-ٰٟۖ-ۭـ]/g;

// ---- Urdu side ----
const U = {
  ب: 'b', پ: 'p', ت: 't', ٹ: 't', ط: 't', ث: 's', س: 's', ص: 's', ج: 'j', چ: 'c', ح: 'h', ہ: 'h', ھ: 'h', ه: 'h',
  خ: 'x', د: 'd', ڈ: 'd', ذ: 'z', ز: 'z', ض: 'z', ظ: 'z', ر: 'r', ڑ: 'r', ژ: 'Z', ش: 'S', غ: 'G', ف: 'f', ق: 'q',
  ک: 'k', ك: 'k', گ: 'g', ل: 'l', م: 'm', ن: 'n', ں: 'n', و: 'W', ؤ: 'W', ی: 'Y', ي: 'Y', ى: 'Y', ے: 'Y', ۓ: 'Y',
  ا: 'A', آ: 'A', أ: 'A', إ: 'A', ٱ: 'A', ع: 'E', ء: 'E', ئ: 'E', ة: 'T', ۃ: 'T',
};
/** Sound sketch of an Urdu word, e.g. وضو → "WzW", روزہ → "rWzH". */
export function urduKey(word) {
  const w = word.replace(/[وىی]ٰ/g, 'ا').replace(STRIP, '');
  let out = '';
  for (let i = 0; i < w.length; i++) {
    let s = U[w[i]];
    if (!s) continue;
    if (s === 'h' && i === w.length - 1 && (w[i] === 'ہ' || w[i] === 'ه')) s = 'H'; // final ہ sounds like "a"
    if (out[out.length - 1] !== s) out += s; // doubled letters (shadda stripped) collapse
  }
  return out;
}

// ---- Roman side ----
/** Sound sketch of a Roman word: consonants, digraphs as one symbol, vowels a/i/u. */
export function romanKey(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  const out = [];
  for (let i = 0; i < w.length; i++) {
    const c = w[i], n = w[i + 1];
    let s;
    if (n === 'h' && 'ksgcz'.includes(c)) { s = { k: 'x', s: 'S', g: 'G', c: 'c', z: 'Z' }[c]; i++; }
    else if (c === 't' && n === 'h') { s = 'θ'; i++; }
    else if ('aeiou'.includes(c) && n === c) { s = { a: 'A', e: 'I', i: 'I', o: 'U', u: 'U' }[c]; i++; }
    else if (c === 'a') s = 'a';
    else if (c === 'e' || c === 'i') s = 'i';
    else if (c === 'o' || c === 'u') s = 'u';
    else if (c === 'y') s = i === 0 || 'aeiou'.includes(n || '') ? 'y' : 'i';
    else if (c === 'v' || c === 'w') s = 'w';
    else if (c === 'c') s = 'k';
    else if (c === 'x') s = 'k';
    else s = c;
    if (out[out.length - 1] !== s) out.push(s);
  }
  return out.join('');
}

const VOWEL = { a: 1, i: 1, u: 1, A: 2, I: 2, U: 2 };
const SUB = {
  a: { A: 0, H: 0.1, E: 0.2, T: 0.2, W: 0.7, Y: 0.7 },
  i: { Y: 0, A: 0.3, E: 0.2, H: 0.5, W: 0.7 },
  u: { W: 0, A: 0.3, E: 0.2, H: 0.5, Y: 0.7 },
  A: { A: 0, H: 0.2, E: 0.2, T: 0.3, W: 0.8, Y: 0.8 },
  I: { Y: 0, E: 0.3, A: 0.6, W: 0.8 },
  U: { W: 0, E: 0.3, A: 0.6, Y: 0.8 },
  w: { W: 0 }, y: { Y: 0 }, h: { H: 0, T: 0.3 }, t: { T: 0.1 }, q: { k: 0.3 }, k: { q: 0.3 }, θ: { t: 0.1, s: 0.1 },
};
const DEL_U = { A: 0.5, W: 0.6, Y: 0.6, E: 0.2, H: 0.3, T: 0.5 }; // Urdu letter not written in Roman
// Roman letter with no Urdu counterpart. Short vowels inside a word are usually unwritten in Urdu;
// long vowels, and vowels at the start or end of a word, are written (ا ع و ی ے ہ).
const delR = (r, pos, n) => (VOWEL[r] === 1 ? (pos === 0 || pos === n - 1 ? 0.6 : 0.2) : VOWEL[r] === 2 ? 0.6 : r === 'h' ? 0.5 : 1);
const sub = (r, u) => (r === u ? 0 : SUB[r]?.[u] ?? 1);
const PAIR = { x: 'kh', G: 'gh', c: 'ch' }; // kh/gh/ch can also be کھ/گھ/چھ

/** Spelling-aware edit distance between a Roman key and an Urdu key. */
export function distance(r, u, limit = Infinity) {
  const n = r.length, m = u.length;
  let prev2 = null, prev = new Float64Array(m + 1), cur;
  for (let j = 1; j <= m; j++) prev[j] = prev[j - 1] + (DEL_U[u[j - 1]] ?? 1);
  for (let i = 1; i <= n; i++) {
    cur = new Float64Array(m + 1);
    cur[0] = prev[0] + delR(r[i - 1], i - 1, n);
    let rowMin = cur[0];
    for (let j = 1; j <= m; j++) {
      let v = Math.min(prev[j - 1] + sub(r[i - 1], u[j - 1]), prev[j] + delR(r[i - 1], i - 1, n), cur[j - 1] + (DEL_U[u[j - 1]] ?? 1));
      const pr = PAIR[r[i - 1]];
      if (pr && j >= 2 && u[j - 2] === pr[0] && u[j - 1] === pr[1]) v = Math.min(v, prev[j - 2]);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > limit) return Infinity;
    prev2 = prev; prev = cur;
  }
  void prev2;
  return prev[m];
}

// Short, very frequent words: too ambiguous to match by sound, so map them directly.
const FIXED = {
  kya: 'کیا', kia: 'کیا', hai: 'ہے', hy: 'ہے', he: 'ہے', hain: 'ہیں', hen: 'ہیں', mein: 'میں', main: 'میں', me: 'میں', mai: 'میں', men: 'میں',
  ki: 'کی', ka: 'کا', ke: 'کے', ko: 'کو', se: 'سے', aur: 'اور', or: 'اور', par: 'پر', pe: 'پر', ne: 'نے', bhi: 'بھی', ya: 'یا', jo: 'جو',
  kin: 'کن', jin: 'جن', jis: 'جس', e: '', kis: 'کس', kise: 'کسے', kisi: 'کسی', kaise: 'کیسے', kese: 'کیسے', kaisa: 'کیسا', kaisi: 'کیسی', kyun: 'کیوں', kyon: 'کیوں', kiun: 'کیوں',
  kitni: 'کتنی', kitne: 'کتنے', kitna: 'کتنا', kab: 'کب', kahan: 'کہاں', kaun: 'کون', kon: 'کون', konsa: 'کون سا', konsi: 'کون سی',
  ho: 'ہو', hota: 'ہوتا', hoti: 'ہوتی', hote: 'ہوتے', hua: 'ہوا', hui: 'ہوئی', hue: 'ہوئے', jata: 'جاتا', jati: 'جاتی', jate: 'جاتے',
  nahi: 'نہیں', nahin: 'نہیں', na: 'نہ', yeh: 'یہ', ye: 'یہ', woh: 'وہ', wo: 'وہ', is: 'اس', us: 'اس', un: 'ان', in: 'ان',
  liye: 'لیے', liay: 'لیے', lie: 'لیے', sath: 'ساتھ', saath: 'ساتھ', bare: 'بارے', baare: 'بارے', kar: 'کر', karna: 'کرنا', karne: 'کرنے',
  karte: 'کرتے', karta: 'کرتا', karti: 'کرتی', de: 'دے', di: 'دی', diya: 'دیا', dena: 'دینا', sakta: 'سکتا', sakti: 'سکتی', sakte: 'سکتے',
  kehte: 'کہتے', kahte: 'کہتے', kehtay: 'کہتے', wala: 'والا', wali: 'والی', wale: 'والے', aik: 'ایک', ek: 'ایک', ap: 'آپ', aap: 'آپ',
  hum: 'ہم', tum: 'تم', apni: 'اپنی', apna: 'اپنا', apne: 'اپنے', kuch: 'کچھ', sab: 'سب', bara: 'بڑا', bari: 'بڑی', chahiye: 'چاہیے',
};

// Common subject terms with well-known Roman spellings (checked first; the sound match covers the rest).
const TERMS = {
  zaroori: 'ضروری', zaruri: 'ضروری', tareef: 'تعریف', tarif: 'تعریف', farq: 'فرق', qisam: 'قسم', qism: 'قسم', qismein: 'قسمیں',
  hadees: 'حدیث', hadith: 'حدیث', hadis: 'حدیث', quran: 'قرآن', namaz: 'نماز', namaaz: 'نماز', roza: 'روزہ', roze: 'روزے', rozay: 'روزے',
  wuzu: 'وضو', wudu: 'وضو', wazu: 'وضو', zakat: 'زکوۃ', zakaat: 'زکوۃ', hajj: 'حج', haj: 'حج', nikah: 'نکاح', talaq: 'طلاق', talaaq: 'طلاق',
  allah: 'اللہ', nabi: 'نبی', rasool: 'رسول', rasul: 'رسول', wahi: 'وحی', wahy: 'وحی',
};

/** Build the vocabulary (word → frequency) from Urdu text. */
export function buildLexicon(texts) {
  const freq = new Map(); // 'plain word|key' → count
  for (const t of texts) {
    const weight = typeof t === 'string' ? 1 : t[1];
    for (const raw of (typeof t === 'string' ? t : t[0]).split(/[^ء-ٰٟ-ۓ]+/)) {
      const w = raw.replace(STRIP, '');
      if (w.length < 2) continue;
      const k = urduKey(raw);
      if (k) freq.set(w + '|' + k, (freq.get(w + '|' + k) || 0) + weight);
    }
  }
  const words = [];
  for (const [wk, f] of freq) { const [w, k] = wk.split('|'); words.push({ w, k, f, lf: Math.log(1 + f) }); }
  return words;
}

/** Best Urdu word for one Roman word, or null if nothing is close enough. */
export function matchWord(lex, roman) {
  const r = romanKey(roman);
  if (!r) return null;
  const limit = 0.25 * r.length + 0.35;
  let best = null, bestScore = Infinity;
  for (const e of lex) {
    if (Math.abs(e.k.length - r.length) > 4) continue;
    const d = distance(r, e.k, limit);
    if (d > limit) continue;
    const s = d - 0.08 * e.lf;
    if (s < bestScore) { bestScore = s; best = e.w; }
  }
  return best;
}

export const hasLatin = (s) => /[a-z]/i.test(s);

/** The Urdu text the vocabulary is learned from. Titles hold the subject terms (وحی, زکوٰۃ, مبتدا…), so they count ×5. */
export function lexiconTexts(refBooks, hadith) {
  const out = [];
  for (const secs of refBooks) for (const sec of secs) { out.push([sec.n, 5]); for (const t of sec.x) { out.push([t.t, 5]); for (const it of t.i) out.push(it[1]); } }
  for (const p of hadith) for (const b of p.b) { out.push([b.t, 5]); for (const h of b.h) out.push(h.u); }
  return out;
}

/** Convert the Latin-script words in a query; Urdu-script words pass through unchanged. */
export function transliterate(lex, query, opts = {}) {
  return query.split(/(\s+)/).map((tok) => {
    if (!/[a-z]/i.test(tok)) return tok;
    const core = tok.toLowerCase().replace(/[^a-z']/g, '').replace(/'/g, '');
    const punct = /\?$/.test(tok) ? '؟' : '';
    if (!core) return tok;
    const hit = core in FIXED ? FIXED[core] : (opts.terms !== false && TERMS[core]) || matchWord(lex, core);
    return hit === '' ? '' : (hit || tok) + punct;
  }).join('').replace(/\s{2,}/g, ' ').trim();
}
