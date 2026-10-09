/**
 * CODO brand constants shared by every poster template.
 * Why: posters are exported as flat images, so contact details and colours
 * must come from one place instead of being typed per design.
 */
export const CODO_BRAND = {
  name: 'CODO',
  fullName: 'CODO AI Innovations',
  website: 'www.codoai.in',
  email: 'info@codoai.in',
  phone: '+91 8086 995 559',
  hashtag: '#codocrew',
} as const;

export type PosterPaletteKey =
  | 'growthGreen'
  | 'codoNavy'
  | 'verdant'
  | 'limePulse'
  | 'heritage'
  | 'espresso'
  | 'parchment'
  | 'saffron'
  | 'rosewood'
  | 'clay'
  | 'honey'
  | 'ocean'
  | 'tealMist'
  | 'arctic'
  | 'slate'
  | 'cobalt'
  | 'indigoDusk'
  | 'midnight'
  | 'charcoal'
  | 'inkWell'
  | 'forestNight'
  | 'crimson'
  | 'berry'
  | 'sunset'
  | 'stone'
  | 'bone'
  | 'graphite'
  | 'mist'
  | 'ivory'
  | 'monsoon'
  | 'lotus'
  | 'sandstorm'
  | 'logoBlack'
  | 'logoWhite';

export type PaletteCategoryId = 'brand' | 'warm' | 'cool' | 'bold' | 'neutral' | 'night' | 'special';

export type PosterPalette = {
  key: PosterPaletteKey;
  label: string;
  category: PaletteCategoryId;
  background: string;
  backgroundAlt: string;
  ink: string;
  inkMuted: string;
  accent: string;
  accentSoft: string;
  /** Which official logo lockup contrasts with this background. */
  logo: 'dark' | 'light';
};

export const POSTER_PALETTES: Record<PosterPaletteKey, PosterPalette> = {
  // —— Brand ——
  growthGreen: {
    key: 'growthGreen',
    label: 'Growth Green',
    category: 'brand',
    background: '#0F8A4F',
    backgroundAlt: '#0B6B3D',
    ink: '#FFFFFF',
    inkMuted: 'rgba(255,255,255,0.82)',
    accent: '#3EE07F',
    accentSoft: 'rgba(255,255,255,0.12)',
    logo: 'light',
  },
  codoNavy: {
    key: 'codoNavy',
    label: 'CODO Navy',
    category: 'brand',
    background: '#0B1F33',
    backgroundAlt: '#071525',
    ink: '#FFFFFF',
    inkMuted: 'rgba(255,255,255,0.78)',
    accent: '#2EB660',
    accentSoft: 'rgba(46,182,96,0.18)',
    logo: 'light',
  },
  verdant: {
    key: 'verdant',
    label: 'Verdant',
    category: 'brand',
    background: '#145C3A',
    backgroundAlt: '#0E4630',
    ink: '#F4FFF8',
    inkMuted: 'rgba(244,255,248,0.8)',
    accent: '#7DFFB2',
    accentSoft: 'rgba(125,255,178,0.14)',
    logo: 'light',
  },
  limePulse: {
    key: 'limePulse',
    label: 'Lime Pulse',
    category: 'brand',
    background: '#1A9B4A',
    backgroundAlt: '#127A38',
    ink: '#FFFFFF',
    inkMuted: 'rgba(255,255,255,0.85)',
    accent: '#C8FF4D',
    accentSoft: 'rgba(200,255,77,0.16)',
    logo: 'light',
  },

  // —— Warm ——
  heritage: {
    key: 'heritage',
    label: 'Heritage',
    category: 'warm',
    background: '#F7F6F3',
    backgroundAlt: '#ECEAE4',
    ink: '#2E2622',
    inkMuted: '#6B5D52',
    accent: '#A88763',
    accentSoft: 'rgba(168,135,99,0.18)',
    logo: 'dark',
  },
  espresso: {
    key: 'espresso',
    label: 'Espresso',
    category: 'warm',
    background: '#FDF6EA',
    backgroundAlt: '#F3E7D3',
    ink: '#4A2C22',
    inkMuted: '#7A5A4A',
    accent: '#8B5A3C',
    accentSoft: 'rgba(139,90,60,0.14)',
    logo: 'dark',
  },
  parchment: {
    key: 'parchment',
    label: 'Parchment',
    category: 'warm',
    background: '#F3EBDD',
    backgroundAlt: '#E8DCC6',
    ink: '#5E1A1D',
    inkMuted: '#3A2A26',
    accent: '#6E1F22',
    accentSoft: 'rgba(110,31,34,0.12)',
    logo: 'dark',
  },
  saffron: {
    key: 'saffron',
    label: 'Saffron',
    category: 'warm',
    background: '#FFF4E0',
    backgroundAlt: '#FFE4B8',
    ink: '#3D2208',
    inkMuted: '#7A4A1A',
    accent: '#E08A1A',
    accentSoft: 'rgba(224,138,26,0.16)',
    logo: 'dark',
  },
  rosewood: {
    key: 'rosewood',
    label: 'Rosewood',
    category: 'warm',
    background: '#F8ECEC',
    backgroundAlt: '#EEDADA',
    ink: '#4A1C24',
    inkMuted: '#7A4550',
    accent: '#A33B52',
    accentSoft: 'rgba(163,59,82,0.14)',
    logo: 'dark',
  },
  clay: {
    key: 'clay',
    label: 'Clay',
    category: 'warm',
    background: '#E8D5C4',
    backgroundAlt: '#D9C0A8',
    ink: '#3A2A22',
    inkMuted: '#6B5346',
    accent: '#B56B45',
    accentSoft: 'rgba(181,107,69,0.16)',
    logo: 'dark',
  },
  honey: {
    key: 'honey',
    label: 'Honey',
    category: 'warm',
    background: '#FFF8E7',
    backgroundAlt: '#F5E6C0',
    ink: '#3F2E0A',
    inkMuted: '#7A6230',
    accent: '#C9A227',
    accentSoft: 'rgba(201,162,39,0.16)',
    logo: 'dark',
  },

  // —— Cool ——
  ocean: {
    key: 'ocean',
    label: 'Ocean',
    category: 'cool',
    background: '#0B6E8A',
    backgroundAlt: '#08556B',
    ink: '#FFFFFF',
    inkMuted: 'rgba(255,255,255,0.82)',
    accent: '#5EE0FF',
    accentSoft: 'rgba(94,224,255,0.16)',
    logo: 'light',
  },
  tealMist: {
    key: 'tealMist',
    label: 'Teal Mist',
    category: 'cool',
    background: '#E6F4F2',
    backgroundAlt: '#D0EAE6',
    ink: '#0F3D3A',
    inkMuted: '#3D6B66',
    accent: '#1A9B8E',
    accentSoft: 'rgba(26,155,142,0.14)',
    logo: 'dark',
  },
  arctic: {
    key: 'arctic',
    label: 'Arctic',
    category: 'cool',
    background: '#EAF2F8',
    backgroundAlt: '#D6E4F0',
    ink: '#13283A',
    inkMuted: '#4A6478',
    accent: '#2F6FAE',
    accentSoft: 'rgba(47,111,174,0.14)',
    logo: 'dark',
  },
  slate: {
    key: 'slate',
    label: 'Slate',
    category: 'cool',
    background: '#3D4F5F',
    backgroundAlt: '#2E3C49',
    ink: '#F4F7FA',
    inkMuted: 'rgba(244,247,250,0.8)',
    accent: '#8EC5E8',
    accentSoft: 'rgba(142,197,232,0.16)',
    logo: 'light',
  },
  cobalt: {
    key: 'cobalt',
    label: 'Cobalt',
    category: 'cool',
    background: '#1E3A8A',
    backgroundAlt: '#172554',
    ink: '#FFFFFF',
    inkMuted: 'rgba(255,255,255,0.82)',
    accent: '#60A5FA',
    accentSoft: 'rgba(96,165,250,0.16)',
    logo: 'light',
  },
  indigoDusk: {
    key: 'indigoDusk',
    label: 'Indigo Dusk',
    category: 'cool',
    background: '#2A2150',
    backgroundAlt: '#1C1638',
    ink: '#F5F2FF',
    inkMuted: 'rgba(245,242,255,0.8)',
    accent: '#A78BFA',
    accentSoft: 'rgba(167,139,250,0.16)',
    logo: 'light',
  },

  // —— Bold ——
  crimson: {
    key: 'crimson',
    label: 'Crimson',
    category: 'bold',
    background: '#8B1E2D',
    backgroundAlt: '#6B1522',
    ink: '#FFFFFF',
    inkMuted: 'rgba(255,255,255,0.82)',
    accent: '#FF8A9A',
    accentSoft: 'rgba(255,138,154,0.16)',
    logo: 'light',
  },
  berry: {
    key: 'berry',
    label: 'Berry',
    category: 'bold',
    background: '#6B2D5B',
    backgroundAlt: '#4E2143',
    ink: '#FFF5FB',
    inkMuted: 'rgba(255,245,251,0.82)',
    accent: '#F472B6',
    accentSoft: 'rgba(244,114,182,0.16)',
    logo: 'light',
  },
  sunset: {
    key: 'sunset',
    label: 'Sunset',
    category: 'bold',
    background: '#FF6B35',
    backgroundAlt: '#E85A28',
    ink: '#1A0A04',
    inkMuted: 'rgba(26,10,4,0.75)',
    accent: '#FFE08A',
    accentSoft: 'rgba(255,224,138,0.22)',
    logo: 'dark',
  },
  lotus: {
    key: 'lotus',
    label: 'Lotus',
    category: 'bold',
    background: '#FCE7F0',
    backgroundAlt: '#F5D0E0',
    ink: '#5B1A38',
    inkMuted: '#8B4568',
    accent: '#DB2777',
    accentSoft: 'rgba(219,39,119,0.14)',
    logo: 'dark',
  },
  sandstorm: {
    key: 'sandstorm',
    label: 'Sandstorm',
    category: 'bold',
    background: '#D4A373',
    backgroundAlt: '#C08B58',
    ink: '#2A1A0C',
    inkMuted: '#5C4030',
    accent: '#FFF3E0',
    accentSoft: 'rgba(255,243,224,0.22)',
    logo: 'dark',
  },

  // —— Neutral ——
  stone: {
    key: 'stone',
    label: 'Stone',
    category: 'neutral',
    background: '#F0EDE8',
    backgroundAlt: '#E2DDD5',
    ink: '#2C2A26',
    inkMuted: '#6B6660',
    accent: '#8A847A',
    accentSoft: 'rgba(138,132,122,0.16)',
    logo: 'dark',
  },
  bone: {
    key: 'bone',
    label: 'Bone',
    category: 'neutral',
    background: '#FAF8F5',
    backgroundAlt: '#F0EBE3',
    ink: '#1F1C18',
    inkMuted: '#5C564E',
    accent: '#A39A8C',
    accentSoft: 'rgba(163,154,140,0.16)',
    logo: 'dark',
  },
  graphite: {
    key: 'graphite',
    label: 'Graphite',
    category: 'neutral',
    background: '#4A4A4A',
    backgroundAlt: '#363636',
    ink: '#FAFAFA',
    inkMuted: 'rgba(250,250,250,0.8)',
    accent: '#C4C4C4',
    accentSoft: 'rgba(196,196,196,0.16)',
    logo: 'light',
  },
  mist: {
    key: 'mist',
    label: 'Mist',
    category: 'neutral',
    background: '#EEF1F4',
    backgroundAlt: '#DEE3E8',
    ink: '#1E2933',
    inkMuted: '#5A6A78',
    accent: '#64748B',
    accentSoft: 'rgba(100,116,139,0.14)',
    logo: 'dark',
  },
  ivory: {
    key: 'ivory',
    label: 'Ivory',
    category: 'neutral',
    background: '#FFFEF9',
    backgroundAlt: '#F5F0E6',
    ink: '#2A2418',
    inkMuted: '#6B6254',
    accent: '#B8A989',
    accentSoft: 'rgba(184,169,137,0.16)',
    logo: 'dark',
  },
  monsoon: {
    key: 'monsoon',
    label: 'Monsoon',
    category: 'neutral',
    background: '#D9E2E8',
    backgroundAlt: '#C5D2DB',
    ink: '#1A2C38',
    inkMuted: '#4A6270',
    accent: '#3D7A96',
    accentSoft: 'rgba(61,122,150,0.14)',
    logo: 'dark',
  },

  // —— Night ——
  midnight: {
    key: 'midnight',
    label: 'Midnight',
    category: 'night',
    background: '#0D1117',
    backgroundAlt: '#010409',
    ink: '#F0F6FC',
    inkMuted: 'rgba(240,246,252,0.78)',
    accent: '#58A6FF',
    accentSoft: 'rgba(88,166,255,0.16)',
    logo: 'light',
  },
  charcoal: {
    key: 'charcoal',
    label: 'Charcoal',
    category: 'night',
    background: '#1C1917',
    backgroundAlt: '#0C0A09',
    ink: '#FAFAF9',
    inkMuted: 'rgba(250,250,249,0.78)',
    accent: '#FBBF24',
    accentSoft: 'rgba(251,191,36,0.16)',
    logo: 'light',
  },
  inkWell: {
    key: 'inkWell',
    label: 'Ink Well',
    category: 'night',
    background: '#111827',
    backgroundAlt: '#030712',
    ink: '#F9FAFB',
    inkMuted: 'rgba(249,250,251,0.78)',
    accent: '#34D399',
    accentSoft: 'rgba(52,211,153,0.16)',
    logo: 'light',
  },
  forestNight: {
    key: 'forestNight',
    label: 'Forest Night',
    category: 'night',
    background: '#0A1F14',
    backgroundAlt: '#05140C',
    ink: '#ECFDF5',
    inkMuted: 'rgba(236,253,245,0.78)',
    accent: '#4ADE80',
    accentSoft: 'rgba(74,222,128,0.16)',
    logo: 'light',
  },

  // —— Special (logo / transparent) ——
  logoBlack: {
    key: 'logoBlack',
    label: 'Black · transparent',
    category: 'special',
    background: 'transparent',
    backgroundAlt: 'transparent',
    ink: '#111111',
    inkMuted: '#111111',
    accent: '#111111',
    accentSoft: 'transparent',
    logo: 'dark',
  },
  logoWhite: {
    key: 'logoWhite',
    label: 'White · transparent',
    category: 'special',
    background: 'transparent',
    backgroundAlt: 'transparent',
    ink: '#FFFFFF',
    inkMuted: '#FFFFFF',
    accent: '#FFFFFF',
    accentSoft: 'transparent',
    logo: 'light',
  },
};

export const PALETTE_CATEGORY_META: Record<
  PaletteCategoryId,
  { label: string; hint: string }
> = {
  brand: { label: 'Brand', hint: 'CODO greens & navy' },
  warm: { label: 'Warm', hint: 'Paper, spice, earth' },
  cool: { label: 'Cool', hint: 'Ocean & sky' },
  bold: { label: 'Bold', hint: 'High-impact colour' },
  neutral: { label: 'Neutral', hint: 'Quiet studio tones' },
  night: { label: 'Night', hint: 'Dark stage looks' },
  special: { label: 'Special', hint: 'Transparent lockups' },
};

/** All studio colourways except transparent logo variants. */
export const STANDARD_PALETTES: PosterPaletteKey[] = (
  Object.keys(POSTER_PALETTES) as PosterPaletteKey[]
).filter((k) => POSTER_PALETTES[k].category !== 'special');

export function palettesInCategory(
  keys: PosterPaletteKey[],
  category: PaletteCategoryId | 'all'
): PosterPaletteKey[] {
  if (category === 'all') return keys;
  return keys.filter((k) => POSTER_PALETTES[k].category === category);
}

export function categoriesForPalettes(keys: PosterPaletteKey[]): PaletteCategoryId[] {
  const seen = new Set<PaletteCategoryId>();
  for (const k of keys) seen.add(POSTER_PALETTES[k].category);
  const order: PaletteCategoryId[] = ['brand', 'warm', 'cool', 'bold', 'neutral', 'night', 'special'];
  return order.filter((c) => seen.has(c));
}

/** Brand navy / green used by the SVG mark fallback (matches agency masters). */
export const LOGO_COLORS = {
  dark: '#0B1F33',
  light: '#FFFFFF',
  accent: '#2EB660',
} as const;

/**
 * Official CODO agency logo assets (masters in public/, optimized under /posters/).
 *
 * | Key   | Master file                      | Use on                          |
 * |-------|----------------------------------|---------------------------------|
 * | dark  | Logo Agnecy.Bluepng.png          | Light / cream / parchment bg    |
 * | light | Logo Agnecy.png                  | Dark / green / branded bg       |
 * | full  | CODO AI INNOVATION blue.png      | Wide banners / website lockups  |
 */
export const CODO_LOGO_ASSETS = {
  dark: { src: '/posters/codo-logo-dark.webp', width: 1060, height: 546 },
  light: { src: '/posters/codo-logo-light.webp', width: 1060, height: 546 },
  full: { src: '/posters/codo-logo-full.webp', width: 2000, height: 664 },
} as const;

export type CodoLogoAssetKey = keyof typeof CODO_LOGO_ASSETS;

/** Pick the official lockup that contrasts with the active palette background. */
export function logoAssetForPalette(palette: Pick<PosterPalette, 'logo'>): Exclude<CodoLogoAssetKey, 'full'> {
  return palette.logo === 'light' ? 'light' : 'dark';
}
