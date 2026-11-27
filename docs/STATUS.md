# Status and handover

Last updated: **2026-11-28**. Update this file at the end of each working session.

## Where things stand

| Item | State |
|---|---|
| v1 → v2 rebuild | **Done** on branch `v2`. Parity with handoff doc 10; the engine passes all vectors; all data files are byte-identical to v1 (core now uses arrays). Checked in a browser: every screen, dark mode, offline, `#hash` redirects. |
| GitHub Pages setup | **Done in code**: `.github/workflows/pages.yml`, base `/zad/`, `404.html` for deep links, v1 caches cleaned up. **Not live yet** (see "Waiting on the owner"). |
| Semantic search (`/search`) | **Done** on branch `semantic-search`, on top of `v2`. Experimental. Opened from the search icon in the header; `?q=` links work. In-browser e5-small, opt-in ~118 MB model download, works offline afterwards. |
| Cited answer ("کتابوں سے جواب") | **Done** on `semantic-search`. Picks the 2–3 best sentences from the top passages, word for word, each with a citation that links to the highlighted passage. No AI-written text. |
| Roman Urdu search | **Done** on `semantic-search`. Converts Roman Urdu to Urdu via the books' vocabulary and shows the student what it understood. |
| AI-written answers | **Not started.** Design in ARCHITECTURE §3 "Current direction". |
| Tests | 82 passing, plus 1 opt-in model check (`ANSWER_EVAL=1`); run with `npm test`. |

## Waiting on the owner

1. **Push the branches.** The last push failed at sign-in (the stored credential is invalid). Run:
   `git -C "C:/Projects/Personal/zad" push -u origin v2 semantic-search`
   (in Claude Code, prefix it with `!`). A browser window should open for GitHub sign-in; use the `fahadmajeedrana` account. If the same error comes back, clear the stored login first: `printf "protocol=https\nhost=github.com\n\n" | git credential reject`.
2. **Go live, in this order:**
   1. Open a PR from `v2` to `main`.
   2. In repo **Settings → Pages**, set the source to **GitHub Actions**.
   3. Merge the PR.
3. **Try the header search** with real student questions (Urdu and Roman Urdu), then decide whether to merge `semantic-search`.

## Open decisions (ask the owner; don't assume)

- **Full books for RAG.** What format are they in: typed text, PDFs with selectable text, or scans that need OCR? Do you have permission to publish full texts (handoff doc 11)?
- **AI answers.**
  - Who can use them: anyone, only the class, or invited users only?
  - Which model and provider: Gemini free tier vs paid "mini"/Haiku vs Azure OpenAI?
  - Where does the small server run: an Azure Function (Flex Consumption) or a Cloudflare Worker?
  - Sign-in: Google ID token plus a Table Storage allow-list (recommended), or Entra External ID.
- **Azure subscription.** The Visual Studio credit is for dev/test only, and production needs pay-as-you-go. Is the VS subscription personal or provided by an employer?
- **Custom domain.** Moving away from `github.io/zad` loses students' saved data and installed apps, so decide before announcing widely.

## Next steps (suggested order)

1. Go live with `v2` (above).
2. Smaller follow-ups:
   - a Gboard Urdu-transliteration hint on the search page;
   - shrinking the 118 MB model by pruning unused vocabulary rows from the embedding matrix (most of its size).
3. AI answers via the small server, with sign-in and quotas. Send it the question plus the top passages; it writes the answer with citations.
4. Ingest full books: `books/<book>/<part>.md` in the same heading format, then rerun embeddings and the eval.

## Known issues and limits

- The search model is a ~118 MB one-time download, which is heavy on mobile data. That's why the download is opt-in.
- Search, and so the cited answer, is weak with negation: "روزہ کن چیزوں سے ٹوٹتا ہے" also pulls in "…روزہ نہیں ٹوٹتا". The page tells students to read the full passage and to ask their teacher about rulings.
- Roman Urdu can't separate words that sound and are spelled alike (وحی vs وہی). Some are fixed in `TERMS`; the page shows what it understood.
- Content needing a teacher's check: the date for سبق 6 in `content/core/lesson-dates.json` says 15 نومبر, between the 17th and 19th (probably 18 نومبر).
- Engine quirks kept on purpose (handoff doc 10 §D):
  - the مجرد detection guesses wrong for some hamza roots, but the Maker compensates;
  - a تفعیل masdar from a root ending in hamza (تَقْرِئَة) isn't detected;
  - the لازم/متعدی markers in the root lexicon are unused.
- `npm audit` reports moderate issues in dev dependencies only; these haven't been reviewed.

## Measured results (keep up to date)

See the README table. Current figures: Urdu 21/24 correct-first; Roman Urdu converted 20/24; Roman held-out 11/16 correct-first and 15/16 in the top 5.
