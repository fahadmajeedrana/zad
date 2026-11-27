import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted Amiri (OFL): bundled and precached, so text renders correctly offline from the first visit.
import '@fontsource/amiri/arabic-400.css';
import '@fontsource/amiri/arabic-700.css';
import '@fontsource/amiri/latin-400.css';
import '@fontsource/amiri/latin-700.css';
import './styles/tokens.css';
import './styles/app.css';
import { getPref } from './state/prefs';
import { App } from './app/App';

// Apply the saved theme before first paint.
const theme = getPref<string | null>('theme', null);
if (theme) document.documentElement.dataset.theme = theme;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
