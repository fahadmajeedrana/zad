// Sarf (conjugation) engine — a verbatim port of the original engine.js (handoff docs/05).
// Do not tidy this file: its exact behaviour is the contract in test-vectors/sarf-engine.json.
// Types live in engine.d.ts.
// ===== Sarf engine: thulathi mujarrad (6 abwab) + thulathi mazeed feeh (10 abwab) =====
const F = 'َ', D = 'ُ', K = 'ِ', S = 'ْ', SH = 'ّ';
const HAMZA = 'ء';
const WEAK = ['و', 'ي'];

const BABS = {
  n:  { ar: 'نَصَرَ يَنْصُرُ', ur: 'باب نَصَرَ', group: 'mujarrad', mv: F, uv: D },
  d:  { ar: 'ضَرَبَ يَضْرِبُ', ur: 'باب ضَرَبَ', group: 'mujarrad', mv: F, uv: K },
  s:  { ar: 'سَمِعَ يَسْمَعُ', ur: 'باب سَمِعَ', group: 'mujarrad', mv: K, uv: F },
  f:  { ar: 'فَتَحَ يَفْتَحُ', ur: 'باب فَتَحَ', group: 'mujarrad', mv: F, uv: F },
  k:  { ar: 'كَرُمَ يَكْرُمُ', ur: 'باب كَرُمَ', group: 'mujarrad', mv: D, uv: D },
  h:  { ar: 'حَسِبَ يَحْسِبُ', ur: 'باب حَسِبَ', group: 'mujarrad', mv: K, uv: K },
  if: { ar: 'إِفْعَال', ur: 'باب اِفعال', group: 'mazeed' },
  tf: { ar: 'تَفْعِيل', ur: 'باب تفعیل', group: 'mazeed' },
  mf: { ar: 'مُفَاعَلَة', ur: 'باب مفاعلہ', group: 'mazeed' },
  ft: { ar: 'اِفْتِعَال', ur: 'باب افتعال', group: 'mazeed' },
  nf: { ar: 'اِنْفِعَال', ur: 'باب انفعال', group: 'mazeed', lazim: true },
  tfl:{ ar: 'تَفَعُّل', ur: 'باب تفعّل', group: 'mazeed' },
  tfa:{ ar: 'تَفَاعُل', ur: 'باب تفاعل', group: 'mazeed' },
  st: { ar: 'اِسْتِفْعَال', ur: 'باب استفعال', group: 'mazeed' },
  fl: { ar: 'اِفْعِلَال', ur: 'باب افعلال', group: 'mazeed', lazim: true },
  fy: { ar: 'اِفْعِيعَال', ur: 'باب افعیعال', group: 'mazeed', lazim: true },
};
const BAB_ORDER = ['n','d','s','f','k','h','if','tf','mf','ft','nf','tfl','tfa','st','fl','fy'];

const SIGHA = [
  ['واحد مذکر غائب','هُوَ'],['تثنیہ مذکر غائب','هُمَا'],['جمع مذکر غائب','هُمْ'],
  ['واحد مؤنث غائب','هِيَ'],['تثنیہ مؤنث غائب','هُمَا'],['جمع مؤنث غائب','هُنَّ'],
  ['واحد مذکر حاضر','أَنْتَ'],['تثنیہ مذکر حاضر','أَنْتُمَا'],['جمع مذکر حاضر','أَنْتُمْ'],
  ['واحد مؤنث حاضر','أَنْتِ'],['تثنیہ مؤنث حاضر','أَنْتُمَا'],['جمع مؤنث حاضر','أَنْتُنَّ'],
  ['واحد متکلم','أَنَا'],['جمع متکلم','نَحْنُ'],
];
const ISM_LABELS = [['واحد مذکر',''],['تثنیہ مذکر',''],['جمع مذکر',''],['واحد مؤنث',''],['تثنیہ مؤنث',''],['جمع مؤنث','']];

// ---- suffix tables ----
const MADI = [F, F+'ا', D+'وا', F+'تْ', F+'تَا', S+'نَ', S+'تَ', S+'تُمَا', S+'تُمْ', S+'تِ', S+'تُمَا', S+'تُنَّ', S+'تُ', S+'نَا'];
const MUD  = [D, F+'انِ', D+'ونَ', D, F+'انِ', S+'نَ', D, F+'انِ', D+'ونَ', K+'ينَ', F+'انِ', S+'نَ', D, D];
const JAZM = [S, F+'ا', D+'وا', S, F+'ا', S+'نَ', S, F+'ا', D+'وا', K+'ي', F+'ا', S+'نَ', S, S];
const PFX  = ['ي','ي','ي','ت','ت','ي','ت','ت','ت','ت','ت','ت',HAMZA,'ن'];
const ISM  = ['ٌ', F+'انِ', D+'ونَ', F+'ةٌ', F+'تَانِ', F+'اتٌ'];

function naqisMadi(cls, W, ALIF) {
  if (cls === 'a') return [F+ALIF, F+W+F+'ا', F+'وْا', F+'تْ', F+'تَا', F+W+S+'نَ', F+W+S+'تَ', F+W+S+'تُمَا', F+W+S+'تُمْ', F+W+S+'تِ', F+W+S+'تُمَا', F+W+S+'تُنَّ', F+W+S+'تُ', F+W+S+'نَا'];
  const L = cls === 'u' ? 'و' : 'ي', V = cls === 'u' ? D : K;
  return [V+L+F, V+L+F+'ا', D+'وا', V+L+F+'تْ', V+L+F+'تَا', V+L+'نَ', V+L+'تَ', V+L+'تُمَا', V+L+'تُمْ', V+L+'تِ', V+L+'تُمَا', V+L+'تُنَّ', V+L+'تُ', V+L+'نَا'];
}
const NAQIS_MUD = {
  u: [D+'و', D+'وَانِ', D+'ونَ', D+'و', D+'وَانِ', D+'ونَ', D+'و', D+'وَانِ', D+'ونَ', K+'ينَ', D+'وَانِ', D+'ونَ', D+'و', D+'و'],
  i: [K+'ي', K+'يَانِ', D+'ونَ', K+'ي', K+'يَانِ', K+'ينَ', K+'ي', K+'يَانِ', D+'ونَ', K+'ينَ', K+'يَانِ', K+'ينَ', K+'ي', K+'ي'],
  a: [F+'ى', F+'يَانِ', F+'وْنَ', F+'ى', F+'يَانِ', F+'يْنَ', F+'ى', F+'يَانِ', F+'وْنَ', F+'يْنَ', F+'يَانِ', F+'يْنَ', F+'ى', F+'ى'],
};
const NAQIS_JAZM = {
  u: [D, D+'وَا', D+'وا', D, D+'وَا', D+'ونَ', D, D+'وَا', D+'وا', K+'ي', D+'وَا', D+'ونَ', D, D],
  i: [K, K+'يَا', D+'وا', K, K+'يَا', K+'ينَ', K, K+'يَا', D+'وا', K+'ي', K+'يَا', K+'ينَ', K, K],
  a: [F, F+'يَا', F+'وْا', F, F+'يَا', F+'يْنَ', F, F+'يَا', F+'وْا', F+'يْ', F+'يَا', F+'يْنَ', F, F],
};

// ---- tokens ----
const t = (c, v = '', r = 0, sh = false) => ({ c, v, r, sh, long: false });
const L = (c) => ({ c, v: '', r: 0, sh: false, long: true });
const clone = (a) => a.map((x) => ({ ...x }));
const vcls = (v) => (v === F ? 'a' : v === D ? 'u' : 'i');

function rootInfo(R) {
  const [a, b, c] = R;
  const info = { R, mithal: a === 'و' || a === 'ي', mudaaf: b === c && !WEAK.includes(b), naqis: WEAK.includes(c) };
  info.ajwaf = WEAK.includes(b) && !info.naqis && !info.mudaaf;
  info.mahmuz = R.includes(HAMZA);
  return info;
}

// افتعال: R1 + ت assimilation
function taPair(a) {
  if (a === 'و' || a === 'ي' || a === HAMZA) return ['ت', 'ت'];
  if ('صضظ'.includes(a)) return [a, 'ط'];
  if (a === 'ط') return ['ط', 'ط'];
  if (a === 'د' || a === 'ذ') return ['د', 'د'];
  if (a === 'ز') return ['ز', 'د'];
  if (a === 'ث') return ['ث', 'ث'];
  return [a, 'ت'];
}

// stems: {madiA, madiP, mudA, mudP, pvA, pvP}
function stems(bab, R) {
  const [a, b, c] = R;
  const B = BABS[bab];
  if (B.group === 'mujarrad') {
    return {
      madiA: [t(a, F, 1), t(b, B.mv, 2), t(c, '', 3)],
      madiP: [t(a, D, 1), t(b, K, 2), t(c, '', 3)],
      mudA: [t(a, S, 1), t(b, B.uv, 2), t(c, '', 3)],
      mudP: [t(a, S, 1), t(b, F, 2), t(c, '', 3)],
      pvA: F, pvP: D,
    };
  }
  const r1 = (v) => t(a, v, 1), r2 = (v, sh) => t(b, v, 2, sh), r3 = (v = '') => t(c, v, 3);
  switch (bab) {
    case 'if': return { madiA: [t(HAMZA, F), r1(S), r2(F), r3()], madiP: [t(HAMZA, D), r1(S), r2(K), r3()], mudA: [r1(S), r2(K), r3()], mudP: [r1(S), r2(F), r3()], pvA: D, pvP: D };
    case 'tf': return { madiA: [r1(F), r2(F, 1), r3()], madiP: [r1(D), r2(K, 1), r3()], mudA: [r1(F), r2(K, 1), r3()], mudP: [r1(F), r2(F, 1), r3()], pvA: D, pvP: D };
    case 'mf': return { madiA: [r1(F), L('ا'), r2(F), r3()], madiP: [r1(D), L('و'), r2(K), r3()], mudA: [r1(F), L('ا'), r2(K), r3()], mudP: [r1(F), L('ا'), r2(F), r3()], pvA: D, pvP: D };
    case 'ft': {
      const [x, y] = taPair(a);
      const R1 = () => t(x, S, 1);
      return { madiA: [t('ا', K), R1(), t(y, F), r2(F), r3()], madiP: [t('ا', D), R1(), t(y, D), r2(K), r3()], mudA: [R1(), t(y, F), r2(K), r3()], mudP: [R1(), t(y, F), r2(F), r3()], pvA: F, pvP: D };
    }
    case 'nf': return { madiA: [t('ا', K), t('ن', S), r1(F), r2(F), r3()], madiP: [t('ا', D), t('ن', S), r1(D), r2(K), r3()], mudA: [t('ن', S), r1(F), r2(K), r3()], mudP: [t('ن', S), r1(F), r2(F), r3()], pvA: F, pvP: D };
    case 'tfl': return { madiA: [t('ت', F), r1(F), r2(F, 1), r3()], madiP: [t('ت', D), r1(D), r2(K, 1), r3()], mudA: [t('ت', F), r1(F), r2(F, 1), r3()], mudP: [t('ت', F), r1(F), r2(F, 1), r3()], pvA: F, pvP: D };
    case 'tfa': return { madiA: [t('ت', F), r1(F), L('ا'), r2(F), r3()], madiP: [t('ت', D), r1(D), L('و'), r2(K), r3()], mudA: [t('ت', F), r1(F), L('ا'), r2(F), r3()], mudP: [t('ت', F), r1(F), L('ا'), r2(F), r3()], pvA: F, pvP: D };
    case 'st': return { madiA: [t('ا', K), t('س', S), t('ت', F), r1(S), r2(F), r3()], madiP: [t('ا', D), t('س', S), t('ت', D), r1(S), r2(K), r3()], mudA: [t('س', S), t('ت', F), r1(S), r2(K), r3()], mudP: [t('س', S), t('ت', F), r1(S), r2(F), r3()], pvA: F, pvP: D };
    case 'fl': return { madiA: [t('ا', K), r1(S), r2(F), t(c, F), r3()], madiP: [t('ا', D), r1(S), r2(D), t(c, K), r3()], mudA: [r1(S), r2(F), t(c, K), r3()], mudP: [r1(S), r2(F), t(c, F), r3()], pvA: F, pvP: D, noWeak: true };
    case 'fy': return { madiA: [t('ا', K), r1(S), t(b, F), t('و', S), r2(F), r3()], madiP: [t('ا', D), r1(S), t(b, D), L('و'), r2(K), r3()], mudA: [r1(S), t(b, F), t('و', S), r2(K), r3()], mudP: [r1(S), t(b, F), t('و', S), r2(F), r3()], pvA: F, pvP: D, noWeak: true };
  }
}

const AJWAF_BABS = ['n','d','s','f','k','h','if','ft','nf','st'];
const MITHAL_DROP = ['d','h','f'];

// ajwaf transform -> {open, closed}
function ajwaf(tokens, bab, madiActiveMujarrad) {
  const k = tokens.findIndex((x) => x.r === 2);
  if (k < 1) return { open: tokens, closed: tokens };
  const open = clone(tokens), p = open[k - 1], v2 = open[k].v;
  const longOf = (v) => (v === F ? 'ا' : v === D ? 'و' : 'ي');
  if (p.v === S && !p.long) { p.v = v2; open[k] = { ...L(longOf(v2)), r: 2 }; }
  else if (p.v === D && v2 === K) { p.v = K; open[k] = { ...L('ي'), r: 2 }; }
  else if (p.v === F) { open[k] = { ...L('ا'), r: 2 }; }
  else return { open: tokens, closed: tokens };
  const closed = clone(open);
  closed.splice(k, 1);
  if (madiActiveMujarrad) closed[k - 1].v = (bab === 'n' || bab === 'k') ? D : K;
  return { open, closed };
}

// mudaaf contraction (last two consonant tokens identical)
function canContract(tokens) {
  const n = tokens.length;
  if (n < 2) return false;
  const x = tokens[n - 2], y = tokens[n - 1];
  return !x.long && !y.long && !x.sh && x.c === y.c && x.v !== S;
}
function contract(tokens) {
  const a = clone(tokens), n = a.length, x = a[n - 2], p = a[n - 3];
  if (p && !p.long && p.v === S) p.v = x.v;
  a.splice(n - 2, 1);
  a[a.length - 1].sh = true;
  return a;
}

const tokStr = (arr) => arr.map((x) => x.c + (x.sh ? SH : '') + x.v).join('');

// ---- orthography ----
const VOW = { [F]: 'a', [D]: 'u', [K]: 'i', [S]: 's', 'ً': 'a', 'ٌ': 'u', 'ٍ': 'i' };
const isMark = (ch) => /[ً-ْ]/.test(ch);
function units(w) {
  const u = [];
  for (const ch of w) { if (isMark(ch) && u.length) u[u.length - 1].m += ch; else u.push({ c: ch, m: '' }); }
  return u;
}
const vowelOf = (m) => { for (const ch of m) if (VOW[ch]) return VOW[ch]; return ''; };
function seatHamza(word) {
  const u = units(word);
  u.forEach((x, i) => {
    if (x.c !== HAMZA) return;
    const own = vowelOf(x.m);
    if (i === 0) { x.c = own === 'i' ? 'إ' : 'أ'; return; }
    const pr = u[i - 1];
    let pv = vowelOf(pr.m), plong = false;
    if (!pr.m && 'اوي'.includes(pr.c)) { plong = true; pv = pr.c === 'ا' ? 'a' : pr.c === 'و' ? 'u' : 'i'; }
    if (!pr.m && pr.c === 'ى') { pv = 'a'; }
    const isFinal = !u.slice(i + 1).some((y) => !isMark(y.c));
    if (isFinal) {
      if (plong || pv === 's' || pv === '') x.c = HAMZA;
      else x.c = pv === 'a' ? 'أ' : pv === 'u' ? 'ؤ' : 'ئ';
      return;
    }
    if (plong && pr.c === 'ا' && own === 'a') { x.c = HAMZA; return; }
    if (own === 'i' || pv === 'i') x.c = 'ئ';
    else if (own === 'u' || pv === 'u') x.c = 'ؤ';
    else x.c = 'أ';
  });
  return u.map((x) => x.c + x.m).join('');
}
function ortho(w) {
  return w.split(' ').map((word) => {
    let s = seatHamza(word);
    s = s.replace(/أَأْ/g, 'آ').replace(/أُؤْ/g, 'أُو').replace(/إِئْ/g, 'إِي').replace(/أَا/g, 'آ');
    s = s.replace(/([ء-ي])ْ\1/g, '$1ّ');          // تْت -> تّ
    s = s.replace(/ِوْ/g, 'ِي').replace(/ُيْ/g, 'ُو');        // mithal i'lal
    s = s.replace(/ُوْ/g, 'ُو').replace(/ِيْ/g, 'ِي');
    s = s.replace(/ّ([ًٌٍَُِ])/g, 'ّ$1');
    return s;
  }).join(' ');
}

// ---- core conjugator ----
function makeForm(prefixTok, stem, suf, naqisTable, ri, ctx) {
  if (ri.naqis && !ctx.noWeak) {
    const n = stem.length, r2 = stem[n - 2];
    const cls = vcls(r2.v);
    const tbl = naqisTable(cls);
    const head = [...prefixTok, ...stem.slice(0, n - 2)];
    return { tokens: [...head, { ...r2, v: '' }], str: tokStr(head) + r2.c + (r2.sh ? SH : '') + tbl[ctx.i] };
  }
  let s = suf;
  const vowelSuf = s[0] !== S;
  let st = stem;
  if (ctx.ajwaf) st = vowelSuf ? ctx.ajwaf.open : ctx.ajwaf.closed;
  if (ctx.dbl && canContract(st)) {
    if (vowelSuf) st = contract(st);
    else if (s === S) { st = contract(st); s = F; }
  }
  const all = [...prefixTok, ...st];
  return { tokens: all, str: tokStr(all) + s };
}

function ctxFor(bab, ri, stem, kind) {
  const ctx = { noWeak: !!stems(bab, ri.R).noWeak, dbl: ri.mudaaf || bab === 'fl' };
  if (ri.ajwaf && !ctx.noWeak && AJWAF_BABS.includes(bab)) ctx.ajwaf = ajwaf(stem, bab, kind === 'madiA' && BABS[bab].group === 'mujarrad');
  return ctx;
}

function prepMudStem(bab, ri, active) {
  const S0 = stems(bab, ri.R);
  let stem = clone(active ? S0.mudA : S0.mudP);
  if (active && ri.R[0] === 'و' && MITHAL_DROP.includes(bab)) stem = stem.slice(1);
  return stem;
}

function madi(bab, ri, active) {
  const S0 = stems(bab, ri.R), stem = active ? S0.madiA : S0.madiP;
  const ctx = ctxFor(bab, ri, stem, active ? 'madiA' : 'madiP');
  const mujW = BABS[bab].group === 'mujarrad' && ri.R[2] === 'و';
  return SIGHA.map((_, i) => ortho(makeForm([], stem, MADI[i], (c) => naqisMadi(c, mujW ? 'و' : 'ي', mujW ? 'ا' : 'ى'), ri, { ...ctx, i }).str));
}

function mudari(bab, ri, active, jazm) {
  const S0 = stems(bab, ri.R), stem = prepMudStem(bab, ri, active);
  const ctx = ctxFor(bab, ri, stem, 'mud');
  const pv = active ? S0.pvA : S0.pvP;
  return SIGHA.map((_, i) => ortho(makeForm([t(PFX[i], pv)], stem, (jazm ? JAZM : MUD)[i], (c) => (jazm ? NAQIS_JAZM : NAQIS_MUD)[c], ri, { ...ctx, i }).str));
}

const AMR_EXC = ['ءكل', 'ءخذ', 'ءمر'];
function amrHazir(bab, ri, i) {
  let stem = prepMudStem(bab, ri, true);
  if (BABS[bab].group === 'mujarrad' && AMR_EXC.includes(ri.R.join(''))) stem = stem.slice(1);
  const ctx = ctxFor(bab, ri, stem, 'mud');
  const f = makeForm([], stem, JAZM[i], (c) => NAQIS_JAZM[c], ri, { ...ctx, i });
  let out = f.str;
  if (bab === 'if') out = HAMZA + F + out;
  else {
    const first = f.tokens[0];
    if (first && first.v === S) {
      const second = f.tokens.slice(1).find((x) => !x.long && x.v && x.v !== S);
      out = 'ا' + (second && second.v === D ? D : K) + out;
    }
  }
  return ortho(out);
}

function amr(bab, ri, active) {
  const j = mudari(bab, ri, active, true);
  return SIGHA.map((_, i) => {
    if (active && i >= 6 && i <= 11) return amrHazir(bab, ri, i);
    return 'لِ' + j[i];
  });
}
function nahi(bab, ri, active) {
  return mudari(bab, ri, active, true).map((x) => 'لَا ' + x);
}

// ---- ism fa'il / maf'ool ----
function ismStem(bab, ri, faail) {
  const [a, b, c] = ri.R;
  if (BABS[bab].group === 'mujarrad') {
    if (faail) {
      if (ri.ajwaf) return [t(a, F, 1), L('ا'), t(HAMZA, K, 2), t(c, '', 3)];
      return [t(a, F, 1), L('ا'), t(b, K, 2), t(c, '', 3)];
    }
    if (ri.ajwaf) return [t('م', F), t(a, b === 'و' ? D : K, 1), L(b), t(c, '', 3)];
    return [t('م', F), t(a, S, 1), t(b, D, 2), L('و'), t(c, '', 3)];
  }
  const st = clone(stems(bab, ri.R).mudA);
  st[st.length - 2].v = faail ? K : F;
  return [t('م', D), ...st];
}
function ism(bab, ri, faail) {
  const stem = ismStem(bab, ri, faail);
  const muj = BABS[bab].group === 'mujarrad';
  const noWeak = !!stems(bab, ri.R).noWeak;
  if (ri.naqis && !noWeak) {
    const n = stem.length;
    if (!faail && muj) {
      const k2 = stem.findIndex((x) => x.r === 2);
      const head = tokStr(stem.slice(0, k2)) + stem[k2].c;
      const core = ri.R[2] === 'و' ? D + 'وّ' : K + 'يّ';
      return ISM.map((s) => ortho(head + core + s));
    }
    const head = tokStr(stem.slice(0, n - 2)) + stem[n - 2].c + (stem[n - 2].sh ? SH : '');
    const tbl = faail ? ['ٍ', K+'يَانِ', D+'ونَ', K+'يَةٌ', K+'يَتَانِ', K+'يَاتٌ'] : ['ًى', F+'يَانِ', F+'وْنَ', F+'اةٌ', F+'اتَانِ', F+'يَاتٌ'];
    return tbl.map((s) => ortho(head + s));
  }
  if (faail && muj && ri.ajwaf && ri.R[2] === HAMZA) {
    const head = ri.R[0] + F + 'ا' + HAMZA;
    return ['ٍ', K+'يَانِ', D+'ونَ', K+'يَةٌ', K+'يَتَانِ', K+'يَاتٌ'].map((x) => ortho(head + x));
  }
  let st = stem;
  if (ri.ajwaf && !muj && !noWeak && AJWAF_BABS.includes(bab)) st = ajwaf(stem, bab, false).open;
  if ((ri.mudaaf || bab === 'fl') && canContract(st)) st = contract(st);
  return ISM.map((s) => ortho(tokStr(st) + s));
}

// ---- masdar (qiyasi for mazeed) ----
function masdarOf(bab, ri) {
  const [a, b, c] = ri.R;
  if (BABS[bab].group === 'mujarrad') return null;
  const nq = ri.naqis, aj = ri.ajwaf;
  let w;
  switch (bab) {
    case 'if': w = aj ? 'إِ' + a + F + 'ا' + c + F + 'ةٌ' : HAMZA + K + a + S + b + F + 'ا' + (nq ? HAMZA : c) + 'ٌ'; break;
    case 'tf': w = nq ? 'تَ' + a + S + b + K + 'يَةٌ' : 'تَ' + a + S + b + K + 'ي' + c + 'ٌ'; break;
    case 'mf': w = 'مُ' + a + F + 'ا' + b + F + (nq ? 'اةٌ' : c + F + 'ةٌ'); break;
    case 'ft': { const [x, y] = taPair(a); w = 'اِ' + x + S + y + K + (aj ? 'ي' : b) + F + 'ا' + (nq ? HAMZA : c) + 'ٌ'; break; }
    case 'nf': w = 'اِنْ' + a + K + (aj ? 'ي' : b) + F + 'ا' + (nq ? HAMZA : c) + 'ٌ'; break;
    case 'tfl': w = 'تَ' + a + F + b + SH + (nq ? K + 'ي' : D + c + 'ٌ'); break;
    case 'tfa': w = 'تَ' + a + F + 'ا' + b + (nq ? K + 'ي' : D + c + 'ٌ'); break;
    case 'st': w = aj ? 'اِسْتِ' + a + F + 'ا' + c + F + 'ةٌ' : 'اِسْتِ' + a + S + b + F + 'ا' + (nq ? HAMZA : c) + 'ٌ'; break;
    case 'fl': w = 'اِ' + a + S + b + K + c + F + 'ا' + c + 'ٌ'; break;
    case 'fy': w = 'اِ' + a + S + b + K + 'ي' + b + F + 'ا' + c + 'ٌ'; break;
  }
  return ortho(w);
}

const GARDAAN_TYPES = [
  { k: 'madiA', ur: 'ماضی معروف' }, { k: 'madiP', ur: 'ماضی مجہول' },
  { k: 'mudA', ur: 'مضارع معروف' }, { k: 'mudP', ur: 'مضارع مجہول' },
  { k: 'amrA', ur: 'امر معروف' }, { k: 'amrP', ur: 'امر مجہول' },
  { k: 'nahiA', ur: 'نہی معروف' }, { k: 'nahiP', ur: 'نہی مجہول' },
  { k: 'faail', ur: 'اسم فاعل' }, { k: 'mafool', ur: 'اسم مفعول' },
];

function gardaan(type, bab, R) {
  const ri = rootInfo(R);
  switch (type) {
    case 'madiA': return madi(bab, ri, true);
    case 'madiP': return madi(bab, ri, false);
    case 'mudA': return mudari(bab, ri, true, false);
    case 'mudP': return mudari(bab, ri, false, false);
    case 'amrA': return amr(bab, ri, true);
    case 'amrP': return amr(bab, ri, false);
    case 'nahiA': return nahi(bab, ri, true);
    case 'nahiP': return nahi(bab, ri, false);
    case 'faail': return ism(bab, ri, true);
    case 'mafool': return ism(bab, ri, false);
  }
}

function sarfSagheer(bab, R) {
  const ri = rootInfo(R);
  return {
    madi: madi(bab, ri, true)[0], mudari: mudari(bab, ri, true, false)[0],
    madiP: madi(bab, ri, false)[0], mudariP: mudari(bab, ri, false, false)[0],
    faail: ism(bab, ri, true)[0], mafool: ism(bab, ri, false)[0],
    amr: amrHazir(bab, ri, 6), nahi: nahi(bab, ri, true)[6],
    masdar: masdarOf(bab, ri),
  };
}

function rootKind(R) {
  const ri = rootInfo(R), k = [];
  if (ri.mudaaf) k.push('مضاعف');
  if (ri.mithal) k.push('مثال');
  if (ri.ajwaf) k.push('اجوف');
  if (ri.naqis) k.push('ناقص');
  if (ri.mahmuz) k.push('مہموز');
  return k.length ? k.join('، ') : 'صحیح';
}

// ---- normalisation & masdar -> root/bab detection ----
const stripHarakat = (s) => s.replace(/[ً-ٰٟـ]/g, '');
function normalize(s) {
  return stripHarakat(s).trim().replace(/[ٱ]/g, 'ا').replace(/آ/g, 'ءا').replace(/[أإؤئ]/g, 'ء').replace(/ى/g, 'ي').replace(/\s+/g, '');
}
function normRoot(s) {
  return stripHarakat(s).replace(/[أإؤئآ]/g, 'ء').replace(/ى/g, 'ي').replace(/ا/g, 'و').replace(/[\s\-ـ]/g, '');
}

function detectMasdar(input) {
  const n = normalize(input);
  const startsHamza = n[0] === HAMZA;
  const rules = [
    [/^است(.)(.)اء$/, 'st', (m) => [m[1], m[2], 'ي']],
    [/^است(.)ا(.)ة$/, 'st', (m) => [m[1], 'و', m[2]]],
    [/^است(.)(.)ا(.)$/, 'st', (m) => [m[1], m[2], m[3]]],
    [/^ا(.)(.)ي\2ا(.)$/, 'fy', (m) => [m[1], m[2], m[3]]],
  ];
  const ifRules = [
    [/^[ءا](.)ا(.)ة$/, 'if', (m) => [m[1], 'و', m[2]]],
    [/^[ءا](.)(.)اء$/, 'if', (m) => [m[1], m[2], 'ي']],
    [/^[ءا]ي(.)ا(.)$/, 'if', (m) => ['و', m[1], m[2]]],
    [/^[ءا](.)(.)ا(.)$/, 'if', (m) => [m[1], m[2], m[3]]],
  ];
  const ftRules = [
    [/^ا(.)ت(.)اء$/, 'ft', (m) => [m[1], m[2], 'ي']],
    [/^ا(.)ت(.)ا(.)$/, 'ft', (m) => [m[1], m[2], m[3]]],
    [/^ان(.)(.)اء$/, 'nf', (m) => [m[1], m[2], 'ي']],
    [/^ان(.)(.)ا(.)$/, 'nf', (m) => [m[1], m[2], m[3]]],
    [/^ا([صضطظ])ط(.)ا(.)$/, 'ft', (m) => [m[1], m[2], m[3]]],
    [/^ا([دذز])د(.)ا(.)$/, 'ft', (m) => [m[1], m[2], m[3]]],
    [/^ات(.)ا(.)$/, 'ft', (m) => ['و', m[1], m[2]]],
    [/^ا(.)(.)(.)ا\3$/, 'fl', (m) => [m[1], m[2], m[3]]],
  ];
  const rest = [
    [/^ت(.)(.)ية$/, 'tf', (m) => [m[1], m[2], 'ي']],
    [/^ت(.)(.)ي(.)$/, 'tf', (m) => [m[1], m[2], m[3]]],
    [/^ت(.)ا(.)(.)$/, 'tfa', (m) => [m[1], m[2], m[3]]],
    [/^ت(.)(.)(.)$/, 'tfl', (m) => [m[1], m[2], m[3]]],
    [/^م(.)ا(.)اة$/, 'mf', (m) => [m[1], m[2], 'و']],
    [/^م(.)ا(.)(.)ة$/, 'mf', (m) => [m[1], m[2], m[3]]],
  ];
  const ordered = [...rules, ...(startsHamza ? [...ifRules, ...ftRules] : [...ftRules, ...ifRules]), ...rest];
  for (const [re, bab, fn] of ordered) {
    const m = n.match(re);
    if (m) return { root: fn(m), bab, guessed: false };
  }
  // mujarrad heuristic
  let s = n.replace(/ة$/, '');
  if (s.length > 3 && s.endsWith('ان')) s = s.slice(0, -2);
  if (s.length === 4 && s[0] === 'م') s = s.slice(1);
  if (s.length === 4 && s.endsWith('اء')) return { root: [s[0], s[1], 'و'], bab: null, guessed: true };
  const arr = [...s];
  for (const ch of ['ا', 'و', 'ي']) {
    for (let i = arr.length - 1; i > 0 && arr.length > 3; i--) if (arr[i] === ch) arr.splice(i, 1);
  }
  if (arr.length === 2) arr.push(arr[1]);
  return { root: arr.slice(0, 3), bab: null, guessed: true, rubai: arr.length > 3 };
}

export {  BABS, BAB_ORDER, SIGHA, ISM_LABELS, GARDAAN_TYPES, gardaan, sarfSagheer, rootKind, normalize, normRoot, detectMasdar, stripHarakat, masdarOf, rootInfo  };
