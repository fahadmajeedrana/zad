# زادُ الطالب (Zad-ut-Talib) v2

An offline-first, installable study companion for Dars-e-Nizami students. It is Urdu-first and right-to-left, with Arabic throughout:

- masadir and a conjugation engine (گردان) covering 16 abwab;
- vocabulary and flashcards;
- topic summaries of the قواعد, فقہ, اصول حدیث and اصول تفسیر books;
- کتاب الحدیث with word-by-word glossaries.

This is a React + TypeScript rebuild of the original single-file app. The spec it follows is in `docs/handoff/`. Hosting and the planned "ask the books" RAG are in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Run

Needs Node 20 or later.

```bash
npm install
npm run dev        # builds data from content/, then starts Vite on http://localhost:5173
npm test           # engine test vectors + acceptance tests (counts, search, Maker, linking, schemas)
npm run build      # type-check + production build into dist/ (service worker included)
npm run preview    # serve dist/ — use this to test offline/installation
```

The service worker is only registered in production builds. To check offline behaviour, use `build` + `preview`, open the app once, then go offline.

## Edit content

All content is plain text under `content/`. `scripts/build-content.mjs` turns it into hashed JSON under `public/data/` and runs automatically before `dev`, `build` and `test`. A malformed line fails the build with the file and line number.

| Content | File | Format |
|---|---|---|
| Masadir | `content/core/masadir.txt` | `masdar\|root\|bab\|urdu` |
| Verbs / words | `content/core/verbs.txt`, `vocab.txt` | see the header comment in each file |
| قواعد | `content/qawaid/{sarf,nahw}{1,2,3}.md` | `## topic`, `@ص 12`, `- item`, `  - sub item`, `1. numbered` |
| فقہ / اصول | `content/fiqh/*.md`, `content/usool/*.md` | as above, plus `# section` |
| Hadith | `content/hadith/h{1,2,3}.txt` | `## کتاب`, `# باب`, `n\|arabic\|source\|word=meaning~…\|urdu` |

To add a new topic-summary book (e.g. اصول فقہ):

1. Add the markdown file.
2. Add one `parseRef` line in `scripts/build-content.mjs`.
3. Add one entry in `REF_BOOKS` (`src/features/refbook/RefBook.tsx`).
4. Replace the "soon" row in `src/features/home/subjects.ts`.
5. Add the route name to `VIEWS` in `src/router.ts`.

## تلاش بالمعنی (semantic search, experimental)

Students open it with the **search icon in the header**, available on every screen. They can also use a link: `/zad/search?q=<question>` runs the question directly.

They ask in their own words and get the books' own passages, with references. Nothing is written by an AI model.

Above the passages, a **"کتابوں سے جواب"** box shows the 2–3 sentences that best answer the question, quoted word for word from the top passages (`src/features/search/answer.ts`). Each sentence:
- carries a citation (book › topic, page; or part › باب, hadith number);
- links to its passage below, where the quoted item is highlighted.

To check the answer quality: `ANSWER_EVAL=1 npx vitest run tests/answer.eval.test.ts --silent=false` prints the picked sentences for sample questions.

**Known weakness:** negation. For "روزہ کن چیزوں سے ٹوٹتا ہے" the search tends to rank the topic "جن چیزوں سے روزہ نہیں ٹوٹتا" too. The page asks students to read the full passage and to ask their teacher about rulings.

Everything runs in the browser:

- **Passage data:** the books are split into 2,166 passages (long topics in ~600-character pieces, plus every hadith). `npm run embeddings` converts each one into a vector with `Xenova/multilingual-e5-small`. The result is stored as int8 vectors in `content/generated/semantic.json` (1.1 MB), which is committed, so CI never needs the model.
- **In the browser:** a Web Worker runs the same model with transformers.js and ranks passages by dot product. Searches take about 50–200 ms.
- **Download:** the model (~118 MB) is fetched from the Hugging Face hub only after the student taps a button. It's then cached, so search works offline afterwards. The vectors and the worker are also cached on first use; they aren't part of the app install.
- **Keeping it current:** after editing content, run `npm run embeddings`. `npm run content` warns when the vectors are stale.
- **Roman Urdu** ("wuzu kin cheezon se toot jata hai?") works too. The model only understands Urdu script, so `src/core/roman.js` first converts each Roman word to the closest-sounding word from the books' own vocabulary:
  - short grammar words (kya, hai, mein, ki…) come from a fixed list;
  - a short list of subject terms with common Roman spellings is checked next;
  - the page shows the student the Urdu it understood, so a wrong guess is visible.
- **Measuring quality:** `npm run eval:search -- [model] [--index] [--roman|--heldout] [--translit] [--noterms]` scores search on student-style questions with known answers. `--index` uses the committed vectors (exactly what the app ships).

| Questions | Correct answer first | In top 5 |
|---|---|---|
| Urdu script (24) | 21 | 24 |
| Roman Urdu (same 24), converted, no term list | 20 | 24 |
| Roman Urdu held-out set (16, never tuned on), converted, no term list | 11 | 15 |
| Roman Urdu without conversion | 0 | 0 |
| (paraphrase-multilingual-MiniLM instead of e5-small, Urdu) | 6 | 15 |

## Deploy (GitHub Pages)

The site is served from <https://fahadmajeedrana.github.io/zad/>. One repository holds both the source and the deployment: GitHub Actions builds `dist/` and publishes it, so no built files are committed.

1. One-time: in the repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
2. Push to `main`. `.github/workflows/pages.yml` tests, builds (with `BASE_PATH=/zad/`) and deploys. Pull requests are tested and built, but not deployed.

How it works on Pages:
- The build copies `index.html` to `404.html`, so deep links like `/zad/fiqh` work.
- Old `#hash` links from v1 redirect to the matching path.
- The new service worker deletes v1's caches.
- Students keep their settings and flashcard progress, because the address hasn't changed.

For a custom domain at the root, build with `BASE_PATH=/` and add a `public/CNAME` file. Azure Static Web Apps is an alternative host; see `docs/ARCHITECTURE.md` §2.

## Licence

The root lexicon (`content/core/roots.txt`) is derived from [Arramooz](https://github.com/linuxscout/arramooz) (GPL), so the app is distributed under the GPL (`GPL-3.0-or-later`). Keep `public/NOTICE.md` and the credit on the Maker screen. Amiri is under the SIL OFL 1.1. The rights to the book content belong to its authors and publishers; see `docs/handoff/11-licences-and-attribution.md`.
