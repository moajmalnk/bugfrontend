import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PosterSizePicker } from './PosterSizePicker';
import {
  getPreset,
  ORIGINAL_PRESET_ID,
  presetDisplayLabel,
  resolveRenderPlan,
  sameAspect,
} from './posterSizes';
import type { PosterPaletteKey } from './brand/brandKit';
import { POSTER_TEMPLATES } from './templates/templateRegistry';
import type { PosterTemplateKey } from './types';

export type ExportSizeIntent = 'download' | 'share';

type Props = {
  templateKey: PosterTemplateKey;
  paletteKey: PosterPaletteKey;
  busy: boolean;
  intent?: ExportSizeIntent;
  onCancel: () => void;
  onConfirm: (presetId: string) => void;
  onApplySuggestion: (template: PosterTemplateKey, palette: PosterPaletteKey) => void;
};

/**
 * Why: Export size only matters at download/share time — keeping it out of the studio
 * canvas frees mobile space. Confirm returns the chosen preset for the export pass.
 */
export function ExportSizeDialog({
  templateKey,
  paletteKey,
  busy,
  intent = 'download',
  onCancel,
  onConfirm,
  onApplySuggestion,
}: Props) {
  const [presetId, setPresetId] = useState(ORIGINAL_PRESET_ID);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const def = POSTER_TEMPLATES[templateKey];
  const plan = resolveRenderPlan(def, presetId);
  const { layout, target } = plan;
  const originalTarget = resolveRenderPlan(def, ORIGINAL_PRESET_ID).target;
  const preset = getPreset(presetId);
  const suggestion =
    preset?.suggest &&
    (preset.suggest.template !== templateKey ||
      (preset.suggest.palette !== undefined && preset.suggest.palette !== paletteKey))
      ? preset.suggest
      : null;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const first = cancelRef.current;
    const last = confirmRef.current;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        e.stopPropagation();
        if (!busy) onCancel();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-size-title"
        className="flex w-full max-w-[440px] flex-col gap-3 rounded-2xl border border-gray-200/60 bg-white p-5 shadow-2xl dark:border-gray-700/60 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={trapTab}
      >
        <div>
          <h3 id="export-size-title" className="text-base font-bold text-gray-900 dark:text-white">
            {intent === 'share' ? 'Share size' : 'Export size'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {intent === 'share'
              ? 'Choose the pixel size before sharing. Preview stays on the original design.'
              : 'Choose the pixel size for this download. Preview stays on the original design.'}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="export-poster-size" className="text-xs font-semibold">
            Size
          </Label>
          <PosterSizePicker
            id="export-poster-size"
            value={presetId}
            onChange={setPresetId}
            originalSize={originalTarget}
            selectedLabel={
              preset
                ? presetDisplayLabel(preset)
                : `Original design (${originalTarget.width} × ${originalTarget.height})`
            }
          />
          <p className="text-xs tabular-nums text-muted-foreground">
            {target.width} × {target.height}px
            {!sameAspect(layout, target) && ' · fitted with soft fill'}
          </p>
        </div>

        {preset?.note ? (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{preset.note}</p>
        ) : null}

        {suggestion ? (
          <div className="flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2 dark:border-blue-900/60 dark:bg-blue-950/30 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 text-xs font-medium text-blue-900 dark:text-blue-200">
              {POSTER_TEMPLATES[suggestion.template].label} suits this size best.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 w-full shrink-0 rounded-xl border-blue-300 text-xs sm:w-auto dark:border-blue-800"
              disabled={busy}
              onClick={() =>
                onApplySuggestion(
                  suggestion.template,
                  (suggestion.palette ??
                    POSTER_TEMPLATES[suggestion.template].defaultPalette) as PosterPaletteKey
                )
              }
            >
              Use {POSTER_TEMPLATES[suggestion.template].label}
            </Button>
          </div>
        ) : null}

        <div className="mt-1 flex flex-row items-center justify-end gap-2">
          <Button
            ref={cancelRef}
            type="button"
            variant="outline"
            className="h-11 min-w-0 flex-1 rounded-xl sm:w-auto sm:flex-none"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            className="h-11 min-w-0 flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 font-semibold text-white shadow-md hover:from-blue-700 hover:to-indigo-800 sm:w-auto sm:flex-none"
            disabled={busy}
            onClick={() => onConfirm(presetId)}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : intent === 'share' ? (
              <Share2 className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="ms-1.5">{intent === 'share' ? 'Share' : 'Download'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
