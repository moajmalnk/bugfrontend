import { CodoLogo } from '../brand/CodoLogo';
import { POSTER_FONT_STACK } from '../brand/posterFonts';
import { PosterElement } from '../edit/PosterElement';
import type { PosterTemplateProps } from '../types';
import { LayerText } from './modern/kit';
import { PosterFrame } from './shared';
import { fitFont, getDateParts, paperTexture } from './posterUtils';

/** "Oct 2" style: aged paper, oversized numeral, short quote and attribution. No photo required. */
export function TypographicQuoteTemplate({ data, palette, size }: PosterTemplateProps) {
  const date = getDateParts(data.dateIso);
  const numeral = date?.day ?? data.title.slice(0, 3);
  const numeralSize = size.key === 'square' ? 440 : 560;
  const quoteText = (data.quote || data.title).toUpperCase();

  return (
    <PosterFrame
      size={size}
      background={paperTexture(palette.background, palette.backgroundAlt)}
      style={{ boxShadow: 'inset 0 0 180px rgba(120,80,40,0.18)' }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 140,
          color: palette.ink,
        }}
      >
        <div style={{ position: 'relative', lineHeight: 0.85 }}>
          {date && (
            <span
              style={{
                position: 'absolute',
                right: '86%',
                top: '28%',
                fontFamily: POSTER_FONT_STACK.script,
                fontSize: 96,
                color: palette.inkMuted,
                whiteSpace: 'nowrap',
              }}
            >
              {date.monthShort}
            </span>
          )}
          <span
            style={{
              fontSize: numeralSize,
              fontWeight: 400,
              color: palette.accent,
              letterSpacing: -10,
            }}
          >
            {numeral}
          </span>
        </div>

        <LayerText
          id={data.quote ? 'quote' : 'title'}
          field={data.quote ? 'quote' : 'title'}
          style={{
            marginTop: 30,
            maxWidth: 760,
            textAlign: 'center',
            fontSize: fitFont(quoteText, 48, 30, 44),
            fontWeight: 400,
            lineHeight: 1.3,
            color: palette.inkMuted,
            letterSpacing: 1,
          }}
        >
          {quoteText}
        </LayerText>
        {data.quoteAuthor && (
          <LayerText
            id="quoteAuthor"
            field="quoteAuthor"
            style={{ marginTop: 16, fontSize: 26, letterSpacing: 3, color: palette.inkMuted }}
          >
            -{data.quoteAuthor.toUpperCase()}-
          </LayerText>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 90,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <PosterElement id="logo" role="chrome" style={{ display: 'inline-flex', lineHeight: 0 }}>
          <CodoLogo variant={palette.logo} height={52} />
        </PosterElement>
      </div>
    </PosterFrame>
  );
}
