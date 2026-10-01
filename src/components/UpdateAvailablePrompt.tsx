import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  show: boolean;
  /** Activates the waiting service worker; the page reloads once it takes control. */
  onAccept: () => Promise<void> | void;
  onDismiss: () => void;
};

/**
 * Why: A blocking modal interrupts people mid-form. This is a non-blocking card so
 * users can finish (and save) what they are doing, then update. It warns that the
 * page reloads so unsaved input is not silently lost.
 */
export function UpdateAvailablePrompt({ show, onAccept, onDismiss }: Props) {
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!show) {
      setUpdating(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !updating) onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, updating, onDismiss]);

  if (!show) return null;

  const handleUpdate = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      await onAccept();
    } catch {
      setUpdating(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="update-prompt-title"
      aria-describedby="update-prompt-desc"
      className="fixed inset-x-3 bottom-3 z-[9999] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[380px]"
    >
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card text-card-foreground shadow-2xl shadow-black/20">
        <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500" aria-hidden />
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 id="update-prompt-title" className="text-sm font-semibold leading-5 text-foreground">
                Update available
              </h2>
              <span className="rounded-lg bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                New
              </span>
            </div>
            <p id="update-prompt-desc" className="mt-1 text-xs leading-relaxed text-muted-foreground">
              A newer version of BugRicer is ready with improvements and fixes. Save any open
              forms first — the page will reload.
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            disabled={updating}
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Dismiss update notice"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            disabled={updating}
            className="h-9 rounded-xl px-3"
          >
            Later
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleUpdate()}
            disabled={updating}
            className="h-9 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 font-semibold text-white hover:from-blue-700 hover:to-indigo-700"
          >
            {updating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating…
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Update now
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
