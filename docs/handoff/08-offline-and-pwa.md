# 08 · Offline and PWA

## Requirements (keep these)

1. After one online visit, **every screen and every data file works offline**, including screens never opened while online.
2. A content update reaches users automatically, with no manual cache bumping.
3. Data files are immutable per URL. A changed file gets a new URL.
4. The app can be installed on Android, iOS and desktop, with correct icons.

## Current implementation

**Versioned data URLs.** At build time, each JSON file is hashed (first 10 hex chars of SHA-256) and referenced as `data/<key>.json?v=<hash>`. The URL map is inlined into the page.

**Service worker** (`src/sw.template.js` → `dist/sw.js`)
- `CACHE = 'zad-<ver>'`, where `ver` is a hash over all data hashes plus the page hash. Any content change gives a new cache.
- **install:** precache CORE (`./`, `index.html`, the manifest, all icons, every versioned data URL), then `skipWaiting()`.
- **activate:** delete every other `zad-*` cache, then `clients.claim()`.
- **fetch** (GET only; same origin plus Google Fonts):
  - Versioned data (`/data/` with `?v=`): **cache first**, no revalidation; network on a miss, stored if OK.
  - Everything else: **stale-while-revalidate**. Respond from the cache if present, while fetching an update in the background. Opaque responses (fonts) are cached too. If offline with nothing cached, a navigation falls back to `index.html`; anything else returns `Response.error()`.
- Registered from the page when `serviceWorker` exists and the protocol isn't `file:`.

**Gaps to fix in the rebuild**
- The **Amiri web font** is cached only after it's first fetched. If the first visit is offline-interrupted, the text falls back to another font. **Self-host Amiri** (OFL licence) and precache it.
- There is no "new version available" prompt. The new service worker takes over quietly and the next load shows new content. That's acceptable; optionally add a toast.

## Manifest (`dist/manifest.webmanifest`)

```json
{ "name": "زاد الطالب — Zad-ut-Talib", "short_name": "زاد الطالب", "lang": "ur", "dir": "rtl",
  "start_url": "./index.html", "scope": "./", "display": "standalone",
  "background_color": "#fff9e9", "theme_color": "#075b35",
  "icons": [ 192 png (any), 512 png (any), 512 maskable png, svg (any) ] }
```

Page head extras: `theme-color #075b35`, an SVG favicon plus a 32px PNG, `apple-touch-icon.png` (180px, full-bleed), `apple-mobile-web-app-status-bar-style: black-translucent` and `viewport-fit=cover`.

## Install prompt

The app catches `beforeinstallprompt`, stops the default mini-bar and shows its own **انسٹال کریں** button in the header. Clicking it calls `prompt()`, waits for `userChoice` and hides the button. On iOS there's no event, so the button never appears (users install through Share → Add to Home Screen). Optionally add an iOS hint.

## Hosting

The app is plain static files. It needs no server rewrites as long as routing stays hash based (doc 03). GitHub Pages serves it as is. Keep paths **relative** (`./`), so it works under a project sub-path.
