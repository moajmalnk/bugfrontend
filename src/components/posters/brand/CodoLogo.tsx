import { CODO_LOGO_ASSETS, LOGO_COLORS, type CodoLogoAssetKey } from './brandKit';

type Props = {
  variant?: 'dark' | 'light' | 'mono';
  /** Height of the mark / logo row in px. */
  height?: number;
  showWordmark?: boolean;
  /** Force mono SVG fill (used when a palette needs a single ink colour). */
  color?: string;
  /** Optional brand accent for the SVG petal and final "O". */
  accent?: string;
  /**
   * Prefer an official agency logo asset. Defaults to the matching dark/light
   * WebP when no custom `color` is set. Pass `false` to force the SVG mark.
   */
  asset?: CodoLogoAssetKey | false;
};

/**
 * CODO logo for posters. Uses the official agency WebP when possible so exports
 * match brand guidelines; falls back to an inline SVG mark when a custom mono
 * colour is required (icons, single-ink layouts).
 */
export function CodoLogo({
  variant = 'dark',
  height = 48,
  showWordmark = true,
  color,
  accent,
  asset,
}: Props) {
  const preferAsset = asset !== false && !color && variant !== 'mono';
  const assetKey: CodoLogoAssetKey =
    asset === 'dark' || asset === 'light' || asset === 'full'
      ? asset
      : variant === 'light'
        ? 'light'
        : 'dark';

  if (preferAsset && showWordmark) {
    const meta = CODO_LOGO_ASSETS[assetKey];
    const width = (height * meta.width) / meta.height;
    return (
      <img
        src={meta.src}
        alt="CODO"
        width={width}
        height={height}
        crossOrigin="anonymous"
        style={{ display: 'block', width, height, objectFit: 'contain' }}
      />
    );
  }

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
        <path
          d="M47 47 H22 A20 20 0 0 1 2 27 V22 A20 20 0 0 1 22 2 H27 A20 20 0 0 1 47 22 Z"
          fill={fill}
        />
        <path
          d="M53 47 V22 A20 20 0 0 1 73 2 H78 A20 20 0 0 1 98 22 V27 A20 20 0 0 1 78 47 Z"
          fill={fill}
        />
        <path
          d="M8 53 H41 A6 6 0 0 1 47 59 V92 A6 6 0 0 1 37 96 L4 63 A6 6 0 0 1 8 53 Z"
          fill={fill}
        />
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
