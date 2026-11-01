import { CodoLogo } from '../brand/CodoLogo';
import { POSTER_FONT_STACK } from '../brand/posterFonts';
import { PosterElement } from '../edit/PosterElement';
import type { PosterTemplateProps } from '../types';
import { LayerText } from './modern/kit';
import { HeroImage, PosterFrame, WebsiteTag } from './shared';
import { fitFont, getDateParts } from './posterUtils';

/** Malayalam message style: brand-colour canvas, regional headline, central white card, hashtag footer. */
export function RegionalMessageTemplate({ data, palette, size }: PosterTemplateProps) {
  const date = getDateParts(data.dateIso);
  const headline = data.malayalamLine || data.title;
  const headlineField = data.malayalamLine ? 'malayalamLine' : 'title';
  const headlineSize = fitFont(headline, 76, 46, 18);
  const cardW = size.key === 'square' ? 440 : 560;
  const cardH = size.key === 'square' ? 520 : size.key === 'story' ? 860 : 700;
  const footer = data.hashtag;
  const footerIsMalayalam = /[\u0D00-\u0D7F]/.test(footer);

  return (
    <PosterFrame
      size={size}
      background={`linear-gradient(180deg, ${palette.background} 0%, ${palette.backgroundAlt} 100%)`}
    >
      <div
        style={{
          position: 'absolute',
          top: 72,
          left: 72,
          right: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <PosterElement id="logo" role="chrome" style={{ display: 'inline-flex', lineHeight: 0 }}>
          <CodoLogo variant={palette.logo} height={56} />
        </PosterElement>
        <WebsiteTag color={palette.ink} fontSize={26} />
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 56,
          paddingTop: 60,
          paddingBottom: 40,
        }}
      >
        <LayerText
          id={headlineField}
          field={headlineField}
          style={{
            fontFamily: POSTER_FONT_STACK.malayalam,
            fontWeight: 700,
            fontSize: headlineSize,
            lineHeight: 1.45,
            color: palette.ink,
            textAlign: 'center',
            maxWidth: 860,
            whiteSpace: 'pre-line',
          }}
        >
          <span lang="ml">{headline}</span>
        </LayerText>

        <PosterElement
          id="card"
          role="group"
          style={{
            width: cardW,
            height: cardH,
            borderRadius: 32,
            background: '#FFFFFF',
            boxShadow: '0 30px 60px rgba(0,0,0,0.22)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            {data.heroImage ? (
              <HeroImage src={data.heroImage} alt={data.title} style={{ maxWidth: '100%', maxHeight: '100%' }} />
            ) : (
              <div style={{ textAlign: 'center', color: palette.backgroundAlt }}>
                {date && (
                  <PosterElement id="date" role="chrome">
                    <div style={{ fontSize: 200, fontWeight: 800, lineHeight: 1 }}>{date.day}</div>
                    <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: 4 }}>
                      {date.monthLong.toUpperCase()}
                    </div>
                  </PosterElement>
                )}
                <LayerText
                  id="title"
                  field="title"
                  style={{
                    marginTop: 24,
                    fontSize: fitFont(data.title, 44, 28, 18),
                    fontWeight: 600,
                    color: '#1F2937',
                  }}
                >
                  {data.title}
                </LayerText>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', height: 10 }}>
            {[palette.accent, palette.background, palette.backgroundAlt, '#FFC940'].map((c, i) => (
              <div key={i} style={{ flex: 1, background: c }} />
            ))}
          </div>
        </PosterElement>
      </div>

      {footer && (
        <LayerText
          id="hashtag"
          field="hashtag"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 64,
            textAlign: 'center',
            fontFamily: footerIsMalayalam ? POSTER_FONT_STACK.malayalam : POSTER_FONT_STACK.body,
            fontWeight: 700,
            fontSize: 32,
            color: palette.ink,
          }}
        >
          <span lang={footerIsMalayalam ? 'ml' : undefined}>{footer}</span>
        </LayerText>
      )}
    </PosterFrame>
  );
}
