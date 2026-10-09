import { memo, useState } from 'react';
import { Check } from 'lucide-react';
import type { PosterPalette } from './brand/brandKit';
import {
  LOGO_STYLES,
  LOGO_STYLE_GROUPS,
  LOGO_STYLE_GROUP_META,
  type LogoStyleGroup,
  type LogoStyleKey,
} from './brand/logoStyles';
import { BrandLogoTemplate } from './templates/BrandLogoTemplate';
import type { PosterData, PosterSize } from './types';

/** Thumbnails render the real template at a mid size, then scale down so strokes stay crisp. */
const THUMB_SOURCE: PosterSize = { key: 'target', label: 'Thumbnail', width: 300, height: 300 };
const THUMB_PX = 64;

const StyleThumb = memo(function StyleThumb({
  styleKey,
  data,
  palette,
}: {
  styleKey: LogoStyleKey;
  data: PosterData;
  palette: PosterPalette;
}) {
  return (
    <span
      className="relative block overflow-hidden rounded-xl border border-black/10 shadow-sm"
      style={{ width: THUMB_PX, height: THUMB_PX }}
    >
      <span
        className="absolute left-0 top-0 block origin-top-left"
        style={{ transform: `scale(${THUMB_PX / THUMB_SOURCE.width})` }}
      >
        <BrandLogoTemplate data={{ ...data, logoStyle: styleKey }} palette={palette} size={THUMB_SOURCE} />
      </span>
    </span>
  );
});

type Props = {
  value: LogoStyleKey;
  onChange: (key: LogoStyleKey) => void;
  data: PosterData;
  palette: PosterPalette;
};

/**
 * Brand Logo design board — grouped live previews so the user sees each of the
 * 34 treatments in the active palette before choosing.
 */
export function LogoStylePicker({ value, onChange, data, palette }: Props) {
  const [group, setGroup] = useState<LogoStyleGroup | 'all'>('all');
  const transparent = palette.background === 'transparent';
  const visible = group === 'all' ? LOGO_STYLES : LOGO_STYLES.filter((s) => s.group === group);
  const selected = LOGO_STYLES.find((s) => s.key === value);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Logo design</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {LOGO_STYLES.length} responsive styles · adapts to icon, square and banner sizes
          </p>
        </div>
        {selected && !transparent && (
          <span className="shrink-0 rounded-xl bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            {selected.label}
          </span>
        )}
      </div>

      {transparent ? (
        <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Transparent palettes export a clean logo cut-out, so design styles are off. Pick a colour palette to use
          them.
        </p>
      ) : (
        <>
          <div
            className="flex gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar"
            role="tablist"
            aria-label="Logo design groups"
          >
            {(['all', ...LOGO_STYLE_GROUPS] as const).map((id) => {
              const active = group === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setGroup(id)}
                  className={`shrink-0 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition ${
                    active
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {id === 'all' ? 'All' : LOGO_STYLE_GROUP_META[id].label}
                </button>
              );
            })}
          </div>

          <div
            className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto pe-0.5 custom-scrollbar min-[420px]:grid-cols-4 sm:grid-cols-5"
            role="listbox"
            aria-label="Logo designs"
          >
            {visible.map((s) => {
              const active = value === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  role="option"
                  aria-selected={active}
                  title={`${s.label} — ${LOGO_STYLE_GROUP_META[s.group].label}`}
                  onClick={() => onChange(s.key)}
                  className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-2 text-center transition ${
                    active
                      ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-600/25 dark:bg-blue-950/40'
                      : 'border-transparent bg-gray-50/80 hover:border-gray-200 hover:bg-white dark:bg-gray-900/50 dark:hover:border-gray-600 dark:hover:bg-gray-900'
                  }`}
                >
                  <span className="relative">
                    <StyleThumb styleKey={s.key} data={data} palette={palette} />
                    {active && (
                      <span className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 shadow">
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      </span>
                    )}
                  </span>
                  <span
                    className={`w-full truncate text-[10px] font-semibold leading-tight ${
                      active ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
