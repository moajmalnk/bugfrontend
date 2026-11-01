import type { CSSProperties } from 'react';
import { CodoLogo } from '../../brand/CodoLogo';
import { POSTER_FONT_STACK } from '../../brand/posterFonts';
import { PosterElement } from '../../edit/PosterElement';
import type { PosterTemplateProps } from '../../types';
import { ContactBlock, HeroImage, PosterFrame, WebsiteTag } from '../shared';
import { fitFont } from '../posterUtils';
import {
  FONT,
  LayerText,
  buildCtx,
  clampLines,
  fitLines,
  pickInk,
  withAlpha,
  type ModernCtx,
} from '../modern/kit';
import type { StudioCatalogEntry, StudioLayoutId, StudioTreatmentId } from './studioSpec';

type Props = PosterTemplateProps & { entry: StudioCatalogEntry };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'CO';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function treatmentBackground(treatment: StudioTreatmentId, ctx: ModernCtx): string {
  const { p } = ctx;
  const base = `linear-gradient(165deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`;
  switch (treatment) {
    case 'clean':
      return base;
    case 'paper':
      return `${base}`;
    case 'night':
      return `radial-gradient(ellipse 80% 50% at 50% 0%, ${withAlpha(p.accent, 0.28)} 0%, transparent 55%), ${base}`;
    case 'brand':
      return `radial-gradient(circle at 90% 10%, ${withAlpha(p.accent, 0.35)} 0%, transparent 40%), ${base}`;
    case 'warm':
      return `radial-gradient(circle at 10% 90%, ${withAlpha(p.accent, 0.22)} 0%, transparent 45%), ${base}`;
    case 'cool':
      return `radial-gradient(circle at 80% 80%, ${withAlpha('#FFFFFF', 0.12)} 0%, transparent 40%), ${base}`;
    case 'festoon':
      return `radial-gradient(circle at 0% 0%, ${withAlpha(p.accent, 0.35)} 0%, transparent 32%), radial-gradient(circle at 100% 0%, ${withAlpha(p.accent, 0.28)} 0%, transparent 30%), ${base}`;
    case 'orbit':
      return `radial-gradient(circle at 50% 120%, ${withAlpha(p.accent, 0.3)} 0%, transparent 50%), ${base}`;
    case 'stripe':
      return `repeating-linear-gradient(135deg, ${withAlpha(p.accent, 0.14)} 0 18px, transparent 18px 48px), ${base}`;
    case 'stamp':
      return base;
    case 'glass':
      return `radial-gradient(circle at 30% 20%, ${withAlpha('#FFFFFF', 0.18)} 0%, transparent 40%), ${base}`;
    case 'diagonal':
      return `linear-gradient(135deg, ${p.background} 0 48%, ${p.backgroundAlt} 48% 100%)`;
    case 'ribbon':
      return base;
    default:
      return base;
  }
}

function TreatmentOrnaments({ treatment, ctx }: { treatment: StudioTreatmentId; ctx: ModernCtx }) {
  const { p, W, H, s } = ctx;
  if (treatment === 'orbit') {
    return (
      <>
        <div
          style={{
            position: 'absolute',
            top: H * 0.08,
            right: -W * 0.15,
            width: W * 0.55,
            height: W * 0.55,
            borderRadius: '50%',
            border: `${6 * s}px solid ${withAlpha(p.accent, 0.35)}`,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -W * 0.2,
            left: -W * 0.1,
            width: W * 0.5,
            height: W * 0.5,
            borderRadius: '50%',
            border: `${4 * s}px solid ${withAlpha(p.ink, 0.12)}`,
            pointerEvents: 'none',
          }}
        />
      </>
    );
  }
  if (treatment === 'festoon') {
    return (
      <>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: 48 + (i % 3) * 28,
              left: i < 3 ? 40 + i * 36 : undefined,
              right: i >= 3 ? 40 + (i - 3) * 36 : undefined,
              width: 14 * s,
              height: 14 * s,
              borderRadius: i % 2 ? 3 : '50%',
              background: i % 2 ? p.accent : withAlpha(p.ink, 0.35),
              transform: `rotate(${i * 18}deg)`,
              pointerEvents: 'none',
            }}
          />
        ))}
      </>
    );
  }
  if (treatment === 'ribbon') {
    return (
      <div
        style={{
          position: 'absolute',
          top: H * 0.22,
          left: 0,
          right: 0,
          height: 18 * s,
          background: p.accent,
          opacity: 0.85,
          pointerEvents: 'none',
        }}
      />
    );
  }
  if (treatment === 'stamp') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 48 * s,
          border: `${5 * s}px solid ${withAlpha(p.ink, 0.22)}`,
          borderRadius: 28,
          pointerEvents: 'none',
        }}
      />
    );
  }
  return null;
}

function Header({ ctx, light }: { ctx: ModernCtx; light?: boolean }) {
  const logo = light ? 'light' : ctx.p.logo;
  const ink = light ? '#FFFFFF' : ctx.p.ink;
  return (
    <div
      style={{
        position: 'absolute',
        top: 56 * ctx.s,
        left: ctx.P,
        right: ctx.P,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 3,
      }}
    >
      <PosterElement id="logo" role="chrome" style={{ display: 'inline-flex', lineHeight: 0 }}>
        <CodoLogo variant={logo} height={48 * ctx.s} />
      </PosterElement>
      <WebsiteTag color={withAlpha(ink, 0.85)} fontSize={22 * ctx.s} />
    </div>
  );
}

function Footer({ ctx, light }: { ctx: ModernCtx; light?: boolean }) {
  if (!ctx.c.hashtag && !ctx.size) return null;
  const ink = light ? '#FFFFFF' : ctx.p.inkMuted;
  return (
    <div
      style={{
        position: 'absolute',
        left: ctx.P,
        right: ctx.P,
        bottom: 48 * ctx.s,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 24,
        zIndex: 3,
      }}
    >
      {ctx.c.hashtag ? (
        <LayerText id="hashtag" field="hashtag" style={{ fontSize: 26 * ctx.s, fontWeight: 700, color: ink }}>
          {ctx.c.hashtag}
        </LayerText>
      ) : (
        <span />
      )}
      <ContactBlock color={ink} />
    </div>
  );
}

function PhotoBox({
  ctx,
  style,
  radius = 28,
}: {
  ctx: ModernCtx;
  style: CSSProperties;
  radius?: number | string;
}) {
  if (ctx.c.image) {
    return (
      <div style={{ overflow: 'hidden', borderRadius: radius, ...style }}>
        <HeroImage src={ctx.c.image} alt={ctx.c.speaker || ctx.c.headline} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }
  return (
    <PosterElement
      id="photo"
      role="chrome"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: withAlpha(ctx.p.accent, 0.2),
        color: ctx.accentInk,
        fontWeight: 800,
        fontSize: 72 * ctx.s,
        borderRadius: radius,
        ...style,
      }}
    >
      {initials(ctx.c.speaker || ctx.c.headline)}
    </PosterElement>
  );
}

function HeadlineBlock({
  ctx,
  align = 'left',
  max = 96,
  color,
}: {
  ctx: ModernCtx;
  align?: 'left' | 'center' | 'right';
  max?: number;
  color?: string;
}) {
  const ink = color ?? ctx.p.ink;
  return (
    <div style={{ textAlign: align, color: ink, minWidth: 0 }}>
      {ctx.c.topic && (
        <LayerText
          id="subtitle"
          field="subtitle"
          style={{
            fontSize: 28 * ctx.s,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: ctx.accentInk,
            marginBottom: 12 * ctx.s,
          }}
        >
          {ctx.c.topic}
        </LayerText>
      )}
      <LayerText
        id="title"
        field="title"
        style={{
          fontFamily: FONT.display,
          fontSize: fitLines(ctx.c.headline, max * ctx.s, 42 * ctx.s, ctx.W - 2 * ctx.P, 3, 0.5),
          lineHeight: 0.95,
          fontWeight: 700,
          ...clampLines(3),
        }}
      >
        {ctx.c.headline}
      </LayerText>
      {ctx.c.body && (
        <LayerText
          id="tagline"
          field="tagline"
          style={{
            marginTop: 20 * ctx.s,
            fontSize: fitLines(ctx.c.body, 34 * ctx.s, 22 * ctx.s, ctx.W - 2 * ctx.P, 3),
            fontWeight: 500,
            color: withAlpha(ink, 0.82),
            ...clampLines(3),
          }}
        >
          {ctx.c.body}
        </LayerText>
      )}
    </div>
  );
}

function MalayalamLine({ ctx, color }: { ctx: ModernCtx; color?: string }) {
  const raw = (ctx as ModernCtx & { malayalam?: string }).malayalam;
  if (!raw) return null;
  return (
    <LayerText
      id="malayalamLine"
      field="malayalamLine"
      style={{
        fontFamily: POSTER_FONT_STACK.malayalam,
        fontWeight: 700,
        fontSize: fitFont(raw, 56 * ctx.s, 32 * ctx.s, 16),
        lineHeight: 1.35,
        color: color ?? ctx.p.ink,
        textAlign: 'center',
      }}
    >
      <span lang="ml">{raw}</span>
    </LayerText>
  );
}

function enrichCtx(ctx: ModernCtx, data: PosterTemplateProps['data']): ModernCtx & { malayalam: string } {
  return { ...ctx, malayalam: data.malayalamLine.trim() };
}

function LayoutBody({ layout, ctx, data }: { layout: StudioLayoutId; ctx: ModernCtx & { malayalam: string }; data: PosterTemplateProps['data'] }) {
  const { W, H, P, s, p, c } = ctx;
  const date = c.date;

  switch (layout) {
    case 'photo_left':
    case 'photo_right': {
      const photoLeft = layout === 'photo_left';
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: photoLeft ? 'row' : 'row-reverse',
            paddingTop: 140 * s,
            paddingBottom: 120 * s,
            paddingLeft: P,
            paddingRight: P,
            gap: 40 * s,
            alignItems: 'stretch',
          }}
        >
          <PhotoBox ctx={ctx} style={{ flex: '0 0 42%', minHeight: 0 }} radius={32} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 * s, minWidth: 0 }}>
            <HeadlineBlock ctx={ctx} max={78} />
            {(c.speaker || c.role) && (
              <PosterElement id="speaker" role="group">
                {c.speaker ? (
                  <LayerText id="speakerName" field="speakerName" style={{ fontSize: 34 * s, fontWeight: 700 }}>
                    {c.speaker}
                  </LayerText>
                ) : null}
                {c.role ? (
                  <LayerText id="speakerRole" field="speakerRole" style={{ fontSize: 24 * s, color: p.inkMuted }}>
                    {c.role}
                  </LayerText>
                ) : null}
              </PosterElement>
            )}
            {c.meta.length > 0 && (
              <PosterElement id="meta" role="chrome" style={{ fontSize: 22 * s, color: p.inkMuted }}>
                {c.meta.map((m) => m.label).join(' · ')}
              </PosterElement>
            )}
          </div>
        </div>
      );
    }
    case 'photo_circle': {
      const D = Math.min(W * 0.48, H * 0.34);
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 36 * s,
            padding: `${160 * s}px ${P}px ${140 * s}px`,
          }}
        >
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                inset: -14 * s,
                borderRadius: '50%',
                border: `${8 * s}px solid ${p.accent}`,
                opacity: 0.85,
              }}
            />
            <PhotoBox ctx={ctx} style={{ width: D, height: D }} radius="50%" />
          </div>
          <HeadlineBlock ctx={ctx} align="center" max={72} />
          {(c.speaker || c.role) && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36 * s, fontWeight: 700 }}>{c.speaker}</div>
              {c.role && <div style={{ fontSize: 24 * s, color: p.inkMuted }}>{c.role}</div>}
            </div>
          )}
        </div>
      );
    }
    case 'photo_top':
      return (
        <>
          <PhotoBox
            ctx={ctx}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: H * 0.42 }}
            radius={0}
          />
          <div
            style={{
              position: 'absolute',
              top: H * 0.42 - 28 * s,
              left: P,
              right: P,
              bottom: 120 * s,
              background: p.background,
              borderRadius: 32,
              padding: 40 * s,
              boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 16 * s,
            }}
          >
            <HeadlineBlock ctx={ctx} max={70} />
            {c.meta.length > 0 && (
              <div style={{ fontSize: 22 * s, color: p.inkMuted }}>{c.meta.map((m) => m.label).join(' · ')}</div>
            )}
          </div>
        </>
      );
    case 'photo_bleed':
      return (
        <>
          {c.image ? (
            <HeroImage
              src={c.image}
              alt={c.headline}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: p.backgroundAlt }} />
          )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.75) 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: P,
              right: P,
              bottom: 140 * s,
              display: 'flex',
              flexDirection: 'column',
              gap: 18 * s,
            }}
          >
            <HeadlineBlock ctx={ctx} max={84} color="#FFFFFF" />
            {c.speaker && <div style={{ fontSize: 32 * s, fontWeight: 600, color: '#FFFFFF' }}>{c.speaker}</div>}
          </div>
        </>
      );
    case 'date_hero':
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24 * s,
            padding: P,
          }}
        >
          {date && (
            <div style={{ textAlign: 'center', color: ctx.accentInk }}>
              <div style={{ fontSize: 200 * s, fontWeight: 300, lineHeight: 0.85, letterSpacing: -8 }}>{date.day}</div>
              <div style={{ fontSize: 36 * s, fontWeight: 700, letterSpacing: 6, textTransform: 'uppercase' }}>
                {date.monthLong}
              </div>
            </div>
          )}
          <HeadlineBlock ctx={ctx} align="center" max={88} />
        </div>
      );
    case 'ticket_band':
      return (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: P * 0.7,
            right: P * 0.7,
            transform: 'translateY(-50%)',
            display: 'flex',
            borderRadius: 28,
            overflow: 'hidden',
            background: withAlpha('#FFFFFF', ctx.isDark ? 0.1 : 0.92),
            boxShadow: '0 28px 60px rgba(0,0,0,0.2)',
            minHeight: H * 0.42,
          }}
        >
          <div
            style={{
              flex: '0 0 28%',
              background: p.accent,
              color: pickInk(p.accent, ['#FFFFFF', '#0B1220']),
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 24,
            }}
          >
            {date ? (
              <>
                <div style={{ fontSize: 72 * s, fontWeight: 800, lineHeight: 1 }}>{date.day}</div>
                <div style={{ fontSize: 22 * s, fontWeight: 700, letterSpacing: 2 }}>{date.monthShort.toUpperCase()}</div>
              </>
            ) : (
              <div style={{ fontSize: 28 * s, fontWeight: 700 }}>EVENT</div>
            )}
          </div>
          <div style={{ flex: 1, padding: 36 * s, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 * s }}>
            <HeadlineBlock ctx={ctx} max={64} color={ctx.isDark ? '#FFFFFF' : p.ink} />
            {c.meta.length > 0 && (
              <div style={{ fontSize: 22 * s, color: ctx.isDark ? withAlpha('#FFF', 0.7) : p.inkMuted }}>
                {c.meta.map((m) => m.label).join(' · ')}
              </div>
            )}
          </div>
        </div>
      );
    case 'calendar_card':
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: P,
          }}
        >
          <div
            style={{
              width: Math.min(W - 2 * P, 640),
              borderRadius: 36,
              overflow: 'hidden',
              background: '#FFFFFF',
              boxShadow: '0 30px 60px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ background: p.accent, padding: `${28 * s}px ${32 * s}px`, color: pickInk(p.accent, ['#FFF', '#111']) }}>
              <div style={{ fontSize: 24 * s, fontWeight: 700, letterSpacing: 3 }}>{date?.monthLong.toUpperCase() ?? 'DATE'}</div>
              <div style={{ fontSize: 96 * s, fontWeight: 800, lineHeight: 1 }}>{date?.day ?? '—'}</div>
            </div>
            <div style={{ padding: 36 * s }}>
              <HeadlineBlock ctx={{ ...ctx, p: { ...p, ink: '#1F2937', inkMuted: '#6B7280', accent: p.accent } }} max={56} color="#1F2937" />
            </div>
          </div>
        </div>
      );
    case 'agenda_rows':
      return (
        <div
          style={{
            position: 'absolute',
            top: 150 * s,
            left: P,
            right: P,
            bottom: 120 * s,
            display: 'flex',
            flexDirection: 'column',
            gap: 28 * s,
          }}
        >
          <HeadlineBlock ctx={ctx} max={72} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 * s }}>
            {[
              ['When', c.dateLabel || c.time || '—'],
              ['Where', c.platform || '—'],
              ['Note', c.body || c.topic || '—'],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr',
                  gap: 16,
                  paddingBottom: 16 * s,
                  borderBottom: `2px solid ${withAlpha(p.ink, 0.12)}`,
                }}
              >
                <div style={{ fontSize: 22 * s, fontWeight: 700, color: ctx.accentInk, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {label}
                </div>
                <div style={{ fontSize: 28 * s, fontWeight: 600, ...clampLines(2) }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'save_badge':
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20 * s,
            padding: P,
          }}
        >
          <div
            style={{
              fontFamily: FONT.script,
              fontSize: fitFont(c.script || 'Save the Date', 90 * s, 48 * s, 14),
              color: ctx.accentInk,
            }}
          >
            {c.script || 'Save the Date'}
          </div>
          {date && (
            <div style={{ fontSize: 56 * s, fontWeight: 800, letterSpacing: 2 }}>
              {date.day} {date.monthShort.toUpperCase()}
            </div>
          )}
          <HeadlineBlock ctx={ctx} align="center" max={70} />
        </div>
      );
    case 'bold_center':
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 28 * s,
            padding: P,
          }}
        >
          {ctx.malayalam && <MalayalamLine ctx={ctx} />}
          <HeadlineBlock ctx={ctx} align="center" max={110} />
        </div>
      );
    case 'swiss_rule':
      return (
        <div
          style={{
            position: 'absolute',
            top: 160 * s,
            left: P,
            right: P,
            bottom: 120 * s,
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: 32 * s,
          }}
        >
          <div style={{ borderTop: `${6 * s}px solid ${p.accent}`, paddingTop: 24 * s }}>
            {date && (
              <>
                <div style={{ fontSize: 120 * s, fontWeight: 800, lineHeight: 0.9 }}>{date.day}</div>
                <div style={{ fontSize: 28 * s, letterSpacing: 2 }}>{date.monthShort.toUpperCase()}</div>
              </>
            )}
          </div>
          <div style={{ borderTop: `${6 * s}px solid ${withAlpha(p.ink, 0.2)}`, paddingTop: 24 * s }}>
            <HeadlineBlock ctx={ctx} max={78} />
            {ctx.malayalam && (
              <div style={{ marginTop: 24 * s }}>
                <MalayalamLine ctx={ctx} />
              </div>
            )}
          </div>
        </div>
      );
    case 'side_rail':
      return (
        <>
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: 28 * s,
              background: p.accent,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 160 * s,
              left: P + 12,
              right: P,
              bottom: 120 * s,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 24 * s,
            }}
          >
            {ctx.malayalam && <MalayalamLine ctx={ctx} />}
            <HeadlineBlock ctx={ctx} max={92} />
          </div>
        </>
      );
    case 'big_day':
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: P,
            gap: 12 * s,
          }}
        >
          {date && (
            <div
              style={{
                fontFamily: FONT.display,
                fontSize: fitFont(date.day, 320 * s, 160 * s, 8),
                lineHeight: 0.8,
                color: withAlpha(p.ink, 0.1),
                fontWeight: 700,
              }}
            >
              {date.day}
            </div>
          )}
          <div style={{ marginTop: -40 * s }}>
            {ctx.malayalam && <MalayalamLine ctx={ctx} />}
            <HeadlineBlock ctx={ctx} max={88} />
          </div>
        </div>
      );
    case 'mesh_card':
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: P,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 760,
              borderRadius: 36,
              padding: 48 * s,
              background: withAlpha('#FFFFFF', ctx.isDark ? 0.12 : 0.88),
              backdropFilter: 'blur(12px)',
              boxShadow: '0 28px 60px rgba(0,0,0,0.18)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20 * s,
            }}
          >
            {ctx.malayalam && <MalayalamLine ctx={ctx} color={ctx.isDark ? '#FFF' : p.ink} />}
            <HeadlineBlock ctx={ctx} max={72} color={ctx.isDark ? '#FFF' : p.ink} />
          </div>
        </div>
      );
    case 'quote_center':
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 36 * s,
            padding: `${160 * s}px ${P}px ${140 * s}px`,
          }}
        >
          <div style={{ fontSize: 160 * s, lineHeight: 0.6, color: ctx.accentInk, fontWeight: 800 }}>“</div>
          <div
            style={{
              fontSize: fitLines(c.quote, 56 * s, 30 * s, W - 2 * P, 6),
              fontWeight: 600,
              lineHeight: 1.3,
              ...clampLines(6),
            }}
          >
            {c.quote}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 * s }}>
            {c.image && <PhotoBox ctx={ctx} style={{ width: 88 * s, height: 88 * s }} radius="50%" />}
            <div>
              <div style={{ fontSize: 30 * s, fontWeight: 700 }}>{c.author || c.speaker}</div>
              {c.role && <div style={{ fontSize: 22 * s, color: p.inkMuted }}>{c.role}</div>}
            </div>
          </div>
        </div>
      );
    case 'quote_bar':
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: P,
            gap: 28 * s,
          }}
        >
          <div style={{ width: 120, height: 10, borderRadius: 6, background: p.accent }} />
          <div
            style={{
              fontSize: fitLines(c.quote, 58 * s, 30 * s, W - 2 * P, 7),
              fontWeight: 600,
              lineHeight: 1.28,
              ...clampLines(7),
            }}
          >
            {c.quote}
          </div>
          <div style={{ fontSize: 28 * s, fontWeight: 700, color: ctx.accentInk }}>— {c.author || c.speaker || 'CODO'}</div>
        </div>
      );
    case 'chat_pair':
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 24 * s,
            padding: `${160 * s}px ${P}px ${140 * s}px`,
          }}
        >
          <div
            style={{
              alignSelf: 'flex-end',
              maxWidth: '78%',
              background: withAlpha(p.ink, ctx.isDark ? 0.2 : 0.08),
              color: p.ink,
              borderRadius: 28,
              borderBottomRightRadius: 8,
              padding: `${22 * s}px ${28 * s}px`,
              fontSize: fitLines(c.headline, 36 * s, 24 * s, W * 0.7, 4),
              fontWeight: 600,
            }}
          >
            {c.headline}
          </div>
          <div
            style={{
              alignSelf: 'flex-start',
              maxWidth: '85%',
              background: p.accent,
              color: pickInk(p.accent, ['#FFF', '#111']),
              borderRadius: 28,
              borderBottomLeftRadius: 8,
              padding: `${22 * s}px ${28 * s}px`,
              fontSize: fitLines(c.body || c.topic || '…', 34 * s, 22 * s, W * 0.75, 5),
              fontWeight: 600,
            }}
          >
            {c.body || c.topic || '…'}
          </div>
          {c.speaker && (
            <div style={{ fontSize: 22 * s, color: p.inkMuted, marginTop: 8 }}>{c.speaker}</div>
          )}
        </div>
      );
    case 'fest_script':
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18 * s,
            padding: P,
          }}
        >
          <div style={{ fontSize: 36 * s, fontWeight: 800, letterSpacing: 6, textTransform: 'uppercase' }}>
            {c.headline || 'HAPPY'}
          </div>
          <div
            style={{
              fontFamily: FONT.script,
              fontSize: fitFont(c.script || data.scriptText || 'Celebration', 120 * s, 56 * s, 12),
              color: ctx.accentInk,
              lineHeight: 1.1,
            }}
          >
            {c.script || data.scriptText || 'Celebration'}
          </div>
          {ctx.malayalam && <MalayalamLine ctx={ctx} />}
          {c.body && (
            <div style={{ marginTop: 12 * s, fontSize: 28 * s, textAlign: 'center', maxWidth: 720, ...clampLines(3) }}>
              {c.body}
            </div>
          )}
          {date && (
            <div style={{ marginTop: 16 * s, fontSize: 24 * s, color: p.inkMuted, letterSpacing: 2 }}>
              {date.day} {date.monthLong.toUpperCase()} {date.year}
            </div>
          )}
        </div>
      );
    case 'medal_ring': {
      const D = Math.min(W * 0.42, H * 0.3);
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24 * s,
            padding: P,
          }}
        >
          <div
            style={{
              fontFamily: FONT.script,
              fontSize: 64 * s,
              color: ctx.accentInk,
            }}
          >
            {c.script || 'Congratulations'}
          </div>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                inset: -16 * s,
                borderRadius: '50%',
                border: `${10 * s}px solid ${p.accent}`,
              }}
            />
            <PhotoBox ctx={ctx} style={{ width: D, height: D }} radius="50%" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44 * s, fontWeight: 800 }}>{c.speaker || c.headline}</div>
            {c.role && <div style={{ fontSize: 26 * s, color: p.inkMuted }}>{c.role}</div>}
            {c.body && <div style={{ marginTop: 12 * s, fontSize: 26 * s, ...clampLines(2) }}>{c.body}</div>}
          </div>
        </div>
      );
    }
    default:
      return <HeadlineBlock ctx={ctx} align="center" />;
  }
}

/** One engine for all Studio Library templates — layout + treatment from the catalog entry. */
export function StudioEngine({ data, palette, size, entry }: Props) {
  const base = buildCtx(data, palette, size);
  const ctx = enrichCtx(base, data);
  const lightBleed = entry.layoutId === 'photo_bleed';

  return (
    <PosterFrame size={size} background={treatmentBackground(entry.treatmentId, ctx)}>
      <TreatmentOrnaments treatment={entry.treatmentId} ctx={ctx} />
      {!lightBleed && <Header ctx={ctx} />}
      {lightBleed && <Header ctx={ctx} light />}
      <LayoutBody layout={entry.layoutId} ctx={ctx} data={data} />
      <Footer ctx={ctx} light={lightBleed} />
    </PosterFrame>
  );
}

/** Tiny CSS-only thumb for the picker — avoids mounting 300 full poster trees. */
export function StudioThumbSwatch({ entry, palette }: { entry: StudioCatalogEntry; palette: { background: string; backgroundAlt: string; accent: string; ink: string } }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: '100%',
        backgroundImage: `linear-gradient(160deg, ${palette.background}, ${palette.backgroundAlt})`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 6,
          left: 6,
          width: 18,
          height: 6,
          borderRadius: 3,
          background: palette.accent,
          opacity: 0.9,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 8,
          right: 8,
          bottom: 14,
          height: 8,
          borderRadius: 2,
          background: withAlpha(palette.ink, 0.55),
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 8,
          right: 20,
          bottom: 6,
          height: 4,
          borderRadius: 2,
          background: withAlpha(palette.ink, 0.28),
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          fontSize: 7,
          fontWeight: 700,
          color: withAlpha(palette.ink, 0.55),
          letterSpacing: 0.2,
        }}
      >
        {entry.treatmentId.slice(0, 4)}
      </span>
    </div>
  );
}
