import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ORIGINAL_PRESET_ID, POSTER_PRESET_GROUPS, type PosterPreset } from './posterSizes';

const dims = (w: number, h: number) => `${w} × ${h}`;

/**
 * Why: ~60 export sizes across 17 platforms is too long for a native select;
 * search matches platform, label and dimensions ("insta story", "1280x720", "1080").
 */
function matches(query: string, group: string, p: PosterPreset): boolean {
  const haystack = `${group} ${p.label} ${p.width}x${p.height} ${dims(p.width, p.height)} ${p.note ?? ''}`
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return query
    .toLowerCase()
    .replace(/×/g, 'x')
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.replace(/×/g, 'x').includes(term));
}

export function PosterSizePicker({
  id,
  value,
  onChange,
  originalSize,
  selectedLabel,
}: {
  id: string;
  value: string;
  onChange: (presetId: string) => void;
  originalSize: { width: number; height: number };
  selectedLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim();
    if (!q) return POSTER_PRESET_GROUPS;
    return POSTER_PRESET_GROUPS.map((g) => ({
      group: g.group,
      presets: g.presets.filter((p) => matches(q, g.group, p)),
    })).filter((g) => g.presets.length > 0);
  }, [query]);

  const showOriginal = !query.trim() || 'original design'.includes(query.trim().toLowerCase());

  const select = (presetId: string) => {
    onChange(presetId);
    setOpen(false);
    setQuery('');
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          className="flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 text-left text-sm text-gray-900 transition hover:border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-gray-600"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[120] w-[var(--radix-popover-trigger-width)] min-w-[280px] rounded-xl p-0 sm:p-0"
        onEscapeKeyDown={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false} className="rounded-xl">
          <CommandInput
            value={query}
            onValueChange={(v) => setQuery(v.slice(0, 40))}
            placeholder="Search platform or size (e.g. insta story, 1280x720)"
            maxLength={40}
          />
          <CommandList className="max-h-[320px] overflow-y-auto custom-scrollbar">
            <CommandEmpty>
              <span className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                <Search className="h-4 w-4" />
                No sizes match “{query.trim()}”
              </span>
            </CommandEmpty>
            {showOriginal && (
              <CommandGroup>
                <CommandItem value={ORIGINAL_PRESET_ID} onSelect={() => select(ORIGINAL_PRESET_ID)} className="rounded-lg">
                  <Check className={`h-4 w-4 shrink-0 ${value === ORIGINAL_PRESET_ID ? 'opacity-100' : 'opacity-0'}`} />
                  <span className="ms-2 flex-1 truncate">Original design</span>
                  <span className="ms-2 text-xs tabular-nums text-muted-foreground">
                    {dims(originalSize.width, originalSize.height)}
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
            {groups.map((g) => (
              <CommandGroup key={g.group} heading={g.group}>
                {g.presets.map((p) => (
                  <CommandItem key={p.id} value={p.id} onSelect={() => select(p.id)} className="rounded-lg">
                    <Check className={`h-4 w-4 shrink-0 ${value === p.id ? 'opacity-100' : 'opacity-0'}`} />
                    <span className="ms-2 flex-1 truncate">{p.label}</span>
                    {!p.label.includes('×') && (
                      <span className="ms-2 text-xs tabular-nums text-muted-foreground">{dims(p.width, p.height)}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
