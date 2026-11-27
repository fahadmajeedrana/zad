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
