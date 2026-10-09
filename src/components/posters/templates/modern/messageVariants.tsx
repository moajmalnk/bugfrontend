import { BadgeCheck, Heart, MessageCircle, Repeat2, Share2, Star } from 'lucide-react';
import { CODO_BRAND } from '../../brand/brandKit';
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
  clampLines,
  ellipsis,
  fitLines,
  pickInk,
  readableOn,
  seeded,
  withAlpha,
  type ModernCtx,
} from './kit';

type VP = { ctx: ModernCtx };

/** Large pull-quote with an author byline. */
function QuoteCard({ ctx }: VP) {
  const { p, c, W, P, s, tall } = ctx;
  const lines = tall ? 8 : ctx.square ? 5 : 6;
  return (
    <PosterFrame
      size={ctx.size}
      background={`radial-gradient(circle at 90% 10%, ${withAlpha(p.accent, 0.28)} 0%, transparent 40%), linear-gradient(160deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${64 * s}px ${P + 12}px ${60 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 24 * s,
          color: p.ink,
        }}
      >
        <div style={{ fontSize: 300 * s, fontWeight: 800, lineHeight: 0.75, height: 150 * s, color: ctx.accentInk }}>“</div>
        <div
          style={{
            fontSize: fitLines(c.quote, 74, 36, W - 2 * P - 24, lines),
            fontWeight: 600,
            lineHeight: 1.25,
            letterSpacing: -0.5,
            ...clampLines(lines),
          }}
        >
          {c.quote}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 * s }}>
          <div style={{ width: 120, height: 8, borderRadius: 4, background: p.accent }} />
          {c.author && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              {c.image && <Photo ctx={ctx} radius="50%" style={{ width: 116 * s, height: 116 * s, flexShrink: 0 }} />}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 36 * s, fontWeight: 700, ...ellipsis }}>{c.author}</div>
                {c.role && <div style={{ fontSize: 24 * s, color: p.inkMuted, ...ellipsis }}>{c.role}</div>}
              </div>
            </div>
          )}
          <Footer ctx={ctx} color={p.inkMuted} />
        </div>
      </div>
    </PosterFrame>
  );
}

/** Social-post card. Engagement icons carry no counts so nothing looks fabricated. */
function SocialPost({ ctx }: VP) {
  const { p, c, W, P, s, tall } = ctx;
  const card = ctx.isDark ? '#FFFFFF' : '#0F172A';
  const ink = readableOn(card);
  const muted = withAlpha(ink, 0.6);
  const badge = pickInk(card, [p.accent, '#1D9BF0']);
  const name = c.speaker || CODO_BRAND.fullName;
  const handle = `@${(c.hashtag.replace(/^#/, '') || 'codo').replace(/\s+/g, '').toLowerCase()}`;
  const cardW = W - 2 * P;
  const lines = tall ? 9 : ctx.square ? 5 : 7;
  const stamp = [c.time, c.dateLabel].filter(Boolean).join(' · ');
  return (
    <PosterFrame
      size={ctx.size}
      background={`radial-gradient(circle at 20% 15%, ${withAlpha(p.accent, 0.4)} 0%, transparent 40%), linear-gradient(160deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${60 * s}px ${P}px ${60 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 48 * s,
        }}
      >
        <div
          style={{
            width: cardW,
            boxSizing: 'border-box',
            padding: `${52 * s}px 56px`,
            borderRadius: 44,
            background: card,
            color: ink,
            boxShadow: '0 40px 90px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 28 * s,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <Photo ctx={ctx} radius="50%" fallbackSize={40} style={{ width: 104 * s, height: 104 * s, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 34 * s, fontWeight: 700 }}>
                <span style={ellipsis}>{name}</span>
                <BadgeCheck size={34 * s} color={card} fill={badge} style={{ flexShrink: 0 }} />
              </div>
              <div style={{ fontSize: 26 * s, color: muted, ...ellipsis }}>{handle}</div>
            </div>
          </div>
          <div style={{ fontSize: fitLines(c.quote, 60, 32, cardW - 112, lines), lineHeight: 1.32, fontWeight: 500, ...clampLines(lines) }}>
            {c.quote}
          </div>
          {stamp && <div style={{ fontSize: 24 * s, color: muted }}>{stamp}</div>}
          <div style={{ height: 1.5, background: withAlpha(ink, 0.12) }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 12px' }}>
            {[MessageCircle, Repeat2, Heart, Share2].map((Icon, i) => (
              <Icon key={i} size={38 * s} color={i === 2 ? badge : muted} fill={i === 2 ? badge : 'none'} strokeWidth={2} />
            ))}
          </div>
        </div>
        <Logo ctx={ctx} />
      </div>
    </PosterFrame>
  );
}

/** Question-and-answer chat thread. */
function Chat({ ctx }: VP) {
  const { p, c, W, P, s } = ctx;
  const leftBg = ctx.isDark ? withAlpha('#FFFFFF', 0.12) : '#FFFFFF';
  const leftInk = ctx.isDark ? '#FFFFFF' : '#111827';
  const bubbleW = W * 0.74;
  const answer = c.body || c.topic || (c.quote !== c.headline ? c.quote : '');
  const avatar = 84 * s;
  return (
    <PosterFrame
      size={ctx.size}
      background={`radial-gradient(${withAlpha(p.ink, 0.1)} 2px, transparent 2.5px) 0 0 / 40px 40px, linear-gradient(160deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${56 * s}px ${P}px ${60 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 28 * s,
          color: p.ink,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <Logo ctx={ctx} />
          {c.dateLabel && <span style={{ fontSize: 24 * s, color: p.inkMuted, fontWeight: 600 }}>{c.dateLabel}</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 * s }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
            <div
              style={{
                width: avatar,
                height: avatar,
                borderRadius: '50%',
                background: p.accent,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: ctx.onAccent,
                fontSize: avatar * 0.42,
                fontWeight: 800,
              }}
            >
              ?
            </div>
            <div
              style={{
                maxWidth: bubbleW,
                padding: `${30 * s}px 36px`,
                borderRadius: '44px 44px 44px 12px',
                background: leftBg,
                color: leftInk,
                boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
                fontSize: fitLines(c.headline, 60, 34, bubbleW - 72, 4),
                fontWeight: 700,
                lineHeight: 1.2,
                ...clampLines(4),
              }}
            >
              {c.headline}
            </div>
          </div>
          {answer && (
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 18 }}>
              <div
                style={{
                  maxWidth: bubbleW,
                  padding: `${30 * s}px 36px`,
                  borderRadius: '44px 44px 12px 44px',
                  background: p.accent,
                  color: ctx.onAccent,
                  boxShadow: '0 16px 40px rgba(0,0,0,0.16)',
                  fontSize: fitLines(answer, 46, 28, bubbleW - 72, 6, CHAR_W.regular),
                  fontWeight: 500,
                  lineHeight: 1.35,
                  ...clampLines(6),
                }}
              >
                {answer}
              </div>
              <Photo ctx={ctx} radius="50%" fallbackSize={30} style={{ width: avatar, height: avatar, flexShrink: 0 }} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, padding: '22px 28px', borderRadius: 30, background: leftBg, alignSelf: 'flex-start', marginLeft: avatar + 18 }}>
            {[0.9, 0.6, 0.35].map((o) => (
              <div key={o} style={{ width: 16, height: 16, borderRadius: '50%', background: withAlpha(leftInk, o) }} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
          <SpeakerLine ctx={ctx} color={p.ink} mutedColor={p.inkMuted} size={30} />
          <MetaList ctx={ctx} color={p.ink} iconColor={ctx.accentInk} size={24} direction="column" items={ctx.c.meta.filter((m) => m.kind !== 'date')} />
        </div>
      </div>
    </PosterFrame>
  );
}

/** Taped sticky note with ruled lines and a handwritten sign-off. */
function StickyNote({ ctx }: VP) {
  const { p, c, W, P, s } = ctx;
  const paper = '#FFF3B0';
  const paperInk = '#2A2414';
  const red = pickInk(paper, [p.accent, '#B42318'], 3);
  const noteW = W - 2 * P - 40;
  const rule = 56 * s;
  const sign = c.author || c.speaker;
  return (
    <PosterFrame
      size={ctx.size}
      background={`radial-gradient(${withAlpha(p.ink, 0.1)} 2px, transparent 2.5px) 0 0 / 36px 36px, linear-gradient(160deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${56 * s}px ${P}px ${60 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32 * s,
          color: p.ink,
        }}
      >
        <Logo ctx={ctx} />
        <div
          style={{
            position: 'relative',
            width: noteW,
            boxSizing: 'border-box',
            padding: `${64 * s}px 56px ${56 * s}px`,
            borderRadius: 12,
            transform: 'rotate(-2deg)',
            background: `repeating-linear-gradient(180deg, transparent 0 ${rule - 2}px, ${withAlpha('#B49B3C', 0.28)} ${rule - 2}px ${rule}px), ${paper}`,
            boxShadow: '0 30px 50px rgba(0,0,0,0.28)',
            color: paperInk,
            display: 'flex',
            flexDirection: 'column',
            gap: 20 * s,
          }}
        >
          {[-1, 1].map((d) => (
            <div
              key={d}
              style={{
                position: 'absolute',
                top: -18,
                [d < 0 ? 'left' : 'right']: -30,
                width: 150,
                height: 46,
                background: 'rgba(255,255,255,0.55)',
                border: '1px solid rgba(0,0,0,0.06)',
                transform: `rotate(${d * 38}deg)`,
              }}
            />
          ))}
          {c.hashtag && <div style={{ fontSize: 24 * s, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: red }}>{c.hashtag}</div>}
          <div style={{ fontSize: fitLines(c.headline, 78, 40, noteW - 112, 4), fontWeight: 700, lineHeight: 1.12, ...clampLines(4) }}>
            {c.headline}
          </div>
          {c.body && <div style={{ fontSize: 30 * s, lineHeight: 1.5, color: withAlpha(paperInk, 0.75), ...clampLines(ctx.tall ? 7 : 4) }}>{c.body}</div>}
          {sign && (
            <div style={{ alignSelf: 'flex-end', fontFamily: FONT.script, fontSize: 76 * s, lineHeight: 1.1, maxWidth: '100%', ...ellipsis }}>
              {sign}
            </div>
          )}
        </div>
        <MetaList ctx={ctx} color={p.ink} iconColor={ctx.accentInk} size={26} justify="center" />
      </div>
    </PosterFrame>
  );
}

/** Confetti celebration with a script hero line. */
function Celebration({ ctx }: VP) {
  const { p, c, W, P, s } = ctx;
  const script = c.script || c.headline;
  const eyebrow = (c.script ? c.headline : '').toUpperCase();
  const r = seeded(245, 23);
  const colors = [p.accent, p.ink, '#FFD166', withAlpha(p.ink, 0.5), withAlpha(p.accent, 0.6)];
  const pieces = Array.from({ length: 60 }, (_, i) => {
    const [x, y, rot, size, shape] = r.slice(i * 4, i * 4 + 5);
    return { x: x * 100, y: y * 100, rot: rot * 360, size: 10 + size * 18, round: shape > 0.6, color: colors[i % colors.length] };
  });
  return (
    <PosterFrame
      size={ctx.size}
      background={`radial-gradient(circle at 50% 45%, ${withAlpha(p.accent, 0.3)} 0%, transparent 55%), linear-gradient(170deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`}
    >
      <Fill>
        {pieces.map((pc, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${pc.x}%`,
              top: `${pc.y}%`,
              width: pc.size,
              height: pc.round ? pc.size : pc.size * 0.45,
              borderRadius: pc.round ? '50%' : 3,
              background: pc.color,
              opacity: 0.6,
              transform: `rotate(${pc.rot}deg)`,
            }}
          />
        ))}
      </Fill>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${60 * s}px ${P}px ${60 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'center',
          color: p.ink,
        }}
      >
        <Logo ctx={ctx} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 * s, maxWidth: '100%' }}>
          {eyebrow && (
            <div
              style={{
                fontFamily: FONT.display,
                fontSize: fitLines(eyebrow, 104, 56, W - 2 * P, 2, CHAR_W.display + 0.1),
                letterSpacing: 10,
                lineHeight: 1,
                ...clampLines(2),
              }}
            >
              {eyebrow}
            </div>
          )}
          <div
            style={{
              fontFamily: FONT.script,
              fontSize: fitLines(script, ctx.tall ? 250 : 210, 100, W - 2 * P, 2, CHAR_W.script),
              lineHeight: 1.1,
              color: ctx.accentInk,
              textShadow: `0 6px 24px ${withAlpha(p.backgroundAlt, 0.5)}`,
              ...clampLines(2),
            }}
          >
            {script}
          </div>
          {c.body && <div style={{ fontSize: 30 * s, lineHeight: 1.45, color: p.inkMuted, maxWidth: 820, ...clampLines(3) }}>{c.body}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 * s }}>
          {c.dateLabel && (
            <Pill ctx={ctx} bg={p.accent} color={ctx.onAccent} size={24} style={{ alignSelf: 'center' }}>
              {c.dateLabel}
            </Pill>
          )}
          {c.hashtag && <div style={{ fontSize: 26 * s, fontWeight: 600, color: ctx.accentInk }}>{c.hashtag}</div>}
        </div>
      </div>
    </PosterFrame>
  );
}

/** Award medal around a portrait, with ribbons and stars. */
function Achievement({ ctx }: VP) {
  const { p, c, W, H, P, s } = ctx;
  const D = Math.min(W * 0.5, H * (ctx.square ? 0.34 : 0.32));
  const name = c.speaker || c.headline;
  const detail = c.speaker ? c.headline : '';
  const ribbon = (side: -1 | 1, color: string) => (
    <div
      style={{
        position: 'absolute',
        top: D * 0.72,
        left: '50%',
        width: D * 0.24,
        height: D * 0.5,
        marginLeft: side < 0 ? -D * 0.26 : D * 0.02,
        background: color,
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)',
        transform: `rotate(${side * 16}deg)`,
        transformOrigin: 'top center',
      }}
    />
  );
  return (
    <PosterFrame
      size={ctx.size}
      background={`repeating-conic-gradient(from 0deg at 50% 36%, ${withAlpha(p.accent, 0.1)} 0deg 6deg, transparent 6deg 12deg), linear-gradient(170deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`}
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
        <Logo ctx={ctx} />
        <div style={{ position: 'relative', width: D, height: D * 1.12 }}>
          {ribbon(-1, p.accent)}
          {ribbon(1, withAlpha(p.accent, 0.75))}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: D,
              height: D,
              borderRadius: '50%',
              padding: D * 0.045,
              boxSizing: 'border-box',
              background: `conic-gradient(${p.accent}, ${withAlpha(p.accent, 0.45)}, ${p.accent}, ${withAlpha(p.accent, 0.45)}, ${p.accent})`,
              boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
            }}
          >
            <Photo
              ctx={ctx}
              radius="50%"
              fallbackSize={D * 0.3}
              style={{ width: '100%', height: '100%', border: `6px solid ${p.background}`, boxSizing: 'border-box' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} size={(i === 2 ? 46 : 36) * s} color={ctx.accentInk} fill={ctx.accentInk} />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 * s, maxWidth: '100%' }}>
          <div style={{ fontFamily: FONT.script, fontSize: 110 * s, lineHeight: 1.1, color: ctx.accentInk, ...ellipsis, maxWidth: '100%' }}>
            {c.script || 'Congratulations'}
          </div>
          <div style={{ fontSize: fitLines(name, 92, 46, W - 2 * P, 2), fontWeight: 800, lineHeight: 1.05, ...clampLines(2) }}>{name}</div>
          {c.speaker && c.role && <div style={{ fontSize: 28 * s, color: p.inkMuted, ...ellipsis }}>{c.role}</div>}
          {detail && (
            <Pill ctx={ctx} bg="transparent" color={p.ink} border={`2px solid ${withAlpha(p.ink, 0.4)}`} size={26} style={{ alignSelf: 'center', marginTop: 8 }}>
              {detail}
            </Pill>
          )}
          {c.body && <div style={{ fontSize: 26 * s, lineHeight: 1.45, color: p.inkMuted, maxWidth: 820, ...clampLines(2) }}>{c.body}</div>}
        </div>
      </div>
    </PosterFrame>
  );
}

export const MESSAGE_VARIANTS = {
  modern_quote_card: QuoteCard,
  modern_social_post: SocialPost,
  modern_chat: Chat,
  modern_sticky_note: StickyNote,
} as const;

export const CELEBRATE_VARIANTS = {
  modern_celebration: Celebration,
  modern_achievement: Achievement,
} as const;
