import { CODO_LOGO_ASSETS, logoAssetForPalette } from '../brand/brandKit';
import { CodoLogo } from '../brand/CodoLogo';
import type { PosterTemplateProps } from '../types';
import { PosterFrame } from './shared';

/**
 * Responsive CODO logo artwork for icons, profile pictures and website logos.
 *
 * - Wide banners (≥2.8:1) → full "CODO AI Innovations" lockup
 * - Wide / square / portrait with room to read → official dark/light wordmark
 * - Tiny app icons (<200px) → SVG mark only (wordmark would be illegible)
 */
export function BrandLogoTemplate({ palette, size }: PosterTemplateProps) {
  const { width: w, height: h } = size;
  const ratio = w / h;
  const minSide = Math.min(w, h);
  const wide = ratio >= 2.2;
  const full = ratio >= 2.8;
  /** App icons / favicons — too small for the agency wordmark. */
  const markOnly = !wide && minSide < 200;

  const background =
    palette.background === 'transparent'
      ? 'transparent'
      : `linear-gradient(140deg, ${palette.background} 0%, ${palette.backgroundAlt} 100%)`;

  const assetKey = full ? 'full' : logoAssetForPalette(palette);
  const meta = CODO_LOGO_ASSETS[assetKey];

  let logoHeight: number;
  if (markOnly) {
    logoHeight = minSide * 0.58;
  } else if (wide) {
    logoHeight = Math.min(h * 0.72, (w * 0.9 * meta.height) / meta.width);
  } else {
    // Square / portrait: fit the horizontal lockup with comfortable padding.
    logoHeight = Math.min(h * 0.42, (w * 0.82 * meta.height) / meta.width);
  }

  return (
    <PosterFrame size={size} background={background}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: markOnly ? 0 : Math.min(w, h) * 0.08,
        }}
      >
        {markOnly ? (
          <CodoLogo height={logoHeight} showWordmark={false} color={palette.ink} asset={false} />
        ) : (
          <CodoLogo height={logoHeight} showWordmark asset={assetKey} />
        )}
      </div>
    </PosterFrame>
  );
}
