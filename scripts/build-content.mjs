// Build the runtime data files from the human-edited content in content/.
//
//   content/core/*.txt, lesson-dates.json  → public/data/core.<hash>.json   (loaded at start-up)
//   content/qawaid/*.md                    → public/data/guide.<hash>.json  (lazy)
//   content/hadith/*.txt                   → public/data/hadith.<hash>.json (lazy)
//   content/fiqh/*.md                      → public/data/fiqh.<hash>.json   (lazy)
//   content/usool/uh.md, uf.md             → public/data/uhadith|tafsir.<hash>.json (lazy)
//
// File names carry a content hash, so every URL is immutable and the service worker
// picks up changes automatically. The URL map and the counts shown on Home go to
// src/generated/data-manifest.json. Any line the parser doesn't understand fails the build.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const C = (p) => path.join(ROOT, 'content', p);
const BABS = ['n', 'd', 's', 'f', 'k', 'h', 'if', 'tf', 'mf', 'ft', 'nf', 'tfl', 'tfa', 'st', 'fl', 'fy'];
const BOOKS = ['q1', 's1', 's2', 'n1', 'n2'];

const errors = [];
const fail = (file, n, msg, line) => errors.push(`${file}:${n}: ${msg}${line ? ` — ${line.slice(0, 70)}` : ''}`);
const read = (p) => fs.readFileSync(p, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');

// ---- line tables (content/core/*.txt): '#' lines are comments, blank lines ignored ----
function table(file, fields, check) {
  const rows = [];
  read(C('core/' + file)).split('\n').forEach((line, i) => {
    if (!line.trim() || line.startsWith('#')) return;
    const f = line.split('|');
    if (f.length !== fields) return fail(file, i + 1, `expected ${fields} fields, got ${f.length}`, line);
    const msg = check && check(f);
    if (msg) return fail(file, i + 1, msg, line);
    rows.push(f);
  });
  return rows;
}
const count = (c) => (c === '' ? null : Number(c));

const masadir = table('masadir.txt', 4, ([m, r, b, u]) =>
  !m || !u ? 'empty masdar or meaning' : [...r].length !== 3 ? 'root must have 3 letters' : !BABS.includes(b) ? `unknown bab "${b}"` : null);
const verbs = table('verbs.txt', 10, ([bk, , madi, mud, , ms, r, u, c, b]) =>
  !BOOKS.includes(bk) ? `unknown book "${bk}"` : !madi || !mud || !ms || !r || !u ? 'missing field' :
  b && !BABS.includes(b) ? `unknown bab "${b}"` : c && !/^\d+$/.test(c) ? 'quran count must be a number' : null)
  .map(([bk, sec, madi, mud, amr, ms, r, u, c, b]) => [bk, sec, madi, mud, amr, ms, r, u, count(c), b]);
const vocab = table('vocab.txt', 5, ([bk, t, a, u, c]) =>
  !BOOKS.includes(bk) ? `unknown book "${bk}"` : !t || !a || !u ? 'missing field' : c && !/^\d+$/.test(c) ? 'quran count must be a number' : null)
  .map(([bk, t, a, u, c]) => [bk, t, a, u, count(c)]);
const meanings = table('meanings.txt', 3, ([, b, u]) => (!BABS.includes(b) ? `unknown bab "${b}"` : !u ? 'empty meaning' : null));
const roots = [];
read(C('core/roots.txt')).split('\n').forEach((line, i) => {
  if (!line.trim() || line.startsWith('#')) return;
  const m = line.match(/^(\S{3}):(\S+)$/);
  if (!m) return fail('roots.txt', i + 1, 'expected root:bab,…', line);
  const bad = m[2].split(',').find((x) => !BABS.includes(x.split('.')[0]));
  if (bad) return fail('roots.txt', i + 1, `unknown bab "${bad}"`, line);
  roots.push([m[1], m[2]]);
});
const lessonDates = JSON.parse(read(C('core/lesson-dates.json')));

// ---- topic-summary markdown (docs/handoff/09-content-pipeline.md) ----
// '# ' starts a section (ignored when oneSection is set), '## ' a topic, '@ص' sets pages,
// '- ' / 'N. ' are items; 2+ leading spaces = level 1.
function parseRef(rel, { key, part = '', oneSection }) {
  const secs = oneSection ? [{ ...oneSection, x: [] }] : [];
  read(C(rel)).split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    if (line.startsWith('# ')) {
      if (!oneSection) secs.push({ k: `${key}b${secs.length + 1}`, n: (part ? `${part} · ` : '') + line.slice(2).trim(), x: [] });
      return;
    }
    const sec = secs[secs.length - 1];
    if (line.startsWith('## ')) {
      if (!sec) return fail(rel, i + 1, 'topic before any "# " section', line);
      sec.x.push({ t: line.slice(3).trim(), p: '', i: [] });
      return;
    }
    const topic = sec && sec.x[sec.x.length - 1];
    if (!topic) return fail(rel, i + 1, 'text before any "## " topic', line);
    if (line.startsWith('@ص')) { topic.p = line.slice(2).trim(); return; }
    const m = line.match(/^( *)(?:- |(\d+)\. )(.*)$/);
    if (!m) return fail(rel, i + 1, 'unparsed line (expected "- item" or "1. item")', line);
    const item = [m[1].length >= 2 ? 1 : 0, m[3].trim()];
    if (m[2]) item.push(Number(m[2]));
    topic.i.push(item);
  });
  return secs;
}

// ---- hadith text: '## ' کتاب group, '# ' باب, 'n|arabic|source|w=m~w=m|urdu' ----
function parseHadith(rel, k, n) {
  const babs = [];
  let kitab = '';
  read(C(rel)).split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    if (line.startsWith('## ')) { kitab = line.slice(3).trim(); return; }
    if (line.startsWith('# ')) { babs.push({ t: line.slice(2).trim(), k: kitab, h: [] }); return; }
    const f = line.split('|');
    if (f.length !== 5) return fail(rel, i + 1, `expected 5 fields, got ${f.length}`, line);
    const [num, a, s, w, u] = f;
    if (!babs.length) return fail(rel, i + 1, 'hadith before any "# " باب', line);
    if (!/^\d+$/.test(num)) return fail(rel, i + 1, 'hadith number must be numeric', line);
    if (!u) return fail(rel, i + 1, 'translation is required', line);
    const ws = w ? w.split('~').map((p) => p.split(/=(.*)/s).slice(0, 2)) : [];
    if (ws.some((x) => x.length !== 2 || x[1] === undefined)) return fail(rel, i + 1, 'glossary must be word=meaning~word=meaning', line);
    babs[babs.length - 1].h.push({ n: Number(num), a, s, w: ws, u });
  });
  // Numbering restarts in every باب (not per part, as handoff doc 04 claims), so a hadith is
  // identified by part + باب + number.
  babs.forEach((b) => {
    const seen = new Set();
    b.h.forEach((h) => { if (seen.has(h.n)) fail(rel, 0, `duplicate hadith number ${h.n} in باب ${b.t.slice(0, 30)}`); seen.add(h.n); });
  });
  return { k, n, b: babs };
}

const QAWAID = [['s1', 'کتاب الصرف · حصہ اول', 'sarf1'], ['s2', 'کتاب الصرف · حصہ دوم', 'sarf2'], ['s3', 'کتاب الصرف · حصہ سوم', 'sarf3'],
  ['n1', 'کتاب النحو · حصہ اول', 'nahw1'], ['n2', 'کتاب النحو · حصہ دوم', 'nahw2'], ['n3', 'کتاب النحو · حصہ سوم', 'nahw3']];

const data = {
  core: { masadir, verbs, vocab, roots, meanings, lessonDates },
  guide: QAWAID.flatMap(([k, n, f]) => parseRef(`qawaid/${f}.md`, { oneSection: { k, n } })),
  hadith: [parseHadith('hadith/h1.txt', 'h1', 'کتاب الحدیث · حصہ اول'), parseHadith('hadith/h2.txt', 'h2', 'کتاب الحدیث · حصہ دوم'), parseHadith('hadith/h3.txt', 'h3', 'کتاب الحدیث · حصہ سوم')],
  fiqh: [...parseRef('fiqh/f1.md', { key: 'f1', part: 'حصہ اول' }), ...parseRef('fiqh/f2.md', { key: 'f2', part: 'حصہ دوم' })],
  uhadith: parseRef('usool/uh.md', { key: 'uh' }),
  tafsir: parseRef('usool/uf.md', { key: 'ut' }),
};

if (errors.length) {
  console.error(`content build failed (${errors.length} problem${errors.length > 1 ? 's' : ''}):\n  ` + errors.slice(0, 40).join('\n  '));
  process.exit(1);
}

// ---- write hashed files + manifest ----
const outDir = path.join(ROOT, 'public', 'data');
fs.mkdirSync(outDir, { recursive: true });
const files = {};
const keep = new Set();
for (const [k, v] of Object.entries(data)) {
  const bytes = Buffer.from(JSON.stringify(v), 'utf8');
  const h = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 10);
  const name = `${k}.${h}.json`;
  fs.writeFileSync(path.join(outDir, name), bytes);
  files[k] = `data/${name}`;
  keep.add(name);
}
for (const f of fs.readdirSync(outDir)) if (f.endsWith('.json') && !keep.has(f)) fs.rmSync(path.join(outDir, f));

const topics = (secs) => secs.reduce((n, s) => n + s.x.length, 0);
const meta = {
  guide: topics(data.guide),
  hadith: data.hadith.reduce((n, p) => n + p.b.reduce((m, b) => m + b.h.length, 0), 0),
  fiqh: topics(data.fiqh),
  uhadith: topics(data.uhadith),
  tafsir: topics(data.tafsir),
};
const manifestFile = path.join(ROOT, 'src', 'generated', 'data-manifest.json');
fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
const manifest = JSON.stringify({ files, meta }, null, 2) + '\n';
if (!fs.existsSync(manifestFile) || fs.readFileSync(manifestFile, 'utf8') !== manifest) fs.writeFileSync(manifestFile, manifest);

for (const [k, f] of Object.entries(files)) console.log(`${f.padEnd(28)} ${(fs.statSync(path.join(ROOT, 'public', f)).size / 1024).toFixed(0).padStart(5)} KB`);
console.log('counts', JSON.stringify({ masadir: masadir.length, verbs: verbs.length, words: vocab.length, roots: roots.length, ...meta }));
