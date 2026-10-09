import { memo, useMemo, useState, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { POSTER_TEMPLATES } from './templates/templateRegistry';
import type { PosterTemplateGroup, PosterTemplateKey } from './types';

type GroupFilter = 'all' | PosterTemplateGroup;

const GROUP_LABELS: Record<GroupFilter, string> = {
  all: 'All',
  signature: 'Signature',
  speaker: 'Speaker',
  event: 'Event',
  type: 'Type',
  quote: 'Quote',
  celebrate: 'Celebrate',
};

const GROUP_ORDER: GroupFilter[] = ['all', 'signature', 'speaker', 'event', 'type', 'quote', 'celebrate'];

const groupOf = (key: PosterTemplateKey): PosterTemplateGroup => POSTER_TEMPLATES[key].group ?? 'signature';

type Props = {
  /** Category-preferred order; the picker filters it but never reorders it. */
  order: PosterTemplateKey[];
  value: PosterTemplateKey;
  onChange: (key: PosterTemplateKey) => void;
  /** Thumbnail renderer owned by the modal so previews share its live data. */
  renderThumb: (key: PosterTemplateKey) => ReactNode;
};

/**
 * Template browser for 40+ templates: group tabs plus search keep the list
 * scannable, and the grid scrolls inside its own panel so the form below
 * stays reachable. `content-visibility` skips painting off-screen thumbnails,
 * which matters because each thumbnail is a full poster render.
 */
export const TemplatePicker = memo(function TemplatePicker({ order, value, onChange, renderThumb }: Props) {
  const [group, setGroup] = useState<GroupFilter>('all');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const out: Partial<Record<GroupFilter, number>> = { all: order.length };
    for (const key of order) {
      const g = groupOf(key);
      out[g] = (out[g] ?? 0) + 1;
    }
    return out;
  }, [order]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return order.filter((key) => {
      if (group !== 'all' && groupOf(key) !== group) return false;
      if (!q) return true;
      const def = POSTER_TEMPLATES[key];
      return def.label.toLowerCase().includes(q) || def.description.toLowerCase().includes(q);
    });
  }, [order, group, query]);

  const tabs = GROUP_ORDER.filter((g) => (counts[g] ?? 0) > 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Template</h3>
        <span className="text-xs text-muted-foreground">{POSTER_TEMPLATES[value].label}</span>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 60))}
          maxLength={60}
          placeholder={`Search ${order.length} templates`}
          aria-label="Search templates"
          className="h-9 w-full rounded-xl border border-gray-200 bg-background ps-9 pe-9 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute end-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div role="tablist" aria-label="Template groups" className="flex flex-wrap gap-1.5">
        {tabs.map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={group === g}
            onClick={() => setGroup(g)}
            className={`flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-semibold transition ${
              group === g
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {GROUP_LABELS[g]}
            <span className={group === g ? 'text-white/80' : 'text-muted-foreground'}>{counts[g]}</span>
          </button>
        ))}
      </div>

      <div className="max-h-[22rem] overflow-y-auto rounded-xl pe-1 custom-scrollbar">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center dark:border-gray-700">
            <p className="text-sm text-muted-foreground">No templates match “{query.trim()}”.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setGroup('all');
              }}
              className="rounded-xl px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
            >
              Show all templates
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {visible.map((key) => {
              const def = POSTER_TEMPLATES[key];
              const active = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChange(key)}
                  aria-pressed={active}
                  title={def.description}
                  style={{ contentVisibility: 'auto', containIntrinsicSize: '0 132px' }}
                  className={`flex min-w-0 flex-col items-center gap-1.5 rounded-xl border p-1.5 text-center transition ${
                    active
                      ? 'border-blue-600 ring-2 ring-blue-600/30'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="pointer-events-none overflow-hidden rounded-lg">{renderThumb(key)}</div>
                  <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-gray-700 dark:text-gray-300">
                    {def.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
