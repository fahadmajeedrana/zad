// One-off: import content and assets from the handoff pack into this repo.
// Usage: node scripts/one-off/migrate-from-handoff.mjs <path-to-zad-handoff>
//
// - Turns the src/*.js template-string sources into plain text files under content/core/
//   (same line formats as docs/handoff/04-data-model.md), so no JavaScript has to run to read content.
// - Copies the markdown / txt content, brand icons, schemas, test vectors and handoff docs.
// Safe to re-run; it overwrites what it wrote before.
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(process.argv[2] || '../zad-handoff');
const DST = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../..');
const app = (p) => path.join(SRC, 'current-app', p);
const out = (p) => { const f = path.join(DST, p); fs.mkdirSync(path.dirname(f), { recursive: true }); return f; };
const copy = (from, to) => fs.cpSync(from, out(to), { recursive: true });

// Evaluate a legacy data source and return the named constants.
const evalSrc = (file, names) => new Function(fs.readFileSync(app('src/' + file), 'utf8') + `;return {${names}}`)();
const { MASADIR_RAW } = evalSrc('data.js', 'MASADIR_RAW');
const { ROOTS_RAW } = evalSrc('roots.js', 'ROOTS_RAW');
const { MEANINGS_RAW } = evalSrc('meanings.js', 'MEANINGS_RAW');
const { VOCAB_RAW, VERBS_RAW, LESSON_DATES } = evalSrc('vocab.js', 'VOCAB_RAW,VERBS_RAW,LESSON_DATES');

const lines = (raw) => raw.split('\n').filter((l) => l.trim());
const writeTable = (file, header, raw) => fs.writeFileSync(out(file), header.map((h) => '# ' + h).join('\n') + '\n' + lines(raw).join('\n') + '\n', 'utf8');

writeTable('content/core/masadir.txt', ['صفوۃ المصادر', 'masdar|root|bab|urdu   (root: 3 letters, hamza written ء; bab codes in docs/handoff/04-data-model.md)'], MASADIR_RAW);
writeTable('content/core/verbs.txt', ['Verb vocabulary', 'book|section|madi|mudari|amr|masdar|root|urdu|quranCount|bab   (amr may be empty; alternatives separated by /; empty bab = no conjugation)'], VERBS_RAW);
writeTable('content/core/vocab.txt', ['Word vocabulary', 'book|topic|arabic|urdu|quranCount   (arabic may contain " ج: " plural and [notes])'], VOCAB_RAW);
writeTable('content/core/meanings.txt', ['Urdu meanings for other abwab of roots in the masadir list', 'root|bab|urdu'], MEANINGS_RAW);
writeTable('content/core/roots.txt', ['Root → abwab index, derived from Arramooz (GPL) — https://github.com/linuxscout/arramooz', 'root:bab[.l|.m],…   (.l = لازم, .m = متعدی)'], ROOTS_RAW);
fs.writeFileSync(out('content/core/lesson-dates.json'), JSON.stringify(LESSON_DATES, null, 2) + '\n', 'utf8');

for (const d of ['qawaid', 'fiqh', 'usool', 'hadith']) copy(app('content/' + d), 'content/' + d);

// Brand + PWA icons
for (const f of ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png']) copy(path.join(SRC, 'brand', f), 'public/' + f);
copy(path.join(SRC, 'brand'), 'brand');
copy(app('dist/NOTICE.md'), 'public/NOTICE.md');

// Spec material
copy(path.join(SRC, 'docs'), 'docs/handoff');
copy(path.join(SRC, 'test-vectors'), 'test-vectors');
copy(path.join(SRC, 'schemas'), 'schemas');
copy(path.join(SRC, 'reference/screenshots'), 'docs/handoff/screenshots');

console.log('migrated from', SRC, 'to', DST);
