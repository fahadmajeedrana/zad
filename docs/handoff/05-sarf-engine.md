# 05 · Sarf (conjugation) engine

Source: `current-app/src/engine.js` (about 440 lines, pure, no dependencies).
Expected outputs: `test-vectors/sarf-engine.json`.

**Port it line for line, then test it.** A port is correct when it reproduces every vector byte for byte, harakat included. The rules are subtle, and a "cleaner" rewrite will drift. Treat the vectors as the contract and add new vectors whenever a rule changes.

## Public API

| Function | Input | Output |
|---|---|---|
| `gardaan(type, bab, R)` | type in `GARDAAN_TYPES`, bab code, `R` = 3 letters | `string[14]` for verb tables, `string[6]` for ism tables |
| `sarfSagheer(bab, R)` | | `{ madi, mudari, madiP, mudariP, faail, mafool, amr, nahi, masdar }` (masdar is `null` for مجرد, because those masadir are سماعی) |
| `masdarOf(bab, R)` | | the قیاسی masdar for مزید abwab, otherwise `null` |
| `detectMasdar(input)` | any typed masdar | `{ root: [3], bab: code \| null, guessed: bool, rubai?: bool }` |
| `rootKind(R)` | | `صحیح`, or a comma-joined list of `مضاعف، مثال، اجوف، ناقص، مہموز` |
| `rootInfo(R)` | | `{ R, mithal, mudaaf, naqis, ajwaf, mahmuz }` |
| `normalize(s)`, `normRoot(s)`, `stripHarakat(s)` | | see doc 06 |

**Constants**
- `BABS`: per bab `{ ar, ur, group, mv?, uv?, lazim? }`. `mv` and `uv` are the madi and mudari ʿayn vowels for مجرد.
- `BAB_ORDER`.
- `SIGHA[14]`: `[urduLabel, arabicPronoun]`.
- `ISM_LABELS[6]`.
- `GARDAAN_TYPES[10]`: `{ k, ur }` with keys `madiA madiP mudA mudP amrA amrP nahiA nahiP faail mafool`.

**Row order** (14 verb forms): واحد/تثنیہ/جمع مذکر غائب, then the same for مؤنث غائب, مذکر حاضر and مؤنث حاضر, then واحد متکلم and جمع متکلم. The UI groups them as غائب (0–5), حاضر (6–11) and متکلم (12–13).

**Ism order** (6 forms): واحد, تثنیہ and جمع مذکر, then the same for مؤنث.

## How it works

1. **Tokens.** A word is built as a list of tokens `{ c: letter, v: vowelMark, r: radicalIndex 0–3, sh: shadda, long: isLongVowelLetter }`. Radical tokens carry `r` = 1, 2 or 3, so the later rules can find the ʿayn and lām.
2. **Stems.** `stems(bab, R)` returns the madi/mudari stems, active and passive, plus the mudari prefix vowels `pvA`/`pvP`.
   - مجرد stems use `mv`/`uv`.
   - Each مزید bab has a hand-written template (e.g. استفعال: `ا ِ س ْ ت َ R1 ْ R2 َ R3`).
   - افتعال runs the ت-assimilation rule `taPair(R1)`: و/ي/ء→تّ; ص ض ظ→ط; ط→طّ; د/ذ→دّ; ز→زد; ث→ثّ.
   - افعلال and افعیعال set `noWeak` (no weak-letter rules for them).
3. **Suffix tables.**
   - `MADI`, `MUD` (indicative) and `JAZM` (jussive, also used for امر and نہی) give the 14 endings.
   - `PFX` gives the mudari prefixes (ي/ت/ء/ن).
   - `ISM` gives the 6 ism endings with tanween.
4. **Root-class rules**, applied in `makeForm` in this order:
   - **ناقص** (final و/ي, unless `noWeak`): the last radical is replaced by a whole-ending table chosen by the vowel on R2 (a/u/i): `naqisMadi`, `NAQIS_MUD`, `NAQIS_JAZM`. In مجرد, a root ending in و uses و and ا in the madi; otherwise ي and ى.
   - **اجوف** (middle و/ي, not ناقص and not مضاعف). Only in the abwab `n d s f k h if ft nf st`. `ajwaf()` builds two variants:
     - *open* (before a vowel ending): the middle radical becomes a long vowel. If the previous letter has sukun, it takes R2's vowel and R2 becomes ا/و/ي; ُ + ِ becomes ِي; after َ it becomes ا.
     - *closed* (before a sukun ending): the long vowel drops. In the مجرد active madi, the first radical takes ُ for abwab n and k, and ِ otherwise.
   - **مضاعف** (R2 = R3, not weak) and the افعلال doubling: when the last two letters are the same and not separated by sukun, they contract into one letter with shadda (`contract`). With a sukun ending, the ending becomes fatha (jussive مُدَّ style).
   - **مثال** (R1 = و). In the active mudari of abwab d, h and f, the و drops (وَعَدَ → يَعِدُ).
5. **Amr** (حاضر forms 6–11 in the active): taken from the jussive with the prefix removed.
   - If the remaining word starts with sukun, a connecting hamza is added: `اُ` if the next vowel is ضمہ, otherwise `اِ`.
   - Bab إفعال always gets `أَ`.
   - The exceptions `ءكل ءخذ ءمر` (مجرد) drop the hamza: كُلْ، خُذْ، مُرْ.
   - Every other amr form, including all passive ones, is `لِ` + jussive.
6. **Nahi**: `لَا ` + jussive, for all 14 forms.
7. **Ism fāʿil / mafʿūl**
   - مجرد: فَاعِل and مَفْعُول. In اجوف, the fāʿil uses ء for R2 (قَائِل) and the mafʿūl uses مَقُول or مَبِيع. In ناقص, the mafʿūl ends مَدْعُوّ or مَرْمِيّ, and the fāʿil uses the shortened ending.
   - مزید: `مُ` + the active mudari stem, with R2's vowel set to ِ for fāʿil and َ for mafʿūl. اجوف and مضاعف are then applied.
8. **Orthography (`ortho`)**, applied to every output string:
   - Hamza seating (`seatHamza`): an initial hamza is أ/إ. A final one is ء after sukun or a long vowel, otherwise it sits on the seat matching the previous vowel. A medial one is ئ if either vowel is i, ؤ if either is u, otherwise أ. `ءا` after a long ا stays bare.
   - Merges: `أَأْ→آ`, `أُؤْ→أُو`, `إِئْ→إِي`, `أَا→آ`.
   - `Xْ X` becomes `Xّ` (assimilation).
   - Mithal spelling: `ِوْ→ِي`, `ُيْ→ُو`, and the redundant sukun after a long vowel is dropped.
   - Shadda is placed before the vowel mark.
9. **Qiyasi masdar** (`masdarOf`): a template per مزید bab, with weak and اجوف variants (e.g. إقامة and استقامة for اجوف; a final ء for ناقص in إفعال, افتعال, انفعال and استفعال; تزكية for ناقص in تفعيل).

## Masdar detection (`detectMasdar`)

1. `normalize(input)`: strip harakat, unify hamza, ى→ي, آ→ءا, remove spaces.
2. Try regex rules in order. If the word starts with ء, the إفعال rules are tried before افتعال; otherwise افتعال first.
   - **استفعال:** `است..اء` (ناقص), `است.ا.ة` (اجوف), `است..ا.`
   - **افعیعال:** `ا(.)(.)ي\2ا(.)`
   - **إفعال:** `[ءا].ا.ة` (اجوف), `[ءا]..اء` (ناقص), `[ءا]ي.ا.` (مثال), `[ءا]..ا.`
   - **افتعال/انفعال:** `ا.ت.اء`, `ا.ت.ا.`, `ان..اء`, `ان..ا.`, assimilated `ا[صضطظ]ط.ا.` and `ا[دذز]د.ا.`, `ات.ا.` (مثال, so R1 = و)
   - **افعلال:** `ا(.)(.)(.)ا\3`
   - **تفعیل:** `ت..ية`, `ت..ي.`; then **تفاعل** `ت.ا..`; then **تفعّل** `ت...`
   - **مفاعلة:** `م.ا.اة`, `م.ا..ة`
3. Otherwise there is no bab (مجرد) and `guessed: true`. The heuristic:
   - Remove a final ة, a final ان (if longer than 3) and a leading م (if 4 letters).
   - `..اء` becomes a root ending in و.
   - Otherwise remove internal ا, و and ي from the end until 3 letters remain. 2 letters means a doubled root.
   - More than 3 letters left sets `rubai: true`.

**Known limitation:** the مجرد heuristic is a guess. For example, قِرَاءَة gives قرو, not قرء (see the vectors). The Maker covers for this. It tries an exact match against our list first (قِرَاءَة is in the list, so it resolves correctly to ق ر ء), then checks the lexicon, and it lets the user edit the root.

## Known gaps (by design today)

- No رباعی (four-letter) verbs, and no forms outside the 16 abwab.
- لفیف (two weak radicals) and other rare combinations follow the rules mechanically, so the UI tells the user to check rare words against a dictionary.
- The `.l`/`.m` (لازم/متعدی) markers in the lexicon are not used. The passive part of صرفِ صغیر is hidden only for `nf fl fy k`.

## Test vectors

`test-vectors/sarf-engine.json` holds:
- `gardaan`: 33 root+bab pairs with all 10 types. They cover sound roots in all 16 abwab, and اجوف و/ي, ناقص و/ي, لفیف, مضاعف, مثال, hamza in the first, middle and last position, افتعال assimilation (صبر، وصل، ذكر), and اجوف/ناقص inside مزید abwab.
- `sarfSagheer` and `rootKind` for the same pairs.
- `detectMasdar`: 17 inputs, including the six Maker examples.
- `normalize`, `normRoot` and `stripHarakat` samples.

To regenerate after a deliberate rule change: `node -e` with `require('./src/engine.js')`. The generator is described in doc 09.
