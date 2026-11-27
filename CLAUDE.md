# CLAUDE.md — زادُ الطالب (Zad-ut-Talib) v2

An offline-first PWA for madrasa students on the Dars-e-Nizami course books. It is Urdu-first, right-to-left, with Arabic throughout. It's live at https://fahadmajeedrana.github.io/zad/ (repo `fahadmajeedrana/zad`).

It rebuilds a single-file v1 app with React + TypeScript + Vite. The original spec is in `docs/handoff/` (11 docs plus reference screenshots). Treat it as the product contract.

**Read first in a new session:** `docs/STATUS.md` (where things stand, open decisions, next steps), then `docs/ARCHITECTURE.md`.

## Commands

```bash
npm run dev            # content build + Vite dev server (no service worker in dev)
npm test               # content build + vitest (engine vectors, acceptance, schemas, search index, Roman Urdu)
npm run build          # content + tsc + vite build + 404.html (BASE_PATH defaults to /zad/)
npm run preview        # serve dist/ — use for offline/PWA checks
npm run embeddings     # recompute semantic-search vectors after content changes (~2 min, downloads model to .cache/)
npm run eval:search -- e5-small --index [--roman|--heldout] [--translit] [--noterms]   # search quality numbers
```

Notes for running these here:
- The shell is Git Bash on Windows.
- `vite preview` refuses to start while another preview of this project is running. Stop the old one, or pass `--bypass-lock`.
- The local Playwright MCP can only save screenshots under `C:\Projects\Personal\zad-handoff`. Delete them afterwards.

## Layout

```
content/              SOURCE OF TRUTH: human-edited text (core/*.txt, qawaid|fiqh|usool/*.md, hadith/*.txt)
content/generated/    semantic.json — committed, produced by `npm run embeddings`
scripts/              build-content.mjs (→ public/data + src/generated), build-embeddings.mjs, eval-search.mjs,
                      postbuild.mjs (404.html), lib/chunks.mjs (chunking, models), one-off/ (v1 → v2 migration)
src/core/             pure logic: sarf/engine.js (+ .d.ts), sarf/babinfo.ts, text.ts (normalisers, inline Arabic,
                      highlight), roman.js (+ .d.ts; Roman Urdu → Urdu)
src/data/             loader (hashed URLs, memoised), types, core.ts (parsing, indexes, lexicon, search matchers,
                      Maker resolution, known-set migration)
src/features/         home, masadir, gardaan (conjugation panel), maker, refbook (4 screens, one component),
                      hadith, vocab, study, search (semantic search + worker)
src/app/              shell: App (screens stay mounted once visited), Header, Dock, Toast, UpdatePrompt, context
src/state/            prefs (localStorage `sm:*`), known (flashcard progress)
src/router.ts         tiny path router; old #hash links redirect; deep links via ?t= / ?b=
tests/                vitest; helpers read the built data files
public/               icons, LICENSE, NOTICE.md, sw-cleanup-legacy.js. public/data/ is GENERATED (gitignored)
docs/                 ARCHITECTURE.md, STATUS.md, handoff/ (original spec)
```

## Rules: don't break these

1. **The sarf engine is a verbatim port.** `src/core/sarf/engine.js` is a byte copy of v1 with only `export` added. Don't refactor or "clean up" it. `test-vectors/sarf-engine.json` (33 roots × 10 tables) is the contract. Change rules only on purpose, add vectors, and review the diff by hand.
2. **Edit content in `content/`, never in `public/data/` or `src/generated/`.** Those are generated, gitignored and wiped on each build. Data files are named `<key>.<sha10>.json`, so the service worker picks up changes automatically. Don't add unhashed data URLs.
3. **After any content change, run `npm run embeddings` and commit `content/generated/semantic.json`.** `npm run content` prints "⚠ semantic search is out of date" when it's stale. The model in `semantic.json` must match the one the browser worker loads; both come from the file.
4. **The app adds no outside material.** Summaries keep each book's own wording, and hadith entries are complete. Any AI-answer feature must answer only from retrieved passages, cite book/باب/page, say when nothing was found, and point students to their teacher for rulings.
5. **Saved settings must stay compatible.** Settings live in `localStorage` under `sm:<key>` (keys listed in handoff doc 02).
   - Flashcard progress is stored under `sm:knownIds` with stable ids: masdar `root:bab`, word `book:fnv-hash(arabic|urdu)[~n]`. The legacy `sm:known` (list positions) is migrated once.
   - Don't change an id scheme without writing a migration.
   - The site address must stay `fahadmajeedrana.github.io/zad/`. Changing it loses users' saved data and installed apps.
6. **Hadith numbers restart in every باب.** Handoff doc 04 is wrong about this. Identify a hadith as `part:babIndex:n`.
7. **The base path is `/zad/`.**
   - Use `import.meta.env.BASE_URL` for URLs; never hard-code `/`.
   - Deep links rely on `dist/404.html`, created by `scripts/postbuild.mjs`.
   - For a root domain, build with `BASE_PATH=/`.
8. **Offline is a hard requirement.** Every screen except the search model download must work offline after one visit; test this with `build` + `preview`.
   - Workbox precaches all `json/js/css/woff2/png/svg`, except the semantic vectors and the worker bundle, which are cached on first use.
   - Amiri is self-hosted through `@fontsource/amiri`. Don't add Google Fonts or other CDNs to the core app.
9. **UI conventions.**
   - Urdu UI copy, RTL, the Amiri font everywhere, Western digits (`380 مصادر`).
   - Use logical CSS properties (`inline-start`/`inline-end`).
   - In dark mode, never put white text on the light-green `--teal`; use `--brand` for filled controls.
10. **Licensing.** The app is GPL-3.0 because the Arramooz root lexicon is GPL. Keep `LICENSE`, `public/NOTICE.md` and the Arramooz credit on the Maker screen. The book texts belong to their authors and publishers, so check permissions before publishing full books more widely.
11. **Never ship secrets in this static site.** That includes API keys and Azure function keys. Anything that needs a key goes behind a server that checks a token (see ARCHITECTURE §3).

## Semantic search and Roman Urdu (branch `semantic-search`)

- **Chunking** is in `scripts/lib/chunks.mjs`. Topics are split into ~600-character pieces prefixed with "section — title". Each hadith is one passage: باب + Urdu translation + Arabic (harakat stripped).
- **Model:** `Xenova/multilingual-e5-small`, q8, with "query: " / "passage: " prefixes. It was picked by measurement (README table). If you change the model, rerun both `embeddings` and `eval:search` and update the README numbers.
- **Roman Urdu:** `src/core/roman.js` (plain JS so Node scripts can import it). Its parts:
  - `FIXED`: grammar words;
  - `TERMS`: subject terms;
  - a spelling-aware edit distance over sound keys;
  - a vocabulary built from the books, with titles weighted ×5.
- **Measuring Roman Urdu changes:**
  - Measure without `TERMS` (`--noterms`).
  - Never tune on the `HELDOUT` set in `scripts/eval-search.mjs`. It exists to catch overfitting.
  - Add new test questions to `Q`/`ROMAN` instead.

## Git

- Commit as `Fahad Rana <31787094+fahadmajeedrana@users.noreply.github.com>`. This is set in the repo's local git config. Never use the global work email in this public repo.
- End commit messages with the Co-Authored-By line the session provides.
- Branches: `v2` holds the rebuild and `semantic-search` builds on it; see `docs/STATUS.md` for what's merged and pushed.
- Don't merge to `main` before GitHub Pages' source is set to "GitHub Actions". Otherwise Pages would publish the raw source tree.
- Line endings: `.gitattributes` forces LF in the repo. The global `core.autocrlf` causes harmless CRLF warnings on Windows.
