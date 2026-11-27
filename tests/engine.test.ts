// Acceptance test C1: the engine reproduces every vector exactly (harakat included).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as E from '../src/core/sarf/engine';

const V = JSON.parse(readFileSync(new URL('../test-vectors/sarf-engine.json', import.meta.url), 'utf8'));
// Compare as JSON so a missing vs undefined key (e.g. rubai) counts as a difference.
const same = (a: unknown, b: unknown) => expect(JSON.stringify(a)).toBe(JSON.stringify(b));

describe('sarf engine vectors', () => {
  it('has the expected vector counts', () => {
    expect(V.gardaan.length).toBe(33);
    expect(V.detectMasdar.length).toBe(17);
  });
  for (const c of V.gardaan) {
    it(`gardaan ${c.root.join('')} ${c.bab}`, () => {
      for (const g of E.GARDAAN_TYPES) same(E.gardaan(g.k, c.bab, c.root), c.forms[g.k]);
    });
  }
  it('sarfSagheer', () => { for (const c of V.sarfSagheer) same(E.sarfSagheer(c.bab, c.root), c.result); });
  it('rootKind', () => { for (const c of V.rootKind) expect(E.rootKind(c.root)).toBe(c.result); });
  it('detectMasdar', () => { for (const c of V.detectMasdar) same(E.detectMasdar(c.input), c.result); });
  it('normalisers', () => {
    for (const c of V.normalize) {
      expect(E.normalize(c.input)).toBe(c.normalize);
      expect(E.normRoot(c.input)).toBe(c.normRoot);
      expect(E.stripHarakat(c.input)).toBe(c.stripHarakat);
    }
  });
});
