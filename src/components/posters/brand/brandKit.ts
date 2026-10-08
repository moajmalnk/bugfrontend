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
  | 'heritage'
  | 'espresso'
  | 'parchment'
  | 'logoBlack'
  | 'logoWhite';

export const STANDARD_PALETTES: PosterPaletteKey[] = ['growthGreen', 'heritage', 'espresso', 'parchment'];

export type PosterPalette = {
  key: PosterPaletteKey;
  label: string;
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
  growthGreen: {
    key: 'growthGreen',
    label: 'Growth Green',
    background: '#0F8A4F',
    backgroundAlt: '#0B6B3D',
    ink: '#FFFFFF',
    inkMuted: 'rgba(255,255,255,0.82)',
    accent: '#3EE07F',
    accentSoft: 'rgba(255,255,255,0.12)',
    logo: 'light',
  },
  heritage: {
    key: 'heritage',
    label: 'Heritage',
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
    background: '#F3EBDD',
    backgroundAlt: '#E8DCC6',
    ink: '#5E1A1D',
    inkMuted: '#3A2A26',
    accent: '#6E1F22',
    accentSoft: 'rgba(110,31,34,0.12)',
    logo: 'dark',
  },
  logoBlack: {
    key: 'logoBlack',
    label: 'Black · transparent',
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
    background: 'transparent',
    backgroundAlt: 'transparent',
    ink: '#FFFFFF',
    inkMuted: '#FFFFFF',
    accent: '#FFFFFF',
    accentSoft: 'transparent',
    logo: 'light',
  },
};

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
