# 01 · Product overview

## Purpose

زادُ الطالب ("the student's provision"; tagline طالب علم کا زادِ راہ) is a study companion for madrasa students on the Dars-e-Nizami course books. It is used on phones in class and for revision, often offline. Every piece of content comes from the course books themselves. The app does not add outside material: summaries keep each book's own wording, and hadith entries are complete.

## Audience and language

- Students who read Urdu as their teaching language and are learning classical Arabic.
- All UI text is Urdu, right to left. Arabic appears inline with full harakat (vowel marks).
- The app assumes small phones, intermittent connectivity and older Android devices.

## Information architecture

The home screen lists **subjects**. Each subject has **sections**, and each section is a screen.

| Subject | Section (screen id) | What it is | Data |
|---|---|---|---|
| عربی زبان | صفوۃ المصادر (`masadir`) | Masdar list with filters; opens a conjugation sheet | core |
| | قواعد (`qawaid`) | Topic summaries of کتاب الصرف 1–3 and کتاب النحو 1–3 | guide |
| | ذخیرہ الفاظ (`vocab`) | Vocabulary from قصص النبیین and the صرف/نحو books, as a table or cards | core |
| | فلیش کارڈ (`study`) | Flashcards for masadir or vocabulary, with a "known" set | core |
| | گردان ساز (`maker`) | Type any masdar; the app detects its root and bab and conjugates it | core |
| حدیث | کتاب الحدیث (`ahadith`) | 583 ahadith from 3 parts: Arabic, source, word-by-word glossary, translation | hadith |
| | اصول حدیث (`uhadith`) | Topic summary, 4 ابواب, 43 topics | uhadith |
| فقہ | کتاب الفقہ (`fiqh`) | Topic summary: part 1 (عبادات, 5 ابواب) and part 2 (نکاح، رضاعت، طلاق، قسم) | fiqh |
| | اصول فقہ | "Coming soon" placeholder (no screen yet) | — |
| تفسیر | اصول تفسیر (`tafsir`) | Topic summary, 4 sections, 34 topics | tafsir |

The bottom dock always shows: ہوم, مصادر, فلیش کارڈ, گردان ساز, ذخیرہ, قواعد. These are the عربی زبان tools. The other subjects are reached from the home screen.

## Content counts (current build)

| Content | Count |
|---|---|
| Masadir (own list) | 305, plus 75 added from the verb vocabulary, for 380 shown |
| Abwab covered | 16: 6 ثلاثی مجرد and 10 ثلاثی مزید فیہ |
| Root lexicon (Arramooz) | 5,288 roots, each mapped to the abwab it occurs in |
| Extra meanings (other abwab of a root) | 538 |
| Vocabulary words | 1,251 (q1 77 · s1 289 · s2 5 · n1 389 · n2 491) |
| Vocabulary verbs | 254 (q1 84 · s1 61 · s2 109) |
| قواعد topics | 216 across 6 books |
| کتاب الحدیث | 583 ahadith (h1 388 · h2 121 · h3 74) in 118 ابواب |
| کتاب الفقہ topics | 174 (part 1: 117 · part 2: 57) |
| اصول حدیث topics | 43 |
| اصول تفسیر topics | 34 |

## Key capabilities

1. **Conjugation engine.** It generates 10 conjugation tables (ماضی/مضارع/امر/نہی in active and passive, plus اسم فاعل and اسم مفعول) and the صرفِ صغیر line, for any three-letter root in 16 abwab. It applies the weak-letter (تعلیل), doubled-letter (ادغام) and hamza spelling rules. See doc 05.
2. **Masdar detection.** From a typed masdar it infers the root and bab using pattern rules, then checks the lexicon for which abwab the root really occurs in.
3. **Text-to-speech.** Uses the browser's Arabic voice for any Arabic word, form, full table or hadith.
4. **Self-testing.** "Hide meaning" toggles on the masadir, vocabulary and hadith screens, plus flashcards with a persistent "known" set.
5. **Search everywhere.** Each screen has search that ignores harakat and handles letter variants (أ/إ/آ→ا, ي/ى→ی, ك→ک, ه/ة→ہ). Matches are highlighted.
6. **Offline-first PWA.** Installable, works fully offline after the first visit, and updates automatically when content changes.

## Content sources

All content was transcribed from the course PDFs, mostly typed from page images. Exercise pages (مشق) are skipped. The books:

- صفوۃ المصادر (masadir list)
- کتاب الصرف 1–3 and کتاب النحو 1–3 (قواعد and vocabulary)
- قصص النبیین 1 (vocabulary, lesson by lesson)
- کتاب الحدیث 1–3
- کتاب الفقہ 1–2
- اصول حدیث
- اصول تفسیر

The اصول تفسیر book has no ابواب, so its 4 sections are editorial groupings. The author's references to himself and his own books are kept as written.

## Out of scope (today)

There are no accounts, sync, backend or analytics. Four-letter (رباعی) verbs and verb forms not in the 16 abwab are not conjugated; the app shows a warning instead.
