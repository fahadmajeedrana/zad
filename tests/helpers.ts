import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../src/generated/data-manifest.json', import.meta.url), 'utf8'));

export const meta = manifest.meta as Record<string, number>;
export const readData = <T = unknown>(k: string): T =>
  JSON.parse(readFileSync(new URL('../public/' + manifest.files[k], import.meta.url), 'utf8'));
export const readJson = <T = unknown>(rel: string): T => JSON.parse(readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
