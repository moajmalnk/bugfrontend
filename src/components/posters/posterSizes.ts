import type { PosterPaletteKey } from './brand/brandKit';
import {
  POSTER_SIZES,
  type PosterLayoutKey,
  type PosterSize,
  type PosterTemplateDefinition,
  type PosterTemplateKey,
} from './types';

export type PosterPreset = {
  id: string;
  group: string;
  label: string;
  width: number;
  height: number;
  note?: string;
  /** Template that suits this size better (e.g. logo for app icons). */
  suggest?: { template: PosterTemplateKey; palette?: PosterPaletteKey };
};

export const ORIGINAL_PRESET_ID = 'original';

const LOGO = { template: 'brand_logo' as const, palette: 'growthGreen' as const };

const p = (
  group: string,
  id: string,
  label: string,
  width: number,
  height: number,
  extra: Partial<PosterPreset> = {}
): PosterPreset => ({ id, group, label, width, height, ...extra });

/** CODO standard export sizes, grouped the way the design team lists them. */
export const POSTER_PRESET_GROUPS: { group: string; presets: PosterPreset[] }[] = [
  {
    group: 'Poster',
    presets: [
      p('Poster', 'poster-portrait', 'Portrait 4:5', 1080, 1350),
      p('Poster', 'poster-square', 'Square 1:1', 1080, 1080),
      p('Poster', 'poster-story', 'Story 9:16', 1080, 1920),
    ],
  },
  {
    group: 'App Icons',
    presets: [48, 72, 96, 144, 192].map((s) =>
      p('App Icons', `app-${s}`, `${s} × ${s}`, s, s, { suggest: LOGO })
    ),
  },
  {
    group: 'Website',
    presets: [
      p('Website', 'web-logo-black', 'Logo 330 × 70 (black)', 330, 70, {
        suggest: { template: 'brand_logo', palette: 'logoBlack' },
      }),
      p('Website', 'web-logo-white', 'Logo 330 × 70 (white)', 330, 70, {
        suggest: { template: 'brand_logo', palette: 'logoWhite' },
      }),
      p('Website', 'web-49x58', '49 × 58', 49, 58, { suggest: LOGO }),
      p('Website', 'web-90', '90 × 90', 90, 90, { suggest: LOGO }),
    ],
  },
  {
    group: 'Additional Sizes',
    presets: [150, 180, 512, 1024].map((s) =>
      p('Additional Sizes', `extra-${s}`, `${s} × ${s}`, s, s, { suggest: LOGO })
    ),
  },
  {
    group: 'Facebook',
    presets: [
      p('Facebook', 'fb-profile', 'Profile Picture', 180, 180, { suggest: LOGO }),
      p('Facebook', 'fb-cover', 'Cover Photo', 820, 312),
      p('Facebook', 'fb-post', 'Post Image', 1200, 630),
    ],
  },
  {
    group: 'LinkedIn',
    presets: [
      p('LinkedIn', 'li-profile', 'Profile Picture', 400, 400, { suggest: LOGO }),
      p('LinkedIn', 'li-cover', 'Cover Photo', 1584, 396),
      p('LinkedIn', 'li-post', 'Post Image', 1200, 628),
    ],
  },
  {
    group: 'Behance',
    presets: [
      p('Behance', 'be-profile', 'Profile Picture', 100, 100, { suggest: LOGO }),
      p('Behance', 'be-cover', 'Cover Photo', 3200, 410),
    ],
  },
  {
    group: 'Twitter / X',
    presets: [
      p('Twitter / X', 'tw-profile', 'Profile Picture', 400, 400, { suggest: LOGO }),
      p('Twitter / X', 'tw-header', 'Header Photo', 1500, 500),
      p('Twitter / X', 'tw-post', 'Post Image', 1200, 675),
    ],
  },
  {
    group: 'Instagram',
    presets: [
      p('Instagram', 'ig-highlight', 'Highlight Cover', 1080, 1920),
      p('Instagram', 'ig-profile', 'Profile Picture', 110, 110, { suggest: LOGO }),
      p('Instagram', 'ig-post', 'Post Image', 1080, 1080),
      p('Instagram', 'ig-story', 'Story Image', 1080, 1920),
    ],
  },
  {
    group: 'YouTube',
    presets: [
      p('YouTube', 'yt-cover', 'Channel Cover Photo', 2048, 1152, { note: 'Must be 6MB or less' }),
      p('YouTube', 'yt-thumb', 'Video Thumbnail', 1280, 720),
    ],
  },
  {
    group: 'Pinterest',
    presets: [
      p('Pinterest', 'pin-profile', 'Profile Picture', 165, 165, { suggest: LOGO }),
      p('Pinterest', 'pin-board', 'Board Display', 222, 150),
      p('Pinterest', 'pin-pin', 'Pin Size', 1000, 1500),
    ],
  },
  {
    group: 'Google My Business',
    presets: [
      p('Google My Business', 'gmb-profile', 'Profile Picture', 250, 250, { suggest: LOGO }),
      p('Google My Business', 'gmb-cover', 'Cover Photo', 1080, 608),
    ],
  },
  {
    group: 'Print',
    presets: [
      p('Print', 'x-banner', 'X-Banner', 800, 2000, { note: 'Standard size — confirm exact size with the printer' }),
      p('Print', 'certificate', 'Certificate', 750, 536),
    ],
  },
  {
    group: 'Courses',
    presets: [
      p('Courses', 'course-image', 'Course Image', 400, 250),
      p('Courses', 'course-category', 'Category Image', 400, 255),
      p('Courses', 'course-bundle', 'Bundle Image', 400, 250),
    ],
  },
  {
    group: 'Shorts',
    presets: [p('Shorts', 'shorts-thumb', 'Thumbnail', 1280, 720)],
  },
  {
    group: 'Snapchat',
    presets: [
      p('Snapchat', 'snap-profile', 'Profile Picture', 320, 320, { suggest: LOGO }),
      p('Snapchat', 'snap-story', 'Story Image', 1080, 1920),
    ],
  },
  {
    group: 'WhatsApp',
    presets: [
      p('WhatsApp', 'wa-profile', 'Profile Picture', 500, 500, { suggest: LOGO }),
      p('WhatsApp', 'wa-banner', 'Banner', 1211, 681),
      p('WhatsApp', 'wa-status', 'Status Image', 1080, 1920),
    ],
  },
];

const PRESET_INDEX = new Map(POSTER_PRESET_GROUPS.flatMap((g) => g.presets).map((x) => [x.id, x]));

export function getPreset(id: string): PosterPreset | null {
  return PRESET_INDEX.get(id) ?? null;
}

/** Same ratio within 0.5% — no letterboxing needed. */
export function sameAspect(a: { width: number; height: number }, b: { width: number; height: number }): boolean {
  return Math.abs(a.width / a.height - b.width / b.height) / (b.width / b.height) < 0.005;
}

function closestLayout(layouts: PosterLayoutKey[], ratio: number): PosterSize {
  let best = POSTER_SIZES[layouts[0]];
  let bestDiff = Infinity;
  for (const key of layouts) {
    const s = POSTER_SIZES[key];
    const diff = Math.abs(Math.log(s.width / s.height) - Math.log(ratio));
    if (diff < bestDiff) {
      best = s;
      bestDiff = diff;
    }
  }
  return best;
}

export type PosterRenderPlan = {
  /** Size the template DOM is drawn at. */
  layout: PosterSize;
  /** Final exported image size. */
  target: { width: number; height: number };
};

/**
 * Decides which layout to draw and what size to export.
 * Why: one design must serve 48px icons up to 3200px banners — fixed-artwork
 * templates keep their native size and are fitted onto the target canvas.
 */
export function resolveRenderPlan(def: PosterTemplateDefinition, presetId: string): PosterRenderPlan {
  const preset = presetId === ORIGINAL_PRESET_ID ? null : getPreset(presetId);
  if (def.responsive && preset) {
    const layout: PosterSize = { key: 'target', label: preset.label, width: preset.width, height: preset.height };
    return { layout, target: { width: preset.width, height: preset.height } };
  }
  if (def.nativeSize) {
    const layout: PosterSize = { key: 'native', label: 'Original', ...def.nativeSize };
    return { layout, target: preset ? { width: preset.width, height: preset.height } : { ...def.nativeSize } };
  }
  const ratio = preset ? preset.width / preset.height : POSTER_SIZES[def.layouts[0]].width / POSTER_SIZES[def.layouts[0]].height;
  const layout = closestLayout(def.layouts, ratio);
  return {
    layout,
    target: preset ? { width: preset.width, height: preset.height } : { width: layout.width, height: layout.height },
  };
}

/** Human label for a preset, always including its pixel size. */
export function presetDisplayLabel(p: PosterPreset): string {
  const label = p.label.includes('×') ? p.label : `${p.label} — ${p.width} × ${p.height}`;
  return `${p.group} · ${label}`;
}
