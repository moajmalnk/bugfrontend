import type { PosterTemplateProps } from '../types';
import { fitFont, getDateParts } from './posterUtils';
import { HeroImage, PosterFrame } from './shared';

const GROWTH_GLIMPSE_BG = '/posters/growth-glimpse-bg.webp';

/** Colours sampled from the Growth Glimpse master artwork. */
const GG = {
  accent: '#2FE07A',
  card: '#064A2B',
  white: '#FFFFFF',
};

/**
 * Measured from growth-glimpse-bg.webp dark placeholders (1080×1152).
 * Why: absolute slots must match the master — an oversized/left-shifted photo
 * clips "Growth Glimpse" and stops feeling responsive to the design grid.
 */
const PHOTO = {
  left: 612,
  top: 372,
  width: 386,
  height: 528,
  radius: 44,
} as const;

/** Master name bar under the portrait (full name + role). */
const BADGE = {
  left: 668,
  top: 902,
  width: 392,
  minHeight: 108,
  paddingX: 26,
  paddingY: 16,
} as const;

/**
 * Official Growth Glimpse poster: master artwork for logo/title/Meet; session
 * copy + a right-column speaker portrait are overlaid into the designed slots.
 */
export function GrowthGlimpseTemplate({ data, size }: PosterTemplateProps) {
  const date = getDateParts(data.dateIso);
  const subtitleSize = fitFont(data.subtitle, 62, 42, 24);
  const timeMatch = data.time.trim().match(/^(.*?)\s*(AM|PM)$/i);
  const timeMain = timeMatch ? timeMatch[1] : data.time.trim();
  const timeSuffix = timeMatch ? timeMatch[2].toUpperCase() : '';
  const speakerName = data.speakerName.trim();
  const speakerRole = data.speakerRole.trim();
  const nameSize = fitFont(speakerName, 32, 20, 16);
  const roleSize = fitFont(speakerRole, 18, 14, 20);
  const nameNeedsWrap = speakerName.length > 18;

  return (
    <PosterFrame size={size} background="#0E7A45">
      <img
        src={GROWTH_GLIMPSE_BG}
        alt=""
        crossOrigin="anonymous"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />

      {data.heroImage && (
        <div
          style={{
            position: 'absolute',
            left: PHOTO.left,
            top: PHOTO.top,
            width: PHOTO.width,
            height: PHOTO.height,
            borderRadius: PHOTO.radius,
            overflow: 'hidden',
            background: 'rgba(4, 40, 24, 0.45)',
          }}
        >
          <HeroImage
            src={data.heroImage}
            alt={speakerName || 'Speaker'}
            grayscale
            fit="cover"
            style={{
              width: '100%',
              height: '100%',
              objectPosition: 'center 12%',
            }}
          />
          {/* Soft bottom blend into the name bar — export-safe gradient. */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '28%',
              background:
                'linear-gradient(180deg, transparent 0%, rgba(6,74,43,0.45) 55%, rgba(6,74,43,0.92) 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}

      {/* Name bar — sits in the master pill; grows with long names, never ellipsizes. */}
      {(speakerName || speakerRole) && (
        <div
          style={{
            position: 'absolute',
            left: BADGE.left,
            top: BADGE.top,
            width: BADGE.width,
            minHeight: BADGE.minHeight,
            borderRadius: 999,
            background: 'rgba(6, 74, 43, 0.96)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: speakerName && speakerRole ? 5 : 0,
            color: GG.white,
            textAlign: 'center',
            padding: `${BADGE.paddingY}px ${BADGE.paddingX}px`,
            boxSizing: 'border-box',
          }}
        >
          {speakerName && (
            <div
              style={{
                fontSize: nameSize,
                fontWeight: 600,
                letterSpacing: -0.2,
                lineHeight: nameNeedsWrap ? 1.18 : 1.1,
                maxWidth: '100%',
                whiteSpace: nameNeedsWrap ? 'normal' : 'nowrap',
                overflowWrap: 'break-word',
                wordBreak: nameNeedsWrap ? 'break-word' : 'normal',
              }}
            >
              {speakerName}
            </div>
          )}
          {speakerRole && (
            <div
              style={{
                fontSize: roleSize,
                fontWeight: 500,
                letterSpacing: 0.3,
                lineHeight: 1.25,
                color: 'rgba(255,255,255,0.9)',
                maxWidth: '100%',
                whiteSpace: 'normal',
                overflowWrap: 'break-word',
              }}
            >
              {speakerRole}
            </div>
          )}
        </div>
      )}

      {/* Topic + tagline — left column only; never under the portrait. */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          top: 470,
          width: 480,
          height: 240,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          overflow: 'hidden',
        }}
      >
        {data.subtitle && (
          <div
            style={{
              fontSize: subtitleSize,
              fontWeight: 700,
              lineHeight: 1.12,
              color: GG.accent,
              letterSpacing: -0.5,
            }}
          >
            {data.subtitle}
          </div>
        )}
        {data.tagline && (
          <div
            style={{
              fontSize: 28,
              fontWeight: 400,
              lineHeight: 1.12,
              color: GG.white,
              maxWidth: 420,
              maxHeight: 28 * 1.12 * 3,
              overflow: 'hidden',
            }}
          >
            {data.tagline}
          </div>
        )}
      </div>

      {date && (
        <>
          <div
            style={{
              position: 'absolute',
              left: 84,
              top: 730,
              width: 116,
              height: 95,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 64,
              fontWeight: 600,
              color: GG.accent,
              lineHeight: 1,
            }}
          >
            {date.day}
          </div>
          <div
            style={{
              position: 'absolute',
              left: 213,
              top: 730,
              height: 95,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              lineHeight: 1.15,
            }}
          >
            <div style={{ fontSize: 36, fontWeight: 600, color: GG.white, whiteSpace: 'nowrap' }}>
              {date.monthLong} {date.year}
            </div>
            <div style={{ fontSize: 36, fontWeight: 600, color: GG.accent }}>{date.weekday}</div>
          </div>
        </>
      )}

      {timeMain && (
        <div
          style={{
            position: 'absolute',
            left: 165,
            top: 868,
            height: 68,
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            color: GG.white,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 52, lineHeight: 1 }}>{timeMain}</span>
          {timeSuffix && <span style={{ fontSize: 36, lineHeight: 1 }}>{timeSuffix}</span>}
        </div>
      )}
    </PosterFrame>
  );
}
