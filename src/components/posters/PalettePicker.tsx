import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  PALETTE_CATEGORY_META,
  POSTER_PALETTES,
  categoriesForPalettes,
  palettesInCategory,
  type PaletteCategoryId,
  type PosterPalette,
  type PosterPaletteKey,
} from './brand/brandKit';

const CHECKERBOARD =
  'linear-gradient(45deg, #d4d4d4 25%, transparent 25%), linear-gradient(-45deg, #d4d4d4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d4 75%), linear-gradient(-45deg, transparent 75%, #d4d4d4 75%)';

function swatchBackground(p: PosterPalette): string {
  if (p.background === 'transparent') {
    return `linear-gradient(135deg, ${p.ink} 50%, transparent 50%), ${CHECKERBOARD}`;
  }
  return `linear-gradient(145deg, ${p.background} 0%, ${p.background} 46%, ${p.accent} 46%, ${p.accent} 100%)`;
}

type Props = {
  options: PosterPaletteKey[];
  value: PosterPaletteKey;
  onChange: (key: PosterPaletteKey) => void;
};

/**
 * Dense studio palette board — category filters + swatch grid so 30+ colourways
 * stay scannable without a long chip wrap.
 */
export function PalettePicker({ options, value, onChange }: Props) {
  const categories = useMemo(() => categoriesForPalettes(options), [options]);
  const [category, setCategory] = useState<PaletteCategoryId | 'all'>('all');
  const [query, setQuery] = useState('');

  const activeCategory =
    category === 'all' || categories.includes(category) ? category : 'all';

  const visible = useMemo(() => {
    const base = palettesInCategory(options, activeCategory);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((k) => {
      const p = POSTER_PALETTES[k];
      return (
        p.label.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        k.toLowerCase().includes(q)
      );
    });
  }, [options, activeCategory, query]);

  const selected = POSTER_PALETTES[value];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Palette</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {options.length} studio colourways · pick a mood, then refine
          </p>
        </div>
        {selected && (
          <div
            className="flex max-w-[46%] shrink-0 items-center gap-2 rounded-2xl border border-gray-200 bg-white/80 px-2.5 py-1.5 dark:border-gray-700 dark:bg-gray-900/70"
            title={selected.label}
          >
            <span
              className="h-8 w-8 shrink-0 rounded-xl border border-black/10 shadow-sm"
              style={{
                background: swatchBackground(selected),
                backgroundSize: selected.background === 'transparent' ? '8px 8px, 8px 8px, 8px 8px, 8px 8px' : undefined,
                backgroundPosition:
                  selected.background === 'transparent' ? '0 0, 0 4px, 4px -4px, -4px 0' : undefined,
              }}
            />
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-gray-900 dark:text-white">
                {selected.label}
              </span>
              <span className="block truncate text-[10px] capitalize text-muted-foreground">
                {PALETTE_CATEGORY_META[selected.category].label}
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 40))}
          maxLength={40}
          placeholder="Search palettes…"
          className="h-9 rounded-xl border-gray-200 bg-white ps-8 text-xs dark:border-gray-700 dark:bg-gray-900"
        />
      </div>

      <div
        className="flex gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar"
        role="tablist"
        aria-label="Palette categories"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === 'all'}
          onClick={() => setCategory('all')}
          className={`shrink-0 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition ${
            activeCategory === 'all'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          All
        </button>
        {categories.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeCategory === id}
            onClick={() => setCategory(id)}
            className={`shrink-0 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition ${
              activeCategory === id
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {PALETTE_CATEGORY_META[id].label}
          </button>
        ))}
      </div>

      <div
        className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto pe-0.5 custom-scrollbar sm:grid-cols-5"
        role="listbox"
        aria-label="Colour palettes"
      >
        {visible.map((k) => {
          const p = POSTER_PALETTES[k];
          const active = value === k;
          return (
            <button
              key={k}
              type="button"
              role="option"
              aria-selected={active}
              title={`${p.label} — ${PALETTE_CATEGORY_META[p.category].hint}`}
              onClick={() => onChange(k)}
              className={`group relative flex flex-col items-center gap-1.5 rounded-2xl border p-2 text-center transition ${
                active
                  ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-600/25 dark:bg-blue-950/40'
                  : 'border-transparent bg-gray-50/80 hover:border-gray-200 hover:bg-white dark:bg-gray-900/50 dark:hover:border-gray-600 dark:hover:bg-gray-900'
              }`}
            >
              <span
                className="relative h-10 w-10 rounded-xl border border-black/10 shadow-sm"
                style={{
                  background: swatchBackground(p),
                  backgroundSize:
                    p.background === 'transparent' ? '7px 7px, 7px 7px, 7px 7px, 7px 7px' : undefined,
                  backgroundPosition:
                    p.background === 'transparent' ? '0 0, 0 3.5px, 3.5px -3.5px, -3.5px 0' : undefined,
                }}
              >
                {active && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/25">
                    <Check className="h-4 w-4 text-white drop-shadow" strokeWidth={3} />
                  </span>
                )}
              </span>
              <span
                className={`w-full truncate text-[10px] font-semibold leading-tight ${
                  active ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {p.label}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 && (
        <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          No palettes match that search.
        </p>
      )}
    </div>
  );
}
