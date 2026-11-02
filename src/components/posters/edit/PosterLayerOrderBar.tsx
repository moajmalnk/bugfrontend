import { ArrowDown, ArrowUp, BringToFront, SendToBack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePosterEdit, Z_MAX, Z_MIN } from './PosterEditContext';

/**
 * Why: Selected layers need explicit stack controls (front / back / custom z)
 * so photo vs title vs logo can be reordered without editing template code.
 */
export function PosterLayerOrderBar() {
  const {
    enabled,
    suppressChrome,
    selectedId,
    layerZIndex,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    setLayerZ,
  } = usePosterEdit();

  if (!enabled || suppressChrome || !selectedId) return null;

  const z = layerZIndex[selectedId] ?? 0;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/70 bg-background/95 p-1.5 shadow-md backdrop-blur-sm"
      role="toolbar"
      aria-label="Layer order"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="hidden px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline">
        Layer
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-xl"
        title="Bring to front"
        aria-label="Bring to front"
        onClick={() => bringToFront(selectedId)}
      >
        <BringToFront className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-xl"
        title="Bring forward"
        aria-label="Bring forward"
        onClick={() => bringForward(selectedId)}
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-xl"
        title="Send backward"
        aria-label="Send backward"
        onClick={() => sendBackward(selectedId)}
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-xl"
        title="Send to back"
        aria-label="Send to back"
        onClick={() => sendToBack(selectedId)}
      >
        <SendToBack className="h-4 w-4" />
      </Button>
      <label className="flex items-center gap-1 ps-1">
        <span className="text-[10px] font-semibold text-muted-foreground">Z</span>
        <Input
          type="number"
          inputMode="numeric"
          min={Z_MIN}
          max={Z_MAX}
          value={z}
          aria-label="Layer z-index"
          className="h-9 w-14 rounded-xl px-2 text-center text-sm tabular-nums"
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '' || raw === '-') return;
            const n = Number(raw);
            if (!Number.isFinite(n)) return;
            setLayerZ(selectedId, n);
          }}
        />
      </label>
    </div>
  );
}
