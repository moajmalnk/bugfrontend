import { Star } from 'lucide-react';
import { PosterFrame } from '../shared';
import {
  CHAR_W,
  FONT,
  Fill,
  Logo,
  MetaList,
  Pill,
  clampLines,
  ellipsis,
  fitLines,
  logoOn,
  pickInk,
  readableOn,
  withAlpha,
  type ModernCtx,
} from './kit';

type VP = { ctx: ModernCtx };

const noDate = (ctx: ModernCtx) => ctx.c.meta.filter((m) => m.kind !== 'date');

/** Giant condensed headline; the last word picks up the accent. */
function BoldType({ ctx }: VP) {
  const { p, c, W, P, s, tall, square } = ctx;
  const words = c.headline.toUpperCase().split(/\s+/).filter(Boolean);
  const last = words.length > 1 ? words.pop() : undefined;
  const size = fitLines(c.headline.toUpperCase(), tall ? 330 : square ? 240 : 290, 110, W - 2 * P, tall ? 5 : 4, CHAR_W.display);
  return (
    <PosterFrame size={ctx.size} background={`linear-gradient(170deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${56 * s}px ${P}px ${60 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: p.ink,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <Logo ctx={ctx} />
          {c.dateLabel && (
            <span style={{ fontSize: 24 * s, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase' }}>{c.dateLabel}</span>
          )}
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: size, lineHeight: 0.86, letterSpacing: 1, ...clampLines(tall ? 5 : 4) }}>
          {words.join(' ')}
          {last && (
            <>
              {' '}
              <span style={{ color: ctx.accentInk }}>{last}</span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 * s }}>
          <div style={{ width: 140, height: 10, borderRadius: 5, background: p.accent }} />
          {c.topic && <div style={{ fontSize: 40 * s, fontWeight: 700, lineHeight: 1.15, ...clampLines(2) }}>{c.topic}</div>}
          {c.body && <div style={{ fontSize: 26 * s, lineHeight: 1.45, color: p.inkMuted, ...clampLines(2) }}>{c.body}</div>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <MetaList ctx={ctx} color={p.ink} iconColor={ctx.accentInk} size={26} items={noDate(ctx)} />
            {c.hashtag && <span style={{ fontSize: 26 * s, fontWeight: 600, color: ctx.accentInk, ...ellipsis }}>{c.hashtag}</span>}
          </div>
        </div>
      </div>
    </PosterFrame>
  );
}

/** International Typographic Style: column grid, big numeral, strict rules. */
function Swiss({ ctx }: VP) {
  const { p, c, W, P, s } = ctx;
  const num = c.date ? c.date.day.padStart(2, '0') : '01';
  const cells = [
    { label: 'Date', value: c.date ? `${c.date.day} ${c.date.monthShort} ${c.date.year}` : '' },
    { label: 'Time', value: c.time },
    { label: 'Where', value: c.platform },
  ].filter((x) => x.value);
  return (
    <PosterFrame
      size={ctx.size}
      background={`repeating-linear-gradient(90deg, ${withAlpha(p.ink, 0.07)} 0 1px, transparent 1px ${W / 6}px), ${p.background}`}
    >
      <div
        style={{
          position: 'absolute',
          top: 120 * s,
          right: P,
          width: 170 * s,
          height: 170 * s,
          background: p.accent,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${56 * s}px ${P}px ${60 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 24 * s,
          color: p.ink,
        }}
      >
        <Logo ctx={ctx} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28 }}>
          <div style={{ fontFamily: FONT.display, fontSize: 250 * s, lineHeight: 0.8, color: ctx.accentInk }}>{num}</div>
          {c.date && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 10, fontSize: 26 * s, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 3 }}>
              <span>{c.date.monthLong}</span>
              <span style={{ color: p.inkMuted, fontWeight: 400 }}>{c.date.weekday}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 * s }}>
          <div
            style={{
              fontSize: fitLines(c.headline, 108, 52, W - 2 * P, 4),
              fontWeight: 800,
              lineHeight: 0.98,
              letterSpacing: -3,
              ...clampLines(4),
            }}
          >
            {c.headline}
          </div>
          {c.topic && <div style={{ fontSize: 36 * s, color: p.inkMuted, lineHeight: 1.2, ...clampLines(2) }}>{c.topic}</div>}
        </div>
        <div>
          {cells.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cells.length}, 1fr)`,
                gap: 24,
                borderTop: `4px solid ${p.ink}`,
                paddingTop: 18 * s,
                marginBottom: 28 * s,
              }}
            >
              {cells.map((cell) => (
                <div key={cell.label} style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 18 * s, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: p.inkMuted }}>{cell.label}</div>
                  <div style={{ fontSize: 28 * s, fontWeight: 700, marginTop: 4, ...ellipsis }}>{cell.value}</div>
                </div>
              ))}
            </div>
          )}
          {c.hashtag && <div style={{ fontSize: 24 * s, fontWeight: 600, color: ctx.accentInk }}>{c.hashtag}</div>}
        </div>
      </div>
    </PosterFrame>
  );
}

/**
 * Frosted card over a colour mesh. Why no backdrop-filter: html-to-image cannot
 * rasterise it, so the "glass" is a translucent fill over a blurred-looking mesh.
 */
function MeshGlass({ ctx }: VP) {
  const { p, c, W, P, s } = ctx;
  const glass = ctx.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.58)';
  const cardW = W - 2 * P;
  return (
    <PosterFrame
      size={ctx.size}
      background={[
        `radial-gradient(circle at 12% 15%, ${withAlpha(p.accent, 0.6)} 0%, transparent 38%)`,
        `radial-gradient(circle at 88% 22%, ${ctx.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.7)'} 0%, transparent 35%)`,
        `radial-gradient(circle at 80% 88%, ${withAlpha(p.accent, 0.45)} 0%, transparent 40%)`,
        `radial-gradient(circle at 12% 85%, ${p.backgroundAlt} 0%, transparent 45%)`,
        `linear-gradient(160deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`,
      ].join(', ')}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${60 * s}px ${P}px ${60 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: p.ink,
        }}
      >
        <Logo ctx={ctx} />
        <div
          style={{
            width: cardW,
            boxSizing: 'border-box',
            padding: `${60 * s}px 56px`,
            borderRadius: 48,
            background: glass,
            border: '1.5px solid rgba(255,255,255,0.4)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            gap: 22 * s,
          }}
        >
          {c.topic && (
            <Pill ctx={ctx} bg={p.accent} color={ctx.onAccent} size={22}>
              {c.topic}
            </Pill>
          )}
          <div
            style={{
              fontSize: fitLines(c.headline, 92, 46, cardW - 112, 4),
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: -1.5,
              ...clampLines(4),
            }}
          >
            {c.headline}
          </div>
          {c.body && <div style={{ fontSize: 27 * s, lineHeight: 1.45, color: p.inkMuted, ...clampLines(3) }}>{c.body}</div>}
          <div style={{ height: 1.5, background: withAlpha(p.ink, 0.18) }} />
          <MetaList ctx={ctx} color={p.ink} iconColor={ctx.accentInk} size={26} />
          {(c.speaker || c.role) && (
            <div style={{ fontSize: 28 * s, fontWeight: 600, ...ellipsis }}>
              {c.speaker}
              {c.role && <span style={{ fontWeight: 400, color: p.inkMuted }}>{c.speaker ? ` · ${c.role}` : c.role}</span>}
            </div>
          )}
        </div>
        <div style={{ fontSize: 26 * s, fontWeight: 600, color: p.inkMuted, minHeight: 1 }}>{c.hashtag}</div>
      </div>
    </PosterFrame>
  );
}

/** Night-sky neon sign with a synthwave grid floor; always dark for glow contrast. */
function Neon({ ctx }: VP) {
  const { p, c, W, H, P, s } = ctx;
  const night = '#05060C';
  const glow = pickInk(night, [p.accent, '#7CF8FF'], 4);
  const head = c.headline.toUpperCase();
  const floor = H * 0.34;
  return (
    <PosterFrame size={ctx.size} background={`radial-gradient(ellipse at 50% 0%, ${withAlpha(glow, 0.22)} 0%, transparent 55%), ${night}`}>
      <div
        style={{
          position: 'absolute',
          left: '-25%',
          right: '-25%',
          bottom: 0,
          height: floor,
          background: `linear-gradient(${withAlpha(glow, 0.55)} 2px, transparent 2px) 0 0 / 100% 64px, linear-gradient(90deg, ${withAlpha(glow, 0.55)} 2px, transparent 2px) 0 0 / 96px 100%`,
          transform: 'perspective(520px) rotateX(60deg)',
          transformOrigin: 'bottom',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: floor - 160,
          height: 200,
          background: `linear-gradient(180deg, ${night} 0%, transparent 100%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${56 * s}px ${P}px ${60 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'center',
          color: '#FFFFFF',
        }}
      >
        <Logo ctx={ctx} variant="light" />
        <div
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: `${40 * s}px 40px`,
            borderRadius: 36,
            border: `4px solid ${glow}`,
            boxShadow: `0 0 18px ${glow}, inset 0 0 18px ${withAlpha(glow, 0.6)}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 16 * s,
          }}
        >
          {c.topic && (
            <div style={{ fontSize: 30 * s, fontWeight: 700, letterSpacing: 6, textTransform: 'uppercase', color: glow, textShadow: `0 0 12px ${glow}`, ...clampLines(2) }}>
              {c.topic}
            </div>
          )}
          <div
            style={{
              fontFamily: FONT.display,
              fontSize: fitLines(head, 170, 86, W - 2 * P - 80, 3, CHAR_W.display),
              lineHeight: 0.92,
              letterSpacing: 3,
              textShadow: `0 0 6px #FFFFFF, 0 0 18px ${glow}, 0 0 42px ${glow}, 0 0 80px ${withAlpha(glow, 0.7)}`,
              ...clampLines(3),
            }}
          >
            {head}
          </div>
        </div>
        <MetaList ctx={ctx} color="#FFFFFF" iconColor={glow} size={28} justify="center" />
        <div style={{ fontSize: 28 * s, fontWeight: 700, color: glow, textShadow: `0 0 12px ${glow}`, minHeight: 1 }}>{c.hashtag}</div>
      </div>
    </PosterFrame>
  );
}

/** Neo-brutalist blocks: thick borders, hard offset shadows, a sticker. */
function Brutalist({ ctx }: VP) {
  const { p, c, W, P, s } = ctx;
  const line = p.ink;
  const box = { border: `6px solid ${line}`, boxShadow: `14px 14px 0 ${line}`, borderRadius: 18 };
  const head = c.headline.toUpperCase();
  const sticker = 170 * s;
  const clear = sticker * 0.55;
  return (
    <PosterFrame size={ctx.size} background={p.background}>
      <div
        style={{
          position: 'absolute',
          top: 36 * s,
          right: P - 10,
          width: sticker,
          height: sticker,
          borderRadius: '50%',
          background: p.ink,
          color: p.background,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'rotate(12deg)',
          zIndex: 2,
        }}
      >
        {c.date ? (
          <>
            <div style={{ fontFamily: FONT.display, fontSize: sticker * 0.46, lineHeight: 0.85 }}>{c.date.day}</div>
            <div style={{ fontSize: sticker * 0.12, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>{c.date.monthShort}</div>
          </>
        ) : (
          <Star size={sticker * 0.45} color={p.background} fill={p.background} />
        )}
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${56 * s}px ${P}px ${70 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 30 * s,
          color: p.ink,
        }}
      >
        <Logo ctx={ctx} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 34 * s }}>
          <div
            style={{
              ...box,
              background: p.accent,
              color: ctx.onAccent,
              padding: `${32 * s}px ${36 + clear}px ${32 * s}px 36px`,
              marginRight: 14,
            }}
          >
            <div
              style={{
                fontSize: fitLines(head, 104, 50, W - 2 * P - 98 - clear, 4, CHAR_W.boldUpper),
                fontWeight: 800,
                lineHeight: 0.98,
                letterSpacing: -1,
                ...clampLines(4),
              }}
            >
              {head}
            </div>
          </div>
          {c.topic && (
            <div
              style={{
                ...box,
                alignSelf: 'flex-start',
                maxWidth: '86%',
                background: '#FFFFFF',
                color: '#111111',
                border: `6px solid ${line}`,
                padding: `${16 * s}px 28px`,
                fontSize: 34 * s,
                fontWeight: 700,
                transform: 'rotate(-1.5deg)',
                ...clampLines(2),
              }}
            >
              {c.topic}
            </div>
          )}
          {c.body && <div style={{ fontSize: 28 * s, lineHeight: 1.45, fontWeight: 600, ...clampLines(3) }}>{c.body}</div>}
        </div>
        <div style={{ ...box, padding: `${20 * s}px 28px`, marginRight: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <MetaList ctx={ctx} color={p.ink} size={26} items={noDate(ctx).length ? noDate(ctx) : c.meta} />
          {c.hashtag && <span style={{ fontSize: 26 * s, fontWeight: 800, ...ellipsis }}>{c.hashtag}</span>}
        </div>
      </div>
    </PosterFrame>
  );
}

/** Quiet layout: hairlines, generous space, medium-weight type. */
function Minimal({ ctx }: VP) {
  const { p, c, W, s } = ctx;
  const P = 96;
  const metaText = c.meta.map((m) => m.label).join('   /   ');
  return (
    <PosterFrame size={ctx.size} background={p.background}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${84 * s}px ${P}px ${80 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: p.ink,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: p.accent, flexShrink: 0 }} />
          {c.hashtag && (
            <span style={{ fontSize: 20 * s, fontWeight: 600, letterSpacing: 6, textTransform: 'uppercase', color: p.inkMuted }}>
              {c.hashtag}
            </span>
          )}
          <div style={{ flex: 1, height: 1, background: withAlpha(p.ink, 0.25) }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 * s }}>
          <div
            style={{
              fontSize: fitLines(c.headline, 100, 50, W - 2 * P, 4, 0.56),
              fontWeight: 600,
              lineHeight: 1.04,
              letterSpacing: -3,
              ...clampLines(4),
            }}
          >
            {c.headline}
          </div>
          {c.topic && (
            <div style={{ fontSize: 38 * s, fontStyle: 'italic', color: p.inkMuted, lineHeight: 1.25, ...clampLines(2) }}>{c.topic}</div>
          )}
          {c.body && (
            <div style={{ fontSize: 26 * s, lineHeight: 1.6, color: p.inkMuted, maxWidth: 760, ...clampLines(3) }}>{c.body}</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 * s }}>
          <div style={{ height: 1, background: withAlpha(p.ink, 0.25) }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <span style={{ fontSize: 22 * s, letterSpacing: 3, textTransform: 'uppercase', color: p.inkMuted, minWidth: 0, ...ellipsis }}>
              {metaText}
            </span>
            <Logo ctx={ctx} height={42} />
          </div>
        </div>
      </div>
    </PosterFrame>
  );
}

/** Oversized outlined day numeral as the hero graphic. */
function BigNumeral({ ctx }: VP) {
  const { p, c, W, H, P, s } = ctx;
  const num = c.date ? c.date.day : (c.headline.trim()[0] ?? 'C').toUpperCase();
  const numSize = Math.min(H * (ctx.tall ? 0.5 : 0.6), W * 0.95);
  const stroke = Math.max(3, numSize * 0.008);
  return (
    <PosterFrame size={ctx.size} background={`linear-gradient(165deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`}>
      <div
        style={{
          position: 'absolute',
          right: -10,
          top: H * 0.06,
          fontFamily: FONT.display,
          fontSize: numSize,
          lineHeight: 0.8,
          color: withAlpha(p.accent, 0.14),
          transform: 'translate(18px, 18px)',
        }}
      >
        {num}
      </div>
      <div
        style={{
          position: 'absolute',
          right: -10,
          top: H * 0.06,
          fontFamily: FONT.display,
          fontSize: numSize,
          lineHeight: 0.8,
          color: 'transparent',
          WebkitTextStroke: `${stroke}px ${ctx.accentInk}`,
        }}
      >
        {num}
      </div>
      {c.date && (
        <div
          style={{
            position: 'absolute',
            left: P,
            top: H * 0.16,
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: 30 * s,
            fontWeight: 800,
            letterSpacing: 10,
            textTransform: 'uppercase',
            color: p.ink,
          }}
        >
          {c.date.monthLong} {c.date.year}
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${56 * s}px ${P}px ${60 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: p.ink,
        }}
      >
        <Logo ctx={ctx} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 * s }}>
          {c.date && <div style={{ fontSize: 28 * s, fontWeight: 600, color: ctx.accentInk }}>{c.date.weekday}</div>}
          <div
            style={{
              fontSize: fitLines(c.headline, 96, 48, W - 2 * P, 3),
              fontWeight: 800,
              lineHeight: 1.03,
              letterSpacing: -1.5,
              ...clampLines(3),
            }}
          >
            {c.headline}
          </div>
          {c.topic && <div style={{ fontSize: 34 * s, color: p.inkMuted, ...clampLines(2) }}>{c.topic}</div>}
          <div style={{ height: 2, background: withAlpha(p.ink, 0.18), margin: `${6 * s}px 0` }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <MetaList ctx={ctx} color={p.ink} iconColor={ctx.accentInk} size={26} items={noDate(ctx)} />
            {c.hashtag && <span style={{ fontSize: 26 * s, fontWeight: 600, color: ctx.accentInk, ...ellipsis }}>{c.hashtag}</span>}
          </div>
        </div>
      </div>
    </PosterFrame>
  );
}

/** Two crossing tape strips with repeated text around a condensed headline. */
function Tape({ ctx }: VP) {
  const { p, c, W, H, P, s } = ctx;
  const head = c.headline.toUpperCase();
  const strip1 = (c.topic || c.headline).toUpperCase();
  const strip2 = [c.hashtag, c.dateLabel].filter(Boolean).join('  •  ').toUpperCase() || strip1;
  const tape = (text: string, top: number, deg: number, bg: string, color: string) => (
    <div
      style={{
        position: 'absolute',
        left: '-15%',
        width: '130%',
        top,
        height: 104 * s,
        transform: `rotate(${deg}deg)`,
        background: bg,
        color,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        fontSize: 42 * s,
        fontWeight: 800,
        letterSpacing: 2,
        boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
      }}
    >
      {Array.from({ length: 10 }, () => `${text}  •  `).join('')}
    </div>
  );
  return (
    <PosterFrame size={ctx.size} background={`linear-gradient(165deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`}>
      {tape(strip1, H * (ctx.square ? 0.13 : 0.15), -6, p.accent, ctx.onAccent)}
      {tape(strip2, H * (ctx.square ? 0.8 : 0.82), 4, p.ink, p.background)}
      <div
        style={{
          position: 'absolute',
          left: P,
          right: P,
          top: H * (ctx.square ? 0.3 : 0.3),
          bottom: H * (ctx.square ? 0.24 : 0.22),
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 20 * s,
          color: p.ink,
        }}
      >
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: fitLines(head, ctx.tall ? 220 : 180, 90, W - 2 * P, 3, CHAR_W.display),
            lineHeight: 0.9,
            letterSpacing: 2,
            ...clampLines(3),
          }}
        >
          {head}
        </div>
        {c.body && <div style={{ fontSize: 28 * s, lineHeight: 1.45, color: p.inkMuted, ...clampLines(2) }}>{c.body}</div>}
        <MetaList ctx={ctx} color={p.ink} iconColor={ctx.accentInk} size={26} items={noDate(ctx)} />
      </div>
      <div style={{ position: 'absolute', top: 52 * s, left: P }}>
        <Logo ctx={ctx} />
      </div>
    </PosterFrame>
  );
}

/** Synthwave sun setting on a horizon. */
function RetroSun({ ctx }: VP) {
  const { p, c, W, H, P, s } = ctx;
  const D = Math.min(W * 0.74, H * (ctx.square ? 0.5 : 0.48));
  const visible = D * 0.62;
  const gap = D * 0.055;
  const head = c.headline.toUpperCase();
  return (
    <PosterFrame size={ctx.size} background={p.background}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${56 * s}px ${P}px ${60 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'center',
          color: p.ink,
        }}
      >
        <Logo ctx={ctx} />
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: fitLines(head, 160, 84, W - 2 * P, 2, CHAR_W.display),
            lineHeight: 0.9,
            letterSpacing: 6,
            textShadow: `5px 5px 0 ${withAlpha(p.accent, 0.6)}`,
            ...clampLines(2),
          }}
        >
          {head}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div style={{ width: D, height: visible, overflow: 'hidden', position: 'relative' }}>
            <div
              style={{
                width: D,
                height: D,
                borderRadius: '50%',
                background: `linear-gradient(180deg, ${p.accent} 0%, ${p.backgroundAlt} 115%)`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: visible * 0.45,
                bottom: 0,
                background: `repeating-linear-gradient(180deg, transparent 0 ${gap}px, ${p.background} ${gap}px ${gap * 1.45}px)`,
              }}
            />
          </div>
          <div style={{ width: '100%', height: 4, background: ctx.accentInk }} />
          {[0.7, 0.5, 0.32, 0.18].map((o, i) => (
            <div key={i} style={{ width: `${90 - i * 16}%`, height: 3, marginTop: 14 * s, background: withAlpha(p.accent, o) }} />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 * s, maxWidth: '100%' }}>
          {c.topic && <div style={{ fontSize: 34 * s, fontWeight: 700, color: ctx.accentInk, ...clampLines(2) }}>{c.topic}</div>}
          <MetaList ctx={ctx} color={p.ink} iconColor={ctx.accentInk} size={26} justify="center" />
          {c.hashtag && <div style={{ fontSize: 24 * s, fontWeight: 600, color: p.inkMuted }}>{c.hashtag}</div>}
        </div>
      </div>
    </PosterFrame>
  );
}

/** Technical drawing: grid paper, dashed title block and a spec table. */
function Blueprint({ ctx }: VP) {
  const { p, c, W, P, s } = ctx;
  const base = p.backgroundAlt;
  const ink = pickInk(base, [p.ink]);
  const muted = withAlpha(ink, 0.7);
  const grid = (alpha: number, w: number, step: number) =>
    `linear-gradient(${withAlpha(ink, alpha)} ${w}px, transparent ${w}px) 0 0 / ${step}px ${step}px, linear-gradient(90deg, ${withAlpha(ink, alpha)} ${w}px, transparent ${w}px) 0 0 / ${step}px ${step}px`;
  const rows = [
    { label: 'Topic', value: c.topic },
    { label: 'Date', value: c.dateLabel },
    { label: 'Time', value: c.time },
    { label: 'Platform', value: c.platform },
    { label: 'Host', value: [c.speaker, c.role].filter(Boolean).join(' · ') },
  ].filter((r) => r.value);
  const cross = (pos: Record<string, number>) => (
    <div style={{ position: 'absolute', width: 40, height: 40, ...pos }}>
      <div style={{ position: 'absolute', left: 19, top: 0, width: 2, height: 40, background: muted }} />
      <div style={{ position: 'absolute', top: 19, left: 0, height: 2, width: 40, background: muted }} />
    </div>
  );
  return (
    <PosterFrame size={ctx.size} background={`${grid(0.14, 1.5, 120)}, ${grid(0.06, 1, 24)}, ${base}`}>
      {cross({ left: 24, top: 24 })}
      {cross({ right: 24, top: 24 })}
      {cross({ left: 24, bottom: 24 })}
      {cross({ right: 24, bottom: 24 })}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${64 * s}px ${P}px ${64 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 28 * s,
          color: ink,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <Logo ctx={ctx} variant={logoOn(base)} />
          {c.hashtag && (
            <span style={{ fontSize: 20 * s, fontWeight: 600, letterSpacing: 4, textTransform: 'uppercase', color: muted, ...ellipsis }}>
              Ref · {c.hashtag}
            </span>
          )}
        </div>
        <div style={{ position: 'relative', border: `2px dashed ${withAlpha(ink, 0.6)}`, borderRadius: 16, padding: `${40 * s}px 36px` }}>
          <span
            style={{
              position: 'absolute',
              top: -16,
              left: 24,
              padding: '0 12px',
              background: base,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: muted,
            }}
          >
            Title
          </span>
          <div style={{ fontSize: fitLines(c.headline, 88, 44, W - 2 * P - 72, 3), fontWeight: 700, lineHeight: 1.05, ...clampLines(3) }}>
            {c.headline}
          </div>
          {c.body && <div style={{ fontSize: 26 * s, lineHeight: 1.45, color: muted, marginTop: 16 * s, ...clampLines(2) }}>{c.body}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: muted }}>
          <div style={{ width: 2, height: 24, background: muted }} />
          <div style={{ flex: 1, height: 2, background: muted }} />
          <div style={{ width: 2, height: 24, background: muted }} />
        </div>
        {rows.length > 0 && (
          <div style={{ border: `2px solid ${withAlpha(ink, 0.5)}`, borderRadius: 16, overflow: 'hidden' }}>
            {rows.map((r, i) => (
              <div
                key={r.label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '220px 1fr',
                  borderTop: i ? `1px solid ${withAlpha(ink, 0.3)}` : undefined,
                }}
              >
                <div style={{ padding: `${16 * s}px 24px`, fontSize: 20 * s, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: muted, borderRight: `1px solid ${withAlpha(ink, 0.3)}` }}>
                  {r.label}
                </div>
                <div style={{ padding: `${16 * s}px 24px`, fontSize: 28 * s, fontWeight: 600, minWidth: 0, ...ellipsis }}>{r.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Fill style={{ boxShadow: `inset 0 0 120px ${withAlpha(readableOn(base) === '#FFFFFF' ? '#000000' : '#FFFFFF', 0.25)}` }} />
    </PosterFrame>
  );
}

export const TYPE_VARIANTS = {
  modern_bold_type: BoldType,
  modern_swiss: Swiss,
  modern_mesh_glass: MeshGlass,
  modern_neon: Neon,
  modern_brutalist: Brutalist,
  modern_minimal: Minimal,
  modern_big_numeral: BigNumeral,
  modern_tape: Tape,
  modern_retro_sun: RetroSun,
  modern_blueprint: Blueprint,
} as const;
