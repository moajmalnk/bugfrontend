import { CodoLogo } from '../brand/CodoLogo';
import { POSTER_FONT_STACK } from '../brand/posterFonts';
import type { PosterTemplateProps } from '../types';
import { ContactBlock, HeroImage, PosterFrame, SocialIcons, WebsiteTag } from './shared';
import { fitFont, getDateParts, paperTexture } from './posterUtils';

/** Script (Great Vibes-style) glyphs ≈ this fraction of font-size wide. */
const SCRIPT_CHAR_WIDTH = 0.42;
/** Condensed display glyphs ≈ this fraction of font-size wide (incl. letter-spacing). */
const DISPLAY_CHAR_WIDTH = 0.5;
const TITLE_MAX_WIDTH = 940;

/**
 * Largest script size that keeps `text` on one line within `maxWidth`, never
 * below `min` — long phrases then wrap (max 2 lines) instead of bleeding off the canvas.
 */
function fitScript(text: string, max: number, min: number, maxWidth: number): number {
  const ideal = maxWidth / (Math.max(text.length, 1) * SCRIPT_CHAR_WIDTH);
  return Math.max(min, Math.min(max, ideal));
}

/** Gandhi Jayanti style: textured light canvas, big date numeral, condensed title with script overlay, hero cut-out. */
export function HeritageHeroTemplate({ data, palette, size }: PosterTemplateProps) {
  const s = size.height >= 1350 ? 1 : 0.82;
  const date = getDateParts(data.dateIso);
  const title = data.title.toUpperCase();
  const titleSize = fitFont(title, 170 * s, 84 * s, 8);
  const scriptMaxWidth = size.width - 140;
  const scriptSize = data.scriptText
    ? fitScript(data.scriptText, 150 * s, 60 * s, scriptMaxWidth)
    : 0;
  const scriptLines =
    data.scriptText && data.scriptText.length * scriptSize * SCRIPT_CHAR_WIDTH > scriptMaxWidth ? 2 : 1;
  const dayFont = 230 * s;
  // Subtitle sits right of the centred day numeral — only the right half is free.
  const subtitleMaxWidth = size.width / 2 - (date ? date.day.length * dayFont * 0.28 : 0) - 72;
  const subtitleSize = data.subtitle ? fitScript(data.subtitle, 76 * s, 36 * s, subtitleMaxWidth) : 0;

  // Estimate where the date + title + script lockup ends so the hero never overlaps it.
  const lockupTop = size.height * (size.key === 'story' ? 0.14 : 0.16);
  const titleLines = Math.max(
    1,
    Math.ceil((title.length * titleSize * DISPLAY_CHAR_WIDTH) / TITLE_MAX_WIDTH),
  );
  const titleBlock = titleLines * titleSize;
  const scriptBottom = data.scriptText ? titleBlock * 0.42 + scriptLines * scriptSize : 0;
  const lockupBottom =
    lockupTop + (date ? dayFont * 0.8 + 18 * s : 0) + 28 * s + Math.max(titleBlock, scriptBottom);
  const heroTop = Math.max(
    size.height * (size.key === 'story' ? 0.4 : size.key === 'square' ? 0.5 : 0.47),
    lockupBottom + 28 * s,
  );
  const footerH = (data.showContacts ? 184 : 120) * s;

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
            <span style={{ fontSize: dayFont, fontWeight: 400, letterSpacing: -6 }}>{date.day}</span>
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
                  fontSize: subtitleSize,
                  color: palette.accent,
                  whiteSpace: 'nowrap',
                  maxWidth: subtitleMaxWidth,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
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
              maxWidth: TITLE_MAX_WIDTH,
            }}
          >
            {title}
          </span>
          {data.scriptText && (
            <span
              style={{
                position: 'absolute',
                top: '42%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: scriptMaxWidth,
                fontFamily: POSTER_FONT_STACK.script,
                fontSize: scriptSize,
                lineHeight: 1,
                color: palette.accent,
                opacity: 0.85,
                textAlign: 'center',
                overflowWrap: 'anywhere',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
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
              style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', borderRadius: 24 }}
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
