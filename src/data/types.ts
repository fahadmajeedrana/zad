import type { BabCode } from '../core/sarf/engine';

export type BookCode = 'q1' | 's1' | 's2' | 'n1' | 'n2';

// ---- raw file shapes (scripts/build-content.mjs, schemas/) ----
export interface CoreRaw {
  /** [masdar, root, bab, urdu] */
  masadir: [string, string, BabCode, string][];
  /** [book, section, madi, mudari, amr, masdar, root, urdu, quranCount, bab] */
  verbs: [BookCode, string, string, string, string, string, string, string, number | null, BabCode | ''][];
  /** [book, topic, arabic, urdu, quranCount] */
  vocab: [BookCode, string, string, string, number | null][];
  /** [root, "bab[.l|.m],…"] */
  roots: [string, string][];
  /** [root, bab, urdu] */
  meanings: [string, BabCode, string][];
  lessonDates: Record<string, string>;
}

export interface RefTopic {
  t: string;
  p: string;
  i: ([0 | 1, string] | [0 | 1, string, number])[];
  /** derived: position in section, from 1 */
  n?: number;
  /** derived: search key */
  s?: string;
}
export interface RefSection { k: string; n: string; x: RefTopic[] }

export interface Hadith {
  n: number;
  a: string;
  s: string;
  w: [string, string][];
  u: string;
  /** derived: search key */
  s2?: string;
}
export interface HadithBab { t: string; k: string; h: Hadith[]; i?: number }
export interface HadithPart { k: string; n: string; b: HadithBab[] }

// ---- parsed records ----
export interface Masdar {
  /** stable id: root:bab */
  id: string;
  /** position in the legacy list order (used only to migrate old progress) */
  idx: number;
  m: string;
  root: string[];
  b: BabCode;
  u: string;
  nm: string;
  nr: string;
  /** set for entries derived from the verb vocabulary */
  src?: BookCode;
}

export interface Verb {
  i: number;
  bk: BookCode;
  sec: string;
  madi: string;
  mud: string;
  amr: string;
  ms: string;
  root: string[];
  nr: string;
  u: string;
  c: number | null;
  b: BabCode | '';
  n: string;
}

export interface Word {
  /** stable id: book:hash(arabic|urdu)[~k] */
  id: string;
  idx: number;
  bk: BookCode;
  t: string;
  a: string;
  u: string;
  c: number | null;
  na: string;
  /** the masdar this word is exactly equal to, if any */
  g?: Masdar;
}

/** What the conjugation sheet needs to open. */
export interface SheetTarget {
  m: string;
  u: string;
  root: string[];
  b: BabCode;
  nr: string;
}
