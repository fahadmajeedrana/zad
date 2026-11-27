// 24px stroke icons (design/icons), currentColor.
const P = {
  home: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />,
  book: <path d="M3 5.5A3.5 3.5 0 0 1 6.5 2H12v18H6.5A3.5 3.5 0 0 0 3 23ZM21 5.5A3.5 3.5 0 0 0 17.5 2H12v18h5.5a3.5 3.5 0 0 1 3.5 3Z" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  cards: <><rect x="6" y="3" width="13" height="16" rx="2.5" /><path d="M4 7v12a2 2 0 0 0 2 2h10" /></>,
  pen: <><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></>,
  rules: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22Z" /><path d="M4 5.5V19a3 3 0 0 1 3-3h13M8 7h8M8 11h8" /></>,
  lang: <><path d="M4 5h8M8 3v2M5.5 9.5C7 12 9 13.5 11 14.5M10.5 5c-.8 3.6-3 6.6-6 8.5" /><path d="m13 20 4-9 4 9M14.5 17h5" /></>,
  quote: <><path d="M4 6h16v10H9l-5 4z" /><path d="M8 10h8M8 13h5" /></>,
  chain: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  scale: <><path d="M12 3v18M7 21h10M5 7h14" /><path d="m5 7-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z" /></>,
  quran: <><path d="M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z" /><path d="M20 4h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7z" /><path d="M7 8h2M15 8h2" /></>,
  roots: <path d="M12 3v7M12 10c-3 0-6 2-7 6M12 10c3 0 6 2 7 6M12 10v11M8 21h8" />,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
  speaker: <><path d="M11 5 6 9H3v6h3l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>,
};
export type IconName = keyof typeof P;

export function Icon({ name, size, stroke = 1.8 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name]}
    </svg>
  );
}

/** Brand mark: mihrab arch, crescent and open book. */
export function BrandMark() {
  return (
    <svg viewBox="40 20 432 470" aria-hidden="true">
      <path d="M105 360V210c0-72 58-113 151-178 93 65 151 106 151 178v150" fill="none" stroke="#E6B83F" strokeWidth="15" strokeLinecap="round" />
      <path transform="translate(256 176)" d="M28 11a48 48 0 1 1-53-53 39 39 0 0 0 53 53Z" fill="#FFF9E9" />
      <path d="M65 365Q164 322 256 391Q348 322 447 365L466 425Q354 390 256 472Q158 390 46 425Z" fill="#FFF9E9" />
      <path d="M256 391v81M65 365Q164 344 256 391Q348 344 447 365M46 427Q158 400 256 480Q354 400 466 427" fill="none" stroke="#E6B83F" strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}
