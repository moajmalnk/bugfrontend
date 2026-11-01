import type { PosterPaletteKey } from '../../brand/brandKit';
import type { PosterFieldKey, PosterTemplateGroup } from '../../types';

/**
 * Studio Library specs — layouts × treatments expand into 260 named templates.
 * Why: creators asked for ~300 Poster Studio options; hand-authoring that many
 * React trees is unmaintainable, so one engine reads these declarative specs.
 */

export type StudioLayoutId =
  | 'photo_left'
  | 'photo_right'
  | 'photo_circle'
  | 'photo_top'
  | 'photo_bleed'
  | 'date_hero'
  | 'ticket_band'
  | 'calendar_card'
  | 'agenda_rows'
  | 'save_badge'
  | 'bold_center'
  | 'swiss_rule'
  | 'side_rail'
  | 'big_day'
  | 'mesh_card'
  | 'quote_center'
  | 'quote_bar'
  | 'chat_pair'
  | 'fest_script'
  | 'medal_ring';

export type StudioTreatmentId =
  | 'clean'
  | 'paper'
  | 'night'
  | 'brand'
  | 'warm'
  | 'cool'
  | 'festoon'
  | 'orbit'
  | 'stripe'
  | 'stamp'
  | 'glass'
  | 'diagonal'
  | 'ribbon';

export type StudioLayoutSpec = {
  id: StudioLayoutId;
  label: string;
  group: PosterTemplateGroup;
  usesHeroImage: boolean;
  heroImageLabel?: string;
  fields: PosterFieldKey[];
  fieldLabels?: Partial<Record<PosterFieldKey, string>>;
};

export type StudioTreatmentSpec = {
  id: StudioTreatmentId;
  label: string;
  /** Hint shown in the template description. */
  hint: string;
  /** Default studio colourway for this treatment (layouts may override via rotation). */
  palette: PosterPaletteKey;
};

const SPEAKER_FIELDS: PosterFieldKey[] = [
  'title',
  'subtitle',
  'tagline',
  'time',
  'platform',
  'speakerName',
  'speakerRole',
  'hashtag',
];
const EVENT_FIELDS: PosterFieldKey[] = ['title', 'subtitle', 'tagline', 'time', 'platform', 'hashtag'];
const TYPE_FIELDS: PosterFieldKey[] = ['title', 'subtitle', 'tagline', 'malayalamLine', 'hashtag'];
const QUOTE_FIELDS: PosterFieldKey[] = ['title', 'quote', 'quoteAuthor', 'speakerName', 'speakerRole', 'hashtag'];
const FEST_FIELDS: PosterFieldKey[] = ['title', 'scriptText', 'malayalamLine', 'tagline', 'hashtag'];

export const STUDIO_LAYOUTS: readonly StudioLayoutSpec[] = [
  {
    id: 'photo_left',
    label: 'Photo Left',
    group: 'speaker',
    usesHeroImage: true,
    heroImageLabel: 'Speaker / hero photo',
    fields: SPEAKER_FIELDS,
  },
  {
    id: 'photo_right',
    label: 'Photo Right',
    group: 'speaker',
    usesHeroImage: true,
    heroImageLabel: 'Speaker / hero photo',
    fields: SPEAKER_FIELDS,
  },
  {
    id: 'photo_circle',
    label: 'Circle Portrait',
    group: 'speaker',
    usesHeroImage: true,
    heroImageLabel: 'Portrait photo',
    fields: SPEAKER_FIELDS,
  },
  {
    id: 'photo_top',
    label: 'Photo Banner',
    group: 'speaker',
    usesHeroImage: true,
    heroImageLabel: 'Banner photo',
    fields: SPEAKER_FIELDS,
  },
  {
    id: 'photo_bleed',
    label: 'Full Bleed',
    group: 'speaker',
    usesHeroImage: true,
    heroImageLabel: 'Background photo',
    fields: SPEAKER_FIELDS,
  },
  {
    id: 'date_hero',
    label: 'Date Hero',
    group: 'event',
    usesHeroImage: false,
    fields: EVENT_FIELDS,
  },
  {
    id: 'ticket_band',
    label: 'Ticket Band',
    group: 'event',
    usesHeroImage: false,
    fields: EVENT_FIELDS,
  },
  {
    id: 'calendar_card',
    label: 'Calendar Card',
    group: 'event',
    usesHeroImage: false,
    fields: EVENT_FIELDS,
  },
  {
    id: 'agenda_rows',
    label: 'Agenda Rows',
    group: 'event',
    usesHeroImage: false,
    fields: EVENT_FIELDS,
  },
  {
    id: 'save_badge',
    label: 'Save Badge',
    group: 'event',
    usesHeroImage: false,
    fields: ['title', 'subtitle', 'scriptText', 'time', 'platform', 'hashtag'],
    fieldLabels: { scriptText: 'Script line (e.g. Save the Date)' },
  },
  {
    id: 'bold_center',
    label: 'Bold Center',
    group: 'type',
    usesHeroImage: false,
    fields: TYPE_FIELDS,
  },
  {
    id: 'swiss_rule',
    label: 'Swiss Rule',
    group: 'type',
    usesHeroImage: false,
    fields: TYPE_FIELDS,
  },
  {
    id: 'side_rail',
    label: 'Side Rail',
    group: 'type',
    usesHeroImage: false,
    fields: TYPE_FIELDS,
  },
  {
    id: 'big_day',
    label: 'Big Day',
    group: 'type',
    usesHeroImage: false,
    fields: TYPE_FIELDS,
  },
  {
    id: 'mesh_card',
    label: 'Mesh Card',
    group: 'type',
    usesHeroImage: false,
    fields: TYPE_FIELDS,
  },
  {
    id: 'quote_center',
    label: 'Quote Stage',
    group: 'quote',
    usesHeroImage: true,
    heroImageLabel: 'Author photo (optional)',
    fields: QUOTE_FIELDS,
  },
  {
    id: 'quote_bar',
    label: 'Quote Bar',
    group: 'quote',
    usesHeroImage: false,
    fields: QUOTE_FIELDS,
  },
  {
    id: 'chat_pair',
    label: 'Chat Pair',
    group: 'quote',
    usesHeroImage: false,
    fields: ['title', 'tagline', 'speakerName', 'hashtag'],
    fieldLabels: { title: 'Question', tagline: 'Answer' },
  },
  {
    id: 'fest_script',
    label: 'Festive Script',
    group: 'celebrate',
    usesHeroImage: false,
    fields: FEST_FIELDS,
    fieldLabels: {
      title: 'Top line (e.g. HAPPY)',
      scriptText: 'Script line',
      malayalamLine: 'Malayalam headline',
    },
  },
  {
    id: 'medal_ring',
    label: 'Medal Ring',
    group: 'celebrate',
    usesHeroImage: true,
    heroImageLabel: 'Teammate photo',
    fields: ['title', 'scriptText', 'speakerName', 'speakerRole', 'tagline', 'hashtag'],
    fieldLabels: {
      title: 'Achievement',
      scriptText: 'Script line',
      speakerName: 'Name',
      speakerRole: 'Role',
    },
  },
] as const;

export const STUDIO_TREATMENTS: readonly StudioTreatmentSpec[] = [
  { id: 'clean', label: 'Clean', hint: 'Quiet canvas, no ornaments', palette: 'bone' },
  { id: 'paper', label: 'Paper', hint: 'Warm paper grain', palette: 'heritage' },
  { id: 'night', label: 'Night', hint: 'Dark stage lighting', palette: 'midnight' },
  { id: 'brand', label: 'Brand', hint: 'CODO green lockup', palette: 'growthGreen' },
  { id: 'warm', label: 'Warm', hint: 'Spice and parchment', palette: 'saffron' },
  { id: 'cool', label: 'Cool', hint: 'Ocean and sky', palette: 'ocean' },
  { id: 'festoon', label: 'Festoon', hint: 'Festive corner bursts', palette: 'honey' },
  { id: 'orbit', label: 'Orbit', hint: 'Arc and ring accents', palette: 'cobalt' },
  { id: 'stripe', label: 'Stripe', hint: 'Diagonal colour bands', palette: 'crimson' },
  { id: 'stamp', label: 'Stamp', hint: 'Inset frame and seal', palette: 'espresso' },
  { id: 'glass', label: 'Glass', hint: 'Frosted card overlay', palette: 'tealMist' },
  { id: 'diagonal', label: 'Diagonal', hint: 'Split colour plane', palette: 'indigoDusk' },
  { id: 'ribbon', label: 'Ribbon', hint: 'Accent ribbon bar', palette: 'codoNavy' },
] as const;

export type StudioCatalogEntry = {
  key: `studio_${StudioLayoutId}_${StudioTreatmentId}`;
  layoutId: StudioLayoutId;
  treatmentId: StudioTreatmentId;
  label: string;
  description: string;
  group: PosterTemplateGroup;
  defaultPalette: PosterPaletteKey;
  usesHeroImage: boolean;
  heroImageLabel?: string;
  fields: PosterFieldKey[];
  fieldLabels?: Partial<Record<PosterFieldKey, string>>;
};

/** 20 layouts × 13 treatments = 260 studio templates. */
export const STUDIO_CATALOG: readonly StudioCatalogEntry[] = STUDIO_LAYOUTS.flatMap((layout) =>
  STUDIO_TREATMENTS.map((treatment) => {
    const key = `studio_${layout.id}_${treatment.id}` as StudioCatalogEntry['key'];
    return {
      key,
      layoutId: layout.id,
      treatmentId: treatment.id,
      label: `${layout.label} · ${treatment.label}`,
      description: `${layout.label} layout with ${treatment.hint.toLowerCase()}.`,
      group: layout.group,
      defaultPalette: treatment.palette,
      usesHeroImage: layout.usesHeroImage,
      heroImageLabel: layout.heroImageLabel,
      fields: layout.fields,
      fieldLabels: layout.fieldLabels,
    };
  })
);

export const STUDIO_TEMPLATE_KEYS = STUDIO_CATALOG.map((e) => e.key);

export type StudioTemplateKey = (typeof STUDIO_TEMPLATE_KEYS)[number];

export const STUDIO_BY_KEY: Record<StudioTemplateKey, StudioCatalogEntry> = Object.fromEntries(
  STUDIO_CATALOG.map((e) => [e.key, e])
) as Record<StudioTemplateKey, StudioCatalogEntry>;

export function isStudioTemplateKey(key: string): key is StudioTemplateKey {
  return key in STUDIO_BY_KEY;
}
