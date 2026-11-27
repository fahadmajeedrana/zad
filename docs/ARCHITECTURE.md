# Architecture, hosting and the RAG plan

## 1. What's built (v2)

An offline-first PWA that rebuilds the original single-file app with parity (see `docs/handoff/10-migration-checklist.md`).

| Layer | Choice | Why |
|---|---|---|
| UI | React 19 + TypeScript, Vite | The app is static and client-side. Next.js's server features (SSR, server components, API routes) would go unused, and a static export plus a service worker is more friction than Vite + `vite-plugin-pwa`. |
| Routing | A 60-line path router (`src/router.ts`) | 10 flat routes, no params. Old `#hash` links redirect to paths. |
| Offline | `vite-plugin-pwa` (Workbox `generateSW`) | Precaches the shell, the self-hosted Amiri font and **every** data file (~3.4 MB), so every screen works offline after one visit. New versions wait for a "تازہ کریں" tap instead of reloading mid-session. |
| Data | `scripts/build-content.mjs` | Plain-text content in `content/` → `public/data/<key>.<hash>.json` + `src/generated/data-manifest.json`. Hashed names make each URL immutable. Bad lines fail the build. |
| Engine | `src/core/sarf/engine.js` | A verbatim copy of the original engine (handoff doc 05 says not to "clean it up"), typed by `engine.d.ts`. All 33 × 10 test vectors pass. |
| State | `localStorage`, prefix `sm:` | Same keys as before, so existing users keep their settings. Flashcard progress now uses stable ids (`root:bab`, `book:hash`), with a one-time migration from the old position-based `sm:known`. |

```
content/            human-edited source (core tables, qawaid/fiqh/usool markdown, hadith txt)
scripts/            build-content.mjs (runs before dev/build/test); one-off/ migration from the handoff
src/core/           pure logic: sarf engine, bab notes, text normalisers + inline-Arabic + highlighting
src/data/           loader, types, core parsing, indexes, lexicon, search matchers, Maker resolution
src/state/          prefs (sm:*), known set
src/platform/       speech, toast bus
src/features/       home, masadir, gardaan (panel), maker, refbook (×4 screens), hadith, vocab, study
src/app/            shell: header, dock, sheet, toast, update prompt
tests/              engine vectors + acceptance tests from handoff doc 10 §C
schemas/            JSON Schemas (core.schema.json is v2: arrays instead of pipe strings)
docs/handoff/       the original spec pack and reference screenshots
```

Deviations from the handoff, on purpose:
- `core.json` stores arrays instead of pipe-delimited strings (doc 10 §D suggests this). All other data files are byte-identical to the original build.
- Hadith numbers restart in every باب, not every part as doc 04 says, so a hadith id is `part:بابIndex:n`.
- In dark mode, filled controls use `--brand` rather than the light-green `--teal`, following doc 07's rule against white text on dark-mode primary.

## 2. Hosting

**Current choice: GitHub Pages** (`fahadmajeedrana.github.io/zad/`, built and deployed by `.github/workflows/pages.yml`).
- It's free, and it's the same address as v1, so installed apps and saved progress carry over.
- Pages has no rewrite rules, so the build copies `index.html` to `404.html` for deep links.

**Alternative: Azure Static Web Apps, Free plan.** Build with `BASE_PATH=/`, then add a `staticwebapp.config.json` with a `navigationFallback` to `/index.html`.

| | Free plan |
|---|---|
| Cost | $0 |
| Bandwidth | 100 GB/month. The Free plan has no overage billing, so it can't produce a surprise bill. A full first visit is about 3.5 MB, which allows roughly 25,000 fresh installs a month. |
| App size | 250 MB (we use about 4 MB) |
| Extras | Custom domain + free TLS, global CDN, 3 PR preview environments, built-in GitHub/Entra sign-in, managed Functions under `/api` |

**Which subscription.** Microsoft's terms say the monthly Visual Studio subscriber credit is for *individual dev/test only, not production*. A public app for students counts as production. Also check whether your VS Enterprise subscription comes through an employer. If it does, the subscription and its resources end when that does, and your employer's policy may cover personal projects. Recommended:
- **Production:** a personal **Pay-As-You-Go** subscription. The Free-tier resources below cost $0 there too. Only LLM tokens and a little storage are billed, and you'd set a budget alert.
- **VS credit subscription:** dev/staging copies, experiments, embedding runs. Its spending limit is a useful safety net, because services stop when the credit runs out.

## 3. RAG design ("ask the books")

### Principles (from the product, doc 01)
The app adds no outside material. The assistant must therefore:
- answer **only** from retrieved passages, in Urdu;
- **cite** every claim (book · part · باب/topic · page) and show the passages under the answer;
- say "یہ بات کتابوں میں نہیں ملی" when retrieval finds nothing relevant;
- not issue rulings beyond the books' wording, and point the student to their teacher for that.

### Components

```
PWA "پوچھیں" screen ──POST /api/ask──▶ Azure Function (SWA managed, Free)
                                          │ 1. normalise query (gnorm/strip harakat)
                                          │ 2. embed query           ──▶ Azure OpenAI embeddings
                                          │ 3. hybrid search (BM25+vector, top 8) ──▶ Azure AI Search (Free)
                                          │ 4. grounded prompt + passages ──▶ Azure OpenAI chat ("mini" model)
                                          ◀ answer + citations (JSON)
Ingestion (local script / manual GitHub Action, not a Function):
  content/ + books/ → chunk with metadata → embed → upsert into the index
```

**Ingestion.** Run it as a script, not an always-on indexer (indexers and skillsets are restricted on the Free tier). Steps:
1. **Phase 1 uses existing content.** The topic summaries (467 topics) and 583 ahadith are already split into topic-sized chunks with book, part, باب and page metadata. This proves the whole pipeline before any new book arrives.
2. **Phase 2 adds full books** as `books/<book>/<part>.md` in the same heading style (`#` باب, `##` topic, `@ص` page). Chunk at about 800 characters, inside topic boundaries, with a small overlap. Every chunk carries its page.

**Index schema.** `id, book, part, bab, topic, page, kind (summary|hadith|book), text` (retrievable), `text_norm` (searchable; harakat stripped and gnorm-normalised at ingest, so search ignores hamza seats and ك/ک) and `vector` (512 dims, int8 scalar quantisation).

**Embeddings.** Use Azure OpenAI `text-embedding-3-small` with `dimensions: 512`. It is multilingual and cheap, and 512 dims plus quantisation keeps the index small.

**Will it fit the 50 MB Free index?** A rough estimate for 15 books × 300 pages is about 9,000 chunks. At ~1.6 KB of text, ~1.5 KB of inverted index and ~0.7 KB of vector plus graph each, that is ~35 MB. It fits, but it is tight.
- If it outgrows 50 MB, the next Azure AI Search tier (Basic) is a fixed monthly cost, roughly $75 at the time of writing. That's out of budget.
- **Escape hatch ($0):** store the int8 vectors and chunk metadata as a blob (~5 MB for 9k chunks), load it into the Function's memory, then do brute-force cosine plus a simple BM25. At this scale that takes milliseconds.
- Microsoft may also delete a Free search service after long inactivity. Keep ingestion reproducible so the index can be rebuilt in one command.

**API.** Put the function in `api/` as a Static Web Apps *managed* function: it's free, same-origin and needs no CORS. Its limits are HTTP triggers only, no managed identity, and keys stored in app settings. Start with non-streaming JSON answers. If you later want token streaming or other triggers, move to a separate **Flex Consumption** Function app (with a monthly free grant). Call it via CORS, because "bring your own Functions" linking needs SWA Standard, about $9/month.

**Model.** Use the cheapest current "mini" chat model in Azure OpenAI / Foundry. Microsoft-branded models can be paid from the VS credit, but *third-party branded products can't*, so Claude via Foundry Marketplace would need a card on a PAYG subscription. One question is about 4k input tokens (8 passages) plus about 500 output tokens, which is a fraction of a US cent. A thousand questions a month costs a few dollars at most; check current pricing before launch.

**Cost and abuse controls.**
- a per-IP daily limit in Azure Table Storage (pennies);
- a cap on `max_tokens` and passage count;
- a budget alert on the subscription;
- optionally, a class access code, or SWA built-in sign-in (GitHub/Entra only on Free, which students may not have).

**Offline.** The Ask screen needs a connection and says so. Everything else stays fully offline. Recent answers can be cached in IndexedDB.

**Content rights.** Handoff doc 11 says the books' wording belongs to their authors and publishers. Putting full book text behind a public chatbot is wider distribution than the current study summaries, so confirm permissions before Phase 2 goes public.

### Monthly cost summary

| Item | Cost |
|---|---|
| Static Web Apps Free (site + managed `/api`) | $0 |
| Azure AI Search Free (1 per subscription, 50 MB) | $0 |
| Azure OpenAI embeddings (one-off per re-index; ~9k chunks) | cents |
| Azure OpenAI chat (~1k questions) | ~$1–3 |
| Table Storage (rate limits) | cents |
| **Total** | **≈ $0–5/month** |
