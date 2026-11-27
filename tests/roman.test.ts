// Roman Urdu → Urdu script for semantic search (src/core/roman.js).
import { describe, expect, it } from 'vitest';
import { buildLexicon, distance, lexiconTexts, romanKey, transliterate, urduKey } from '../src/core/roman';
import type { HadithPart, RefSection } from '../src/data/types';
import { readData } from './helpers';

const lex = buildLexicon(lexiconTexts(['guide', 'fiqh', 'uhadith', 'tafsir'].map((k) => readData<RefSection[]>(k)), readData<HadithPart[]>('hadith')));
const tr = (q: string) => transliterate(lex, q, { terms: false }); // test the sound matching, not the term list

describe('sound keys', () => {
  it('Urdu', () => {
    expect(urduKey('وضو')).toBe('WzW');
    expect(urduKey('روزہ')).toBe('rWzH');
    expect(urduKey('زکوٰۃ')).toBe('zkAT'); // و with dagger alif reads as alif
    expect(urduKey('خبر')).toBe('xbr');
  });
  it('Roman', () => {
    expect(romanKey('wuzu')).toBe('wuzu');
    expect(romanKey('khabar')).toBe('xabar');
    expect(romanKey('taaruf')).toBe('tAruf');
    expect(romanKey('zaroori')).toBe('zarUri');
  });
  it('unwritten short vowels are cheap, missing consonants are not', () => {
    expect(distance(romanKey('wuzu'), urduKey('وضو'))).toBeLessThan(0.5);
    expect(distance(romanKey('wuzu'), urduKey('وزن'))).toBeGreaterThan(1);
  });
});

describe('transliterate with the books\' vocabulary', () => {
  const cases: [string, string][] = [
    ['wuzu', 'وضو'], ['zakat', 'زکوۃ'], ['taaruf', 'تعارف'], ['amaal', 'اعمال'], ['ghusl', 'غسل'], ['tayammum', 'تیمم'],
    ['muannas', 'مؤنث'], ['khabar', 'خبر'], ['mufsidaat', 'مفسدات'], ['hazrat usman', 'حضرت عثمان'],
  ];
  for (const [r, u] of cases) it(`${r} → ${u}`, () => expect(tr(r)).toBe(u));
  it('grammar words come from the fixed list; izafat "e" is dropped', () => {
    expect(tr('talaq e kinaya kya hai?')).toBe('طلاق کنایہ کیا ہے؟');
  });
  it('Urdu-script words pass through', () => expect(tr('nikah کے ارکان')).toBe('نکاح کے ارکان'));
});
