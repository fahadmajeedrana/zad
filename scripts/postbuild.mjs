// GitHub Pages has no rewrite rules: serve the app for unknown paths (deep links like /zad/fiqh)
// by copying index.html to 404.html. After the first visit the service worker handles routing.
import { copyFileSync } from 'node:fs';
copyFileSync('dist/index.html', 'dist/404.html');
console.log('dist/404.html written');
