# 06 · Search, normalisation and text handling

Arabic and Urdu share a script but have different letter forms. Search has to match across harakat, hamza seats and Arabic/Urdu letter variants. These are the exact functions in the current app. Port them as they are, because search results and links depend on them.

## Normalisers

| Name | Used for | Rules (in order) |
|---|---|---|
| `stripHarakat(s)` | everything | remove U+064B–U+0670, U+065F and tatweel ـ |
| `normalize(s)` | masdar, vocabulary and Maker matching | strip harakat → trim → ٱ→ا → آ→ءا → أإؤئ→ء → ى→ي → remove all whitespace |
| `normRoot(s)` | root queries | strip harakat → أإؤئآ→ء → ى→ي → **ا→و** → remove spaces, `-` and ـ |
| `gnorm(s)` | reference books and hadith (Urdu-heavy text) | strip harakat → أإآٱ→ا → ك→ک → يى→ی → ه ة ۃ→ہ → ؤئ→ء → collapse whitespace |
| `vnorm(s)` | linking a vocabulary word to a masdar (**keeps vowels**) | trim → remove a leading `اَلْ`/`ال` → remove tanween (U+064B–064D) → remove the final short vowel → remove sukun and tatweel → dagger alif ٰ→fatha → أإآٱؤئ→ء → ى→ي |
| `toNom(m)` | verb masdar shown as a masdar entry | ending `ةً→ةٌ`, `اءً→اءٌ`, `ئًا→ئٌ`, `ءًا→ءٌ`, `ًا→ٌ` |
| `accus(m)` | masdar inside صرفِ صغیر | ending `ةٌ→ةً`, `اءٌ→اءً`, `ءٌ→ءً`, `ٌ→ًا` |
| `sayText(a)` | vocabulary speech | remove `[…]`; ` ج: ` → `، ` |

## Matching rules per screen

- **Masadir:** `nm.includes(normalize(q))`, or (when `normRoot(q).length ≥ 2`) the root with ا→و includes `normRoot(q)`, or `u.includes(q)` (raw Urdu). The group and bab filters are applied first.
- **Vocabulary, words:** `na.includes(normalize(q))` or `u.includes(q)`.
- **Vocabulary, verbs:** `n.includes(normalize(q))`, or (root query of 2+ letters) `nr.includes(normRoot(q))`, or `u.includes(q)`.
- **Reference books:** `topic.s.includes(gnorm(q).trim())`.
- **Hadith:** `hadith.s2.includes(gnorm(q).trim())`.

## Highlighting

- Only on the reference-book and hadith screens, and only when the normalised query is at least 2 characters.
- The query is regex-escaped, then wrapped in `<mark>` **only inside text nodes**. In the HTML string version this is the `(^|>)([^<]+)` replace. A rebuild should highlight on text segments, not on markup.
- Highlighting matches the normalised query against the displayed text. That text isn't normalised, so a match only shows where the surface form agrees with the query (e.g. text without harakat). This is acceptable and known.

## Inline Arabic inside Urdu (reference books)

Item text is Urdu with Arabic examples mixed in. Arabic words that carry harakat are styled as `.ex` (Arabic example style). Rule for each whitespace-separated token:

1. Remove leading `( [ « "` and trailing `) ] » " ، ؛ : ؟ ! . ۔ ,` to get the core word.
2. The core is **Arabic** if it has harakat (U+064B–0652, U+0670, Quranic marks U+06E1, U+06DC, U+06E2–06ED) and either
   - it has **2 or more** marks, or
   - it has at most 2 letters.
   This means an Urdu word with a single izafat zer stays plain.
3. Neighbouring Arabic words, with the spaces between them, are merged into one styled run. Punctuation outside the core stays unstyled.

All text is HTML-escaped before any markup is added.

## RTL and bidi

- The document is `dir="rtl" lang="ur"`. Arabic blocks such as hadith text use `lang="ar" dir="rtl"`, so speech and fonts work correctly.
- Numbers are shown with Western digits (`380 مصادر`). Keep this.
- Page ranges use an en dash (`29–30`).
- Arrow keys in the flashcards follow the RTL visual direction: ← is next.
