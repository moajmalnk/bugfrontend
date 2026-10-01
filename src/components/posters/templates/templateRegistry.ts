import type { ComponentType } from 'react';
import { STANDARD_PALETTES } from '../brand/brandKit';
import type { PosterTemplateDefinition, PosterTemplateKey, PosterTemplateProps } from '../types';
import { BirthdayTemplate } from './BirthdayTemplate';
import { BrandLogoTemplate } from './BrandLogoTemplate';
import { GrowthGlimpseTemplate } from './GrowthGlimpseTemplate';
import { HeritageHeroTemplate } from './HeritageHeroTemplate';
import { ProductHeroTemplate } from './ProductHeroTemplate';
import { RegionalMessageTemplate } from './RegionalMessageTemplate';
import { SpeakerSessionTemplate } from './SpeakerSessionTemplate';
import { TeamSessionTemplate } from './TeamSessionTemplate';
import { TypographicQuoteTemplate } from './TypographicQuoteTemplate';

const ALL_LAYOUTS: PosterTemplateDefinition['layouts'] = ['portrait', 'square', 'story'];

export const POSTER_TEMPLATES: Record<PosterTemplateKey, PosterTemplateDefinition> = {
  growth_glimpse: {
    key: 'growth_glimpse',
    label: 'Growth Glimpse',
    description: 'Official Growth Glimpse artwork — topic, date, time and speaker',
    defaultPalette: 'growthGreen',
    palettes: [],
    fields: ['subtitle', 'tagline', 'time', 'speakerName', 'speakerRole'],
    fieldLabels: {
      subtitle: 'Session topic (e.g. Landing Page Psychology)',
      tagline: 'One-line takeaway',
      time: 'Time (e.g. 10:30 AM)',
    },
    usesHeroImage: true,
    heroImageLabel: 'Speaker photo (transparent cut-out works best)',
    layouts: ['square'],
    nativeSize: { width: 1080, height: 1152 },
    showsDate: true,
  },
  team_session: {
    key: 'team_session',
    label: 'Team Session',
    description: 'CODO Team Session / debate artwork — topic, time and day',
    defaultPalette: 'growthGreen',
    palettes: [],
    fields: ['subtitle', 'time'],
    fieldLabels: {
      subtitle: 'Topic — wrap words in *green* or _blue_ to highlight',
      time: 'Time (e.g. 11:30 AM)',
    },
    usesHeroImage: false,
    layouts: ['square'],
    nativeSize: { width: 1080, height: 1080 },
    showsDate: true,
  },
  speaker_session: {
    key: 'speaker_session',
    label: 'Speaker Session',
    description: 'Editable speaker card — any palette, all sizes',
    defaultPalette: 'growthGreen',
    palettes: STANDARD_PALETTES,
    fields: ['title', 'subtitle', 'tagline', 'time', 'platform', 'speakerName', 'speakerRole', 'hashtag'],
    usesHeroImage: true,
    heroImageLabel: 'Speaker photo',
    layouts: ['square', 'portrait', 'story'],
    showsDate: true,
  },
  heritage_hero: {
    key: 'heritage_hero',
    label: 'Heritage Hero',
    description: 'Holiday tribute — big date, condensed title, hero cut-out',
    defaultPalette: 'heritage',
    palettes: STANDARD_PALETTES,
    fields: ['title', 'subtitle', 'scriptText', 'quote', 'quoteAuthor'],
    fieldLabels: {
      title: 'Condensed title (e.g. GANDHI)',
      subtitle: 'Script prefix (e.g. happy)',
      scriptText: 'Script overlay (e.g. Jayanti)',
      quote: 'Quote (shown when no hero image)',
    },
    usesHeroImage: true,
    heroImageLabel: 'Hero cut-out (transparent PNG works best)',
    layouts: ALL_LAYOUTS,
    showsDate: true,
  },
  product_hero: {
    key: 'product_hero',
    label: 'Product Hero',
    description: 'Coffee Day style — giant word with an overlapping object',
    defaultPalette: 'espresso',
    palettes: STANDARD_PALETTES,
    fields: ['title', 'scriptText', 'tagline'],
    fieldLabels: {
      title: 'Giant word (e.g. COFFEE)',
      scriptText: 'Sub-word (e.g. DAY)',
    },
    usesHeroImage: true,
    heroImageLabel: 'Hero object (transparent PNG works best)',
    layouts: ALL_LAYOUTS,
    showsDate: true,
  },
  typographic_quote: {
    key: 'typographic_quote',
    label: 'Typographic Quote',
    description: 'Minimal numeral + quote, no photo needed',
    defaultPalette: 'parchment',
    palettes: STANDARD_PALETTES,
    fields: ['title', 'quote', 'quoteAuthor'],
    fieldLabels: { title: 'Fallback text (used when quote is empty)' },
    usesHeroImage: false,
    layouts: ALL_LAYOUTS,
    showsDate: true,
  },
  regional_message: {
    key: 'regional_message',
    label: 'Malayalam Message',
    description: 'Regional headline with a central card and hashtag',
    defaultPalette: 'growthGreen',
    palettes: STANDARD_PALETTES,
    fields: ['title', 'malayalamLine', 'hashtag'],
    fieldLabels: { title: 'English title (fallback headline)' },
    usesHeroImage: true,
    heroImageLabel: 'Card artwork',
    layouts: ALL_LAYOUTS,
    showsDate: true,
  },
  birthday: {
    key: 'birthday',
    label: 'Birthday',
    description: 'CODO team birthday — photo card, HAPPY BIRTHDAY banner, name, role and wish',
    defaultPalette: 'growthGreen',
    palettes: [],
    fields: ['speakerName', 'speakerRole', 'quote'],
    fieldLabels: {
      speakerName: 'Name',
      speakerRole: 'Role (e.g. Full Stack Developer)',
      quote: 'Wish — "Celebrate big, Name!" is added automatically',
    },
    usesHeroImage: true,
    heroImageLabel: 'Teammate photo (transparent cut-out works best)',
    layouts: ['portrait'],
    nativeSize: { width: 1080, height: 1350 },
    showsDate: false,
  },
  brand_logo: {
    key: 'brand_logo',
    label: 'Brand Logo',
    description: 'CODO logo for app icons, profile pictures and website logos',
    defaultPalette: 'growthGreen',
    palettes: ['growthGreen', 'logoBlack', 'logoWhite', 'heritage', 'espresso'],
    fields: [],
    usesHeroImage: false,
    layouts: ['square'],
    nativeSize: { width: 1024, height: 1024 },
    responsive: true,
    showsDate: false,
  },
};

export const POSTER_TEMPLATE_COMPONENTS: Record<PosterTemplateKey, ComponentType<PosterTemplateProps>> = {
  growth_glimpse: GrowthGlimpseTemplate,
  team_session: TeamSessionTemplate,
  speaker_session: SpeakerSessionTemplate,
  heritage_hero: HeritageHeroTemplate,
  product_hero: ProductHeroTemplate,
  typographic_quote: TypographicQuoteTemplate,
  regional_message: RegionalMessageTemplate,
  birthday: BirthdayTemplate,
  brand_logo: BrandLogoTemplate,
};

const CATEGORY_TEMPLATES: Record<string, PosterTemplateKey[]> = {
  birthday: ['birthday'],
  growth_program: ['growth_glimpse', 'team_session', 'speaker_session', 'typographic_quote'],
  holiday: ['heritage_hero', 'typographic_quote', 'regional_message', 'product_hero'],
  observance: ['product_hero', 'heritage_hero', 'typographic_quote', 'regional_message'],
  company_event: ['team_session', 'speaker_session', 'product_hero', 'typographic_quote', 'regional_message'],
};

/** Templates ordered by relevance for a BugDates category; first entry is the default. */
export function templatesForCategory(category: string): PosterTemplateKey[] {
  const preferred = CATEGORY_TEMPLATES[category] ?? CATEGORY_TEMPLATES.company_event;
  const rest = (Object.keys(POSTER_TEMPLATES) as PosterTemplateKey[]).filter(
    (k) => !preferred.includes(k) && (k !== 'birthday' || category === 'birthday')
  );
  return [...preferred, ...rest];
}
