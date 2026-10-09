import { CodoLogo } from '../brand/CodoLogo';
import { POSTER_FONT_STACK } from '../brand/posterFonts';
import type { PosterTemplateProps } from '../types';
import { HeroImage, PosterFrame } from './shared';
import { getDateParts } from './posterUtils';

/** Bebas-style condensed glyphs ≈ this fraction of font-size wide (incl. letter-spacing). */
const CHAR_WIDTH = 0.5;
/** Side padding so type never kisses the poster edge. */
const SIDE_PAD = 56;
/** Room reserved for the vertical date when one is shown. */
const DATE_GUTTER = 52;
const TAGLINE_SIZE = 34;
const TAGLINE_LINE_HEIGHT = 1.35;
/** Tagline baseline sits above the logo (logo occupies bottom 80–144px). */
const TAGLINE_BOTTOM = 190;
/** Hero bottom limit when there is no tagline — clears the logo. */
const LOGO_ZONE = 190;

/**
 * Splits a long headline into 1–3 stacked lines so Product Hero stays readable
 * instead of overflowing a single nowrap row (e.g. "THURSDAY GROWTH GLIMPSE").
 */
function splitHeadline(word: string): string[] {
  const parts = word.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return [word];
  if (parts.length === 2) return parts;
  // 3+ words: balance into two lines (Coffee Day style stacks).
  const mid = Math.ceil(parts.length / 2);
  return [parts.slice(0, mid).join(' '), parts.slice(mid).join(' ')];
}

/** Coffee Day style: giant condensed word, hero object overlapping it, vertical date, logo at the base. */
export function ProductHeroTemplate({ data, palette, size }: PosterTemplateProps) {
  const date = getDateParts(data.dateIso);
  const word = data.title.toUpperCase().trim() || 'CODO';
  const lines = splitHeadline(word);
  const longest = Math.max(...lines.map((l) => l.length), 1);
  const available = size.width - SIDE_PAD * 2 - (date ? DATE_GUTTER : 0);
  // Cap height so multi-line stacks still leave room for the hero / logo.
  const maxLinePx = data.heroImage
    ? size.key === 'story' ? 260 : size.key === 'square' ? 160 : 210
    : size.key === 'story' ? 280 : size.key === 'square' ? 220 : 240;
  const wordSize = Math.min(maxLinePx, Math.max(64, available / (longest * CHAR_WIDTH)));
  const wordTop = size.height * (size.key === 'story' ? 0.14 : size.key === 'square' ? 0.06 : 0.08);
  const scriptSize = Math.min(42, wordSize * 0.28);
  const headlineBottom =
    wordTop + lines.length * wordSize * 0.9 + (data.scriptText ? 10 + scriptSize * 1.2 : 0);

  const taglineLines = data.tagline
    ? Math.min(
        3,
        Math.ceil((data.tagline.length * TAGLINE_SIZE * 0.5) / (size.width - SIDE_PAD * 2)),
      )
    : 0;
  const taglineHeight = taglineLines * TAGLINE_SIZE * TAGLINE_LINE_HEIGHT;
  // Photos are opaque rectangles, so the hero sits in its own zone between the
  // headline and tagline instead of overlapping the word (which hid "GLIMPSE").
  const heroTop = headlineBottom + 32;
  const heroBottom = data.tagline ? TAGLINE_BOTTOM + taglineHeight + 36 : LOGO_ZONE;

  return (
    <PosterFrame
      size={size}
      background={`radial-gradient(ellipse at 50% 40%, ${palette.background} 0%, ${palette.backgroundAlt} 100%)`}
    >
      {/* Giant word — constrained to the canvas; long titles stack + shrink. */}
      <div
        style={{
          position: 'absolute',
          top: wordTop,
          left: SIDE_PAD,
          right: SIDE_PAD,
          display: 'flex',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'relative',
            maxWidth: '100%',
            paddingRight: date ? DATE_GUTTER : 0,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              fontFamily: POSTER_FONT_STACK.display,
              fontSize: wordSize,
              lineHeight: 0.9,
              color: palette.ink,
              letterSpacing: Math.max(1, wordSize * 0.01),
              textAlign: 'center',
              textTransform: 'uppercase',
            }}
          >
            {lines.map((line) => (
              <span key={line} style={{ whiteSpace: 'nowrap', display: 'block' }}>
                {line}
              </span>
            ))}
          </div>
          {date && (
            <span
              style={{
                position: 'absolute',
                top: wordSize * 0.08,
                right: 0,
                writingMode: 'vertical-rl',
                fontSize: Math.min(28, wordSize * 0.18),
                color: palette.ink,
                letterSpacing: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {date.monthLong} {date.day}
            </span>
          )}
          {data.scriptText && (
            <span
              style={{
                display: 'block',
                marginTop: 10,
                fontSize: scriptSize,
                color: palette.ink,
                letterSpacing: 1,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
            >
              {data.scriptText.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Hero — own zone under the headline, sized to whatever space remains. */}
      {data.heroImage && (
        <div
          style={{
            position: 'absolute',
            top: heroTop,
            bottom: heroBottom,
            left: 120,
            right: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <HeroImage
            src={data.heroImage}
            alt={data.title}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              borderRadius: 28,
              filter: 'drop-shadow(0 30px 40px rgba(60,30,20,0.28))',
            }}
          />
        </div>
      )}

      {data.tagline && (
        <div
          style={{
            position: 'absolute',
            left: SIDE_PAD,
            right: SIDE_PAD,
            bottom: TAGLINE_BOTTOM,
            textAlign: 'center',
            fontSize: TAGLINE_SIZE,
            lineHeight: TAGLINE_LINE_HEIGHT,
            color: palette.inkMuted,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as const,
          }}
        >
          {data.tagline}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 80,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <CodoLogo variant={palette.logo} height={64} />
      </div>
    </PosterFrame>
  );
}
