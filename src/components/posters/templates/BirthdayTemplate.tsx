import { CodoLogo } from '../brand/CodoLogo';
import { CODO_BRAND } from '../brand/brandKit';
import { POSTER_FONT_STACK } from '../brand/posterFonts';
import type { PosterTemplateProps } from '../types';
import { fitFont } from './posterUtils';
import { HeroImage, PosterFrame } from './shared';

/** Colours sampled from the CODO birthday poster. */
const BD = {
  glow: '#7C9A6E',
  teal: '#2C6A6A',
  deep: '#1A4F5A',
  card: '#22994F',
  banner: '#0F2744',
  bannerInk: '#E9ECEF',
  arc: '#9BE15D',
  accent: '#2FD36B',
  white: '#FFFFFF',
};

const CARD = { left: 239, top: 323, width: 606, height: 732, radius: 40 };

/**
 * CODO team birthday poster (1080 × 1350): teammate photo on the green card,
 * navy HAPPY / BIRTHDAY banner, name + role and a wish that ends with the name.
 */
export function BirthdayTemplate({ data, size }: PosterTemplateProps) {
  const name = data.speakerName.trim() || 'Teammate';
  const firstName = name.split(/\s+/)[0];
  const nameSize = fitFont(name, 66, 44, 14);
  const wish = data.quote.trim();
  const wishSize = fitFont(`${wish} Celebrate big, ${firstName}!`, 22, 17, 150);

  return (
    <PosterFrame
      size={size}
      background={`radial-gradient(ellipse 75% 55% at 55% 22%, ${BD.glow} 0%, ${BD.teal} 55%, ${BD.deep} 100%)`}
    >
      {/* Side arcs */}
      {[{ left: -70 }, { right: -70 }].map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: 363,
            width: 172,
            height: 680,
            borderRadius: 86,
            border: `2px solid ${BD.arc}`,
            opacity: 0.85,
            ...pos,
          }}
        />
      ))}

      <div style={{ position: 'absolute', top: 72, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <CodoLogo height={78} color={BD.white} accent={BD.accent} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: CARD.left,
          top: CARD.top,
          width: CARD.width,
          height: CARD.height,
          borderRadius: CARD.radius,
          background: BD.card,
        }}
      />

      {/* Photo may rise above the card (cut-outs) but is clipped at the card's bottom edge. */}
      {data.heroImage && (
        <div
          style={{
            position: 'absolute',
            left: CARD.left - 40,
            top: CARD.top - 50,
            width: CARD.width + 80,
            height: CARD.height + 50,
            overflow: 'hidden',
            borderRadius: `0 0 ${CARD.radius}px ${CARD.radius}px`,
          }}
        >
          <HeroImage
            src={data.heroImage}
            alt={name}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              objectPosition: 'bottom center',
            }}
          />
        </div>
      )}

      {/* HAPPY / BIRTHDAY banner */}
      <div
        style={{
          position: 'absolute',
          top: 814,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontFamily: POSTER_FONT_STACK.display,
          color: BD.bannerInk,
          lineHeight: 1,
        }}
      >
        <div
          style={{
            background: BD.banner,
            padding: '8px 44px 4px',
            fontFamily: POSTER_FONT_STACK.body,
            fontWeight: 400,
            fontSize: 72,
            letterSpacing: 6,
          }}
        >
          HAPPY
        </div>
        <div style={{ background: BD.banner, padding: '8px 40px 2px', fontSize: 124, letterSpacing: 5, lineHeight: 0.92 }}>
          BIRTHDAY
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 1072,
          left: 60,
          right: 60,
          textAlign: 'center',
          color: BD.white,
        }}
      >
        <div style={{ fontSize: nameSize, fontWeight: 700, lineHeight: 1.1, textTransform: 'uppercase' }}>{name}</div>
        {data.speakerRole.trim() && (
          <div style={{ marginTop: 10, fontSize: 34, fontWeight: 600, lineHeight: 1.1, textTransform: 'uppercase' }}>
            {data.speakerRole}
          </div>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 1212,
          left: 100,
          right: 100,
          textAlign: 'center',
          color: BD.white,
          fontSize: wishSize,
          lineHeight: 1.3,
        }}
      >
        {wish && <>{wish} </>}
        Celebrate big, <strong style={{ fontWeight: 700 }}>{firstName}!</strong>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: BD.white,
          fontSize: 28,
        }}
      >
        {CODO_BRAND.website}
      </div>
    </PosterFrame>
  );
}
