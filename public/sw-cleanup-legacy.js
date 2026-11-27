// Imported by the generated service worker. The previous app (v1) cached everything under
// 'zad-<hash>' caches; once v2 activates they're dead weight (~2.5 MB), so remove them.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => /^zad-[0-9a-f]+$/.test(k)).map((k) => caches.delete(k)))),
  );
});
