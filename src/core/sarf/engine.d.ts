// Types for engine.js (kept as plain JS so it stays a verbatim port).

export type BabCode = 'n' | 'd' | 's' | 'f' | 'k' | 'h' | 'if' | 'tf' | 'mf' | 'ft' | 'nf' | 'tfl' | 'tfa' | 'st' | 'fl' | 'fy';
export type GardaanType = 'madiA' | 'madiP' | 'mudA' | 'mudP' | 'amrA' | 'amrP' | 'nahiA' | 'nahiP' | 'faail' | 'mafool';

export interface Bab {
  ar: string;
  ur: string;
  group: 'mujarrad' | 'mazeed';
  mv?: string;
  uv?: string;
  lazim?: boolean;
}

export interface RootInfo {
  R: string[];
  mithal: boolean;
  mudaaf: boolean;
  naqis: boolean;
  ajwaf: boolean;
  mahmuz: boolean;
}

export interface SarfSagheer {
  madi: string;
  mudari: string;
  madiP: string;
  mudariP: string;
  faail: string;
  mafool: string;
  amr: string;
  nahi: string;
  /** قیاسی masdar for مزید abwab; null for مجرد (سماعی). */
  masdar: string | null;
}

export interface Detected {
  root: string[];
  bab: BabCode | null;
  guessed: boolean;
  rubai?: boolean;
}

export const BABS: Record<BabCode, Bab>;
export const BAB_ORDER: BabCode[];
/** 14 rows: [urduLabel, arabicPronoun] */
export const SIGHA: [string, string][];
export const ISM_LABELS: [string, string][];
export const GARDAAN_TYPES: { k: GardaanType; ur: string }[];

export function gardaan(type: GardaanType, bab: BabCode, R: string[]): string[];
export function sarfSagheer(bab: BabCode, R: string[]): SarfSagheer;
export function masdarOf(bab: BabCode, ri: RootInfo): string | null;
export function rootInfo(R: string[]): RootInfo;
export function rootKind(R: string[]): string;
export function detectMasdar(input: string): Detected;
export function normalize(s: string): string;
export function normRoot(s: string): string;
export function stripHarakat(s: string): string;
