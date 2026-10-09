import { CalendarDays, Check, Clock, Megaphone, Mic, Sparkles, Star, Video, type LucideIcon } from 'lucide-react';
import { PosterFrame } from '../shared';
import {
  CHAR_W,
  FONT,
  Fill,
  Footer,
  Logo,
  MetaList,
  Photo,
  Pill,
  SpeakerLine,
  bulletPoints,
  clampLines,
  ellipsis,
  fitLines,
  pickInk,
  readableOn,
  withAlpha,
  type ModernCtx,
} from './kit';

type VP = { ctx: ModernCtx };

const noDate = (ctx: ModernCtx) => ctx.c.meta.filter((m) => m.kind !== 'date');

/** Contrasting card surface for layered layouts: white on dark palettes, ink on light ones. */
function cardColors(ctx: ModernCtx) {
  const card = ctx.isDark ? '#FFFFFF' : '#0F172A';
  const ink = readableOn(card);
  return {
    card,
    ink,
    muted: withAlpha(ink, 0.66),
    accent: pickInk(card, [ctx.p.accent, ctx.p.background, ctx.p.backgroundAlt]),
  };
}

/** Event ticket with a perforated stub; real transparent notches via radial gradients. */
function Ticket({ ctx }: VP) {
  const { p, c, W, P, s, tall } = ctx;
  const k = cardColors(ctx);
  const n = 28;
  const hole = (at: string) => `radial-gradient(circle at ${at}, transparent ${n}px, ${k.card} ${n + 1}px)`;
  const mainBg = tall
    ? `${hole('0 100%')} left / 51% 100% no-repeat, ${hole('100% 100%')} right / 51% 100% no-repeat`
    : `${hole('100% 0')} top / 100% 51% no-repeat, ${hole('100% 100%')} bottom / 100% 51% no-repeat`;
  const stubBg = tall
    ? `${hole('0 0')} left / 51% 100% no-repeat, ${hole('100% 0')} right / 51% 100% no-repeat`
    : `${hole('0 0')} top / 100% 51% no-repeat, ${hole('0 100%')} bottom / 100% 51% no-repeat`;
  const stubSize = tall ? 340 : 290;
  const mainW = tall ? W - 2 * P : W - 2 * P - stubSize;
  const dash = `3px dashed ${withAlpha(k.ink, 0.3)}`;
  return (
    <PosterFrame
      size={ctx.size}
      background={`radial-gradient(circle at 15% 12%, ${withAlpha(p.accent, 0.35)} 0%, transparent 40%), linear-gradient(160deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${56 * s}px ${P}px ${56 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: 36 * s,
          color: p.ink,
        }}
      >
        <Footer ctx={ctx} color={p.ink} />
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: tall ? 'column' : 'row',
            filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.3))',
            minHeight: tall ? 1100 : ctx.square ? 560 : 640,
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              background: mainBg,
              borderRadius: tall ? '36px 36px 0 0' : '36px 0 0 36px',
              padding: 48,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 24 * s,
              color: k.ink,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 * s }}>
              {c.topic && (
                <div style={{ fontSize: 22 * s, fontWeight: 700, letterSpacing: 5, textTransform: 'uppercase', color: k.accent, ...ellipsis }}>
                  {c.topic}
                </div>
              )}
              <div style={{ fontSize: fitLines(c.headline, 76, 40, mainW - 96, 3), fontWeight: 800, lineHeight: 1.05, ...clampLines(3) }}>
                {c.headline}
              </div>
              {c.body && <div style={{ fontSize: 24 * s, lineHeight: 1.45, color: k.muted, ...clampLines(tall ? 4 : 2) }}>{c.body}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {(c.speaker || c.image) && (
                <Photo ctx={ctx} radius="50%" fallbackSize={34} style={{ width: 96, height: 96, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <SpeakerLine ctx={ctx} color={k.ink} mutedColor={k.muted} size={30} />
              </div>
            </div>
            <MetaList ctx={ctx} color={k.ink} iconColor={k.accent} size={24} items={c.meta.filter((m) => m.kind === 'platform')} />
          </div>
          <div
            style={{
              [tall ? 'height' : 'width']: stubSize,
              flexShrink: 0,
              background: stubBg,
              borderRadius: tall ? '0 0 36px 36px' : '0 36px 36px 0',
              [tall ? 'borderTop' : 'borderLeft']: dash,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              color: k.ink,
              textAlign: 'center',
              padding: 24,
              boxSizing: 'border-box',
            }}
          >
            {c.date ? (
              <>
                <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 6, textTransform: 'uppercase', color: k.accent }}>
                  {c.date.monthShort}
                </div>
                <div style={{ fontFamily: FONT.display, fontSize: 150, lineHeight: 0.85 }}>{c.date.day}</div>
                <div style={{ fontSize: 22, color: k.muted }}>{c.date.weekday}</div>
              </>
            ) : (
              <Star size={90} color={k.accent} fill={k.accent} />
            )}
            {c.time && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: dash, fontSize: 30, fontWeight: 700, maxWidth: '100%', ...ellipsis }}>
                {c.time}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </PosterFrame>
  );
}

/** "Save the Date" script over an oversized day numeral. */
function SaveDate({ ctx }: VP) {
  const { p, c, W, P, s, tall, square } = ctx;
  const head = c.headline.toUpperCase();
  return (
    <PosterFrame
      size={ctx.size}
      background={`radial-gradient(circle at 50% 42%, ${withAlpha(p.accent, 0.25)} 0%, transparent 55%), linear-gradient(170deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`}
    >
      <Fill style={{ inset: 28, border: `2px solid ${withAlpha(p.ink, 0.25)}`, borderRadius: 32 }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${64 * s}px ${P}px ${64 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'center',
          color: p.ink,
        }}
      >
        <Logo ctx={ctx} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontFamily: FONT.script, fontSize: (tall ? 150 : 124) * s, lineHeight: 1.1, color: ctx.accentInk }}>
            {c.script || 'Save the Date'}
          </div>
          {c.date ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 10 * s }}>
                <div style={{ width: 90, height: 2, background: withAlpha(p.ink, 0.5) }} />
                <span style={{ fontSize: 28 * s, fontWeight: 600, letterSpacing: 8, textTransform: 'uppercase' }}>{c.date.weekday}</span>
                <div style={{ width: 90, height: 2, background: withAlpha(p.ink, 0.5) }} />
              </div>
              <div style={{ fontFamily: FONT.display, fontSize: tall ? 440 : square ? 290 : 360, lineHeight: 0.84, marginTop: 10 }}>
                {c.date.day}
              </div>
              <div style={{ fontSize: 46 * s, fontWeight: 700, letterSpacing: 14, textTransform: 'uppercase' }}>
                {c.date.monthLong} {c.date.year}
              </div>
            </>
          ) : (
            <CalendarDays size={200 * s} color={ctx.accentInk} strokeWidth={1.4} />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 * s, maxWidth: '100%' }}>
          <div
            style={{
              fontSize: fitLines(head, 58, 32, W - 2 * P, 2, CHAR_W.boldUpper),
              fontWeight: 700,
              letterSpacing: 3,
              lineHeight: 1.15,
              ...clampLines(2),
            }}
          >
            {head}
          </div>
          {c.topic && <div style={{ fontSize: 30 * s, color: p.inkMuted, ...clampLines(2) }}>{c.topic}</div>}
          <MetaList ctx={ctx} color={p.ink} iconColor={ctx.accentInk} size={26} items={noDate(ctx)} justify="center" />
          {c.hashtag && <div style={{ fontSize: 24 * s, fontWeight: 600, color: ctx.accentInk }}>{c.hashtag}</div>}
        </div>
      </div>
    </PosterFrame>
  );
}

/** Tear-off desk calendar page. */
function Calendar({ ctx }: VP) {
  const { p, c, W, H, P, s, tall, square } = ctx;
  const cardW = Math.min(W * 0.6, H * (tall ? 0.36 : square ? 0.42 : 0.44));
  const cardH = cardW * 1.02;
  const head = pickInk('#FFFFFF', [p.accent, p.backgroundAlt, '#111827']);
  const onHead = readableOn(head);
  const ring = (side: 'left' | 'right') => (
    <div
      style={{
        position: 'absolute',
        top: -cardW * 0.07,
        [side]: '24%',
        width: cardW * 0.07,
        height: cardW * 0.17,
        borderRadius: 999,
        background: '#E5E7EB',
        border: '3px solid #9CA3AF',
        boxSizing: 'border-box',
      }}
    />
  );
  return (
    <PosterFrame
      size={ctx.size}
      background={`radial-gradient(${withAlpha(p.ink, 0.1)} 2px, transparent 2.5px) 0 0 / 36px 36px, linear-gradient(160deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${56 * s}px ${P}px ${56 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'center',
          color: p.ink,
        }}
      >
        <Footer ctx={ctx} color={p.inkMuted} style={{ alignSelf: 'stretch' }} />
        <div
          style={{
            position: 'relative',
            width: cardW,
            height: cardH,
            borderRadius: 40,
            background: '#FFFFFF',
            boxShadow: '0 40px 80px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            transform: 'rotate(-2deg)',
          }}
        >
          <div
            style={{
              height: cardH * 0.24,
              borderRadius: '40px 40px 0 0',
              background: head,
              color: onHead,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: cardW * 0.085,
              fontWeight: 800,
              letterSpacing: cardW * 0.012,
              textTransform: 'uppercase',
            }}
          >
            {c.date ? `${c.date.monthLong} ${c.date.year}` : ''}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#111827' }}>
            {c.date ? (
              <>
                <div style={{ fontFamily: FONT.display, fontSize: cardW * 0.5, lineHeight: 0.86 }}>{c.date.day}</div>
                <div style={{ fontSize: cardW * 0.065, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: head }}>
                  {c.date.weekday}
                </div>
              </>
            ) : (
              <CalendarDays size={cardW * 0.4} color={head} strokeWidth={1.4} />
            )}
          </div>
          {ring('left')}
          {ring('right')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 * s, maxWidth: '100%' }}>
          <div style={{ fontSize: fitLines(c.headline, 80, 42, W - 2 * P, 2), fontWeight: 800, lineHeight: 1.05, ...clampLines(2) }}>
            {c.headline}
          </div>
          {c.topic && <div style={{ fontSize: 32 * s, color: ctx.accentInk, fontWeight: 600, ...clampLines(2) }}>{c.topic}</div>}
          <MetaList ctx={ctx} color={p.ink} iconColor={ctx.accentInk} size={26} items={noDate(ctx)} justify="center" />
        </div>
      </div>
    </PosterFrame>
  );
}

/** Event details as a stack of labelled glass rows. */
function Agenda({ ctx }: VP) {
  const { p, c, W, P, s, square } = ctx;
  const rows: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: CalendarDays, label: 'Date', value: c.dateLabel },
    { icon: Clock, label: 'Time', value: c.time },
    { icon: Video, label: 'Where', value: c.platform },
    { icon: Mic, label: 'Speaker', value: [c.speaker, c.role].filter(Boolean).join(' · ') },
    { icon: Sparkles, label: 'Topic', value: c.topic },
  ].filter((r) => r.value);
  const shown = rows.slice(0, square ? 4 : 5);
  const icon = 68 * s;
  return (
    <PosterFrame
      size={ctx.size}
      background={`radial-gradient(circle at 100% 0%, ${withAlpha(p.accent, 0.3)} 0%, transparent 45%), linear-gradient(165deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${56 * s}px ${P}px ${56 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 28 * s,
          color: p.ink,
        }}
      >
        <Footer ctx={ctx} color={p.inkMuted} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 * s }}>
          <div style={{ width: 90, height: 8, borderRadius: 4, background: p.accent }} />
          <div
            style={{
              fontSize: fitLines(c.headline, 94, 46, W - 2 * P, square ? 2 : 3),
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: -1.5,
              ...clampLines(square ? 2 : 3),
            }}
          >
            {c.headline}
          </div>
          {c.body && <div style={{ fontSize: 26 * s, lineHeight: 1.45, color: p.inkMuted, ...clampLines(2) }}>{c.body}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 * s }}>
          {shown.map((r) => (
            <div
              key={r.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                padding: `${20 * s}px 26px`,
                borderRadius: 28,
                background: withAlpha(p.ink, ctx.isDark ? 0.08 : 0.06),
                border: `1px solid ${withAlpha(p.ink, 0.14)}`,
              }}
            >
              <div
                style={{
                  width: icon,
                  height: icon,
                  borderRadius: 20,
                  background: p.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <r.icon size={icon * 0.5} color={ctx.onAccent} strokeWidth={2.2} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 19 * s, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: p.inkMuted }}>
                  {r.label}
                </div>
                <div style={{ fontSize: 32 * s, fontWeight: 700, lineHeight: 1.2, ...ellipsis }}>{r.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PosterFrame>
  );
}

/** Headline plus a checklist built from the tagline. */
function Takeaways({ ctx }: VP) {
  const { p, c, W, P, s, square } = ctx;
  let points = bulletPoints(c.body, square ? 3 : 4);
  if (points.length < 2) points = [c.topic, ...noDate(ctx).map((m) => m.label)].filter(Boolean).slice(0, 4);
  const dot = 56 * s;
  return (
    <PosterFrame size={ctx.size} background={p.background}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 170,
          height: 170,
          borderRadius: '0 0 0 110px',
          background: p.accent,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 46,
          right: 46,
          width: 72,
          height: 72,
          borderRadius: '50%',
          border: `4px solid ${withAlpha(ctx.onAccent, 0.6)}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${60 * s}px ${P}px ${60 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 28 * s,
          color: p.ink,
        }}
      >
        <Logo ctx={ctx} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 * s }}>
          {c.hashtag && (
            <div style={{ fontSize: 24 * s, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: ctx.accentInk }}>
              {c.hashtag}
            </div>
          )}
          <div
            style={{
              fontSize: fitLines(c.headline, 92, 46, W - 2 * P, 3),
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: -1.5,
              ...clampLines(3),
            }}
          >
            {c.headline}
          </div>
        </div>
        {points.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 * s }}>
            {points.map((pt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 22 }}>
                <div
                  style={{
                    width: dot,
                    height: dot,
                    borderRadius: '50%',
                    background: p.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Check size={dot * 0.56} color={ctx.onAccent} strokeWidth={3} />
                </div>
                <div style={{ fontSize: 34 * s, fontWeight: 600, lineHeight: 1.3, paddingTop: dot * 0.08, minWidth: 0, ...clampLines(2) }}>
                  {pt}
                </div>
              </div>
            ))}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            paddingTop: 24 * s,
            borderTop: `2px solid ${withAlpha(p.ink, 0.15)}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 0 }}>
            {c.speaker && <Photo ctx={ctx} radius="50%" fallbackSize={36} style={{ width: 96, height: 96, flexShrink: 0 }} />}
            <SpeakerLine ctx={ctx} color={p.ink} mutedColor={p.inkMuted} size={30} />
          </div>
          <MetaList ctx={ctx} color={p.ink} iconColor={ctx.accentInk} size={22} direction="column" items={c.meta.filter((m) => m.kind !== 'platform')} />
        </div>
      </div>
    </PosterFrame>
  );
}

/** Loud announcement: megaphone badge and a big headline. */
function Announcement({ ctx }: VP) {
  const { p, c, W, P, s } = ctx;
  const badge = 190 * s;
  return (
    <PosterFrame
      size={ctx.size}
      background={`radial-gradient(circle at 85% 15%, ${withAlpha(p.accent, 0.35)} 0%, transparent 38%), linear-gradient(160deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${60 * s}px ${P}px ${60 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 28 * s,
          color: p.ink,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ position: 'relative', width: badge, height: badge }}>
            <div
              style={{
                position: 'absolute',
                inset: -26,
                borderRadius: '50%',
                background: `repeating-conic-gradient(${withAlpha(p.accent, 0.35)} 0deg 10deg, transparent 10deg 20deg)`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: p.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: 'rotate(-12deg)',
                boxShadow: `0 20px 50px ${withAlpha(p.accent, 0.45)}`,
              }}
            >
              <Megaphone size={badge * 0.48} color={ctx.onAccent} strokeWidth={2} />
            </div>
          </div>
          <Logo ctx={ctx} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 * s }}>
          {(c.topic || c.hashtag) && (
            <Pill ctx={ctx} bg="transparent" color={ctx.accentInk} border={`2px solid ${ctx.accentInk}`} size={24}>
              {(c.topic || c.hashtag).toUpperCase()}
            </Pill>
          )}
          <div
            style={{
              fontSize: fitLines(c.headline, ctx.tall ? 128 : 116, 54, W - 2 * P, 4),
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: -3,
              ...clampLines(4),
            }}
          >
            {c.headline}
          </div>
          {c.body && <div style={{ fontSize: 30 * s, lineHeight: 1.45, color: p.inkMuted, ...clampLines(3) }}>{c.body}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 * s }}>
          <MetaList ctx={ctx} color={p.ink} iconColor={ctx.accentInk} size={28} />
          <SpeakerLine ctx={ctx} color={p.ink} mutedColor={p.inkMuted} size={30} />
        </div>
      </div>
    </PosterFrame>
  );
}

/** Retro sunburst rays radiating from a date badge. */
function Sunburst({ ctx }: VP) {
  const { p, c, W, H, P, s } = ctx;
  const D = Math.min(W * 0.56, H * (ctx.square ? 0.38 : 0.36));
  const head = c.headline.toUpperCase();
  return (
    <PosterFrame
      size={ctx.size}
      background={`repeating-conic-gradient(from 0deg at 50% 45%, ${p.background} 0deg 7.5deg, ${p.backgroundAlt} 7.5deg 15deg)`}
    >
      <Fill style={{ background: `radial-gradient(circle at 50% 45%, transparent 25%, ${withAlpha(p.backgroundAlt, 0.9)} 80%)` }} />
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
            position: 'relative',
            width: D,
            height: D,
            borderRadius: '50%',
            background: p.accent,
            color: ctx.onAccent,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 0 14px ${withAlpha(p.accent, 0.3)}, 0 30px 70px rgba(0,0,0,0.35)`,
          }}
        >
          <div style={{ position: 'absolute', inset: 18, borderRadius: '50%', border: `4px dashed ${withAlpha(ctx.onAccent, 0.5)}` }} />
          {c.date ? (
            <>
              <div style={{ fontSize: D * 0.09, fontWeight: 800, letterSpacing: 6, textTransform: 'uppercase' }}>{c.date.monthShort}</div>
              <div style={{ fontFamily: FONT.display, fontSize: D * 0.44, lineHeight: 0.86 }}>{c.date.day}</div>
              <div style={{ fontSize: D * 0.065, fontWeight: 600 }}>{c.date.weekday}</div>
            </>
          ) : (
            <Star size={D * 0.4} color={ctx.onAccent} fill={ctx.onAccent} />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 * s, maxWidth: '100%' }}>
          <div
            style={{
              fontFamily: FONT.display,
              fontSize: fitLines(head, 150, 78, W - 2 * P, 2, CHAR_W.display),
              lineHeight: 0.92,
              letterSpacing: 3,
              textShadow: `0 6px 0 ${withAlpha(p.backgroundAlt, 0.9)}`,
              ...clampLines(2),
            }}
          >
            {head}
          </div>
          {c.topic && <div style={{ fontSize: 32 * s, fontWeight: 600, color: ctx.accentInk, ...clampLines(2) }}>{c.topic}</div>}
          <MetaList ctx={ctx} color={p.ink} iconColor={ctx.accentInk} size={26} items={noDate(ctx)} justify="center" />
        </div>
      </div>
    </PosterFrame>
  );
}

export const EVENT_VARIANTS = {
  modern_ticket: Ticket,
  modern_save_date: SaveDate,
  modern_calendar: Calendar,
  modern_agenda: Agenda,
  modern_takeaways: Takeaways,
  modern_announcement: Announcement,
  modern_sunburst: Sunburst,
} as const;
