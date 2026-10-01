import { CodoLogo } from '../brand/CodoLogo';
import { POSTER_FONT_STACK } from '../brand/posterFonts';
import type { PosterTemplateProps } from '../types';
import { HeroImage, PosterFrame } from './shared';
import { getDateParts } from './posterUtils';

/** Coffee Day style: giant condensed word, hero object overlapping it, vertical date, logo at the base. */
export function ProductHeroTemplate({ data, palette, size }: PosterTemplateProps) {
  const date = getDateParts(data.dateIso);
  const word = data.title.toUpperCase().trim() || 'CODO';
  // Bebas glyphs are ~0.42em wide; size the word to span ~78% of the poster width.
  const wordSize = Math.min(420, Math.max(140, (size.width * 0.78) / (Math.max(word.length, 1) * 0.42)));
  const wordTop = size.height * (size.key === 'story' ? 0.16 : size.key === 'square' ? 0.07 : 0.1);
  const wordLeft = (size.width - word.length * wordSize * 0.42) / 2;

  return (
    <PosterFrame
      size={size}
      background={`radial-gradient(ellipse at 50% 40%, ${palette.background} 0%, ${palette.backgroundAlt} 100%)`}
    >
      {/* Giant word */}
      <div
        style={{
          position: 'absolute',
          top: wordTop,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={{ position: 'relative' }}>
          <span
            style={{
              fontFamily: POSTER_FONT_STACK.display,
              fontSize: wordSize,
              lineHeight: 0.9,
              color: palette.ink,
              letterSpacing: 2,
              whiteSpace: 'nowrap',
            }}
          >
            {word}
          </span>
          {date && (
            <span
              style={{
                position: 'absolute',
                top: wordSize * 0.06,
                left: '100%',
                marginLeft: 10,
                writingMode: 'vertical-rl',
                fontSize: 30,
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
                position: 'absolute',
                top: '100%',
                left: '50%',
                marginTop: 8,
                fontSize: 46,
                color: palette.ink,
                letterSpacing: 1,
                whiteSpace: 'nowrap',
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
            // Starts mid-word so the object overlaps the lettering without hiding it.
            top: wordTop + wordSize * 0.4,
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
            left: 0,
            right: 0,
            bottom: 210,
            textAlign: 'center',
            fontSize: 34,
            color: palette.inkMuted,
            padding: `0 ${Math.max(80, wordLeft)}px`,
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
        <CodoLogo variant={palette.logo} height={78} color={palette.ink} />
      </div>
    </PosterFrame>
  );
}
