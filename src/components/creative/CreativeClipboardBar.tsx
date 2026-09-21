import { Button } from '@/components/ui/button';
import { Loader2, ClipboardPaste, Copy, FolderInput, Scissors, X } from 'lucide-react';

export type CreativeClipboard = {
  mode: 'copy' | 'cut';
  assetIds: string[];
} | null;

type Props = {
  selectedCount: number;
  clipboard: CreativeClipboard;
  busy: boolean;
  canOrganize: boolean;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onMoveTo: () => void;
  onClearSelection: () => void;
  onClearClipboard: () => void;
};

export function CreativeClipboardBar({
  selectedCount,
  clipboard,
  busy,
  canOrganize,
  onCopy,
  onCut,
  onPaste,
  onMoveTo,
  onClearSelection,
  onClearClipboard,
}: Props) {
  if (!canOrganize) return null;
  if (selectedCount === 0 && !clipboard) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 sm:p-4">
      <div className="pointer-events-auto flex w-full max-w-3xl min-w-0 flex-col gap-3 rounded-2xl border border-fuchsia-200/70 bg-background/95 px-3 py-3 shadow-lg backdrop-blur-md dark:border-fuchsia-800/50 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4">
        <div className="min-w-0 text-sm font-medium text-foreground">
          {selectedCount > 0 ? (
            <span>
              {selectedCount} selected
              {clipboard
                ? ` · clipboard: ${clipboard.mode} (${clipboard.assetIds.length})`
                : ''}
            </span>
          ) : clipboard ? (
            <span>
              Clipboard: {clipboard.mode} ({clipboard.assetIds.length})
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          {selectedCount > 0 ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-xl"
                disabled={busy}
                onClick={onCopy}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-xl"
                disabled={busy}
                onClick={onCut}
              >
                <Scissors className="mr-2 h-4 w-4" />
                Cut
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-xl"
                disabled={busy}
                onClick={onMoveTo}
              >
                <FolderInput className="mr-2 h-4 w-4" />
                Move to…
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 rounded-xl"
                disabled={busy}
                onClick={onClearSelection}
              >
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </>
          ) : null}
          {clipboard ? (
            <>
              <Button
                type="button"
                size="sm"
                className="h-10 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 text-white hover:from-fuchsia-700 hover:to-violet-800"
                disabled={busy}
                onClick={onPaste}
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardPaste className="mr-2 h-4 w-4" />
                )}
                Paste here
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 rounded-xl"
                disabled={busy}
                onClick={onClearClipboard}
              >
                Clear clipboard
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
