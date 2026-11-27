export interface LexEntry { w: string; k: string; f: number; lf: number }
export function urduKey(word: string): string;
export function romanKey(word: string): string;
export function distance(r: string, u: string, limit?: number): number;
/** Texts, or [text, weight] pairs (titles carry the subject terms, so they are weighted up). */
export function buildLexicon(texts: Iterable<string | [string, number]>): LexEntry[];
export function matchWord(lex: LexEntry[], roman: string): string | null;
export function hasLatin(s: string): boolean;
export function transliterate(lex: LexEntry[], query: string, opts?: { terms?: boolean }): string;

type Sec = { n: string; x: { t: string; i: [number, string, number?][] }[] };
type Part = { b: { t: string; h: { u: string }[] }[] };
export function lexiconTexts(refBooks: Sec[][], hadith: Part[]): (string | [string, number])[];
