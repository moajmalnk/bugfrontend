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
  const maxLinePx = size.key === 'story' ? 280 : size.key === 'square' ? 220 : 240;
  const wordSize = Math.min(maxLinePx, Math.max(64, available / (longest * CHAR_WIDTH)));
  const wordTop = size.height * (size.key === 'story' ? 0.14 : size.key === 'square' ? 0.06 : 0.08);
  const stackHeight = lines.length * wordSize * 0.92;

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
                fontSize: Math.min(42, wordSize * 0.28),
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

      {/* Hero object overlapping the word */}
      {data.heroImage && (
        <div
          style={{
            position: 'absolute',
            top: wordTop + stackHeight * 0.45,
            bottom: data.tagline ? 270 : 200,
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
            bottom: 210,
            textAlign: 'center',
            fontSize: 34,
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
