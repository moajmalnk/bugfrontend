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
 * Official Growth Glimpse poster: the approved master artwork (logo, title,
 * Google Meet pill, arcs) is the background; only session details are overlaid.
 * Coordinates are measured on the 1080 × 1152 master.
 */
export function GrowthGlimpseTemplate({ data, size }: PosterTemplateProps) {
  const date = getDateParts(data.dateIso);
  const subtitleSize = fitFont(data.subtitle, 62, 42, 24);
  const timeMatch = data.time.trim().match(/^(.*?)\s*(AM|PM)$/i);
  const timeMain = timeMatch ? timeMatch[1] : data.time.trim();
  const timeSuffix = timeMatch ? timeMatch[2].toUpperCase() : '';
  const hasHero = !!data.heroImage;

  return (
    <PosterFrame size={size} background="#0E7A45">
      <img
        src={GROWTH_GLIMPSE_BG}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />

      {data.heroImage && (
        <HeroImage
          src={data.heroImage}
          alt={data.speakerName || 'Speaker'}
          grayscale
          style={{
            position: 'absolute',
            left: 436,
            top: 181,
            width: 644,
            height: 971,
            objectPosition: 'bottom center',
          }}
        />
      )}

      {/* The master already has the name card; redraw it only when a photo covers it. */}
      {hasHero && (
        <div
          style={{
            position: 'absolute',
            left: 664,
            top: 884,
            width: 430,
            height: 139,
            borderRadius: 70,
            background: GG.card,
            opacity: 0.94,
          }}
        />
      )}
      {(data.speakerName || data.speakerRole) && (
        <div
          style={{
            position: 'absolute',
            left: 672,
            top: 887,
            width: 400,
            height: 133,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            color: GG.white,
            textAlign: 'center',
          }}
        >
          {data.speakerName && (
            <div
              style={{
                fontSize: fitFont(data.speakerName, 46, 30, 14),
                fontWeight: 600,
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
              }}
            >
              {data.speakerName}
            </div>
          )}
          {data.speakerRole && (
            <div
              style={{
                fontSize: fitFont(data.speakerRole, 26, 18, 28),
                fontWeight: 600,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              {data.speakerRole}
            </div>
          )}
        </div>
      )}
      {hasHero && (
        <div
          style={{
            position: 'absolute',
            left: 822,
            top: 1050,
            fontSize: 37,
            fontStyle: 'italic',
            fontWeight: 400,
            color: GG.white,
            lineHeight: 1.2,
          }}
        >
          #cod<span style={{ color: GG.accent }}>o</span>crew
        </div>
      )}

      {/* Topic + tagline sit between the baked title and the baked date box (y 470–720). */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          top: 470,
          width: 540,
          height: 250,
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
          <div style={{ position: 'absolute', left: 213, top: 731, lineHeight: 1.18 }}>
            <div style={{ fontSize: 37, fontWeight: 600, color: GG.white }}>
              {date.monthLong} {date.year}
            </div>
            <div style={{ fontSize: 37, fontWeight: 600, color: GG.accent }}>{date.weekday}</div>
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
            alignItems: 'center',
            gap: 10,
            color: GG.white,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 54, lineHeight: 1 }}>{timeMain}</span>
          {timeSuffix && <span style={{ fontSize: 38, lineHeight: 1, marginTop: 8 }}>{timeSuffix}</span>}
        </div>
      )}
    </PosterFrame>
  );
}
