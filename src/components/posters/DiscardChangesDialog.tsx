import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  onKeepEditing: () => void;
  onDiscard: () => void;
};

/**
 * Small (400px) in-studio confirm for discarding unsaved poster edits.
 * Rendered inside the studio's portal so it stacks above it (Radix dialogs sit at z-50,
 * below the studio's z-[110]). Escape is handled by the studio's key listener, which
 * maps it to "Keep editing". Focus starts on the safe action and is trapped between
 * the two buttons, then returned to whatever had it before.
 */
export function DiscardChangesDialog({ onKeepEditing, onDiscard }: Props) {
  const keepRef = useRef<HTMLButtonElement>(null);
  const discardRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    keepRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const first = keepRef.current;
    const last = discardRef.current;
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
        onKeepEditing();
      }}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="discard-poster-title"
        aria-describedby="discard-poster-desc"
        className="w-full max-w-[400px] rounded-2xl border border-gray-200/60 bg-white p-5 shadow-2xl dark:border-gray-700/60 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={trapTab}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-xl bg-amber-100 p-2 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 id="discard-poster-title" className="text-base font-bold text-gray-900 dark:text-white">
              Discard poster changes?
            </h3>
            <p id="discard-poster-desc" className="mt-1 text-sm text-muted-foreground">
              Your edits to this poster haven&apos;t been saved. If you leave now, they&apos;ll be lost.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            ref={keepRef}
            type="button"
            variant="outline"
            className="h-10 w-full rounded-xl sm:w-auto"
            onClick={onKeepEditing}
          >
            Keep editing
          </Button>
          <Button
            ref={discardRef}
            type="button"
            variant="destructive"
            className="h-10 w-full rounded-xl sm:w-auto"
            onClick={onDiscard}
          >
            Discard changes
          </Button>
        </div>
      </div>
    </div>
  );
}
