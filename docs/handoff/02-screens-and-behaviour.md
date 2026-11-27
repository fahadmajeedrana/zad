# 02 · Screens and behaviour

Screenshots for every screen are in `reference/screenshots/`. Files are named `{mobile|desktop}-{nn}-{screen}.png`, plus `-dark-` variants.

Conventions used below:

- **Persisted** means the value is saved in `localStorage` under the key `sm:<key>`, as JSON. The full list is at the end.
- Every list has a **count label** (e.g. `380 مصادر`) that updates live.
- Every search input filters as the user types. There is no submit button.
- All screens share the app chrome described first.

---

## App chrome (all screens)

**Header** (sticky, green gradient, gold underline)
- Brand mark (arch, crescent and book), the title زادُ الطالب and the subtitle طالب علم کا زادِ راہ. Clicking or pressing Enter on the brand goes to Home.
- **Install button** (انسٹال کریں): shown only after the browser fires `beforeinstallprompt`. Clicking it shows the native install prompt; the button then hides.
- **Theme button** (moon icon): toggles light/dark. Persisted as `theme` (`"light"` or `"dark"`). With nothing stored, the app is light.

**Bottom dock** (fixed, floating, frosted)
- Buttons, in RTL order: ہوم │ مصادر, فلیش کارڈ, گردان ساز, ذخیرہ, قواعد. A thin separator follows Home.
- The active screen's button is filled with the brand green (`aria-selected="true"`).
- The dock is a `tablist`. Each button sets the URL hash.

**Routing:** hash based. The routes are `#home #masadir #qawaid #vocab #study #maker #ahadith #fiqh #uhadith #tafsir`.
- An unknown or empty hash shows Home.
- Changing route scrolls to the top and closes the conjugation sheet if it is open.
- The current subject is persisted as `sub`; it is derived from whichever section was opened last.

**Toast:** a small dark pill above the dock, shown for 1.6 s. It is used for copy confirmations, speech errors and similar messages.

**Speaker buttons:** any element with a speaker icon reads its Arabic text aloud (see Text-to-speech below).

---

## Home (`#home`)

- The heading مضامین · مضمون منتخب کریں, then one **subject card** per subject.
- A card has a green gradient header with an icon, name and description, and a gold inner underline. Below it is a list of **section rows**: icon, name, a one-line description, a **count pill** (e.g. `216 عنوانات`) and a chevron.
- Clicking a row navigates to that section's route.
- A section marked *soon* (اصول فقہ) is a non-clickable row with the badge `جلد آ رہا ہے` and no chevron. A whole subject can also be marked soon; it then shows a header only, with the badge.
- Count pills come from data: masadir from the core data; the others are topic or hadith counts embedded at build time (`DATA_META`), so Home never has to load the lazy data files.

## صفوۃ المصادر (`#masadir`): the default first screen

**Controls**
- Search: placeholder `مصدر، مادہ یا معنی تلاش کریں`.
- A segmented control for the group: سب, مجرد or مزید فیہ.
- A **bab select** with "all" plus two optgroups, ثلاثی مجرد (shows the Arabic pattern, e.g. نَصَرَ يَنْصُرُ) and ثلاثی مزید فیہ (shows the Urdu name and the pattern). Choosing a group hides the other optgroup; if the selected bab doesn't fit the group, it resets to "all".
- A **hide meaning** toggle (معنی چھپائیں). Persisted as `hideM`. When on, meanings are blurred (7px) and revealed on hover or keyboard focus.
- The count label.

**Search matching** (any of these; details in doc 06)
- the normalised masdar contains the normalised query, or
- the query has 2 or more root letters and the root (with ا treated as و) contains it, or
- the Urdu meaning contains the raw query.

**Grid:** auto-fill columns at least 200px wide, fixed at 2 columns on phones (≤560px). Each card shows:
- the masdar, large, in Arabic
- the Urdu meaning
- a footer with a coloured dot (green for مجرد, accent for مزید), the bab name, ✓ if the card is in the known set, and a small speaker button.

Clicking a card or pressing Enter opens the **conjugation sheet** for that masdar.

**Empty state:** `«query» فہرست میں نہیں ملا۔` with a button `اس کی گردان بنائیں`. The button puts the query into the Maker, navigates to `#maker` and runs it.

## Conjugation sheet / panel (shared component)

The same panel is used in two places: as a **bottom sheet** (a modal dialog from masadir, vocabulary and flashcards) and **inline** on the Maker screen.

**Sheet behaviour**
- A dimmed, blurred backdrop.
- The body slides up from the bottom with a 24px top radius, up to 94% of the viewport height, and scrolls on its own.
- Closes with ✕, a backdrop click, Escape, or any route change.
- Page scrolling is locked while it is open. On close, focus returns to the element that opened it.

**Panel contents, top to bottom**
1. **Title row:** the masdar (or the madi form if there is no masdar) and a speaker button. Below it, the Urdu meaning. Below that, pills with the root letters (spaced) and the root type: صحیح, or any of مضاعف/مثال/اجوف/ناقص/مہموز.
2. **Warnings** (when they apply):
   - Four-letter masdar: explains that only three-letter verbs are supported.
   - Guessed root that isn't in the list: tells the user the مجرد bab is سماعی and to check a dictionary.
3. **Editable root** (Maker only): three one-letter inputs. Typing normalises the letter (أإؤئآ→ء, ى→ي, ا→و) and moves focus to the next box. When all three are filled, the bab list is recomputed.
4. **Pickers**
   - **باب**: lists only the abwab this root occurs in, from the lexicon plus our own masadir. The label shows the count, `(اس مادہ کے N ابواب)`, or `(لغت میں مادہ نہیں ملا، تمام ابواب)` if the root isn't in the lexicon. The select is disabled if there is only one bab. When opened from a card, that card's own bab is always kept in the list.
   - **گردان**: the 10 conjugation types plus `تمام گردانیں ایک ساتھ` (all at once). Persisted as `gtype`.
5. **Bab card:** the pattern (e.g. فَعَلَ يَفْعُلُ), the bab name, transitive/intransitive usage, a one-line sign, and a collapsible `خاصیات اور مثالیں` (characteristics list and examples). The open/closed state is persisted as `babOpen`. The content is in `src/babinfo.js`.
6. **صرفِ صغیر line**, with a speaker button that reads the whole line: `{madi} {mudari} {masdar in accusative} فَهُوَ {faail}، وَ{madiP} {mudariP} فَهُوَ {mafool}، الأَمْرُ مِنْهُ {amr} وَالنَّهْيُ عَنْهُ {nahi}`. The passive part is left out when the bab is لازم (intransitive), which covers انفعال, افعلال, افعیعال and كَرُمَ.
7. **Tables:** one table, or all 10 in a multi-column layout.
   - The title row has a speaker button for the whole table and a **کاپی** button that copies the forms, comma-separated, and shows a toast.
   - Verb tables have 14 rows, grouped under the headings غائب (6), حاضر (6) and متکلم (2). Each row shows the form, its label (e.g. واحد مذکر) with the Arabic pronoun (هُوَ…), and a speaker button.
   - اسم فاعل and اسم مفعول tables have 6 rows grouped under مذکر and مؤنث.
8. **Note:** for weak, doubled or hamza roots, a short caveat that rare words should be checked against a dictionary.

**Meaning resolution** (shown under the title, in this order)
1. The masadir entry for this root in the chosen bab.
2. The meaning passed in by the opener (from a card or the Maker).
3. The meanings table for root + bab, also trying root variants (ا↔و, a final و/ا↔ي).
4. Otherwise, the hint `معنی درج نہیں · {what this bab usually means}` in muted style.

## گردان ساز (`#maker`)

- A large Arabic input (placeholder `مثلاً اِسْتِغْفَار`) and a **بنائیں** button. Enter also runs it.
- Example chips: اِسْتِغْفَار، تَعَلُّم، إِرْسَال، اِنْكِسَار، مُرَاسَلَة، نُصْرَة. Clicking one fills the input and runs it.
- A note credits the Arramooz lexicon, with a link.
- On load, the Maker is prefilled with اِسْتِغْفَار and run.

**Run logic**
1. If the normalised input equals a known masdar, open the panel with that masdar's root, bab and meaning.
2. Otherwise call `detectMasdar` (doc 05) to get the root, the bab (or none) and a `guessed` flag.
3. If no bab was detected (a مجرد pattern):
   - If our list has another masdar from the same root in a مجرد bab, use that bab and show the meaning `اسی مادہ سے: {masdar} ({meaning})`.
   - Otherwise, if the lexicon lists مجرد abwab for the root, use the first one. The note says how many abwab there are and to choose by meaning, or `لغت کے مطابق: {bab}` if there is only one.
4. If the lexicon has the root but not the chosen bab, show the meaning `یہ باب اس مادہ کے لیے لغت میں نہیں ملا۔`
5. Open the panel with the root editable, the warnings as above, and the default bab نَصَرَ if nothing else applies.

## قواعد (`#qawaid`), کتاب الفقہ (`#fiqh`), اصول حدیث (`#uhadith`), اصول تفسیر (`#tafsir`)

These four screens are **one component with different data and labels** (the "reference book" view).

| Screen | Data | "Book" select lists | Default | "All" label | Saved as |
|---|---|---|---|---|---|
| قواعد | guide | 6 books (s1–s3, n1–n3) | s1 | تمام کتابیں | `gBook` |
| کتاب الفقہ | fiqh | 9 ابواب across 2 parts | f1b1 | تمام ابواب | `fBook` |
| اصول حدیث | uhadith | 4 ابواب | uhb1 | تمام ابواب | `uBook` |
| اصول تفسیر | tafsir | 4 sections | utb1 | تمام حصے | `tBook` |

**Controls**
- Search, with a screen-specific placeholder.
- **Book select:** each section, then "all" as the last option.
- **Topic select:** `تمام عنوانات`, then `N. title` for each topic. When "all books" is chosen, each option is prefixed with a short book label.
- `سب کھولیں` / `سب بند کریں` buttons open or close every topic.
- The count label: `N عنوانات`.

**Loading:** on first open, the list shows `لوڈ ہو رہا ہے…` while the data file loads. If loading fails, it shows `ڈیٹا لوڈ نہیں ہو سکا۔` with a retry button.

**List**
- Grouped by section. Each group header has the section name and its topic count.
- Each topic is a collapsible row. The summary shows a number badge (its position within the section, starting at 1), the title and a page pill (`ص 29–30`).
- The body is a list of items. An item is either top level or indented (level 1), and is either bulleted or numbered (the number is shown in bold).
- **Inline Arabic styling:** runs of Arabic words with harakat inside the Urdu text are wrapped and styled as Arabic examples (larger, Arabic colour). The rule is in doc 06.
- **Search:** matches the normalised title and all item text of a topic. Matching topics are shown expanded, and matches are highlighted with `<mark>`. If a single topic is selected, it is shown expanded.
- **Empty state:** `کوئی عنوان نہیں ملا۔`

## کتاب الحدیث (`#ahadith`)

**Controls**
- Search (placeholder `حدیث، لفظ، ترجمہ یا حوالہ تلاش کریں`). It matches the Arabic, the translation, the source and every glossary word and meaning, all normalised.
- **Book select:** حصہ اول, دوم, سوم, then تمام حصے. Persisted as `hBook`; the default is h1.
- **Bab select:** تمام ابواب, then each باب with its hadith count. Disabled divider options (`── کتاب ──`) mark each کتاب group.
- A **hide translation** toggle (ترجمہ چھپائیں). Persisted as `hHide`. When on, translations are blurred; tapping a card's translation reveals it.
- The count label: `N احادیث`.

**List:** grouped by باب. The header shows the Arabic باب title, a subtitle (the کتاب and the Urdu subtitle) and the count. When "all parts" is chosen, the part name is shown too. Each **hadith card** has:
- A number badge, the source reference and a speaker button (reads the Arabic without ﴾﴿).
- The Arabic text, large, `lang="ar"`.
- A collapsible `لفظی ترجمہ (N الفاظ)` with word chips (Arabic word with its Urdu meaning). It opens automatically when the search matches inside the glossary.
- `ترجمہ:` followed by the Urdu translation.

Matches are highlighted in the Arabic, the glossary meanings and the translation. **Empty state:** `کوئی حدیث نہیں ملی۔`

## ذخیرہ الفاظ (`#vocab`)

**Controls**
- Search (placeholder `عربی لفظ، مادہ یا اردو معنی تلاش کریں`).
- A **mode** segmented control: جدول (table) or کارڈ (cards). Persisted as `vMode`; the default is table.
- A **kind** segmented control (cards mode only): الفاظ (words) or افعال (verbs).
- **Book select:** تمام کتابیں, قصص النبیین 1, کتاب الصرف 1–2, کتاب النحو 1–2. Persisted as `vBook`; the default is q1.
- **Topic/lesson select:** in table mode it lists every lesson in book order; in cards mode, the topics for the chosen kind.
- A **hide meaning** toggle. Persisted as `vHide`.
- The count: in table mode `N افعال · M اسماء`; in cards mode `N الفاظ` or `N افعال`.

**Table mode** shows one section per lesson, in book order. The header has the lesson title, the book name and the class date if there is one (`LESSON_DATES`).
- **أفعال table:** #, ماضی, مضارع, امر (only if any row has one), مصدر, Urdu meaning, Quran count (only if any row has one), and a speaker button.
- **أسماء table:** #, the word, its plural (column shown only if some word has ` ج: `), the meaning, the Quran count, and a speaker button.
- Rows that link to a conjugation are styled as links (`گردان دیکھیں`). Verb rows link when they have a bab. Word rows link when the word is exactly a masdar in our list (matching rule in doc 04).
- With hide-meaning on, tapping a non-linked row reveals its meaning.

**Cards mode**
- A word card shows the word, the meaning, the topic, a `گردان ›` badge if it links, a Quran count badge, and a speaker button.
- A verb card shows the madi, then the مضارع · امر · مصدر line, the meaning, the bab and the Quran count. Clicking it opens the sheet; a verb without a bab shows the toast `اس فعل کی گردان (رباعی / خلافِ قیاس) یہاں دستیاب نہیں`.

**Speech text:** bracketed notes `[...]` are removed, and ` ج: ` is read as a pause (`، `).

## فلیش کارڈ (`#study`)

**Settings**
- Source: مصادر or ذخیرہ الفاظ.
- Filter: the bab select (for masadir) or a book select (for vocabulary).
- Mode: all cards, or only the ones not yet known.
- Front side: Arabic or Urdu.

**Card:** 3:2 aspect ratio and up to 540px wide. It flips in 3D (0.5 s) on tap, with the پلٹیں button or with the Space key.
- **Masadir card, Arabic side:** the masdar large, `madi · mudari` below it, and a bab tag. Urdu side: the meaning and the root letters.
- **Vocabulary card:** the word with a topic and book tag on one side; the meaning and `قرآن کریم میں: N بار` on the other.
- The front shows the hint `پلٹنے کے لیے ٹیپ کریں`.

**Progress:** `pos / total` with a bar.

**Controls**
- پچھلا, پلٹیں and اگلا. Arrow keys work too: in RTL, ← is next and → is previous. A swipe of more than 50 px also moves between cards.
- ✓ یاد ہے toggles the card in the known set (pressed state).
- 🔊 سنیں reads the card aloud.
- گردان opens the sheet; this button is hidden for vocabulary cards.
- ترتیب بدلیں reshuffles and shows a toast.

**Deck:** the cards matching the filters are shuffled with Fisher–Yates. Any settings change rebuilds and reshuffles the deck. An empty deck shows `اس انتخاب میں کوئی کارڈ نہیں`.

The keyboard shortcuts apply only on this screen, with the sheet closed and focus not in an input.

---

## Text-to-speech

- Uses the browser's speech synthesis. It picks an `ar-SA` voice, or failing that any `ar*` voice, and re-picks when the voice list changes. Rate 0.8.
- Starting new speech cancels any current speech. The active speaker button gets a `playing` state until the speech ends.
- If there is no Arabic voice, a toast appears once: `اس ڈیوائس پر عربی آواز انسٹال نہیں؛ سیٹنگز میں عربی آواز شامل کریں`
- If speech isn't supported at all: `یہ براؤزر آواز نہیں چلا سکتا`

## Persisted preferences (localStorage, key prefix `sm:`, JSON values)

| Key | Type | Default | Meaning |
|---|---|---|---|
| `theme` | `"light" \| "dark"` | none, which means light | Theme |
| `sub` | string | `"arabi"` | Last subject (derived from the last section opened) |
| `hideM` | bool | false | Masadir: hide meanings |
| `gtype` | string | `"madiA"` | Conjugation type last chosen (or `"all"`) |
| `babOpen` | bool | false | Bab card details open |
| `known` | (number \| string)[] | [] | Known flashcards: masdar ids (numbers) and vocabulary ids (`"w<idx>"`) |
| `gBook` / `fBook` / `uBook` / `tBook` | string | s1 / f1b1 / uhb1 / utb1 | Selected section on each reference screen |
| `hBook` | string | `"h1"` | Hadith part |
| `hHide` | bool | false | Hadith: hide translation |
| `vBook` | string | `"q1"` | Vocabulary book |
| `vMode` | `"table" \| "cards"` | `"table"` | Vocabulary mode |
| `vHide` | bool | false | Vocabulary: hide meanings |

⚠ The `known` ids are **list positions**, so they break if the data is reordered. See doc 10 for the recommended stable ids and how to migrate existing data.

## Accessibility (current behaviour to keep)

- The dock is a `tablist` with `aria-selected`. Toggles use `aria-pressed`. The sheet is `role="dialog" aria-modal="true"` and handles focus on open and close.
- Cards are focusable (`tabindex=0`) and open with Enter. Speaker buttons have Urdu `aria-label`s.
- `prefers-reduced-motion` turns off all transitions.
- Search inputs use 16px text so iOS doesn't zoom on focus.
