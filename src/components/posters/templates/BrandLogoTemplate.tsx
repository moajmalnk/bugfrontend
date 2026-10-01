import { CodoLogo } from '../brand/CodoLogo';
import type { PosterTemplateProps } from '../types';
import { PosterFrame } from './shared';

/**
 * Responsive CODO logo artwork for icons, profile pictures and website logos.
 * Wide canvases (≥ 2.2:1) get the full wordmark; everything else gets the mark only.
 */
export function BrandLogoTemplate({ palette, size }: PosterTemplateProps) {
  const { width: w, height: h } = size;
  const ratio = w / h;
  const wide = ratio >= 2.2;
  // Mark + gap + 4-letter wordmark is ~3.6× the mark height.
  const logoHeight = wide ? Math.min(h * 0.62, (w * 0.9) / 3.6) : Math.min(w, h) * 0.58;
  const background =
    palette.background === 'transparent'
      ? 'transparent'
      : `linear-gradient(140deg, ${palette.background} 0%, ${palette.backgroundAlt} 100%)`;

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
        <CodoLogo height={logoHeight} showWordmark={wide} color={palette.ink} />
      </div>
    </PosterFrame>
  );
}
