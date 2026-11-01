import type { BugDatesCalendarItem, GrowthProgramSession } from '@/services/bugDatesService';
import { CODO_BRAND, type PosterPaletteKey } from './brand/brandKit';
import { DEFAULT_LOGO_STYLE } from './brand/logoStyles';
import type { PosterData, PosterFieldKey, PosterTemplateKey } from './types';

export const POSTER_FIELD_LIMITS: Record<PosterFieldKey, number> = {
  title: 60,
  subtitle: 60,
  scriptText: 30,
  tagline: 120,
  time: 20,
  platform: 30,
  speakerName: 40,
  speakerRole: 50,
  quote: 160,
  quoteAuthor: 40,
  malayalamLine: 80,
  hashtag: 40,
};

export const POSTER_FIELD_LABELS: Record<PosterFieldKey, string> = {
  title: 'Headline',
  subtitle: 'Subtitle',
  scriptText: 'Script accent',
  tagline: 'Tagline',
  time: 'Time',
  platform: 'Platform',
  speakerName: 'Speaker name',
  speakerRole: 'Speaker role',
  quote: 'Quote',
  quoteAuthor: 'Quote author',
  malayalamLine: 'Malayalam headline',
  hashtag: 'Hashtag',
};

/** Default session time on CODO posters (Growth Glimpse / Team Session standard). */
export const DEFAULT_POSTER_TIME = '10:30 AM';

export const EMPTY_POSTER_DATA: PosterData = {
  title: '',
  subtitle: '',
  scriptText: '',
  tagline: '',
  dateIso: null,
  time: DEFAULT_POSTER_TIME,
  platform: '',
  speakerName: '',
  speakerRole: '',
  quote: '',
  quoteAuthor: '',
  malayalamLine: '',
  hashtag: CODO_BRAND.hashtag,
  heroImage: null,
  showContacts: true,
  logoStyle: DEFAULT_LOGO_STYLE,
};

const BIRTHDAY_WISH =
  'Wishing you a day full of joy, laughter, and love, and a year ahead filled with success, good health, and unforgettable moments.';

/**
 * Curated bilingual poster copy for high-visibility Kerala / India occasions.
 * Why: generic title-split leaves Malayalam Message / Heritage Hero empty;
 * creators should open Design Poster already production-ready for CODO.
 */
type OccasionPosterPreset = {
  match: RegExp;
  title: string;
  subtitle?: string;
  scriptText?: string;
  malayalamLine?: string;
  tagline?: string;
  quote?: string;
  quoteAuthor?: string;
  hashtag?: string;
  defaultPalette?: PosterPaletteKey;
  /** Prefer these templates when opening Poster Studio for this occasion. */
  preferredTemplates?: PosterTemplateKey[];
};

export const OCCASION_POSTER_PRESETS: OccasionPosterPreset[] = [
  {
    match: /kerala\s*piravi/i,
    title: 'KERALA',
    subtitle: 'happy',
    scriptText: 'Piravi',
    malayalamLine: 'ഏവർക്കും കേരളപ്പിറവി ആശംസകൾ',
    tagline: 'Built in Kerala. Building for the world.',
    quote:
      "From God's Own Country to products the world trusts — happy Kerala Piravi from CODO AI Innovations.",
    quoteAuthor: 'CODO AI Innovations',
    hashtag: '#KeralaPiravi',
    defaultPalette: 'verdant',
    preferredTemplates: [
      'regional_message',
      'heritage_hero',
      'studio_fest_script_brand',
      'studio_fest_script_warm',
      'studio_bold_center_brand',
      'studio_mesh_card_glass',
      'studio_date_hero_paper',
      'typographic_quote',
      'modern_celebration',
    ],
  },
  {
    match: /\bvishu\b/i,
    title: 'VISHU',
    subtitle: 'happy',
    scriptText: 'Vishu',
    malayalamLine: 'എല്ലാവർക്കും വിഷു ആശംസകൾ',
    tagline: 'New beginnings. New builds.',
    hashtag: '#Vishu',
    defaultPalette: 'saffron',
    preferredTemplates: [
      'regional_message',
      'heritage_hero',
      'studio_fest_script_warm',
      'studio_fest_script_festoon',
      'modern_celebration',
    ],
  },
  {
    match: /\bonam\b|thiruvonam/i,
    title: 'ONAM',
    subtitle: 'happy',
    scriptText: 'Onam',
    malayalamLine: 'എല്ലാവർക്കും ഓണാശംസകൾ',
    tagline: 'Prosperity, together.',
    hashtag: '#Onam',
    defaultPalette: 'honey',
    preferredTemplates: [
      'regional_message',
      'heritage_hero',
      'studio_fest_script_festoon',
      'studio_fest_script_warm',
      'modern_celebration',
    ],
  },
];

export function occasionPosterPreset(title: string): OccasionPosterPreset | null {
  const t = String(title ?? '').trim();
  if (!t) return null;
  return OCCASION_POSTER_PRESETS.find((p) => p.match.test(t)) ?? null;
}

const clamp = (key: PosterFieldKey, value: string | null | undefined) =>
  String(value ?? '').trim().slice(0, POSTER_FIELD_LIMITS[key]);

/**
 * Why: events store a meeting link, but posters should show the platform name, not a URL.
 */
function platformFromLocation(location: string | null | undefined): string {
  const v = String(location ?? '').trim();
  if (!v) return '';
  const lower = v.toLowerCase();
  if (lower.includes('meet.google')) return 'Google Meet';
  if (lower.includes('zoom.')) return 'Zoom';
  if (lower.includes('teams.microsoft') || lower.includes('teams.live')) return 'Microsoft Teams';
  if (/^https?:\/\//i.test(v)) return 'Online';
  return v;
}

function firstSentence(text: string | null | undefined): string {
  const v = String(text ?? '').trim();
  if (!v) return '';
  const match = v.match(/^[^.!?\n]+[.!?]?/);
  return (match ? match[0] : v).trim();
}

/** Splits "Gandhi Jayanti" into ["Gandhi", "Jayanti"] for display + script lockups. */
function splitTitle(title: string): [string, string] {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return [title.trim(), ''];
  return [words[0], words.slice(1).join(' ')];
}

function hashtagFor(title: string): string {
  const slug = title.replace(/[^\p{L}\p{N}]+/gu, '');
  return slug ? `#${slug}`.slice(0, POSTER_FIELD_LIMITS.hashtag) : CODO_BRAND.hashtag;
}

/**
 * Why: BugRicer usernames are often snake_case; posters need a polished display name
 * matching Growth Glimpse artwork (e.g. nadha_rahman → Nadha Rahman).
 */
export function posterDisplayName(raw: string | null | undefined): string {
  const cleaned = String(raw ?? '')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** True when the avatar is a real upload, not the ui-avatars placeholder. */
export function isRealPosterAvatar(avatar: string | null | undefined): boolean {
  const raw = String(avatar ?? '').trim();
  return raw !== '' && !/^https?:\/\/ui-avatars\.com\//i.test(raw);
}

/**
 * Prefills poster content from a BugDates item (and its Growth Glimpse session when present).
 * Why: designers should start from the real event data, then only polish copy and imagery.
 */
export function buildPosterData(
  item: BugDatesCalendarItem,
  session: GrowthProgramSession | null,
  occurrenceDate: string
): PosterData {
  const category = String(item.layer || item.category || 'company_event');
  const title = String(item.title ?? '').trim();
  const base: PosterData = {
    ...EMPTY_POSTER_DATA,
    dateIso: occurrenceDate || null,
    // Prefer the branded default; event start_time is often wrong for poster art.
    time: clamp('time', DEFAULT_POSTER_TIME),
    platform: clamp('platform', platformFromLocation(item.location_or_link)),
  };

  if (category === 'birthday') {
    const person = String(item.username ?? title.replace(/\s*[—-]\s*birthday$/i, '')).trim();
    const display = person ? person.charAt(0).toUpperCase() + person.slice(1) : '';
    return {
      ...base,
      title: clamp('title', `Happy Birthday ${display}`.trim()),
      speakerName: clamp('speakerName', display),
      speakerRole: clamp('speakerRole', item.job_title),
      quote: clamp('quote', BIRTHDAY_WISH),
    };
  }

  if (category === 'growth_program' || category === 'company_event') {
    const cleanTitle = title.replace(/^saturday\s+/i, '').replace(/\s*&\s*checkout$/i, '');
    return {
      ...base,
      title: clamp('title', cleanTitle || title),
      subtitle: clamp('subtitle', session?.agenda_topic),
      tagline: clamp('tagline', firstSentence(session?.summary_notes) || firstSentence(item.description)),
      speakerName: clamp('speakerName', posterDisplayName(session?.host_name)),
      speakerRole: clamp('speakerRole', session?.host_job_title),
      hashtag: CODO_BRAND.hashtag,
    };
  }

  const occasion = occasionPosterPreset(title);
  if (occasion) {
    return {
      ...base,
      title: clamp('title', occasion.title),
      subtitle: clamp('subtitle', occasion.subtitle ?? (category === 'holiday' ? 'happy' : '')),
      scriptText: clamp('scriptText', occasion.scriptText ?? ''),
      malayalamLine: clamp('malayalamLine', occasion.malayalamLine ?? ''),
      tagline: clamp('tagline', occasion.tagline ?? ''),
      quote: clamp('quote', occasion.quote ?? ''),
      quoteAuthor: clamp('quoteAuthor', occasion.quoteAuthor ?? ''),
      hashtag: clamp('hashtag', occasion.hashtag ?? hashtagFor(title)),
    };
  }

  const [head, tail] = splitTitle(title);
  return {
    ...base,
    title: clamp('title', head),
    subtitle: category === 'holiday' ? 'happy' : '',
    scriptText: clamp('scriptText', tail),
    hashtag: hashtagFor(title),
  };
}
