// Subject registry (doc 03): adding a book = add content + one entry here.
import type { Core } from '../../data/core';
import { DATA_META } from '../../data/loader';
import type { View } from '../../router';
import type { IconName } from '../../ui/icons';

export interface Section { v?: View; n: string; d: string; i: IconName; count?: (c: Core) => string; soon?: boolean }
export interface Subject { k: string; n: string; d: string; i: IconName; soon?: boolean; secs: Section[] }

export const SUBJECTS: Subject[] = [
  { k: 'arabi', n: 'عربی زبان', d: 'صرف، نحو، مصادر اور قرآنی ذخیرہ الفاظ', i: 'lang', secs: [
    { v: 'masadir', n: 'صفوۃ المصادر', d: 'مصادر کی فہرست اور گردانیں', i: 'grid', count: (c) => `${c.ownCount} مصادر` },
    { v: 'qawaid', n: 'قواعد', d: 'کتاب الصرف و کتاب النحو کا خلاصہ', i: 'rules', count: () => `${DATA_META.guide} عنوانات` },
    { v: 'vocab', n: 'ذخیرہ الفاظ', d: 'قصص النبیین، صرف و نحو کی کتب', i: 'book', count: (c) => `${c.WORDS.length + c.VERBS.length} الفاظ` },
    { v: 'study', n: 'فلیش کارڈ', d: 'مصادر اور الفاظ کی دہرائی', i: 'cards' },
    { v: 'maker', n: 'گردان ساز', d: 'کسی بھی مصدر کی گردان', i: 'pen' },
  ] },
  { k: 'hadees', n: 'حدیث', d: 'احادیث کا متن، ترجمہ اور الفاظ', i: 'quote', secs: [
    { v: 'ahadith', n: 'کتاب الحدیث', d: 'حصہ اول، دوم و سوم (لفظی و بامحاورہ ترجمہ)', i: 'quote', count: () => `${DATA_META.hadith} احادیث` },
    { v: 'uhadith', n: 'اصول حدیث', d: 'حجیتِ حدیث، اصطلاحات، کتبِ احادیث اور اہم اصول', i: 'chain', count: () => `${DATA_META.uhadith} عنوانات` },
  ] },
  { k: 'fiqh', n: 'فقہ', d: 'عبادات اور عائلی احکام و مسائل کا خلاصہ', i: 'scale', secs: [
    { v: 'fiqh', n: 'کتاب الفقہ', d: 'حصہ اول: عبادات · حصہ دوم: نکاح، رضاعت، طلاق، قسم', i: 'scale', count: () => `${DATA_META.fiqh} عنوانات` },
    { n: 'اصول فقہ', d: 'اصول فقہ کے قواعد', i: 'roots', soon: true },
  ] },
  { k: 'tafsir', n: 'تفسیر', d: 'علوم القرآن اور اصولِ تفسیر', i: 'quran', secs: [
    { v: 'tafsir', n: 'اصول تفسیر', d: 'وحی، نزول، جمعِ قرآن، قراءات، نسخ اور مآخذِ تفسیر', i: 'quran', count: () => `${DATA_META.tafsir} عنوانات` },
  ] },
];

export const SUB_OF: Partial<Record<View, string>> = {};
for (const s of SUBJECTS) for (const x of s.secs) if (x.v) SUB_OF[x.v] = s.k;
