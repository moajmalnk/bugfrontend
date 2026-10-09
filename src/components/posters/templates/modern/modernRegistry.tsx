import type { ComponentType } from 'react';
import { STANDARD_PALETTES, type PosterPaletteKey } from '../../brand/brandKit';
import type {
  PosterFieldKey,
  PosterTemplateDefinition,
  PosterTemplateGroup,
  PosterTemplateProps,
} from '../../types';
import { EVENT_VARIANTS } from './eventVariants';
import { buildCtx, type ModernCtx } from './kit';
import { CELEBRATE_VARIANTS, MESSAGE_VARIANTS } from './messageVariants';
import { MODERN_TEMPLATE_KEYS, type ModernTemplateKey } from './modernKeys';
import { SPEAKER_VARIANTS } from './speakerVariants';
import { TYPE_VARIANTS } from './typeVariants';

type Variant = ComponentType<{ ctx: ModernCtx }>;

const VARIANTS: Record<ModernTemplateKey, Variant> = {
  ...SPEAKER_VARIANTS,
  ...EVENT_VARIANTS,
  ...TYPE_VARIANTS,
  ...MESSAGE_VARIANTS,
  ...CELEBRATE_VARIANTS,
};

const EVENT_FIELDS: PosterFieldKey[] = ['title', 'subtitle', 'tagline', 'time', 'platform', 'speakerName', 'speakerRole', 'hashtag'];
const TYPE_FIELDS: PosterFieldKey[] = ['title', 'subtitle', 'tagline', 'time', 'platform', 'hashtag'];
const QUOTE_FIELDS: PosterFieldKey[] = ['title', 'quote', 'quoteAuthor', 'speakerName', 'speakerRole', 'hashtag'];

const EVENT_LABELS: Partial<Record<PosterFieldKey, string>> = {
  title: 'Headline',
  subtitle: 'Topic / eyebrow',
  tagline: 'Supporting line',
  time: 'Time (e.g. 10:30 AM)',
  platform: 'Platform or venue',
};

type Spec = {
  label: string;
  description: string;
  group: PosterTemplateGroup;
  palette: PosterPaletteKey;
  fields?: PosterFieldKey[];
  fieldLabels?: Partial<Record<PosterFieldKey, string>>;
  photo?: string;
};

const SPEAKER_PHOTO = 'Speaker photo (optional — initials are used without one)';

const SPECS: Record<ModernTemplateKey, Spec> = {
  modern_split_photo: { label: 'Split Photo', description: 'Text panel beside a full-height photo', group: 'speaker', palette: 'codoNavy', photo: SPEAKER_PHOTO },
  modern_editorial: { label: 'Editorial Cover', description: 'Magazine cover with a masthead headline', group: 'speaker', palette: 'charcoal', photo: 'Cover photo' },
  modern_spotlight: { label: 'Spotlight', description: 'Circular portrait with an accent ring', group: 'speaker', palette: 'indigoDusk', photo: SPEAKER_PHOTO },
  modern_arch: { label: 'Arch Portrait', description: 'Arch-framed photo with an offset outline', group: 'speaker', palette: 'clay', photo: SPEAKER_PHOTO },
  modern_speaker_card: { label: 'Speaker Card', description: 'Floating profile card on colour blobs', group: 'speaker', palette: 'cobalt', photo: SPEAKER_PHOTO },
  modern_duotone: { label: 'Duotone', description: 'Grayscale photo washed in palette colour', group: 'speaker', palette: 'berry', photo: 'Background photo' },
  modern_polaroid: { label: 'Polaroid', description: 'Tilted instant print with a handwritten caption', group: 'speaker', palette: 'bone', photo: 'Photo for the print' },
  modern_podcast: { label: 'Podcast Cover', description: 'Square cover art with mic badge and waveform', group: 'speaker', palette: 'midnight', photo: 'Host or guest photo' },
  modern_gallery: { label: 'Gallery Frame', description: 'Double-ruled frame, photo and big date', group: 'speaker', palette: 'ivory', photo: 'Featured photo' },
  modern_diagonal: { label: 'Diagonal Cut', description: 'Photo above a diagonal colour panel', group: 'speaker', palette: 'ocean', photo: 'Background photo' },
  modern_webinar: { label: 'Webinar', description: 'Headline block with a host card and schedule', group: 'speaker', palette: 'growthGreen', photo: 'Host photo' },

  modern_ticket: { label: 'Event Ticket', description: 'Ticket with a perforated date stub', group: 'event', palette: 'sunset', photo: 'Speaker photo (optional)' },
  modern_save_date: { label: 'Save the Date', description: 'Script heading over an oversized day', group: 'event', palette: 'rosewood', fields: ['title', 'subtitle', 'scriptText', 'time', 'platform', 'hashtag'], fieldLabels: { scriptText: 'Script heading (default: Save the Date)' } },
  modern_calendar: { label: 'Desk Calendar', description: 'Tear-off calendar page with binder rings', group: 'event', palette: 'tealMist', fields: TYPE_FIELDS },
  modern_agenda: { label: 'Agenda', description: 'Event details as labelled rows', group: 'event', palette: 'slate' },
  modern_takeaways: {
    label: 'Key Takeaways',
    description: 'Headline plus a checklist',
    group: 'event',
    palette: 'arctic',
    photo: 'Speaker photo (optional)',
    fieldLabels: { tagline: 'Takeaways — separate points with full stops or •' },
  },
  modern_announcement: { label: 'Announcement', description: 'Megaphone badge and a loud headline', group: 'event', palette: 'crimson' },
  modern_sunburst: { label: 'Sunburst', description: 'Retro rays around a date badge', group: 'event', palette: 'saffron', fields: TYPE_FIELDS },

  modern_bold_type: { label: 'Bold Type', description: 'Giant condensed headline, accent last word', group: 'type', palette: 'limePulse', fields: TYPE_FIELDS },
  modern_swiss: { label: 'Swiss Grid', description: 'Column grid, big numeral, strict rules', group: 'type', palette: 'parchment', fields: TYPE_FIELDS },
  modern_mesh_glass: { label: 'Mesh Glass', description: 'Frosted card over a colour mesh', group: 'type', palette: 'lotus' },
  modern_neon: { label: 'Neon Night', description: 'Glowing sign over a synthwave grid', group: 'type', palette: 'midnight', fields: TYPE_FIELDS },
  modern_brutalist: { label: 'Brutalist', description: 'Thick borders, hard shadows and a sticker', group: 'type', palette: 'honey', fields: TYPE_FIELDS },
  modern_minimal: { label: 'Minimal', description: 'Hairlines and generous whitespace', group: 'type', palette: 'stone', fields: TYPE_FIELDS },
  modern_big_numeral: { label: 'Big Numeral', description: 'Outlined day numeral as the hero', group: 'type', palette: 'inkWell', fields: TYPE_FIELDS },
  modern_tape: { label: 'Tape Strips', description: 'Crossing tape with repeated text', group: 'type', palette: 'sandstorm', fields: TYPE_FIELDS },
  modern_retro_sun: { label: 'Retro Sun', description: 'Striped sun setting on a horizon', group: 'type', palette: 'espresso', fields: TYPE_FIELDS },
  modern_blueprint: { label: 'Blueprint', description: 'Grid paper, title block and spec table', group: 'type', palette: 'monsoon' },

  modern_quote_card: {
    label: 'Quote Card',
    description: 'Large pull-quote with author byline',
    group: 'quote',
    palette: 'forestNight',
    fields: QUOTE_FIELDS,
    fieldLabels: { title: 'Headline (used when quote is empty)', speakerRole: 'Author role' },
    photo: 'Author photo (optional)',
  },
  modern_social_post: {
    label: 'Social Post',
    description: 'Quote styled as a verified social post',
    group: 'quote',
    palette: 'mist',
    fields: ['title', 'quote', 'speakerName', 'time', 'hashtag'],
    fieldLabels: { title: 'Headline (used when post text is empty)', quote: 'Post text', speakerName: 'Display name (default: CODO AI Innovations)', hashtag: 'Handle / hashtag' },
    photo: 'Profile photo (optional)',
  },
  modern_chat: {
    label: 'Chat Q&A',
    description: 'Question and answer chat bubbles',
    group: 'quote',
    palette: 'verdant',
    fields: ['title', 'tagline', 'time', 'platform', 'speakerName', 'speakerRole'],
    fieldLabels: { title: 'Question', tagline: 'Answer' },
    photo: 'Answering person photo (optional)',
  },
  modern_sticky_note: {
    label: 'Sticky Note',
    description: 'Taped note with a handwritten sign-off',
    group: 'quote',
    palette: 'graphite',
    fields: ['title', 'tagline', 'quoteAuthor', 'time', 'platform', 'hashtag'],
    fieldLabels: { title: 'Note heading', tagline: 'Note text', quoteAuthor: 'Signature' },
  },

  modern_celebration: {
    label: 'Celebration',
    description: 'Confetti with a script hero line',
    group: 'celebrate',
    palette: 'heritage',
    fields: ['title', 'scriptText', 'tagline', 'hashtag'],
    fieldLabels: { title: 'Top line (e.g. HAPPY)', scriptText: 'Script line (e.g. Diwali)', tagline: 'Message' },
  },
  modern_achievement: {
    label: 'Achievement',
    description: 'Medal portrait with ribbons and stars',
    group: 'celebrate',
    palette: 'codoNavy',
    fields: ['title', 'scriptText', 'speakerName', 'speakerRole', 'tagline'],
    fieldLabels: { title: 'Achievement (e.g. Employee of the Month)', scriptText: 'Script line (default: Congratulations)', speakerName: 'Name', speakerRole: 'Role', tagline: 'Message' },
    photo: 'Teammate photo',
  },
};

function definition(key: ModernTemplateKey): PosterTemplateDefinition {
  const spec = SPECS[key];
  const fields = spec.fields ?? EVENT_FIELDS;
  return {
    key,
    label: spec.label,
    description: spec.description,
    group: spec.group,
    defaultPalette: spec.palette,
    palettes: STANDARD_PALETTES,
    fields,
    fieldLabels: { ...(fields === EVENT_FIELDS || fields === TYPE_FIELDS ? EVENT_LABELS : {}), ...spec.fieldLabels },
    usesHeroImage: !!spec.photo,
    heroImageLabel: spec.photo,
    layouts: ['square', 'portrait', 'story'],
    showsDate: true,
  };
}

function component(key: ModernTemplateKey): ComponentType<PosterTemplateProps> {
  const Variant = VARIANTS[key];
  function ModernTemplate({ data, palette, size }: PosterTemplateProps) {
    return <Variant ctx={buildCtx(data, palette, size)} />;
  }
  ModernTemplate.displayName = `Modern(${key})`;
  return ModernTemplate;
}

export const MODERN_TEMPLATES = Object.fromEntries(
  MODERN_TEMPLATE_KEYS.map((key) => [key, definition(key)])
) as Record<ModernTemplateKey, PosterTemplateDefinition>;

export const MODERN_TEMPLATE_COMPONENTS = Object.fromEntries(
  MODERN_TEMPLATE_KEYS.map((key) => [key, component(key)])
) as Record<ModernTemplateKey, ComponentType<PosterTemplateProps>>;
