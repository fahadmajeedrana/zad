# 10 · Migration checklist

Use this as the definition of done for the rebuild.

## A. Things to decide before starting

- [ ] **Stable ids.** Today the flashcard "known" set stores list positions (`DATA` index for masadir, `'w'+index` for words). Adopt content ids:
  - masdar: `${root}:${bab}` (unique once the verb-merge rule has run)
  - word: `${book}:${hash(arabic+urdu)}`
  - topic: `${sectionKey}:${slug or position}`
  - hadith: `${part}:${n}`
- [ ] **Migrate existing progress.** Write a one-off migration that reads `sm:known`, maps each position to its new id using the current data order, writes the new key and leaves the old one. The current data order is the order in `current-app/dist/data/core.json`, with verb-derived masadir appended after the 305 own entries in VERBS order.
- [ ] **Storage prefix.** Keep `sm:` (legacy from "Safwatul Masadir"), or migrate to a new prefix while still reading the old one.
- [ ] **Routing.** Keep hash routing, or use path routes with a static fallback (doc 03).
- [ ] **Font.** Self-host Amiri and precache it (doc 08).
- [ ] **Content sources.** Move them from `src/*.js` to plain text or TSV (doc 09).

## B. Parity checklist

**Chrome**
- [ ] Header with brand, home link, install button (only when prompted) and theme toggle; theme persists.
- [ ] Dock with 6 tabs and the active state; hash routes; any route change closes the sheet and scrolls to the top.
- [ ] Toast; RTL throughout; Amiri everywhere; dark mode matches the tokens.

**Home**
- [ ] Subjects come from config; counts appear without loading lazy data; soon rows and badges.

**Masadir**
- [ ] 380 entries (305 own plus 75 derived from verbs).
- [ ] Group and bab filters work together (optgroups hide; the bab resets when it doesn't fit the group).
- [ ] Search by masdar, root (2 or more letters, ا≡و) or Urdu meaning.
- [ ] Hide-meaning persists; known ✓ shows on cards.
- [ ] The empty state sends the query to the Maker.

**Conjugation panel**
- [ ] The bab list is limited to the root's abwab (lexicon plus own list, using variants); the card's own bab is kept; disabled when there is only one.
- [ ] 10 types plus "all"; the type persists.
- [ ] Bab card with collapsible details; the open state persists.
- [ ] The صرفِ صغیر line follows the لازم rule.
- [ ] Tables are grouped (غائب/حاضر/متکلم, مذکر/مؤنث), with speak-row, speak-all and copy.
- [ ] Meaning resolution follows the order in doc 02; the hint is shown when there's no meaning.
- [ ] Warnings for four-letter and guessed roots; the weak-root note.
- [ ] The sheet locks scroll, closes with Escape or the backdrop, and returns focus.

**Maker**
- [ ] Exact-match path; detection path; مجرد bab chosen from our list, then the lexicon; the "bab not in lexicon" message.
- [ ] Editable root boxes with letter normalisation and auto-advance; the bab list recomputes.
- [ ] Example chips; prefilled with اِسْتِغْفَار on load.

**Reference books** (×4)
- [ ] Section select with "all" last; topic select (with short prefixes when "all" is chosen); open and close all; the section persists.
- [ ] Loading and error states with retry.
- [ ] Inline Arabic styling rule; search over title and items; matches expanded and highlighted.

**Hadith**
- [ ] Part and bab selects with group dividers and counts; the part persists.
- [ ] The glossary opens automatically when the match is in it; highlighting.
- [ ] Hide translation persists; tap reveals.

**Vocabulary**
- [ ] Table mode: lessons in book order, dates, conditional columns (امر, plural, count), linked rows.
- [ ] Cards mode: words and verbs, topic filter by kind, link badges, verbs without a bab show the toast.
- [ ] Book filter, mode and hide toggle persist.

**Study**
- [ ] Source, filter, mode and front settings rebuild and shuffle the deck.
- [ ] 3D flip on tap, button or Space; prev/next by button, arrow keys (RTL) or swipe over 50px.
- [ ] Known toggle persists; speak; the گردان button opens the sheet (masadir only); shuffle with a toast; empty deck message.

**Speech**
- [ ] Arabic voice selection, rate 0.8, cancels the previous utterance, playing state, toasts for no voice or no support.

**PWA**
- [ ] Works fully offline after the first visit (test in airplane mode, opening every screen).
- [ ] Data URLs are versioned by content; the old cache is removed on update.
- [ ] Manifest and icons (maskable, apple-touch); the install prompt button.

## C. Acceptance tests (automatable)

1. **Engine:** every case in `test-vectors/sarf-engine.json` matches exactly.
2. **Data:** every runtime file validates against `schemas/`.
3. **Counts:** Home shows 305 مصادر, 216 / 583 / 43 / 174 / 34 عنوانات or احادیث, and 1505 الفاظ.
4. **Search examples:**
   - masadir `نصر` → includes نَصْرٌ
   - masadir root `ق و ل` (with spaces) → includes قَوْلٌ
   - masadir Urdu `لکھنا` → كِتَابَةٌ
   - tafsir `عثمانی` → 2 or more topics
   - hadith `نیت` → includes h1 #1
5. **Maker:**
   - اِسْتِغْفَار gives استفعال, root غ ف ر.
   - قِرَاءَة is an exact list match: root ق ر ء, bab فَتَحَ. The engine's `detectMasdar` alone would return قرو, so the exact-match path matters.
   - سُؤَال (not in the list) gives root س ء ل, with the مجرد bab taken from the lexicon (فَتَحَ).
6. **Linking:** 25 vocabulary words (all books) exactly equal a masdar and show `گردان ›`, e.g. لِقَاءٌ, جَزَاءٌ, حَمْدٌ. Phrases never do.
7. **Persistence:** reload restores every key in the doc 02 table.
8. **Offline:** the second load works with the network disabled; all 10 routes render.

Screenshots in `reference/screenshots/` are the visual baseline (phone 420px and desktop 1280px).

## D. Known quirks in the current code (fix or keep deliberately)

| Quirk | Where | Suggestion |
|---|---|---|
| Two stacked theme blocks in the CSS; only the second is live | `app.html` CSS | Port only the live values (the tokens) |
| `known` uses list positions | study | Stable ids plus a migration (section A) |
| Topic numbers are positions | reference books | Fine for display; don't use them as ids |
| Content tables are pipe-delimited strings inside JSON | core.json | Convert to arrays of objects at build time |
| Vocabulary word click builds a sheet payload with a redundant ternary (`… ? w.g.m : w.g.m`) | vocab handler | Simplify: open `w.g` |
| `LESSON_DATES` value for سبق 6 says 15 نومبر, between the 17th and 19th | vocab.js | **Content check with the teacher** (probably 18 نومبر) |
| The lexicon's لازم/متعدی markers (`.l`/`.m`) are unused | ROOTS_RAW | Could drive the passive part of صرفِ صغیر per root |
| The مجرد detection heuristic guesses wrong for some hamza roots (قراءة→قرو) | engine | Keep the editable root; optionally add a lexicon-aware retry |
| تفعیل masdar of a root ending in hamza (e.g. تَقْرِئَة) isn't detected; it falls through to the مجرد guess | engine `detectMasdar` | Add a `ت..ئة` rule, plus a vector |
| Google Fonts dependency | head | Self-host |
| Absolute paths in the original build scripts | tools | Already relative in this pack |
| `dockTheme` styles in the CSS target a dock button that no longer exists (the theme button moved to the header) | CSS | Drop |
