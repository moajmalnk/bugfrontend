import { CodoLogo } from '../brand/CodoLogo';
import { POSTER_FONT_STACK } from '../brand/posterFonts';
import type { PosterTemplateProps } from '../types';
import { ContactBlock, HeroImage, PosterFrame, SocialIcons, WebsiteTag } from './shared';
import { fitFont, getDateParts, paperTexture } from './posterUtils';

/** Gandhi Jayanti style: textured light canvas, big date numeral, condensed title with script overlay, hero cut-out. */
export function HeritageHeroTemplate({ data, palette, size }: PosterTemplateProps) {
  const s = size.height >= 1350 ? 1 : 0.82;
  const date = getDateParts(data.dateIso);
  const titleSize = fitFont(data.title.toUpperCase(), 170 * s, 84 * s, 8);
  const heroTop = size.height * (size.key === 'story' ? 0.4 : size.key === 'square' ? 0.5 : 0.47);
  const footerH = 150 * s;

  return (
    <PosterFrame size={size} background={paperTexture(palette.background, palette.backgroundAlt)}>
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 72 * s,
          left: 72,
          right: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <CodoLogo variant={palette.logo} height={56 * s} />
        {data.showContacts && <SocialIcons color={palette.inkMuted} size={36 * s} />}
      </div>

      {/* Date + title lockup */}
      <div
        style={{
          position: 'absolute',
          top: size.height * (size.key === 'story' ? 0.14 : 0.16),
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          color: palette.accent,
        }}
      >
        {date && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', lineHeight: 0.8 }}>
            <span style={{ fontSize: 230 * s, fontWeight: 400, letterSpacing: -6 }}>{date.day}</span>
            <span
              style={{
                position: 'absolute',
                left: '50%',
                bottom: -18 * s,
                transform: 'translateX(-50%)',
                fontSize: 26 * s,
                letterSpacing: 3,
                color: palette.inkMuted,
                background: palette.background,
                padding: '0 8px',
              }}
            >
              {date.monthLong}
            </span>
            {data.subtitle && (
              <span
                style={{
                  position: 'absolute',
                  left: '100%',
                  bottom: 10 * s,
                  marginLeft: 6,
                  fontFamily: POSTER_FONT_STACK.script,
                  fontSize: 76 * s,
                  color: palette.accent,
                  whiteSpace: 'nowrap',
                }}
              >
                {data.subtitle}
              </span>
            )}
          </div>
        )}
        <div style={{ position: 'relative', marginTop: 28 * s, display: 'flex', justifyContent: 'center' }}>
          <span
            style={{
              fontFamily: POSTER_FONT_STACK.display,
              fontSize: titleSize,
              lineHeight: 1,
              color: palette.accent,
              letterSpacing: 2,
              textAlign: 'center',
              maxWidth: 940,
            }}
          >
            {data.title.toUpperCase()}
          </span>
          {data.scriptText && (
            <span
              style={{
                position: 'absolute',
                top: '42%',
                left: '50%',
                transform: 'translateX(-46%)',
                fontFamily: POSTER_FONT_STACK.script,
                fontSize: 150 * s,
                lineHeight: 1,
                color: palette.accent,
                opacity: 0.85,
                whiteSpace: 'nowrap',
              }}
            >
              {data.scriptText}
            </span>
          )}
        </div>
      </div>

      {/* Hero */}
      <div
        style={{
          position: 'absolute',
          top: heroTop,
          bottom: footerH,
          left: 80,
          right: 80,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        {data.heroImage ? (
          <>
            <div
              style={{
                position: 'absolute',
                bottom: 6,
                left: '12%',
                right: '12%',
                height: 40,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.22)',
                filter: 'blur(16px)',
              }}
            />
            <HeroImage
              src={data.heroImage}
              alt={data.title}
              style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}
            />
          </>
        ) : (
          data.quote && (
            <div
              style={{
                alignSelf: 'center',
                textAlign: 'center',
                color: palette.ink,
                fontSize: fitFont(data.quote, 54 * s, 34 * s, 60),
                lineHeight: 1.35,
                maxWidth: 820,
              }}
            >
              &ldquo;{data.quote}&rdquo;
              {data.quoteAuthor && (
                <div style={{ marginTop: 24, fontSize: 28 * s, letterSpacing: 4, color: palette.inkMuted }}>
                  — {data.quoteAuthor.toUpperCase()} —
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Footer */}
      {data.showContacts && (
        <div
          style={{
            position: 'absolute',
            left: 72,
            right: 72,
            bottom: 56 * s,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <WebsiteTag color={palette.inkMuted} fontSize={28 * s} />
          <ContactBlock color={palette.inkMuted} />
        </div>
      )}
    </PosterFrame>
  );
}
