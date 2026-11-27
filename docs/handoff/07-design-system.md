# 07 · Design system

The values come from `design/tokens.json`; `design/tokens.css` has the same values as CSS variables with neutral names. The brand assets are in `brand/` (see `brand/README.md`).

> **Note on the current CSS:** `app.html` has an early base theme (navy and saffron) followed by an override block headed "Field-notebook theme" that redefines the variables and many components. **Only the override values are live.** The tokens file holds the live values. Don't port the base block.

## Brand

- **Palette:** forest green `#075B35`, deep green `#034326`, gold `#E6B83F`, cream `#FFF9E9`, light green `#087A47` (gradient start).
- **Mark:** a mihrab arch (gold stroke) with a crescent inside it and an open book at the base. Text in the logo and banner is converted to paths (Amiri), so it looks the same everywhere.
- **Header:** a 135° gradient from `#087a47` to `#034326` with a 3px gold underline. Dark mode uses `#075b35` to `#022a18`.
- **Subject card header:** a gradient from brand to deep with a 2px gold underline.

## Colour roles

| Role | Light | Dark | Used for |
|---|---|---|---|
| ink | #1c2a22 | #e5eae4 | body text |
| paper | #fff9e9 | #121814 | page background, sheet body |
| surface | #ffffff | #1b231e | cards, inputs, selects |
| rule | #e8dfc6 | #2d3a32 | borders, dashed card footers |
| muted | #66706a | #9aa69e | meta text, hints |
| primary | #075b35 | #7cc59a | headings, active segment/toggle, buttons, number badges, مجرد dot |
| primary-soft | #e5f1e8 | #17342a | hover fills, table group rows |
| accent | #8f6410 | #e6b83f | مزید فیہ marker (dot, bab-card edge, summary) |
| accent-soft | #fbefcc | #33291a | search `<mark>` background |
| brand | #075b35 | #0d6a40 | active dock button, subject headers (white text on top) |
| warn | #a33a1f | #e07a5f | warning box edge |

Contrast: white text sits only on `brand` or `deep`, which pass AA in both themes. In dark mode, `primary` is a light green used as **text and border colour**, never as a background for white text.

## Typography

- **Amiri** for everything: Arabic, Urdu and UI. Weights 400 and 700, plus italic 400. Fallbacks are Noto Naskh Arabic, Traditional Arabic and serif.
- Body text is 16.5px with line-height 1.7. Naskh needs generous line height; don't go below 1.6 for Urdu.
- Arabic display sizes: masdar card 26–30px; conjugation forms 22px or more; sheet title 36px or more; flashcard `clamp(46px, 12vw, 76px)`.
- Section heading (`h2.sec`) is 17–19px/700 in primary colour, with a 2px underline in primary.

## Layout

- Content column is at most 980px wide and centred, with a 16px gap between blocks.
- The bottom padding leaves room for the dock: `calc(110px + safe-area-inset-bottom)`.
- Card grid: `repeat(auto-fill, minmax(200px, 1fr))` with a 12px gap; fixed at 2 columns and a 10px gap at ≤560px. Multi-table conjugation layout: `auto-fill, minmax(300px, 1fr)`.
- Breakpoints: ≤400px (small phone: smaller dock icons and labels), ≤560px (phone: 2-column card grid, single-column pickers, smaller Arabic), ≥900px (tablet: multi-column conjugation tables), ≥1100px (desktop).
- Safe areas: the header pads `env(safe-area-inset-top)`, and the dock, sheet and toast respect the bottom inset.
- Stacking order: sticky search 6 · header 15 · dock 18 · sheet 20 · toast 40.

## Components (inventory)

| Component | Spec |
|---|---|
| **Header** | sticky; brand mark 42px (12px radius, gold 45% border); title 22–25px white; subtitle 12.5px at 85% opacity; optional install button (white with green text); theme icon button |
| **Dock** | fixed bottom, centred, `min(560px, 100% − 24px)` wide, 6px padding, 22px radius, glass background, rule border, shadow `0 8px 28px rgba(20,35,25,.22)`; buttons flex equally, min height 56px, 16px radius, 22px icon above an 11–13px bold label; active = brand fill with white text; hover = primary-soft |
| **Section heading** | primary colour, 2px bottom border; optional muted subtitle after ` · ` |
| **Search field** | sticky below the header, white, 12px radius, shadow, leading search icon, 16px input |
| **Segmented control** | pill track (999px), buttons 6×16px padding; pressed = primary fill, white text |
| **Select** | 8px radius, rule border, min height 38px; optgroups for مجرد/مزید |
| **Icon toggle** (`iconbtn`) | pill with icon and label; pressed = primary fill |
| **Button** | 8px radius, primary outline; `primary`/`accent` = filled; `good` pressed = filled; `ghost` = borderless muted |
| **Count label** | muted 14px; drops to its own row on phones |
| **Masdar / vocab card** | surface, rule border, 14px radius, padding 16/16/12; Arabic headword; meaning; dashed-top footer with dot, bab, ✓ and speaker; hover = primary border plus shadow; `.hide` blurs the meaning |
| **Subject card** | 16px radius; gradient header (icon tile 42px with 16% white fill, h3 21px, description 13px); section rows with icon, title, small description, count pill and chevron; soon rows at 75% opacity with a badge |
| **Bottom sheet** | backdrop `rgba(10,15,25,.38)` with 3px blur; body on paper, 24px top radius, max 94% height, grabber bar |
| **Conjugation panel** | head (title, speaker, meaning, root and type pills, close); warning boxes; pickers grid; bab card (4px inline-start border in primary or accent, collapsible details); صرفِ صغیر box; tables |
| **Conjugation table** | 12px radius; title bar in primary with a 2px underline, speaker and copy button; group rows on primary-soft; each row shows the form (Arabic), the label with its pronoun, and a speaker |
| **Topic row** (`details.rule`) | summary with a number badge (26px, primary, white numerals, tabular), title and page pill; body list with level-1 indentation and bold numbers |
| **Hadith card** | number badge, source, speaker; Arabic 21–24px; collapsible glossary chips; `ترجمہ:` paragraph; hide mode blurs it (6px) until tapped |
| **Vocabulary table** | lesson header (title, then book · date); subheads أفعال/أسماء; striped compact table; Arabic cells larger; linked rows look clickable |
| **Flashcard** | 3:2 card, max 540px, 18px radius, 3D flip; big Arabic, Urdu meaning, tag, hint; progress bar in primary |
| **Pill / badge** | 999px radius; root pill, root-type pill, count pill, `جلد آ رہا ہے` badge, Quran count `qc` badge |
| **Warning box** | warn-soft background, 4px inline-start border in warn |
| **Toast** | ink background with paper text, 10px radius, 13px; fades in and out; sits above the dock |
| **Speaker button** | round icon button; `sm` variant inside rows; shows a `playing` state while speaking |
| **Empty and loading states** | centred muted text in an `.empty` box, optionally with an action button |

## Icons

- `design/icons/app/` holds the 14 icons the app uses today: book, cards, chain, grid, lang, pen, quote, quran, roots, rules, scale, speaker, moon, eye. Each is a 24×24 stroke icon, 1.8 stroke width, round caps, `currentColor`.
- `design/icons/brand-kit/` holds the brand kit's set (home, search, settings, categories, book-open, contents, …), in the same style. The dock and search currently use home, categories, book-open, contents and search from this set.

## Motion

- Card hover: 0.15s. Flashcard flip: 0.5s `cubic-bezier(.2,.7,.2,1)`. Toast shows for 1.6s.
- On ≥1100px screens with hover, the dock has a gentle magnification effect.
- `prefers-reduced-motion: reduce` turns off all transitions and animations.

## Do and don't

- **Do** use logical properties (`inline-start`/`inline-end`), because everything is RTL.
- **Do** keep Arabic text exactly as given: never strip harakat for display, and never use a font without good harakat placement.
- **Don't** mirror icons that show a direction of reading or time unless the design does.
- **Don't** put white text on the dark-mode `primary` colour.
