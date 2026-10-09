import { Mic } from 'lucide-react';
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
  fitLines,
  logoOn,
  pickInk,
  readableOn,
  seeded,
  withAlpha,
  type ModernCtx,
} from './kit';

type VP = { ctx: ModernCtx };

const noDate = (ctx: ModernCtx) => ctx.c.meta.filter((m) => m.kind !== 'date');

/** Text panel beside (or under, on stories) a full-bleed photo. */
function SplitPhoto({ ctx }: VP) {
  const { p, c, W, H, P, s, tall } = ctx;
  const panelW = tall ? W : Math.round(W * 0.56);
  const photoH = tall ? Math.round(H * 0.46) : H;
  const textW = panelW - P * 2;
  const head = fitLines(c.headline, tall ? 104 : 86, 46, textW, 4);
  return (
    <PosterFrame size={ctx.size} background={p.background}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: tall ? 'column-reverse' : 'row',
        }}
      >
        <div
          style={{
            width: panelW,
            height: tall ? H - photoH : H,
            boxSizing: 'border-box',
            padding: `${64 * s}px ${P}px`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 24 * s,
            overflow: 'hidden',
            background: `linear-gradient(160deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`,
            color: p.ink,
          }}
        >
          <Logo ctx={ctx} />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 20 * s,
              minHeight: 0,
            }}
          >
            {c.dateLabel && (
              <Pill ctx={ctx} bg={p.accent} color={ctx.onAccent} size={22}>
                {c.dateLabel.toUpperCase()}
              </Pill>
            )}
            <div
              style={{
                fontSize: head,
                fontWeight: 800,
                lineHeight: 1.04,
                letterSpacing: -1.5,
                ...clampLines(4),
              }}
            >
              {c.headline}
            </div>
            {c.topic && (
              <div
                style={{
                  fontSize: 38 * s,
                  fontWeight: 600,
                  lineHeight: 1.15,
                  color: ctx.accentInk,
                  ...clampLines(2),
                }}
              >
                {c.topic}
              </div>
            )}
            {c.body && (
              <div
                style={{
                  fontSize: 26 * s,
                  lineHeight: 1.45,
                  color: p.inkMuted,
                  ...clampLines(3),
                }}
              >
                {c.body}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 * s }}>
            <MetaList
              ctx={ctx}
              color={p.ink}
              iconColor={ctx.accentInk}
              size={28}
              direction="column"
              items={noDate(ctx)}
            />
            <div style={{ height: 2, background: withAlpha(p.ink, 0.18) }} />
            <SpeakerLine ctx={ctx} color={p.ink} mutedColor={p.inkMuted} />
          </div>
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0 }}>
          <Photo ctx={ctx} style={{ position: 'absolute', inset: 0 }} fallbackSize={220} />
          <Fill
            style={{
              background: tall
                ? `linear-gradient(0deg, ${withAlpha(p.backgroundAlt, 0.55)} 0%, transparent 35%)`
                : `linear-gradient(90deg, ${withAlpha(p.backgroundAlt, 0.5)} 0%, transparent 30%)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              background: p.accent,
              ...(tall ? { left: 0, right: 0, bottom: 0, height: 10 } : { left: 0, top: 0, bottom: 0, width: 10 }),
            }}
          />
        </div>
      </div>
    </PosterFrame>
  );
}

/** Magazine cover: full-bleed photo, masthead headline, cover lines at the bottom. */
function Editorial({ ctx }: VP) {
  const { p, c, W, P, s } = ctx;
  const mast = c.headline.toUpperCase();
  const mastSize = fitLines(mast, ctx.tall ? 250 : 210, 104, W - 2 * P, 2, CHAR_W.display);
  const hi = pickInk('#101010', [p.accent, '#FFFFFF']);
  return (
    <PosterFrame size={ctx.size} background={p.backgroundAlt}>
      <Photo
        ctx={ctx}
        style={{ position: 'absolute', inset: 0 }}
        position="center 22%"
        fallbackSize={320}
        fallbackBg={`linear-gradient(160deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`}
      />
      <Fill
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 46%, rgba(0,0,0,0.9) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${52 * s}px ${P}px ${60 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: '#FFFFFF',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 24,
              fontSize: 22 * s,
              fontWeight: 600,
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            <span>{c.hashtag}</span>
            <span>{c.dateLabel}</span>
          </div>
          <div
            style={{
              height: 2,
              background: 'rgba(255,255,255,0.6)',
              margin: `${14 * s}px 0`,
            }}
          />
          <div
            style={{
              fontFamily: FONT.display,
              fontSize: mastSize,
              lineHeight: 0.88,
              letterSpacing: 2,
              ...clampLines(2),
            }}
          >
            {mast}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 * s }}>
          {c.topic && (
            <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>
              <div
                style={{
                  width: 8,
                  borderRadius: 4,
                  background: hi,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  fontSize: fitLines(c.topic, 56, 32, W - 2 * P - 30, 3),
                  fontWeight: 700,
                  lineHeight: 1.12,
                  ...clampLines(3),
                }}
              >
                {c.topic}
              </div>
            </div>
          )}
          {c.body && (
            <div
              style={{
                fontSize: 26 * s,
                lineHeight: 1.45,
                color: 'rgba(255,255,255,0.82)',
                ...clampLines(3),
              }}
            >
              {c.body}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14 * s,
                minWidth: 0,
              }}
            >
              <SpeakerLine ctx={ctx} color="#FFFFFF" mutedColor="rgba(255,255,255,0.75)" />
              <MetaList ctx={ctx} color="#FFFFFF" iconColor={hi} size={26} items={noDate(ctx)} />
            </div>
            <Logo ctx={ctx} variant="light" height={50} />
          </div>
        </div>
      </div>
    </PosterFrame>
  );
}

/** Circular portrait with an accent arc and name pill. */
function Spotlight({ ctx }: VP) {
  const { p, c, W, H, P, s } = ctx;
  const D = Math.min(W * 0.56, H * (ctx.tall ? 0.36 : ctx.square ? 0.38 : 0.42));
  const head = fitLines(c.headline, 84, 44, W - 2 * P, 2);
  return (
    <PosterFrame
      size={ctx.size}
      background={`radial-gradient(circle at 50% 50%, ${withAlpha(p.accent, 0.35)} 0%, transparent 42%), linear-gradient(160deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`}
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12 * s,
            maxWidth: '100%',
          }}
        >
          {c.topic && (
            <div
              style={{
                fontSize: 24 * s,
                fontWeight: 700,
                letterSpacing: 4,
                textTransform: 'uppercase',
                color: ctx.accentInk,
                ...clampLines(1),
              }}
            >
              {c.topic}
            </div>
          )}
          <div
            style={{
              fontSize: head,
              fontWeight: 800,
              lineHeight: 1.05,
              ...clampLines(2),
            }}
          >
            {c.headline}
          </div>
        </div>
        <div style={{ position: 'relative', width: D, height: D, flexShrink: 0 }}>
          <div
            style={{
              position: 'absolute',
              inset: -30 * s,
              borderRadius: '50%',
              border: `3px dashed ${withAlpha(p.ink, 0.35)}`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: -12,
              borderRadius: '50%',
              background: `conic-gradient(from 200deg, ${p.accent} 0 68%, transparent 68% 100%)`,
            }}
          />
          <Photo
            ctx={ctx}
            radius="50%"
            fallbackSize={D * 0.32}
            style={{
              position: 'absolute',
              inset: 0,
              border: `10px solid ${p.background}`,
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10 * s,
            maxWidth: '100%',
          }}
        >
          {c.speaker && (
            <Pill ctx={ctx} bg={p.accent} color={ctx.onAccent} size={34} style={{ alignSelf: 'center' }}>
              {c.speaker}
            </Pill>
          )}
          {c.role && <div style={{ fontSize: 26 * s, color: p.inkMuted, ...clampLines(1) }}>{c.role}</div>}
        </div>
        <MetaList ctx={ctx} color={p.ink} iconColor={ctx.accentInk} size={26} justify="center" />
      </div>
    </PosterFrame>
  );
}

/** Arch-shaped portrait with an offset outline. */
function Arch({ ctx }: VP) {
  const { p, c, W, P, s } = ctx;
  const archW = Math.round(W * (ctx.square ? 0.44 : 0.6));
  const radius = `${archW / 2}px ${archW / 2}px 36px 36px`;
  return (
    <PosterFrame
      size={ctx.size}
      background={`linear-gradient(180deg, ${p.background} 0%, ${p.background} 60%, ${p.backgroundAlt} 60%, ${p.backgroundAlt} 100%)`}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${56 * s}px ${P}px ${56 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28 * s,
          color: p.ink,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            alignSelf: 'stretch',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <Logo ctx={ctx} />
          {c.dateLabel && (
            <Pill ctx={ctx} bg="transparent" color={p.ink} border={`2px solid ${withAlpha(p.ink, 0.4)}`} size={22}>
              {c.dateLabel}
            </Pill>
          )}
        </div>
        <div
          style={{
            fontSize: fitLines(c.headline, 88, 44, W - 2 * P, 2),
            fontWeight: 800,
            lineHeight: 1.04,
            ...clampLines(2),
          }}
        >
          {c.headline}
        </div>
        <div style={{ position: 'relative', width: archW, flex: 1, minHeight: 0 }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transform: 'translate(22px, -22px)',
              borderRadius: radius,
              border: `3px solid ${ctx.accentInk}`,
            }}
          />
          <Photo ctx={ctx} radius={radius} fallbackSize={archW * 0.28} style={{ position: 'absolute', inset: 0 }} />
        </div>
        <SpeakerLine ctx={ctx} color={p.ink} mutedColor={p.inkMuted} align="center" />
        <MetaList ctx={ctx} color={p.ink} iconColor={ctx.accentInk} size={26} items={noDate(ctx)} justify="center" />
      </div>
    </PosterFrame>
  );
}

/** Floating profile card over soft colour blobs. */
function SpeakerCard({ ctx }: VP) {
  const { p, c, W, P, s } = ctx;
  const card = ctx.isDark ? '#FFFFFF' : '#0F172A';
  const cardInk = readableOn(card);
  const cardMuted = withAlpha(cardInk, 0.66);
  const cardAccent = pickInk(card, [p.accent, p.background, p.backgroundAlt]);
  const innerW = W - 2 * P - 80;
  return (
    <PosterFrame
      size={ctx.size}
      background={`radial-gradient(circle at 12% 10%, ${withAlpha(p.accent, 0.45)} 0%, transparent 34%), radial-gradient(circle at 90% 92%, ${withAlpha(p.accent, 0.35)} 0%, transparent 36%), linear-gradient(160deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${52 * s}px ${P}px ${60 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: 36 * s,
        }}
      >
        <Footer ctx={ctx} color={p.ink} />
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 48,
              background: withAlpha(p.accent, 0.5),
              transform: 'rotate(-3.5deg)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 48,
              background: card,
              padding: 40,
              display: 'flex',
              flexDirection: 'column',
              gap: 22 * s,
              boxShadow: '0 40px 80px rgba(0,0,0,0.28)',
              overflow: 'hidden',
            }}
          >
            <Photo ctx={ctx} radius={32} fallbackSize={200} style={{ flex: 1, minHeight: 0 }} />
            <div
              style={{
                fontSize: fitLines(c.headline, 68, 38, innerW, 2),
                fontWeight: 800,
                lineHeight: 1.06,
                color: cardInk,
                ...clampLines(2),
              }}
            >
              {c.headline}
            </div>
            {c.topic && (
              <div
                style={{
                  fontSize: 32 * s,
                  fontWeight: 600,
                  color: cardAccent,
                  lineHeight: 1.2,
                  ...clampLines(2),
                }}
              >
                {c.topic}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                gap: 24,
              }}
            >
              <SpeakerLine ctx={ctx} color={cardInk} mutedColor={cardMuted} size={32} />
              <MetaList ctx={ctx} color={cardInk} iconColor={cardAccent} size={24} direction="column" />
            </div>
          </div>
        </div>
      </div>
    </PosterFrame>
  );
}

/** Grayscale photo washed in palette colour with a huge condensed headline. */
function Duotone({ ctx }: VP) {
  const { p, c, W, P, s } = ctx;
  const ink = pickInk(p.backgroundAlt, [p.ink]);
  const head = c.headline.toUpperCase();
  return (
    <PosterFrame size={ctx.size} background={p.backgroundAlt}>
      <Photo ctx={ctx} grayscale style={{ position: 'absolute', inset: 0 }} fallbackSize={300} position="center 20%" />
      <Fill
        style={{
          background: `linear-gradient(180deg, ${withAlpha(p.background, 0.35)} 0%, ${withAlpha(p.background, 0.55)} 45%, ${withAlpha(p.backgroundAlt, 0.97)} 100%)`,
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
          color: ink,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <Logo ctx={ctx} />
          {c.dateLabel && (
            <Pill
              ctx={ctx}
              bg={withAlpha(p.backgroundAlt, 0.55)}
              color={ink}
              border={`2px solid ${withAlpha(ink, 0.5)}`}
              size={22}
            >
              {c.dateLabel}
            </Pill>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 * s }}>
          <div
            style={{
              fontFamily: FONT.display,
              fontSize: fitLines(head, ctx.tall ? 210 : 180, 92, W - 2 * P, 3, CHAR_W.display),
              lineHeight: 0.9,
              letterSpacing: 2,
              ...clampLines(3),
            }}
          >
            {head}
          </div>
          {c.topic && (
            <div
              style={{
                fontSize: 38 * s,
                fontWeight: 700,
                color: ctx.accentInk,
                lineHeight: 1.15,
                ...clampLines(2),
              }}
            >
              {c.topic}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: 24,
            }}
          >
            <SpeakerLine ctx={ctx} color={ink} mutedColor={withAlpha(ink, 0.75)} />
            <MetaList
              ctx={ctx}
              color={ink}
              iconColor={ctx.accentInk}
              size={24}
              direction="column"
              items={noDate(ctx)}
            />
          </div>
        </div>
      </div>
    </PosterFrame>
  );
}

/** Tilted instant-photo print with a handwritten caption. */
function Polaroid({ ctx }: VP) {
  const { p, c, W, H, P, s } = ctx;
  const side = Math.min(W * 0.56, H * (ctx.square ? 0.34 : 0.4));
  const pad = side * 0.06;
  return (
    <PosterFrame
      size={ctx.size}
      background={`radial-gradient(${withAlpha(p.ink, 0.12)} 2px, transparent 2.5px) 0 0 / 34px 34px, linear-gradient(160deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${56 * s}px ${P}px ${56 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: p.ink,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 * s }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
            }}
          >
            <Logo ctx={ctx} />
            {c.dateLabel && <span style={{ fontSize: 24 * s, fontWeight: 600, color: p.inkMuted }}>{c.dateLabel}</span>}
          </div>
          <div
            style={{
              fontSize: fitLines(c.headline, 92, 46, W - 2 * P, 3),
              fontWeight: 800,
              lineHeight: 1.04,
              ...clampLines(3),
            }}
          >
            {c.headline}
          </div>
        </div>
        <div
          style={{
            alignSelf: 'center',
            position: 'relative',
            background: '#FFFFFF',
            padding: `${pad}px ${pad}px ${side * 0.22}px`,
            borderRadius: 14,
            transform: 'rotate(-4deg)',
            boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
          }}
        >
          <Photo ctx={ctx} radius={6} fallbackSize={side * 0.3} style={{ width: side, height: side }} />
          <div
            style={{
              position: 'absolute',
              left: pad,
              right: pad,
              bottom: side * 0.04,
              textAlign: 'center',
              fontFamily: FONT.script,
              fontSize: side * 0.12,
              color: '#1F2937',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {c.speaker || c.topic || c.hashtag}
          </div>
          <div
            style={{
              position: 'absolute',
              top: -24,
              left: '50%',
              width: side * 0.36,
              height: 46,
              transform: 'translateX(-50%) rotate(3deg)',
              background: 'rgba(255,255,255,0.55)',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 * s }}>
          {(c.topic || c.role) && (
            <div
              style={{
                fontSize: 34 * s,
                fontWeight: 600,
                color: ctx.accentInk,
                lineHeight: 1.2,
                ...clampLines(2),
              }}
            >
              {c.topic || c.role}
            </div>
          )}
          <MetaList ctx={ctx} color={p.ink} iconColor={ctx.accentInk} size={26} items={noDate(ctx)} />
        </div>
      </div>
    </PosterFrame>
  );
}

/** Podcast cover: square portrait, mic badge and an audio waveform. */
function Podcast({ ctx }: VP) {
  const { p, c, W, H, P, s } = ctx;
  const ink = pickInk(p.backgroundAlt, [p.ink]);
  const side = Math.min(W - 2 * P - 160, H * (ctx.tall ? 0.4 : ctx.square ? 0.36 : 0.42));
  const bars = seeded(44, 11);
  return (
    <PosterFrame
      size={ctx.size}
      background={`radial-gradient(ellipse at 50% 0%, ${withAlpha(p.accent, 0.32)} 0%, transparent 60%), ${p.backgroundAlt}`}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${52 * s}px ${P}px ${56 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'center',
          color: ink,
        }}
      >
        <div
          style={{
            alignSelf: 'stretch',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <Logo ctx={ctx} variant={logoOn(p.backgroundAlt)} />
          {c.platform && (
            <Pill ctx={ctx} bg={withAlpha(ink, 0.12)} color={ink} size={24}>
              <Mic size={26 * s} /> {c.platform}
            </Pill>
          )}
        </div>
        <div style={{ position: 'relative', width: side, height: side }}>
          <Photo
            ctx={ctx}
            radius={48}
            fallbackSize={side * 0.3}
            style={{
              width: side,
              height: side,
              boxShadow: '0 30px 70px rgba(0,0,0,0.4)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: -36 * s,
              bottom: -36 * s,
              width: 120 * s,
              height: 120 * s,
              borderRadius: '50%',
              background: p.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `8px solid ${p.backgroundAlt}`,
            }}
          >
            <Mic size={54 * s} color={ctx.onAccent} strokeWidth={2.4} />
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 90 * s,
          }}
        >
          {bars.map((r, i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: (14 + r * 76) * s,
                borderRadius: 6,
                background: withAlpha(p.accent, 0.45 + r * 0.55),
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14 * s,
            maxWidth: '100%',
          }}
        >
          <div
            style={{
              fontSize: fitLines(c.headline, 78, 42, W - 2 * P, 2),
              fontWeight: 800,
              lineHeight: 1.06,
              ...clampLines(2),
            }}
          >
            {c.headline}
          </div>
          <SpeakerLine ctx={ctx} color={ink} mutedColor={withAlpha(ink, 0.7)} align="center" size={30} />
        </div>
        <MetaList
          ctx={ctx}
          color={ink}
          iconColor={pickInk(p.backgroundAlt, [p.accent, ink])}
          size={24}
          justify="center"
        />
      </div>
    </PosterFrame>
  );
}

/** Double-ruled gallery frame around a photo, with a date block. */
function Gallery({ ctx }: VP) {
  const { p, c, W, P, s } = ctx;
  const inset = 84;
  const hasDate = !!c.date;
  return (
    <PosterFrame size={ctx.size} background={p.background}>
      <Fill
        style={{
          inset: 32,
          border: `3px solid ${withAlpha(p.ink, 0.55)}`,
          borderRadius: 28,
        }}
      />
      <Fill
        style={{
          inset: 46,
          border: `1px solid ${withAlpha(p.ink, 0.3)}`,
          borderRadius: 20,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: `${80 * s}px ${inset}px ${76 * s}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: 28 * s,
          color: p.ink,
        }}
      >
        <Photo ctx={ctx} radius={22} fallbackSize={220} style={{ flex: 1, minHeight: 0 }} />
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-end' }}>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 12 * s,
            }}
          >
            {c.topic && (
              <div
                style={{
                  fontSize: 22 * s,
                  fontWeight: 700,
                  letterSpacing: 4,
                  textTransform: 'uppercase',
                  color: ctx.accentInk,
                  ...clampLines(1),
                }}
              >
                {c.topic}
              </div>
            )}
            <div
              style={{
                fontSize: fitLines(c.headline, 72, 38, W - 2 * inset - (hasDate ? 240 : 0), 3),
                fontWeight: 800,
                lineHeight: 1.05,
                ...clampLines(3),
              }}
            >
              {c.headline}
            </div>
            <SpeakerLine ctx={ctx} color={p.ink} mutedColor={p.inkMuted} size={28} />
          </div>
          {c.date && (
            <div
              style={{
                width: 200,
                flexShrink: 0,
                textAlign: 'right',
                lineHeight: 1,
              }}
            >
              <div
                style={{
                  fontFamily: FONT.display,
                  fontSize: 170 * s,
                  lineHeight: 0.82,
                  color: ctx.accentInk,
                }}
              >
                {c.date.day}
              </div>
              <div
                style={{
                  fontSize: 26 * s,
                  fontWeight: 700,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  marginTop: 8,
                }}
              >
                {c.date.monthShort} {c.date.year}
              </div>
              <div style={{ fontSize: 22 * s, color: p.inkMuted, marginTop: 6 }}>{c.date.weekday}</div>
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
          }}
        >
          <MetaList ctx={ctx} color={p.ink} iconColor={ctx.accentInk} size={24} items={noDate(ctx)} />
          <Logo ctx={ctx} height={46} />
        </div>
      </div>
    </PosterFrame>
  );
}

/**
 * Photo top, colour panel cut on a diagonal with an accent stripe.
 * Why a flex column instead of fixed percentages: the panel sizes to its text and the
 * photo takes whatever height is left, so the face is never sliced on square posters.
 * The wedge (rise `D`, stripe `T`) is in px so the cut angle is identical at every size.
 */
function Diagonal({ ctx }: VP) {
  const { p, c, W, P, s, square } = ctx;
  const D = (square ? 110 : 170) * s;
  const T = 16 * s;
  const wedge = `polygon(0 ${D}px, 100% 0, 100% 100%, 0 100%)`;
  return (
    <PosterFrame size={ctx.size} background={p.backgroundAlt}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0 }}>
          <Photo ctx={ctx} style={{ position: 'absolute', inset: 0 }} position="center 22%" fallbackSize={260} />
        </div>
        <div
          style={{
            position: 'relative',
            flex: '0 0 auto',
            marginTop: -(D + T),
            background: p.accent,
            clipPath: wedge,
          }}
        >
          <div
            style={{
              marginTop: T,
              clipPath: wedge,
              background: `linear-gradient(160deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`,
              padding: `${D + 28 * s}px ${P}px ${56 * s}px`,
            }}
          >
            <DiagonalText ctx={ctx} W={W} P={P} s={s} square={square} />
          </div>
        </div>
      </div>
      {c.dateLabel && (
        <div style={{ position: 'absolute', top: 52 * s, left: P }}>
          <Pill ctx={ctx} bg={p.accent} color={ctx.onAccent} size={24}>
            {c.dateLabel.toUpperCase()}
          </Pill>
        </div>
      )}
    </PosterFrame>
  );
}

function DiagonalText({ ctx, W, P, s, square }: { ctx: ModernCtx; W: number; P: number; s: number; square: boolean }) {
  const { p, c } = ctx;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18 * s,
        color: p.ink,
      }}
    >
      <div
        style={{
          fontSize: fitLines(c.headline, 90, 44, W - 2 * P, square ? 2 : 3),
          fontWeight: 800,
          lineHeight: 1.04,
          letterSpacing: -1.5,
          ...clampLines(square ? 2 : 3),
        }}
      >
        {c.headline}
      </div>
      {c.topic && (
        <div
          style={{
            fontSize: 34 * s,
            fontWeight: 600,
            color: ctx.accentInk,
            lineHeight: 1.2,
            ...clampLines(square ? 1 : 2),
          }}
        >
          {c.topic}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 24,
        }}
      >
        <SpeakerLine ctx={ctx} color={p.ink} mutedColor={p.inkMuted} size={30} />
        <MetaList ctx={ctx} color={p.ink} iconColor={ctx.accentInk} size={24} direction="column" items={noDate(ctx)} />
      </div>
      <div style={{ height: 2, background: withAlpha(p.ink, 0.18) }} />
      <Footer ctx={ctx} color={p.inkMuted} />
    </div>
  );
}

/** Webinar promo: headline block plus a host card with photo and schedule. */
function Webinar({ ctx }: VP) {
  const { p, c, W, P, s } = ctx;
  return (
    <PosterFrame
      size={ctx.size}
      background={`radial-gradient(circle at 100% 0%, ${withAlpha(p.accent, 0.35)} 0%, transparent 40%), linear-gradient(160deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`}
    >
      <div
        style={{
          position: 'absolute',
          width: 720,
          height: 720,
          borderRadius: '50%',
          border: `90px solid ${withAlpha(p.ink, 0.06)}`,
          right: -280,
          top: -280,
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
          gap: 28 * s,
          color: p.ink,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <Logo ctx={ctx} />
          {c.platform && (
            <Pill ctx={ctx} bg={p.accent} color={ctx.onAccent} size={24}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: ctx.onAccent,
                  display: 'inline-block',
                }}
              />
              {c.platform}
            </Pill>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 * s }}>
          {c.topic && (
            <div
              style={{
                fontSize: 26 * s,
                fontWeight: 700,
                letterSpacing: 4,
                textTransform: 'uppercase',
                color: ctx.accentInk,
                ...clampLines(2),
              }}
            >
              {c.topic}
            </div>
          )}
          <div
            style={{
              fontSize: fitLines(c.headline, ctx.tall ? 112 : 100, 50, W - 2 * P, 4),
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: -2,
              ...clampLines(4),
            }}
          >
            {c.headline}
          </div>
          {c.body && (
            <div
              style={{
                fontSize: 28 * s,
                lineHeight: 1.45,
                color: p.inkMuted,
                ...clampLines(3),
              }}
            >
              {c.body}
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            padding: 30 * s,
            borderRadius: 36,
            background: withAlpha(p.ink, 0.08),
            border: `1px solid ${withAlpha(p.ink, 0.16)}`,
          }}
        >
          <Photo
            ctx={ctx}
            radius="50%"
            fallbackSize={56 * s}
            style={{ width: 150 * s, height: 150 * s, flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <SpeakerLine ctx={ctx} color={p.ink} mutedColor={p.inkMuted} size={34} />
          </div>
          <div
            style={{
              width: 2,
              alignSelf: 'stretch',
              background: withAlpha(p.ink, 0.2),
            }}
          />
          <MetaList
            ctx={ctx}
            color={p.ink}
            iconColor={ctx.accentInk}
            size={24}
            direction="column"
            items={c.meta.filter((m) => m.kind !== 'platform')}
          />
        </div>
      </div>
    </PosterFrame>
  );
}

export const SPEAKER_VARIANTS = {
  modern_split_photo: SplitPhoto,
  modern_editorial: Editorial,
  modern_spotlight: Spotlight,
  modern_arch: Arch,
  modern_speaker_card: SpeakerCard,
  modern_duotone: Duotone,
  modern_polaroid: Polaroid,
  modern_podcast: Podcast,
  modern_gallery: Gallery,
  modern_diagonal: Diagonal,
  modern_webinar: Webinar,
} as const;
