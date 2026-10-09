import type { CSSProperties, ReactNode } from 'react';
import { BRAND_MARK_ASSETS, brandMarkForPalette, type PosterPalette } from '../brand/brandKit';
import { normalizeLogoStyle, type LogoStyleKey } from '../brand/logoStyles';
import type { PosterTemplateProps } from '../types';
import { PosterFrame } from './shared';

/** Turns `#RRGGBB` / `rgb(a)` palette colours into rgba with a new alpha. */
function alpha(color: string, a: number): string {
  const hex = color.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const rgb = color.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const [r, g, b] = rgb[1].split(',').map((p) => p.trim());
    return `rgba(${r},${g},${b},${a})`;
  }
  return color;
}

type ContainerKind = 'card' | 'glass' | 'outline' | 'pill' | 'circle' | 'squircle' | 'hexagon';

const CONTAINER_BY_STYLE: Partial<Record<LogoStyleKey, ContainerKind>> = {
  rounded_card: 'card',
  glass_card: 'glass',
  outline_card: 'outline',
  pill: 'pill',
  circle_badge: 'circle',
  ring: 'circle',
  double_ring: 'circle',
  seal: 'circle',
  squircle: 'squircle',
  hexagon: 'hexagon',
};

type Layout = {
  w: number;
  h: number;
  /** 1% of the shorter side — every stroke / gap scales with this. */
  u: number;
  wide: boolean;
};

/**
 * Canvas background for a style. Everything is CSS gradients (no masks / filters)
 * so html-to-image exports match the preview pixel-for-pixel.
 */
function canvasBackground(style: LogoStyleKey, p: PosterPalette, { u }: Layout): string {
  const grad = `linear-gradient(140deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`;
  const glowTone = p.logo === 'light' ? '255,255,255' : '0,0,0';
  const px = (n: number) => `${Math.max(1, n).toFixed(1)}px`;

  switch (style) {
    case 'solid':
      return p.background;
    case 'radial':
      return `radial-gradient(circle at 50% 45%, ${p.background} 0%, ${p.backgroundAlt} 78%)`;
    case 'mesh':
      return [
        `radial-gradient(at 12% 18%, ${alpha(p.accent, 0.38)} 0, transparent 46%)`,
        `radial-gradient(at 88% 12%, rgba(${glowTone},0.14) 0, transparent 42%)`,
        `radial-gradient(at 82% 88%, ${alpha(p.accent, 0.3)} 0, transparent 48%)`,
        grad,
      ].join(', ');
    case 'aurora':
      return [
        `radial-gradient(ellipse 65% 42% at 18% 8%, ${alpha(p.accent, 0.45)}, transparent 70%)`,
        `radial-gradient(ellipse 55% 45% at 92% 92%, ${alpha(p.accent, 0.32)}, transparent 70%)`,
        p.backgroundAlt,
      ].join(', ');
    case 'two_tone':
      return `linear-gradient(180deg, ${p.background} 0 50%, ${p.backgroundAlt} 50% 100%)`;
    case 'vignette':
      return `radial-gradient(circle at 50% 50%, transparent 42%, rgba(0,0,0,0.38) 100%), ${p.background}`;
    case 'spotlight':
      return `radial-gradient(ellipse 55% 75% at 50% 0%, rgba(255,255,255,0.22), transparent 72%), ${p.backgroundAlt}`;
    case 'dots':
      return `radial-gradient(${alpha(p.accent, 0.4)} ${px(u * 0.32)}, transparent ${px(u * 0.4)}) 0 0 / ${px(u * 4)} ${px(u * 4)}, ${grad}`;
    case 'grid': {
      const line = alpha(p.ink, 0.09);
      const step = px(u * 6);
      const t = px(u * 0.14);
      return `linear-gradient(${line} ${t}, transparent ${t}) 0 0 / ${step} ${step}, linear-gradient(90deg, ${line} ${t}, transparent ${t}) 0 0 / ${step} ${step}, ${grad}`;
    }
    case 'stripes':
      return `repeating-linear-gradient(135deg, ${alpha(p.accent, 0.13)} 0 ${px(u * 2)}, transparent ${px(u * 2)} ${px(u * 5)}), ${grad}`;
    case 'checker':
      return `repeating-conic-gradient(${alpha(p.ink, 0.05)} 0% 25%, transparent 0% 50%) 0 0 / ${px(u * 8)} ${px(u * 8)}, ${grad}`;
    case 'ripples':
      return `repeating-radial-gradient(circle at 50% 50%, ${alpha(p.accent, 0.16)} 0 ${px(u * 0.3)}, transparent ${px(u * 0.3)} ${px(u * 6)}), ${grad}`;
    case 'crosshatch': {
      const c = alpha(p.ink, 0.06);
      return `repeating-linear-gradient(45deg, ${c} 0 ${px(u * 0.2)}, transparent ${px(u * 0.2)} ${px(u * 3)}), repeating-linear-gradient(-45deg, ${c} 0 ${px(u * 0.2)}, transparent ${px(u * 0.2)} ${px(u * 3)}), ${grad}`;
    }
    case 'split_diagonal':
      return `linear-gradient(135deg, ${p.background} 0 50%, ${p.backgroundAlt} 50% 100%)`;
    case 'split_vertical':
      return `linear-gradient(90deg, ${p.background} 0 50%, ${p.backgroundAlt} 50% 100%)`;
    case 'halo':
      return `radial-gradient(circle at 50% 50%, ${alpha(p.accent, 0.4)} 0, transparent 46%), ${grad}`;
    case 'rounded_card':
    case 'squircle':
    case 'circle_badge':
      return p.backgroundAlt;
    case 'glass_card':
      return [
        `radial-gradient(at 15% 20%, ${alpha(p.accent, 0.5)} 0, transparent 50%)`,
        `radial-gradient(at 85% 85%, ${alpha(p.accent, 0.35)} 0, transparent 50%)`,
        grad,
      ].join(', ');
    default:
      return grad;
  }
}

/** Decorative layers drawn under the logo (frames, arcs, bands). */
function decorLayers(style: LogoStyleKey, p: PosterPalette, { w, h, u }: Layout): ReactNode {
  const abs: CSSProperties = { position: 'absolute', pointerEvents: 'none', boxSizing: 'border-box' };
  const stroke = Math.max(1.5, u * 0.45);

  switch (style) {
    case 'inset_border':
      return (
        <div
          style={{ ...abs, inset: u * 5, border: `${stroke}px solid ${alpha(p.accent, 0.75)}`, borderRadius: u * 3 }}
        />
      );
    case 'double_border':
      return (
        <>
          <div style={{ ...abs, inset: u * 4, border: `${stroke}px solid ${alpha(p.accent, 0.8)}`, borderRadius: u * 3 }} />
          <div style={{ ...abs, inset: u * 6.5, border: `${Math.max(1, stroke * 0.5)}px solid ${alpha(p.accent, 0.5)}`, borderRadius: u * 2 }} />
        </>
      );
    case 'corner_marks': {
      const len = u * 10;
      const off = u * 6;
      const t = Math.max(2, u * 0.8);
      const c = p.accent;
      const corners: CSSProperties[] = [
        { top: off, left: off, borderTop: `${t}px solid ${c}`, borderLeft: `${t}px solid ${c}` },
        { top: off, right: off, borderTop: `${t}px solid ${c}`, borderRight: `${t}px solid ${c}` },
        { bottom: off, left: off, borderBottom: `${t}px solid ${c}`, borderLeft: `${t}px solid ${c}` },
        { bottom: off, right: off, borderBottom: `${t}px solid ${c}`, borderRight: `${t}px solid ${c}` },
      ];
      return corners.map((pos, i) => <div key={i} style={{ ...abs, width: len, height: len, ...pos }} />);
    }
    case 'orbit': {
      const big = Math.max(w, h) * 0.9;
      const small = Math.max(w, h) * 0.7;
      return (
        <>
          <div
            style={{
              ...abs,
              width: big,
              height: big,
              borderRadius: '50%',
              border: `${u * 11}px solid ${alpha(p.accent, 0.14)}`,
              right: -big * 0.45,
              top: -big * 0.4,
            }}
          />
          <div
            style={{
              ...abs,
              width: small,
              height: small,
              borderRadius: '50%',
              background: alpha(p.accent, 0.12),
              left: -small * 0.55,
              bottom: -small * 0.55,
            }}
          />
        </>
      );
    }
    case 'bottom_band':
      return (
        <>
          <div style={{ ...abs, left: 0, right: 0, bottom: 0, height: u * 6, background: p.accent }} />
          <div style={{ ...abs, left: 0, right: 0, bottom: u * 7.2, height: Math.max(1, u * 0.35), background: alpha(p.accent, 0.5) }} />
        </>
      );
    case 'accent_bar':
      return (
        <>
          <div style={{ ...abs, left: 0, top: 0, bottom: 0, width: u * 2.6, background: p.accent }} />
          <div style={{ ...abs, right: u * 6, top: u * 6, width: u * 5, height: u * 5, borderRadius: u * 1.2, background: alpha(p.accent, 0.35) }} />
        </>
      );
    default:
      return null;
  }
}

/** Box (and its look) that hosts the logo for card / badge styles. */
function containerBox(kind: ContainerKind, style: LogoStyleKey, p: PosterPalette, l: Layout) {
  const { w, h, u, wide } = l;
  const glassFill = p.logo === 'light' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)';
  const lift = `0 ${u * 2.5}px ${u * 7}px rgba(0,0,0,0.28)`;

  let width: number;
  let height: number;
  let radius: number | string;
  if (wide) {
    // Wide banners: every badge becomes a pill/card so the lockup stays readable.
    width = w * 0.86;
    height = h * 0.78;
    radius = kind === 'card' || kind === 'glass' || kind === 'outline' ? u * 6 : h;
  } else if (kind === 'circle') {
    width = height = Math.min(w, h) * 0.84;
    radius = '50%';
  } else if (kind === 'squircle') {
    width = height = Math.min(w, h) * 0.8;
    radius = width * 0.24;
  } else if (kind === 'hexagon') {
    width = Math.min(w, h / 0.866) * 0.9;
    height = width * 0.866;
    radius = 0;
  } else if (kind === 'pill') {
    width = w * 0.86;
    height = Math.min(h * 0.42, w * 0.4);
    radius = height;
  } else {
    width = w * 0.84;
    height = Math.min(h * 0.6, w * 0.56);
    radius = u * 5;
  }

  const look: CSSProperties = { borderRadius: radius };
  switch (style) {
    case 'rounded_card':
      Object.assign(look, {
        background: `linear-gradient(140deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`,
        boxShadow: lift,
      });
      break;
    case 'glass_card':
      Object.assign(look, {
        background: glassFill,
        border: `${Math.max(1, u * 0.25)}px solid rgba(255,255,255,0.38)`,
        boxShadow: `0 ${u * 2}px ${u * 6}px rgba(0,0,0,0.18)`,
      });
      break;
    case 'outline_card':
      Object.assign(look, { border: `${Math.max(2, u * 0.55)}px solid ${p.accent}` });
      break;
    case 'pill':
      Object.assign(look, {
        background: alpha(p.accent, 0.14),
        border: `${Math.max(1.5, u * 0.35)}px solid ${alpha(p.accent, 0.55)}`,
      });
      break;
    case 'circle_badge':
      Object.assign(look, {
        background: `linear-gradient(140deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`,
        boxShadow: lift,
      });
      break;
    case 'ring':
      Object.assign(look, { border: `${Math.max(2, u * 1.2)}px solid ${p.accent}` });
      break;
    case 'double_ring':
      Object.assign(look, {
        border: `${Math.max(2, u * 0.7)}px solid ${p.accent}`,
        boxShadow: `0 0 0 ${u * 1.6}px ${p.background}, 0 0 0 ${u * 2.2}px ${alpha(p.accent, 0.6)}`,
      });
      break;
    case 'seal':
      Object.assign(look, {
        border: `${Math.max(2, u * 0.6)}px dashed ${alpha(p.accent, 0.85)}`,
        boxShadow: `inset 0 0 0 ${u * 1.6}px ${alpha(p.accent, 0.12)}`,
      });
      break;
    case 'squircle':
      Object.assign(look, {
        background: `linear-gradient(160deg, ${p.background} 0%, ${p.backgroundAlt} 100%)`,
        boxShadow: `${lift}, inset 0 ${u * 0.4}px 0 rgba(255,255,255,0.18)`,
      });
      break;
    case 'hexagon':
      Object.assign(look, {
        background: alpha(p.accent, 0.16),
        clipPath: wide ? undefined : 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)',
      });
      break;
  }

  // Mark height as a share of the box's shorter side — round shapes leave less room at the corners.
  const fill = wide ? 0.6 : kind === 'circle' ? 0.56 : kind === 'hexagon' ? 0.52 : kind === 'squircle' ? 0.6 : 0.6;
  return { width, height, look, fill };
}

/**
 * Responsive brand-symbol artwork (from `public/logo.png`) for app icons, profile
 * pictures, banners and website logos.
 *
 * - 34 design styles (canvas, frames, badges, patterns, accents) × every palette
 * - The symbol is near-square, so it is sized from the shorter side; wide banners
 *   turn badges into pills instead of stretching them
 * - Dark palettes get the white + green variant; transparent palettes export a
 *   mono cut-out and ignore the style
 */
export function BrandLogoTemplate({ data, palette, size }: PosterTemplateProps) {
  const { width: w, height: h } = size;
  const minSide = Math.min(w, h);
  const wide = w / h >= 2.2;
  const transparent = palette.background === 'transparent';
  const style: LogoStyleKey = transparent ? 'gradient' : normalizeLogoStyle(data.logoStyle);
  const layout: Layout = { w, h, u: minSide / 100, wide };

  const mark = BRAND_MARK_ASSETS[brandMarkForPalette(palette)];
  const aspect = mark.width / mark.height;

  const kind = transparent ? undefined : CONTAINER_BY_STYLE[style];
  const box = kind ? containerBox(kind, style, palette, layout) : null;

  let logoHeight = box
    ? Math.min(box.width, box.height) * box.fill
    : transparent
      ? minSide * 0.86
      : minSide * (wide ? 0.62 : 0.5);
  if (style === 'underline') logoHeight *= 0.88;
  const logoWidth = logoHeight * aspect;

  const logo = (
    <img
      src={mark.src}
      alt="Brand logo"
      width={logoWidth}
      height={logoHeight}
      crossOrigin="anonymous"
      decoding="async"
      draggable={false}
      style={{ display: 'block', width: logoWidth, height: logoHeight, objectFit: 'contain' }}
    />
  );

  return (
    <PosterFrame size={size} background={transparent ? 'transparent' : canvasBackground(style, palette, layout)}>
      {!transparent && decorLayers(style, palette, layout)}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: layout.u * 3,
        }}
      >
        {box ? (
          <div
            style={{
              width: box.width,
              height: box.height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              ...box.look,
            }}
          >
            {logo}
          </div>
        ) : (
          logo
        )}
        {style === 'underline' && (
          <div
            style={{
              width: Math.min(w * 0.22, logoWidth * 0.6),
              height: Math.max(2, layout.u * 0.9),
              borderRadius: 999,
              background: palette.accent,
            }}
          />
        )}
      </div>
    </PosterFrame>
  );
}
