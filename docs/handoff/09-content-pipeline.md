# 09 · Content pipeline

Content is edited as plain text, then a build step turns it into the runtime JSON. Keep this split in the rebuild: editors work on text files, and the app consumes generated JSON. You can swap the scripts for any language. The **formats below are the contract**.

## Source of truth per data file

| Runtime file | Canonical source (in `current-app/`) | Converter |
|---|---|---|
| `core.json → MASADIR_RAW` | `src/data.js` (template string, one line per masdar) | build.py evaluates it with Node |
| `core.json → ROOTS_RAW` | `src/roots.js` (from Arramooz; see doc 11) | " |
| `core.json → MEANINGS_RAW` | `src/meanings.js` | " |
| `core.json → VOCAB_RAW, VERBS_RAW, LESSON_DATES` | `src/vocab.js` | " |
| `guide.json` | `content/qawaid/{sarf1..3,nahw1..3}.md` | `tools/guide2js.py` → `src/guide.js` → build.py |
| `hadith.json` | `content/hadith/h1.txt h2.txt h3.txt` | `tools/hadith2js.py` → `src/hadith.js` → build.py |
| `fiqh.json` | `content/fiqh/f1.md f2.md` | build.py `parse_ref` |
| `uhadith.json` | `content/usool/uh.md` | " |
| `tafsir.json` | `content/usool/uf.md` | " |
| bab notes | `src/babinfo.js` | inlined into the page |

`content/vocab/*.tsv` are the **original spreadsheet exports** that `vocab.js` was built from. They don't include قصص النبیین. `vocab.js` is canonical; the TSVs are kept for reference only.

**Recommendation for the rebuild:** move the `.js` template-string sources to plain text or TSV files (same line formats), so that no JavaScript has to be run to read content.

## Formats

### Topic-summary markdown (qawaid, fiqh, usool)

```markdown
# Section title                ← new section (باب / book part). In qawaid files, '# ' lines are ignored (one file = one book).
## Topic title                 ← new topic
@ص 29–30                       ← page(s) for the current topic (optional)
- item                         ← level 0 bullet
  - sub item                   ← 2+ leading spaces = level 1
1. numbered item               ← keeps its number
  2. numbered sub item
```

- Every non-blank line must be one of these forms, otherwise the build fails with `unparsed <file>: <line>`. That's deliberate: it catches stray paragraphs.
- Section keys are generated as `<prefix>b<n>`: `f1b1`, `f2b3`, `uhb2`, `utb4`. Qawaid uses fixed keys `s1…n3`.
- Fiqh section names are prefixed with the part (`حصہ اول · …`). Single-part books have no prefix.

### Hadith text

```
## كِتَابُ الْعَقَائِدِ                       ← کتاب group (applies to following ابواب)
# بَابُ الْإِيْمَانِ                          ← باب; may include " — Urdu subtitle"
n|arabic|source|word=meaning~word=meaning|urdu translation
```

The glossary field may be empty. The translation is required (the build asserts it).

### Line tables in `src/*.js`

The formats are in doc 04.

## Build

```bash
cd current-app
python3 tools/guide2js.py      # qawaid markdown → src/guide.js
python3 tools/hadith2js.py     # hadith txt     → src/hadith.js
python3 tools/build.py         # everything     → dist/ (index.html, sw.js, data/*.json)
```

- Requires Python 3.9+ and Node 18+. Paths are relative to `current-app/`.
- Verified: in this pack, the three steps reproduce `dist/` **byte for byte**.
- The output lists file sizes, the cache version and the counts.

## Adding a new topic-summary book

1. Transcribe it into `content/<area>/<file>.md` in the format above. Skip مشق pages and keep the book's own wording.
2. Add a parse line in the build (e.g. `data['usoolfiqh'] = parse_ref(..., 'uq', '')`) and add its count to the metadata.
3. Add a reference-book screen config (doc 03) and a section entry under its subject in the subject registry. Swap the "soon" placeholder for it if there is one.
4. Rebuild. The service-worker cache version changes automatically.

## Regenerating engine test vectors

```bash
node current-app/tools/gen_test_vectors.js test-vectors/sarf-engine.json
```

Do this only after a **deliberate** change to the engine rules. Review the diff by hand before committing it.

## Brand assets

`tools/brand.py` regenerates `brand/` (SVG and PNG). It needs `uharfbuzz`, `fonttools` and Playwright, plus the Amiri TTFs (`AMIRI_DIR`) and the original kit's icon folder (`BRAND_KIT_ICONS`). You only need it to change the logo; the outputs are already in the pack.
