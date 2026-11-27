// Acceptance tests from docs/handoff/10-migration-checklist.md §C (data, counts, search, Maker, linking).
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';
import { buildCore, matchMasdar, migrateKnown, resolveMaker } from '../src/data/core';
import { gnorm, segmentInlineArabic, highlightParts, vnorm, toNom, accus } from '../src/core/text';
import type { CoreRaw, HadithPart, RefSection } from '../src/data/types';
import { meta, readData, readJson } from './helpers';

const core = buildCore(readData<CoreRaw>('core'));
const prepRef = (d: RefSection[]) => { d.forEach((b) => b.x.forEach((t) => { t.s = gnorm(t.t + ' ' + t.i.map((x) => x[1]).join(' ')); })); return d; };

describe('C2 data files validate against schemas/', () => {
  const ajv = new Ajv2020({ allErrors: true });
  const cases: [string, string][] = [['core', 'schemas/core.schema.json'], ['hadith', 'schemas/hadith.schema.json'],
    ['guide', 'schemas/ref-book.schema.json'], ['fiqh', 'schemas/ref-book.schema.json'], ['uhadith', 'schemas/ref-book.schema.json'], ['tafsir', 'schemas/ref-book.schema.json']];
  for (const [k, schema] of cases) {
    it(k, () => {
      const validate = ajv.compile({ ...readJson<object>(schema), $id: undefined });
      const ok = validate(readData(k));
      expect(ok, JSON.stringify(validate.errors?.slice(0, 3))).toBe(true);
    });
  }
});

describe('C3 counts', () => {
  it('masadir: 305 own + 75 from verbs = 380', () => {
    expect(core.ownCount).toBe(305);
    expect(core.DATA.length).toBe(380);
  });
  it('home counts', () => {
    expect(meta).toEqual({ guide: 216, hadith: 583, fiqh: 174, uhadith: 43, tafsir: 34 });
    expect(core.WORDS.length + core.VERBS.length).toBe(1505);
  });
  it('stable ids are unique', () => {
    expect(new Set(core.DATA.map((d) => d.id)).size).toBe(core.DATA.length);
    expect(new Set(core.WORDS.map((w) => w.id)).size).toBe(core.WORDS.length);
  });
});

describe('C4 search examples', () => {
  const masadir = (q: string) => core.DATA.filter((d) => matchMasdar(d, q)).map((d) => d.m);
  it('masadir نصر → نَصْرٌ', () => expect(masadir('نصر')).toContain('نَصْرٌ'));
  it('masadir root "ق و ل" → قَوْلٌ', () => expect(masadir('ق و ل')).toContain('قَوْلٌ'));
  it('masadir Urdu لکھنا → كِتَابَةٌ', () => expect(masadir('لکھنا')).toContain('كِتَابَةٌ'));
  it('tafsir عثمانی → 2+ topics', () => {
    const qn = gnorm('عثمانی').trim();
    const n = prepRef(readData<RefSection[]>('tafsir')).reduce((a, b) => a + b.x.filter((t) => t.s!.includes(qn)).length, 0);
    expect(n).toBeGreaterThanOrEqual(2);
  });
  it('hadith نیت → includes h1 #1', () => {
    const qn = gnorm('نیت').trim();
    const h1 = readData<HadithPart[]>('hadith')[0];
    const hits = h1.b[0].h.filter((x) => gnorm(x.a + ' ' + x.u + ' ' + x.s + ' ' + x.w.map((w) => w.join(' ')).join(' ')).includes(qn));
    expect(hits.map((x) => x.n)).toContain(1);
  });
});

describe('C5 Maker', () => {
  it('اِسْتِغْفَار → استفعال, root غ ف ر', () => {
    const r = resolveMaker(core, 'اِسْتِغْفَار')!;
    expect(r.bab).toBe('st');
    expect(r.root).toEqual(['غ', 'ف', 'ر']);
  });
  it('قِرَاءَة → exact list match: root ق ر ء, bab فَتَحَ', () => {
    const r = resolveMaker(core, 'قِرَاءَة')!;
    expect(r.root).toEqual(['ق', 'ر', 'ء']);
    expect(r.bab).toBe('f');
  });
  it('سُؤَال → root س ء ل with the مجرد bab from the lexicon (فَتَحَ)', () => {
    const r = resolveMaker(core, 'سُؤَال')!;
    expect(r.root).toEqual(['س', 'ء', 'ل']);
    expect(r.bab).toBe('f');
  });
});

describe('C6 linking', () => {
  const linked = core.WORDS.filter((w) => w.g);
  it('25 vocabulary words link to a masdar', () => expect(linked.length).toBe(25));
  it('includes لِقَاءٌ, جَزَاءٌ, حَمْدٌ', () => {
    const a = linked.map((w) => w.a);
    for (const x of ['لِقَاءٌ', 'جَزَاءٌ', 'حَمْدٌ']) expect(a).toContain(x);
  });
  it('phrases never link', () => expect(linked.every((w) => !/[\s:[]/.test(w.a.trim()))).toBe(true));
});

describe('known-set migration (doc 10 §A)', () => {
  it('maps legacy positions to stable ids', () => {
    const ids = migrateKnown(core, [0, 305, 'w0', 'w5', 9999, 'junk']);
    expect(ids).toEqual([core.DATA[0].id, core.DATA[305].id, core.WORDS[0].id, core.WORDS[5].id]);
    expect(core.DATA[305].src).toBeDefined(); // first verb-derived entry
  });
});

describe('text helpers', () => {
  it('toNom / accus', () => {
    expect(toNom('ظُلْمًا')).toBe('ظُلْمٌ');
    expect(accus('كِتَابَةٌ')).toBe('كِتَابَةً');
  });
  it('vnorm drops article, tanween and final vowel', () => expect(vnorm('اَلْحَمْدُ')).toBe(vnorm('حَمْدٌ')));
  it('inline Arabic: words with 2+ marks are examples, izafat zer stays plain', () => {
    const segs = segmentInlineArabic('مثال: ضَرَبَ زَيْدٌ، علمِ صرف');
    expect(segs.filter((s) => s.ex).map((s) => s.t)).toEqual(['ضَرَبَ زَيْدٌ']);
    expect(segs.map((s) => s.t).join('')).toBe('مثال: ضَرَبَ زَيْدٌ، علمِ صرف');
  });
  it('highlight only for 2+ chars', () => {
    expect(highlightParts('نیت کا بیان', 'ن')).toEqual([{ t: 'نیت کا بیان' }]);
    expect(highlightParts('نیت کا بیان', 'نیت')).toEqual([{ t: 'نیت', m: true }, { t: ' کا بیان' }]);
  });
});
