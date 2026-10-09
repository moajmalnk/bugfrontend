/**
 * Keys for the modern template library. Kept in a React-free module so `types.ts`
 * and the backend whitelist stay in sync without importing components.
 */
export const MODERN_TEMPLATE_KEYS = [
  // Speakers
  'modern_split_photo',
  'modern_editorial',
  'modern_spotlight',
  'modern_arch',
  'modern_speaker_card',
  'modern_duotone',
  'modern_polaroid',
  'modern_podcast',
  'modern_gallery',
  'modern_diagonal',
  'modern_webinar',
  // Events
  'modern_ticket',
  'modern_save_date',
  'modern_calendar',
  'modern_agenda',
  'modern_takeaways',
  'modern_announcement',
  'modern_sunburst',
  // Typography
  'modern_bold_type',
  'modern_swiss',
  'modern_mesh_glass',
  'modern_neon',
  'modern_brutalist',
  'modern_minimal',
  'modern_big_numeral',
  'modern_tape',
  'modern_retro_sun',
  'modern_blueprint',
  // Quotes & social
  'modern_quote_card',
  'modern_social_post',
  'modern_chat',
  'modern_sticky_note',
  // Celebrations
  'modern_celebration',
  'modern_achievement',
] as const;

export type ModernTemplateKey = (typeof MODERN_TEMPLATE_KEYS)[number];
