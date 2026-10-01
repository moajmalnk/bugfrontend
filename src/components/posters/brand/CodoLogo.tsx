import { LOGO_COLORS } from './brandKit';

type Props = {
  variant?: 'dark' | 'light' | 'mono';
  /** Height of the mark in px; the wordmark scales with it. */
  height?: number;
  showWordmark?: boolean;
  color?: string;
  /** Optional brand accent for the bottom-right petal and final "O" (CODO social lockup). */
  accent?: string;
};

/**
 * Code-drawn approximation of the CODO four-petal mark + wordmark.
 * Why: the poster export must not depend on a remote image; an inline SVG
 * renders identically in preview and in the exported WebP.
 */
export function CodoLogo({ variant = 'dark', height = 48, showWordmark = true, color, accent }: Props) {
  const fill =
    color ?? (variant === 'mono' ? 'currentColor' : LOGO_COLORS[variant === 'light' ? 'light' : 'dark']);
  const markSize = height;
  const gap = height * 0.22;
  const fontSize = height * 0.78;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap,
        color: fill,
        lineHeight: 1,
      }}
    >
      <svg
        width={markSize}
        height={markSize}
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ display: 'block', flexShrink: 0 }}
      >
        {/* Top-left petal: rounded outward, tight inner corner */}
        <path
          d="M47 47 H22 A20 20 0 0 1 2 27 V22 A20 20 0 0 1 22 2 H27 A20 20 0 0 1 47 22 Z"
          fill={fill}
        />
        {/* Top-right petal */}
        <path
          d="M53 47 V22 A20 20 0 0 1 73 2 H78 A20 20 0 0 1 98 22 V27 A20 20 0 0 1 78 47 Z"
          fill={fill}
        />
        {/* Bottom-left play triangle */}
        <path
          d="M8 53 H41 A6 6 0 0 1 47 59 V92 A6 6 0 0 1 37 96 L4 63 A6 6 0 0 1 8 53 Z"
          fill={fill}
        />
        {/* Bottom-right petal */}
        <path
          d="M53 53 H78 A20 20 0 0 1 98 73 V78 A20 20 0 0 1 78 98 H73 A20 20 0 0 1 53 78 Z"
          fill={accent ?? fill}
        />
      </svg>
      {showWordmark && (
        <span
          style={{
            fontFamily: "'PosterPoppins', 'Poppins', system-ui, sans-serif",
            fontWeight: 800,
            fontSize,
            letterSpacing: fontSize * 0.02,
            color: fill,
          }}
        >
          COD<span style={{ color: accent ?? fill }}>O</span>
        </span>
      )}
    </div>
  );
}
