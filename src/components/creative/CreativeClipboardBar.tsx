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
    <div className="sticky bottom-4 z-20 w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-fuchsia-200/70 bg-background/95 px-4 py-3 shadow-lg backdrop-blur-md dark:border-fuchsia-800/50">
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
        <div className="flex flex-wrap items-center gap-2">
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
