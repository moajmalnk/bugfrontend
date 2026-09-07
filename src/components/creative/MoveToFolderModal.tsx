import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { CreativeFolder } from '@/services/creativeService';
import { Folder, Home, Loader2 } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

type Props = {
  open: boolean;
  folders: CreativeFolder[];
  busy?: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: (folderId: string | null) => void | Promise<void>;
};

function buildChildrenMap(folders: CreativeFolder[]) {
  const map = new Map<string | null, CreativeFolder[]>();
  for (const f of folders) {
    const key = f.parent_id ?? null;
    const list = map.get(key) ?? [];
    list.push(f);
    map.set(key, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  return map;
}

export function MoveToFolderModal({
  open,
  folders,
  busy = false,
  selectedCount,
  onClose,
  onConfirm,
}: Props) {
  const [q, setQ] = useState('');
  const [target, setTarget] = useState<string | null>(null);
  const childrenMap = useMemo(() => buildChildrenMap(folders), [folders]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return folders;
    return folders.filter((f) => f.name.toLowerCase().includes(term));
  }, [folders, q]);

  const renderTree = (parentId: string | null, depth: number): ReactNode => {
    const kids = childrenMap.get(parentId) ?? [];
    return kids.map((folder) => {
      if (q.trim() && !filtered.some((f) => f.id === folder.id)) {
        // Still show ancestors of matches via flat filtered list below when searching
      }
      const visible =
        !q.trim() ||
        filtered.some((f) => f.id === folder.id) ||
        (childrenMap.get(folder.id) ?? []).some((c) =>
          filtered.some((f) => f.id === c.id)
        );
      if (!visible && q.trim()) return null;
      return (
        <div key={folder.id} className="flex flex-col gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => setTarget(folder.id)}
            className={cn(
              'flex min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors',
              target === folder.id
                ? 'bg-fuchsia-600 text-white'
                : 'hover:bg-muted'
            )}
            style={{ paddingInlineStart: `${12 + depth * 16}px` }}
          >
            <Folder className="h-4 w-4 shrink-0" />
            <span className="truncate font-medium">{folder.name}</span>
          </button>
          {renderTree(folder.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !busy) onClose();
      }}
    >
      <DialogContent className="max-w-[600px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Move to folder</DialogTitle>
          <DialogDescription>
            Move {selectedCount} asset{selectedCount === 1 ? '' : 's'} to a
            destination folder.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            value={q}
            maxLength={100}
            onChange={(e) => setQ(e.target.value.slice(0, 100))}
            placeholder="Search folders…"
            className="h-11 rounded-xl"
            disabled={busy}
          />
          <div className="max-h-72 overflow-y-auto rounded-xl border border-border/60 p-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setTarget(null)}
              className={cn(
                'mb-1 flex w-full min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm',
                target === null
                  ? 'bg-fuchsia-600 text-white'
                  : 'hover:bg-muted'
              )}
            >
              <Home className="h-4 w-4 shrink-0" />
              <span className="font-medium">All files (root)</span>
            </button>
            <div className="flex flex-col gap-1">{renderTree(null, 0)}</div>
            {folders.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No folders yet. Create one first.
              </p>
            ) : null}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 text-white hover:from-fuchsia-700 hover:to-violet-800"
            disabled={busy}
            onClick={() => void onConfirm(target)}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Move here'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
