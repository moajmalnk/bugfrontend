/**
 * Brand Logo design styles. Each style is a layout treatment (canvas, frame,
 * badge, pattern or accent) rendered with the active palette, so 34 styles ×
 * 32 palettes give the studio hundreds of on-brand logo artworks.
 */
export type LogoStyleGroup = 'canvas' | 'frame' | 'badge' | 'pattern' | 'accent';

export const LOGO_STYLES = [
  // —— Canvas ——
  { key: 'gradient', label: 'Gradient', group: 'canvas' },
  { key: 'solid', label: 'Solid', group: 'canvas' },
  { key: 'radial', label: 'Radial', group: 'canvas' },
  { key: 'mesh', label: 'Mesh', group: 'canvas' },
  { key: 'aurora', label: 'Aurora', group: 'canvas' },
  { key: 'two_tone', label: 'Two-tone', group: 'canvas' },
  { key: 'vignette', label: 'Vignette', group: 'canvas' },
  { key: 'spotlight', label: 'Spotlight', group: 'canvas' },
  // —— Frames ——
  { key: 'inset_border', label: 'Inset border', group: 'frame' },
  { key: 'double_border', label: 'Double border', group: 'frame' },
  { key: 'corner_marks', label: 'Corner marks', group: 'frame' },
  { key: 'rounded_card', label: 'Floating card', group: 'frame' },
  { key: 'glass_card', label: 'Glass card', group: 'frame' },
  { key: 'outline_card', label: 'Outline card', group: 'frame' },
  { key: 'pill', label: 'Pill', group: 'frame' },
  // —— Badges ——
  { key: 'circle_badge', label: 'Circle badge', group: 'badge' },
  { key: 'ring', label: 'Ring', group: 'badge' },
  { key: 'double_ring', label: 'Double ring', group: 'badge' },
  { key: 'squircle', label: 'App icon', group: 'badge' },
  { key: 'hexagon', label: 'Hexagon', group: 'badge' },
  { key: 'seal', label: 'Seal', group: 'badge' },
  // —— Patterns ——
  { key: 'dots', label: 'Dot grid', group: 'pattern' },
  { key: 'grid', label: 'Blueprint', group: 'pattern' },
  { key: 'stripes', label: 'Stripes', group: 'pattern' },
  { key: 'checker', label: 'Checker', group: 'pattern' },
  { key: 'ripples', label: 'Ripples', group: 'pattern' },
  { key: 'crosshatch', label: 'Crosshatch', group: 'pattern' },
  // —— Accents ——
  { key: 'orbit', label: 'Orbit arcs', group: 'accent' },
  { key: 'split_diagonal', label: 'Diagonal split', group: 'accent' },
  { key: 'split_vertical', label: 'Vertical split', group: 'accent' },
  { key: 'bottom_band', label: 'Bottom band', group: 'accent' },
  { key: 'halo', label: 'Halo glow', group: 'accent' },
  { key: 'accent_bar', label: 'Accent bar', group: 'accent' },
  { key: 'underline', label: 'Underline', group: 'accent' },
] as const;

export type LogoStyleKey = (typeof LOGO_STYLES)[number]['key'];

export const DEFAULT_LOGO_STYLE: LogoStyleKey = 'gradient';

export const LOGO_STYLE_GROUP_META: Record<LogoStyleGroup, { label: string }> = {
  canvas: { label: 'Canvas' },
  frame: { label: 'Frames' },
  badge: { label: 'Badges' },
  pattern: { label: 'Patterns' },
  accent: { label: 'Accents' },
};

export const LOGO_STYLE_GROUPS: LogoStyleGroup[] = ['canvas', 'frame', 'badge', 'pattern', 'accent'];

const STYLE_KEYS = new Set<string>(LOGO_STYLES.map((s) => s.key));

/** Guards stored / legacy values so an unknown key never blanks the artwork. */
export function normalizeLogoStyle(value: string | null | undefined): LogoStyleKey {
  return value && STYLE_KEYS.has(value) ? (value as LogoStyleKey) : DEFAULT_LOGO_STYLE;
}
