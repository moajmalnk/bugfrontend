import { CODO_LOGO_ASSETS, logoAssetForPalette } from '../brand/brandKit';
import { CodoLogo } from '../brand/CodoLogo';
import type { PosterTemplateProps } from '../types';
import { PosterFrame } from './shared';

/**
 * Responsive CODO logo artwork for icons, profile pictures and website logos.
 *
 * - Wide banners → full "CODO AI Innovations" lockup
 * - Medium-wide → dark/light agency wordmark matching the palette
 * - Square / portrait → SVG mark only (app icons, avatars)
 */
export function BrandLogoTemplate({ palette, size }: PosterTemplateProps) {
  const { width: w, height: h } = size;
  const ratio = w / h;
  const wide = ratio >= 2.2;
  const full = ratio >= 2.8;
  const background =
    palette.background === 'transparent'
      ? 'transparent'
      : `linear-gradient(140deg, ${palette.background} 0%, ${palette.backgroundAlt} 100%)`;

  const assetKey = full ? 'full' : logoAssetForPalette(palette);
  const meta = CODO_LOGO_ASSETS[assetKey];
  // Fit the official logo inside ~90% of the canvas while keeping aspect ratio.
  const logoHeight = wide
    ? Math.min(h * 0.72, (w * 0.9 * meta.height) / meta.width)
    : Math.min(w, h) * 0.58;

  return (
    <PosterFrame size={size} background={background}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {wide ? (
          <CodoLogo height={logoHeight} showWordmark asset={assetKey} />
        ) : (
          <CodoLogo height={logoHeight} showWordmark={false} color={palette.ink} asset={false} />
        )}
      </div>
    </PosterFrame>
  );
}
