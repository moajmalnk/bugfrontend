import { Clock, Video } from 'lucide-react';
import { CodoLogo } from '../brand/CodoLogo';
import { POSTER_FONT_STACK } from '../brand/posterFonts';
import type { PosterTemplateProps } from '../types';
import { HeroImage, PosterFrame, WebsiteTag } from './shared';
import { fitFont, getDateParts } from './posterUtils';

/** Top-corner radius of the speaker photo frame (scaled by poster size). */
const PHOTO_RADIUS = 72;

/** Growth Glimpse style: green brand canvas, speaker photo in an arch, date + time + platform blocks. */
export function SpeakerSessionTemplate({ data, palette, size }: PosterTemplateProps) {
  const s = size.height >= 1350 ? 1 : 0.86;
  const date = getDateParts(data.dateIso);
  const titleSize = fitFont(data.title, 128 * s, 72 * s, 14);
  const photoW = 540 * s;
  const photoH = Math.min(size.height * 0.68, 980);
  const initials = data.speakerName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <PosterFrame
      size={size}
      background={`linear-gradient(140deg, ${palette.background} 0%, ${palette.backgroundAlt} 100%)`}
    >
      {/* Decorative arcs */}
      <div
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
          borderRadius: 900,
          border: `120px solid ${palette.accentSoft}`,
          right: -420,
          top: -360,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 700,
          height: 700,
          borderRadius: 700,
          background: palette.accentSoft,
          left: -380,
          bottom: -380,
        }}
      />

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 64 * s,
          left: 72,
          right: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <CodoLogo variant={palette.logo} height={56 * s} />
        <WebsiteTag color={palette.ink} fontSize={26 * s} />
      </div>

      {/* Speaker arch + photo */}
      <div
        style={{
          position: 'absolute',
          right: 40,
          bottom: 0,
          width: photoW,
          height: photoH,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 70 * s,
            right: 0,
            bottom: 0,
            height: photoH * 0.72,
            borderTopLeftRadius: 400,
            borderTopRightRadius: 400,
            background: 'rgba(0,0,0,0.22)',
          }}
        />
        {data.heroImage ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              borderTopLeftRadius: PHOTO_RADIUS * s,
              borderTopRightRadius: PHOTO_RADIUS * s,
              boxShadow: '0 -18px 60px rgba(0,0,0,0.28)',
            }}
          >
            <HeroImage
              src={data.heroImage}
              alt={data.speakerName || 'Speaker'}
              grayscale
              fit="cover"
              style={{
                width: '100%',
                height: '100%',
                objectPosition: 'center 12%',
              }}
            />
            {/* Gradient layers instead of CSS masks — masks drop out in html-to-image exports. */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 22%, transparent 52%, ${palette.backgroundAlt} 100%)`,
                opacity: 0.92,
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, rgba(0,0,0,0.28) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.22) 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderTopLeftRadius: PHOTO_RADIUS * s,
                borderTopRightRadius: PHOTO_RADIUS * s,
                border: '1.5px solid rgba(255,255,255,0.22)',
                borderBottom: 'none',
                pointerEvents: 'none',
              }}
            />
          </div>
        ) : (
          <div
            style={{
              position: 'absolute',
              left: 70 * s,
              right: 0,
              bottom: photoH * 0.18,
              display: 'flex',
              justifyContent: 'center',
              fontSize: 220 * s,
              fontWeight: 800,
              color: palette.accentSoft,
            }}
          >
            {initials || 'C'}
          </div>
        )}
        {(data.speakerName || data.speakerRole) && (
          <div
            style={{
              position: 'absolute',
              right: 20,
              bottom: 150 * s,
              padding: `${22 * s}px ${34 * s}px`,
              borderRadius: 28,
              background: 'rgba(11,107,61,0.78)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: palette.ink,
              maxWidth: photoW - 20,
            }}
          >
            {data.speakerName && (
              <div style={{ fontSize: 40 * s, fontWeight: 600, lineHeight: 1.15 }}>{data.speakerName}</div>
            )}
            {data.speakerRole && (
              <div style={{ fontSize: 24 * s, color: palette.inkMuted, marginTop: 4 }}>{data.speakerRole}</div>
            )}
          </div>
        )}
      </div>

      {/* Left content column */}
      <div
        style={{
          position: 'absolute',
          left: 72,
          top: size.key === 'story' ? 300 : 180 * s,
          width: 560,
          display: 'flex',
          flexDirection: 'column',
          gap: 22 * s,
          color: palette.ink,
        }}
      >
        <div style={{ fontSize: titleSize, fontWeight: 600, lineHeight: 1.02, letterSpacing: -2 }}>
          {data.title}
        </div>
        {data.subtitle && (
          <div style={{ fontSize: 62 * s, fontWeight: 600, lineHeight: 1.1, color: palette.accent }}>
            {data.subtitle}
          </div>
        )}
        {data.tagline && (
          <div style={{ fontSize: 28 * s, lineHeight: 1.35, color: palette.inkMuted, maxWidth: 480 }}>
            {data.tagline}
          </div>
        )}

        {date && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 12 * s }}>
            <div
              style={{
                minWidth: 120 * s,
                height: 120 * s,
                padding: '0 16px',
                borderRadius: 26,
                background: 'rgba(0,0,0,0.32)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 76 * s,
                fontWeight: 800,
                color: palette.accent,
                lineHeight: 1,
              }}
            >
              {date.day}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 2,
                lineHeight: 1.12,
              }}
            >
              <div style={{ fontSize: 44 * s, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {date.monthShort} {date.year}
              </div>
              <div style={{ fontSize: 44 * s, fontWeight: 600, color: palette.accent }}>
                {date.weekday}
              </div>
            </div>
          </div>
        )}

        {data.time && (
          <>
            <div style={{ height: 2, width: 470, background: 'rgba(255,255,255,0.25)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 56 * s, fontWeight: 600 }}>
              <Clock size={60 * s} color={palette.accent} strokeWidth={2.4} />
              <span>{data.time}</span>
            </div>
            <div style={{ height: 2, width: 470, background: 'rgba(255,255,255,0.25)' }} />
          </>
        )}

        {data.platform && (
          <div
            style={{
              alignSelf: 'flex-start',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: `${18 * s}px ${34 * s}px`,
              borderRadius: 60,
              background: '#0B1F15',
              fontSize: 32 * s,
              fontWeight: 600,
            }}
          >
            <Video size={36 * s} color={palette.accent} />
            <span>{data.platform}</span>
          </div>
        )}
      </div>

      {data.hashtag && (
        <div
          style={{
            position: 'absolute',
            right: 72,
            bottom: 48 * s,
            fontSize: 40 * s,
            fontWeight: 600,
            color: palette.ink,
            fontFamily: POSTER_FONT_STACK.body,
          }}
        >
          {data.hashtag}
        </div>
      )}
    </PosterFrame>
  );
}
