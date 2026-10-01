import type { PosterPalette, PosterPaletteKey } from './brand/brandKit';

/**
 * Layout a template is drawn at. `native` is a fixed artwork size (e.g. the
 * Growth Glimpse master); `target` means the template lays itself out at the
 * exact export size (brand logo).
 */
export type PosterSizeKey = 'portrait' | 'square' | 'story' | 'native' | 'target';

export type PosterSize = {
  key: PosterSizeKey;
  label: string;
  width: number;
  height: number;
};

export const POSTER_SIZES: Record<'portrait' | 'square' | 'story', PosterSize> = {
  portrait: { key: 'portrait', label: 'Portrait 4:5', width: 1080, height: 1350 },
  square: { key: 'square', label: 'Square 1:1', width: 1080, height: 1080 },
  story: { key: 'story', label: 'Story 9:16', width: 1080, height: 1920 },
};

export type PosterLayoutKey = keyof typeof POSTER_SIZES;

export type PosterTemplateKey =
  | 'growth_glimpse'
  | 'team_session'
  | 'speaker_session'
  | 'heritage_hero'
  | 'product_hero'
  | 'typographic_quote'
  | 'regional_message'
  | 'brand_logo'
  | 'birthday';

/** Editable poster content. Empty strings mean "hide this element". */
export type PosterData = {
  title: string;
  subtitle: string;
  scriptText: string;
  tagline: string;
  /** ISO yyyy-MM-dd; display parts are derived at render time. */
  dateIso: string | null;
  time: string;
  platform: string;
  speakerName: string;
  speakerRole: string;
  quote: string;
  quoteAuthor: string;
  malayalamLine: string;
  hashtag: string;
  /** Same-origin data URL so the export never taints the canvas. */
  heroImage: string | null;
  showContacts: boolean;
};

export type PosterFieldKey = Exclude<keyof PosterData, 'heroImage' | 'showContacts' | 'dateIso'>;

export type PosterTemplateProps = {
  data: PosterData;
  palette: PosterPalette;
  size: PosterSize;
};

export type PosterTemplateDefinition = {
  key: PosterTemplateKey;
  label: string;
  description: string;
  defaultPalette: PosterPaletteKey;
  /** Palettes offered in the studio; empty hides the picker (fixed artwork). */
  palettes: PosterPaletteKey[];
  /** Fields shown in the studio form for this template. */
  fields: PosterFieldKey[];
  fieldLabels?: Partial<Record<PosterFieldKey, string>>;
  usesHeroImage: boolean;
  heroImageLabel?: string;
  /** Layouts the template supports; the closest one to the export size is used. */
  layouts: PosterLayoutKey[];
  /** Fixed artwork size; overrides `layouts`. */
  nativeSize?: { width: number; height: number };
  /** Lays itself out at the exact export size instead of a fixed layout. */
  responsive?: boolean;
  showsDate: boolean;
};
