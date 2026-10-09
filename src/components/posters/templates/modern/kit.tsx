import type { CSSProperties, ReactNode } from 'react';
import { CalendarDays, Clock, Video } from 'lucide-react';
import type { PosterPalette } from '../../brand/brandKit';
import { CodoLogo } from '../../brand/CodoLogo';
import { POSTER_FONT_STACK } from '../../brand/posterFonts';
import type { PosterData, PosterSize } from '../../types';
import { getDateParts, type DateParts } from '../posterUtils';

export const FONT = POSTER_FONT_STACK;

/** Average glyph width as a share of font size — drives the text-fit estimates below. */
export const CHAR_W = {
  display: 0.44, // Bebas (condensed caps)
  bold: 0.6, // Poppins 700/800 mixed case
  boldUpper: 0.72, // Poppins 800 caps
  regular: 0.54, // Poppins 400/600 mixed case
  script: 0.42, // Great Vibes
} as const;

/* ------------------------------------------------------------------ colour */

function parseColor(color: string): [number, number, number] | null {
  const v = color.trim();
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = v.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const [r, g, b] = rgb[1].split(',').map((x) => parseFloat(x));
    if ([r, g, b].every((x) => Number.isFinite(x))) return [r, g, b];
  }
  return null;
}

/** Same colour with a new alpha — palette colours are hex or rgb(a). */
export function withAlpha(color: string, a: number): string {
  const c = parseColor(color);
  return c ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : color;
}

/** WCAG relative luminance (0 = black, 1 = white). Unknown colours count as mid-grey. */
export function luminance(color: string): number {
  const c = parseColor(color);
  if (!c) return 0.5;
  const [r, g, b] = c.map((x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const DARK_INK = '#0B1220';

/** Near-black or white, whichever reads better on `bg`. */
export function readableOn(bg: string): string {
  return contrast(DARK_INK, bg) >= contrast('#FFFFFF', bg) ? DARK_INK : '#FFFFFF';
}

/** Logo lockup that reads on `bg` (the palette's `logo` only fits its own background). */
export function logoOn(bg: string): 'dark' | 'light' {
  return readableOn(bg) === '#FFFFFF' ? 'light' : 'dark';
}

/**
 * First candidate with at least `min` contrast on `bg`, else black/white.
 * Why: palette accents are tuned for the palette background, not for white
 * cards or photos, so every layered surface re-checks its text colour.
 */
export function pickInk(bg: string, candidates: string[], min = 3): string {
  return candidates.find((c) => contrast(c, bg) >= min) ?? readableOn(bg);
}

/* ----------------------------------------------------------------- content */

export type MetaKind = 'date' | 'time' | 'platform';
export type MetaItem = { kind: MetaKind; label: string };

export type ModernContent = {
  headline: string;
  topic: string;
  body: string;
  script: string;
  date: DateParts | null;
  dateLabel: string;
  time: string;
  platform: string;
  speaker: string;
  role: string;
  hashtag: string;
  quote: string;
  author: string;
  image: string | null;
  meta: MetaItem[];
};

function buildContent(data: PosterData): ModernContent {
  const date = getDateParts(data.dateIso);
  const dateLabel = date ? `${date.weekday.slice(0, 3)}, ${date.day} ${date.monthShort} ${date.year}` : '';
  const title = data.title.trim();
  const subtitle = data.subtitle.trim();
  const time = data.time.trim();
  const platform = data.platform.trim();
  const meta: MetaItem[] = [];
  if (dateLabel) meta.push({ kind: 'date', label: dateLabel });
  if (time) meta.push({ kind: 'time', label: time });
  if (platform) meta.push({ kind: 'platform', label: platform });
  return {
    // Placeholder only shows in the editor; export is blocked while the headline is empty.
    headline: title || subtitle || 'Your headline',
    topic: title ? subtitle : '',
    body: data.tagline.trim(),
    script: data.scriptText.trim(),
    date,
    dateLabel,
    time,
    platform,
    speaker: data.speakerName.trim(),
    role: data.speakerRole.trim(),
    hashtag: data.hashtag.trim(),
    quote: data.quote.trim() || data.tagline.trim() || title,
    author: data.quoteAuthor.trim() || data.speakerName.trim(),
    image: data.heroImage,
    meta,
  };
}

/* --------------------------------------------------------------- context */

export type ModernCtx = {
  p: PosterPalette;
  size: PosterSize;
  W: number;
  H: number;
  /** Story (9:16) — stack vertically and use the extra height. */
  tall: boolean;
  /** Square (1:1) — tighten vertical rhythm. */
  square: boolean;
  /** Vertical rhythm scale: 0.88 square, 1 portrait/story. */
  s: number;
  /** Outer padding. */
  P: number;
  isDark: boolean;
  onAccent: string;
  /** Accent if it reads on the background, else the palette ink. */
  accentInk: string;
  c: ModernContent;
};

export function buildCtx(data: PosterData, palette: PosterPalette, size: PosterSize): ModernCtx {
  const tall = size.height / size.width >= 1.6;
  const square = size.height / size.width <= 1.05;
  return {
    p: palette,
    size,
    W: size.width,
    H: size.height,
    tall,
    square,
    s: square ? 0.88 : 1,
    P: 72,
    isDark: luminance(palette.background) < 0.4,
    onAccent: readableOn(palette.accent),
    accentInk: pickInk(palette.background, [palette.accent, palette.ink]),
    c: buildContent(data),
  };
}

/* ------------------------------------------------------------- text fit */

function countLines(words: string[], perLine: number): number {
  if (perLine < 1) return Infinity;
  let lines = 1;
  let cur = 0;
  for (const w of words) {
    const len = w.length;
    if (cur === 0) cur = len;
    else if (cur + 1 + len <= perLine) cur += 1 + len;
    else {
      lines += 1;
      cur = len;
    }
    if (len > perLine) {
      lines += Math.ceil(len / perLine) - 1;
      cur = len % perLine || perLine;
    }
  }
  return lines;
}

/**
 * Largest font size (≤ max) that wraps `text` into `maxLines` within `widthPx`.
 * Why: CSS cannot auto-fit multi-line text, and the export must match the preview.
 */
export function fitLines(
  text: string,
  maxPx: number,
  minPx: number,
  widthPx: number,
  maxLines: number,
  charW: number = CHAR_W.bold
): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return maxPx;
  for (let px = maxPx; px > minPx; px -= 2) {
    if (countLines(words, Math.floor(widthPx / (px * charW))) <= maxLines) return px;
  }
  return minPx;
}

export function clampLines(lines: number): CSSProperties {
  return {
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };
}

export const ellipsis: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

export function initials(text: string): string {
  return (
    text
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || 'C'
  );
}

/** Splits the tagline into short points for list layouts. */
export function bulletPoints(text: string, max = 4): string[] {
  return text
    .split(/\s*(?:[•|;\n]|\.\s+)\s*/)
    .map((t) => t.replace(/\.+$/, '').trim())
    .filter((t) => t.length > 1)
    .slice(0, max);
}

/* ------------------------------------------------------------ components */

export function Fill({ style, children }: { style?: CSSProperties; children?: ReactNode }) {
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...style }}>{children}</div>;
}

export function Logo({
  ctx,
  height = 54,
  variant,
}: {
  ctx: ModernCtx;
  height?: number;
  variant?: 'dark' | 'light';
}) {
  return <CodoLogo variant={variant ?? ctx.p.logo} height={height * ctx.s} />;
}

const META_ICONS = { date: CalendarDays, time: Clock, platform: Video } as const;

export function MetaList({
  ctx,
  color,
  iconColor,
  size = 30,
  direction = 'row',
  items,
  justify,
}: {
  ctx: ModernCtx;
  color: string;
  iconColor?: string;
  size?: number;
  direction?: 'row' | 'column';
  items?: MetaItem[];
  justify?: CSSProperties['justifyContent'];
}) {
  const list = items ?? ctx.c.meta;
  if (!list.length) return null;
  const px = size * ctx.s;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        flexWrap: direction === 'row' ? 'wrap' : undefined,
        justifyContent: justify,
        gap: direction === 'row' ? `${px * 0.5}px ${px * 1.1}px` : px * 0.5,
        color,
        fontSize: px,
        fontWeight: 600,
        lineHeight: 1.2,
        minWidth: 0,
      }}
    >
      {list.map((m) => {
        const Icon = META_ICONS[m.kind];
        return (
          <div key={m.kind} style={{ display: 'flex', alignItems: 'center', gap: px * 0.4, minWidth: 0 }}>
            <Icon size={px * 1.05} color={iconColor ?? color} strokeWidth={2.2} style={{ flexShrink: 0 }} />
            <span style={ellipsis}>{m.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Cover photo, or an initials monogram so photo layouts never render a hole. */
export function Photo({
  ctx,
  style,
  radius = 0,
  grayscale = false,
  position = 'center 18%',
  fallbackSize = 160,
  fallbackBg,
  fallbackInk,
}: {
  ctx: ModernCtx;
  style?: CSSProperties;
  radius?: CSSProperties['borderRadius'];
  grayscale?: boolean;
  position?: string;
  fallbackSize?: number;
  fallbackBg?: string;
  fallbackInk?: string;
}) {
  const base: CSSProperties = { position: 'relative', overflow: 'hidden', borderRadius: radius, ...style };
  if (ctx.c.image) {
    return (
      <div style={base}>
        <img
          src={ctx.c.image}
          alt={ctx.c.speaker || 'Poster photo'}
          crossOrigin="anonymous"
          draggable={false}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: position,
            filter: grayscale ? 'grayscale(1) contrast(1.05)' : undefined,
          }}
        />
      </div>
    );
  }
  const bg =
    fallbackBg ??
    `linear-gradient(140deg, ${withAlpha(ctx.p.accent, 0.55)} 0%, ${withAlpha(ctx.p.accent, 0.16)} 100%)`;
  return (
    <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <span
        style={{
          fontFamily: FONT.display,
          fontSize: fallbackSize,
          lineHeight: 1,
          letterSpacing: fallbackSize * 0.04,
          color: fallbackInk ?? withAlpha(ctx.p.ink, 0.85),
        }}
      >
        {initials(ctx.c.speaker || ctx.c.headline)}
      </span>
    </div>
  );
}

export function Pill({
  ctx,
  children,
  bg,
  color,
  size = 26,
  border,
  style,
}: {
  ctx: ModernCtx;
  children: ReactNode;
  bg: string;
  color: string;
  size?: number;
  border?: string;
  style?: CSSProperties;
}) {
  const px = size * ctx.s;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: px * 0.4,
        alignSelf: 'flex-start',
        maxWidth: '100%',
        padding: `${px * 0.45}px ${px * 0.9}px`,
        borderRadius: 999,
        background: bg,
        color,
        border,
        fontSize: px,
        fontWeight: 700,
        letterSpacing: px * 0.06,
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Logo on one side, hashtag on the other — the standard modern footer. */
export function Footer({
  ctx,
  color,
  variant,
  style,
}: {
  ctx: ModernCtx;
  color: string;
  variant?: 'dark' | 'light';
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        minWidth: 0,
        ...style,
      }}
    >
      <Logo ctx={ctx} variant={variant} />
      {ctx.c.hashtag && (
        <span style={{ ...ellipsis, fontSize: 28 * ctx.s, fontWeight: 600, color, minWidth: 0 }}>{ctx.c.hashtag}</span>
      )}
    </div>
  );
}

export function SpeakerLine({
  ctx,
  color,
  mutedColor,
  size = 34,
  align = 'left',
}: {
  ctx: ModernCtx;
  color: string;
  mutedColor: string;
  size?: number;
  align?: 'left' | 'center' | 'right';
}) {
  if (!ctx.c.speaker && !ctx.c.role) return null;
  const px = size * ctx.s;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: px * 0.15, textAlign: align, minWidth: 0 }}>
      {ctx.c.speaker && (
        <div style={{ ...ellipsis, fontSize: px, fontWeight: 700, color, lineHeight: 1.15 }}>{ctx.c.speaker}</div>
      )}
      {ctx.c.role && (
        <div style={{ ...ellipsis, fontSize: px * 0.68, fontWeight: 400, color: mutedColor, lineHeight: 1.25 }}>
          {ctx.c.role}
        </div>
      )}
    </div>
  );
}

/** Deterministic pseudo-random sequence so decorations are identical in preview and export. */
export function seeded(n: number, seed = 7): number[] {
  const out: number[] = [];
  let x = seed;
  for (let i = 0; i < n; i += 1) {
    x = (x * 9301 + 49297) % 233280;
    out.push(x / 233280);
  }
  return out;
}
