# 04 · Data model

All runtime data is in `current-app/dist/data/*.json`. JSON Schemas are in `schemas/`, and every current file validates against them. All text is UTF-8 and NFC. Arabic carries harakat. Hamza in roots is always written `ء`.

## Bab codes (used everywhere)

| Code | Bab | Group | Notes |
|---|---|---|---|
| `n` | نَصَرَ يَنْصُرُ | مجرد | |
| `d` | ضَرَبَ يَضْرِبُ | مجرد | |
| `s` | سَمِعَ يَسْمَعُ | مجرد | |
| `f` | فَتَحَ يَفْتَحُ | مجرد | |
| `k` | كَرُمَ يَكْرُمُ | مجرد | treated as لازم (no passive part in صرفِ صغیر) |
| `h` | حَسِبَ يَحْسِبُ | مجرد | |
| `if` | إِفْعَال | مزید | |
| `tf` | تَفْعِيل | مزید | |
| `mf` | مُفَاعَلَة | مزید | |
| `ft` | اِفْتِعَال | مزید | |
| `nf` | اِنْفِعَال | مزید | لازم |
| `tfl` | تَفَعُّل | مزید | |
| `tfa` | تَفَاعُل | مزید | |
| `st` | اِسْتِفْعَال | مزید | |
| `fl` | اِفْعِلَال | مزید | لازم |
| `fy` | اِفْعِيعَال | مزید | لازم |

Display order (`BAB_ORDER`): `n d s f k h if tf mf ft nf tfl tfa st fl fy`.

Book codes for vocabulary: `q1` قصص النبیین 1 · `s1` `s2` کتاب الصرف 1, 2 · `n1` `n2` کتاب النحو 1, 2. The display order is the same as listed.

---

## core.json (loaded at start)

An object with six fields. Five are **line-oriented text tables**: split on `\n`, trim, drop empty lines, then split each line on `|`. A typed rebuild may convert these to arrays of objects at build time. The schemas describe today's format.

### `MASADIR_RAW`: `masdar|root|bab|urdu`
```
نَصْرٌ|نصر|n|مدد کرنا
```
- `root`: 3 letters, no separators. Hamza is `ء`; weak letters are as in the dictionary (`قول`, `رمي`).

Parsed record: `{ id: index, m, root: [r1,r2,r3], b, u, nm: normalize(m), nr: rootString }`.

### `VERBS_RAW`: `book|section|madi|mudari|amr|masdar|root|urdu|quranCount?|bab?`
```
s1|باب ضرب|ظَلَمَ|يَظْلِمُ|اِظْلِمْ|ظُلْمًا|ظلم|ظلم کرنا|266|d
```
- `amr` may be empty. `mudari` and `masdar` may hold alternatives separated by `/`; the first is the main one.
- `bab` empty means there's no conjugation (a four-letter or irregular verb).
- `section` is the lesson or topic title.

Parsed record: `{ i, bk, sec, madi, mud, amr, ms, root[], nr, u, c: number|null, b, n: normalize(madi+' '+mud+' '+ms)+' '+root }`.

**Merge rule:** for each verb with a bab and a 3-letter root, where no masdar with the same `root+bab` exists yet, a masdar entry is added to the list:
- `m = toNom(first masdar alternative)`, which turns the accusative ending into nominative (doc 06)
- `u = verb.u`
- `src = verb.bk` (the source book)

These appended entries are shown in the masadir screen, but are not counted in the "305 مصادر" pill on Home (that pill counts entries without `src`).

### `VOCAB_RAW`: `book|topic|arabic|urdu|quranCount?`
```
s1|اشارہ، موصولہ، نافیہ|هٰذَا|یہ [مذکر]|
q1|سبق 4 · إِبْرَاهِيمُ يَكْسِرُ الْأَصْنَامَ|صَنَمٌ ج: أَصْنَامٌ|بت|
```
- `arabic` may contain ` ج: ` followed by the plural, and `[…]` notes.

Parsed record: `{ id: 'w'+index, bk, t, a, u, c, na: normalize(a), g?: linkedMasdar }`.

**Linking a word to a conjugation (`g`):** only when the whole `arabic` field is a single token (no space, `:` or `[`), and `vnorm(word) === vnorm(masdar)` for some masdar. `vnorm` keeps the vowels but removes the article, tanween, final short vowel, sukun and tatweel, and unifies hamza seats and ى (doc 06). This is deliberately strict, so words are only linked to their real masdar.

### `ROOTS_RAW`: `root:bab[.l|.m],…`  (Arramooz, GPL; see doc 11)
```
ءبد:n.l,d.l,s.l,tfl
```
- These are the abwab the root occurs in. The suffix `.l` means لازم and `.m` means متعدی; it is present only when known. **The current app ignores the suffix.**
- Parsed: `LEX: Map<root, bab[]>`.

### `MEANINGS_RAW`: `root|bab|urdu`
- Urdu meanings for **other** abwab of roots in the list. Parsed: `MEAN: Map<root+'|'+bab, urdu>`.

### `LESSON_DATES`: `{ lessonTitle: urduDateString }`
- Class dates shown beside قصص النبیین lesson headers.

### Derived indexes and lookups

| Name | Definition |
|---|---|
| `BY_ROOT` | `Map<root, Map<bab, masdarRecord>>`; the first masdar per root+bab wins |
| `byNorm` | `Map<normalize(m) without ٌ ٍ, masdarRecord>`; exact match used by the Maker |
| `byVowelled` | `Map<vnorm(m), masdarRecord>`; used for linking vocabulary words |
| `rootKey(R)` | `R.join('')`, with أإؤئآ→ء and ى→ي |
| variants(k) | `[k, k with ا→و, k with a final و/ا→ي, k with a final ي→و]` |
| `allowedFor(R)` | the union over variants of `LEX.get(v)` and the keys of `BY_ROOT.get(v)`, in `BAB_ORDER`. An empty result means "unknown root, allow all". |
| `meaningFor(R, b)` | for each variant: `MEAN.get(v+'|'+b)`, otherwise `BY_ROOT.get(v)?.get(b)?.u`. If nothing matches, `null`. |
| `entriesFor(nr)` | `BY_ROOT.get(nr)` or an empty map. Passed to the conjugation panel, so changing the bab can show another masdar from our own list. |

---

## Reference-book files: guide.json, fiqh.json, uhadith.json, tafsir.json

Schema: `schemas/ref-book.schema.json`.

```jsonc
[ { "k": "f1b1",                                   // stable section key
    "n": "حصہ اول · باب اول: طہارت کے احکام و مسائل",  // display name
    "x": [ { "t": "پیش لفظ: علم الفقہ کا دائرہ کار",    // topic title
             "p": "15",                             // page(s); may be "29–30" or ""
             "i": [ [0, "item text"],               // [level, text]
                    [1, "sub item"],                // level 1 = indented
                    [0, "numbered item", 3] ] } ] } ]  // optional list number
```

| File | Section keys | Sections | Topics |
|---|---|---|---|
| guide | s1 s2 s3 n1 n2 n3 | 6 books | 216 |
| fiqh | f1b1…f1b5, f2b1…f2b4 | 9 ابواب across 2 parts | 174 |
| uhadith | uhb1…uhb4 | 4 | 43 |
| tafsir | utb1…utb4 | 4 | 34 |

Derived at init:
- `topic.n` = position in its section, starting at 1. It is used in the topic select (`k:n`) and as the number badge.
- `topic.s` = `gnorm(title + ' ' + all item texts)`, the search key.

Topic positions are **not stable ids**. See doc 10.

## hadith.json

Schema: `schemas/hadith.schema.json`.

```jsonc
[ { "k": "h1", "n": "کتاب الحدیث · حصہ اول",
    "b": [ { "t": "بَابُ الْإِيْمَانِ",                // باب title; optional " — Urdu subtitle"
             "k": "كِتَابُ الْعَقَائِدِ",              // کتاب group; may be ""; optional " — "
             "h": [ { "n": 1,                          // number within the part
                      "a": "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ.",
                      "s": "صحیح البخاری: رقم الحدیث 1",
                      "w": [["إِنَّمَا","بے شک"], …],    // glossary; may be []
                      "u": "بے شک اعمال کا دارو مدار…" } ] } ] } ]
```

- **Bab select labels:** the text after the last ` — ` in `t`. **Group dividers:** the text after the last ` — ` in `k`, emitted whenever `k` changes.
- **Card header subtitle:** `[last part of k, the part of t after ' — ']`, joined with ` · `.
- Derived at init: `bab.i` (position) and `hadith.s2 = gnorm(a+' '+u+' '+s+' '+all glossary words and meanings)`.
- A stable id candidate: `part:n`, e.g. `h1:1`. The numbers are unique within a part.

## Build-time counts (`DATA_META`)

These are embedded into the page so that Home can show counts without loading the lazy files:
`{ guide: 216, hadith: 583, fiqh: 174, uhadith: 43, tafsir: 34 }`. Compute them at build time in the rebuild too.
