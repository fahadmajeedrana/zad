# 03 · Architecture

## Current implementation (as built)

There is no framework and no bundler. A Python script assembles one HTML page and a set of JSON files.

```
build.py
 ├─ evaluates src/*.js data files with Node   → data/core.json, guide.json, hadith.json
 ├─ parses content/{fiqh,usool}/*.md          → data/fiqh.json, uhadith.json, tafsir.json
 ├─ hashes each JSON                          → URL map { core: "data/core.json?v=<sha10>", … }
 ├─ inlines engine.js + babinfo.js + URL map + counts into app.html → dist/index.html
 └─ fills sw.template.js with a cache version and precache list → dist/sw.js
```

**Runtime layers inside `index.html`**

| Layer | Where | Notes |
|---|---|---|
| Data loader | first `<script>` | `loadData(key)` gives a cached Promise of the JSON for that key. On failure the cache entry is cleared so a retry works. Also registers the service worker. |
| Sarf engine | `engine.js` (inlined) | Pure functions with no DOM. Exports `gardaan`, `sarfSagheer`, `detectMasdar`, `rootKind`, `normalize`, `normRoot`, `stripHarakat`, `masdarOf`, `rootInfo`, plus the constants `BABS`, `BAB_ORDER`, `SIGHA`, `ISM_LABELS`, `GARDAAN_TYPES`. Works as a CommonJS module too (used for the test vectors). |
| Bab notes | `babinfo.js` (inlined) | `BAB_INFO[bab] = { wazn[3], use, sign, khas[], ex }` |
| App | second `<script>`, an async IIFE | `await loadData('core')`, then parses the raw tables into in-memory indexes. After that come the components, each a set of DOM render functions plus event handlers. |

**State** lives in module-level variables (filters, the deck, the current position) plus `localStorage` (see doc 02). Rendering is "rebuild innerHTML" on every change. There is no virtual DOM and no list virtualisation; the largest list is about 600 hadith cards and performs fine.

**Lazy screens:** `withData(key, listSelector, render)` handles the first open. It shows a loading message, loads the JSON, runs the screen's `init` once (building its indexes and filling its selects), then renders. Later opens render immediately.

**Events:** delegated clicks, for example one listener on each grid, and one capture-phase listener on the document for every `[data-say]` speaker button.

## Neutral module breakdown for the rebuild

Pick whatever stack you like. Keep these boundaries, because each one can be tested on its own.

```
core/            (pure; no UI, no I/O)
  sarf-engine    port of engine.js. Must pass test-vectors/sarf-engine.json exactly.
  text           normalize, normRoot, stripHarakat, gnorm, vnorm, toNom, accus, sayText,
                 inline-Arabic segmenter, highlighter (doc 06)
  lexicon        allowedFor(root), meaningFor(root, bab), entriesFor(root)  (doc 04)
data/
  loader         fetch versioned JSON; memoise; retry after failure
  parsers        core.json raw tables → typed records (Masdar, Verb, Word, LexEntry, Meaning)
  indexes        byRoot, byNorm, byVowelled, lessonOrder, search keys
state/
  prefs          persisted keys (doc 02 table); one place to read and write them
  known-set      flashcard progress (move to stable ids, doc 10)
features/
  home           subjects → sections registry (data-driven, below)
  masadir        list, filters, search
  gardaan        conjugation panel; used both inline (maker) and as a sheet
  maker          masdar input → detection → panel
  reference-book one component for qawaid / fiqh / uhadith / tafsir (config table in doc 02)
  hadith         list, filters, glossary, hide-translation
  vocab          table and card modes
  study          deck, flip, known, keyboard and swipe
platform/
  speech         Arabic voice picking, play/stop state, fallbacks
  pwa            service worker, install prompt
  theme          light/dark
ui/              design-system components (doc 07)
```

**The subject registry should stay data-driven.** In the current app, adding a subject or section means one entry in `SUBJECTS`:

```
{ k, n, d, icon, soon?, secs: [ { v: routeId, n, d, icon, count?: () => string, soon? } ] }
```

Routes come from the `v` values. A section with `soon: true` and no `v` renders as a placeholder row. Keep this config-driven, so that adding a book means adding content and one entry.

**The reference-book config** (one per screen): `{ dataKey, idPrefix, storeKey, defaultSection, allLabel, shortLabel(section), title, subtitle, searchPlaceholder }`.

## Routing

- Today: hash routes (`#masadir` and so on), so it works on GitHub Pages without rewrites. Keep hash routing, or add an SPA fallback (`404.html` → `index.html`) if you move to path routes.
- Any change of route must close the sheet and scroll to the top.
- Deep-linking to a single masdar, topic or hadith doesn't exist today, but is a natural extension (e.g. `#masadir/نصر/n`, `#fiqh/f1b2/7`). If you add it, base it on stable ids (doc 10), not list positions.

## Performance budget (current)

| Asset | Size |
|---|---|
| index.html (all code, CSS and icons) | ~135 KB |
| data/core.json (needed at start) | ~225 KB |
| guide / hadith / fiqh / uhadith / tafsir | 450 / 710 / 630 / 115 / 155 KB (lazy) |

On first load, only `index.html`, `core.json` and the Amiri font are fetched. The parsing of `core.json` at start-up (5.3k lexicon lines and a few thousand table rows) is cheap; keep it off the critical render path if your stack makes that easy.
