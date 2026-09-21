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
import { Folder, FolderPlus, Home, Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

const NAME_MAX = 100;
const MAX_FOLDER_DEPTH = 6;

type Props = {
  open: boolean;
  folders: CreativeFolder[];
  busy?: boolean;
  creating?: boolean;
  canCreate?: boolean;
  selectedCount: number;
  /** Optional title when moving a single asset (cleaner modal copy). */
  itemLabel?: string | null;
  /**
   * Current folder of the asset(s) when they share one location.
   * Used to mark “Current” and block a no-op move.
   */
  currentFolderId?: string | null;
  onClose: () => void;
  onConfirm: (folderId: string | null) => void | Promise<void>;
  /**
   * Why: Create under the selected destination (root or folder) without leaving Move.
   * Return the created folder so the picker can select it immediately.
   */
  onCreateFolder?: (
    name: string,
    parentId: string | null
  ) => Promise<CreativeFolder | void>;
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

function depthOf(
  folderId: string | null,
  byId: Map<string, CreativeFolder>
): number {
  if (!folderId) return 0;
  let depth = 0;
  let cursor: string | null = folderId;
  const guard = new Set<string>();
  while (cursor && byId.has(cursor) && !guard.has(cursor)) {
    guard.add(cursor);
    depth += 1;
    cursor = byId.get(cursor)?.parent_id ?? null;
  }
  return depth;
}

export function MoveToFolderModal({
  open,
  folders,
  busy = false,
  creating = false,
  canCreate = false,
  selectedCount,
  itemLabel = null,
  currentFolderId,
  onClose,
  onConfirm,
  onCreateFolder,
}: Props) {
  const [q, setQ] = useState('');
  const [target, setTarget] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState('');

  const childrenMap = useMemo(() => buildChildrenMap(folders), [folders]);
  const folderById = useMemo(() => {
    const map = new Map<string, CreativeFolder>();
    for (const f of folders) map.set(f.id, f);
    return map;
  }, [folders]);

  const locked = busy || creating;

  // Why: reset only when the dialog opens — not when currentFolderId
  // recalculates — so typing in search is never wiped mid-keystroke.
  useEffect(() => {
    if (!open) return;
    setQ('');
    setTarget(currentFolderId !== undefined ? currentFolderId : null);
    setCreateOpen(false);
    setNewName('');
    setCreateError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-only reset
  }, [open]);

  /**
   * Why: include every ancestor of a name match so nested hits (e.g. under
   * Mockup → Zeeque…) stay reachable in the tree while searching.
   */
  const visibleIds = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return null;
    const matched = new Set<string>();
    for (const f of folders) {
      if ((f.name || '').toLowerCase().includes(term)) matched.add(f.id);
    }
    const visible = new Set<string>(matched);
    for (const id of matched) {
      let cursor = folderById.get(id)?.parent_id ?? null;
      const guard = new Set<string>();
      while (cursor && folderById.has(cursor) && !guard.has(cursor)) {
        guard.add(cursor);
        visible.add(cursor);
        cursor = folderById.get(cursor)?.parent_id ?? null;
      }
    }
    return visible;
  }, [folders, folderById, q]);

  const matchedFolders = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [] as CreativeFolder[];
    return [...folders]
      .filter((f) => (f.name || '').toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [folders, q]);

  const folderPathLabel = (folderId: string) => {
    const parts: string[] = [];
    let cursor: string | null = folderId;
    const guard = new Set<string>();
    while (cursor && folderById.has(cursor) && !guard.has(cursor)) {
      guard.add(cursor);
      const folder = folderById.get(cursor)!;
      parts.unshift(folder.name);
      cursor = folder.parent_id ?? null;
    }
    return parts.join(' / ');
  };

  const isSameLocation =
    currentFolderId !== undefined && target === (currentFolderId ?? null);

  const parentDepth = depthOf(target, folderById);
  const canCreateHere = canCreate && !!onCreateFolder && parentDepth < MAX_FOLDER_DEPTH;
  const searching = Boolean(q.trim());

  const parentLabel =
    target === null
      ? 'All files (root)'
      : folderById.get(target)?.name ?? 'Selected folder';

  const description =
    selectedCount === 1 && itemLabel
      ? `Choose a folder for “${itemLabel}”.`
      : selectedCount > 0
        ? `Move ${selectedCount} asset${selectedCount === 1 ? '' : 's'} to a destination folder.`
        : 'Choose a destination folder.';

  const resetCreateForm = () => {
    setCreateOpen(false);
    setNewName('');
    setCreateError('');
  };

  const handleClose = () => {
    if (locked) return;
    if (
      createOpen &&
      newName.trim() &&
      !window.confirm('Discard the new folder name?')
    ) {
      return;
    }
    onClose();
  };

  const handleCreate = async () => {
    if (!canCreateHere || locked) return;
    const trimmed = newName.trim().slice(0, NAME_MAX);
    if (!trimmed) {
      setCreateError('Folder name is required');
      return;
    }
    try {
      const created = await onCreateFolder?.(trimmed, target);
      resetCreateForm();
      if (created && 'id' in created) {
        setTarget(created.id);
        setQ('');
      }
    } catch {
      // Parent surfaces toast; keep form open for retry.
    }
  };

  const renderTree = (parentId: string | null, depth: number): ReactNode => {
    const kids = childrenMap.get(parentId) ?? [];
    return kids.map((folder) => {
      if (visibleIds && !visibleIds.has(folder.id)) return null;
      const isCurrent = currentFolderId === folder.id;
      return (
        <div key={folder.id} className="flex flex-col gap-1">
          <button
            type="button"
            disabled={locked}
            onClick={() => setTarget(folder.id)}
            className={cn(
              'flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors sm:py-2',
              target === folder.id
                ? 'bg-fuchsia-600 text-white'
                : 'hover:bg-muted'
            )}
            style={{ paddingInlineStart: `${12 + depth * 16}px` }}
          >
            <Folder className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-medium">
              {folder.name}
            </span>
            {isCurrent ? (
              <span
                className={cn(
                  'shrink-0 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  target === folder.id
                    ? 'bg-white/20 text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                Current
              </span>
            ) : null}
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
        if (!o) handleClose();
      }}
    >
      <DialogContent className="flex max-h-[min(92vh,720px)] w-[calc(100vw-1.5rem)] max-w-[600px] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:w-full">
        <DialogHeader className="shrink-0 gap-1 border-b border-border/50 px-4 py-4 sm:px-6">
          <DialogTitle>Move to folder</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-12 gap-3 overflow-y-auto px-4 py-4 sm:gap-4 sm:px-6">
          <div className="col-span-12 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={q}
              maxLength={100}
              onChange={(e) => setQ(e.target.value.slice(0, 100))}
              placeholder="Search folders…"
              className="h-11 min-w-0 flex-1 rounded-xl"
              disabled={locked}
              aria-label="Search folders"
            />
            {canCreate && onCreateFolder ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full shrink-0 rounded-xl sm:w-auto"
                disabled={locked || !canCreateHere}
                onClick={() => {
                  setCreateOpen((v) => !v);
                  setCreateError('');
                }}
                title={
                  canCreateHere
                    ? target
                      ? `New subfolder in ${parentLabel}`
                      : 'New folder in All files'
                    : `Maximum folder depth (${MAX_FOLDER_DEPTH}) reached`
                }
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                {createOpen ? 'Close' : 'New folder'}
              </Button>
            ) : null}
          </div>

          {createOpen && canCreateHere ? (
            <div className="col-span-12 flex flex-col gap-3 rounded-2xl border border-fuchsia-200/60 bg-fuchsia-500/5 p-3 dark:border-fuchsia-800/50 sm:p-4">
              <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                {target
                  ? `New subfolder inside “${parentLabel}”`
                  : 'New folder in All files (root)'}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1 flex flex-col gap-1">
                  <Input
                    value={newName}
                    maxLength={NAME_MAX}
                    onChange={(e) => {
                      const next = e.target.value.slice(0, NAME_MAX);
                      setNewName(next);
                      setCreateError(next.trim() ? '' : 'Folder name is required');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleCreate();
                      }
                    }}
                    placeholder="Folder name"
                    className="h-11 rounded-xl"
                    disabled={locked}
                    autoFocus
                    aria-label="New folder name"
                  />
                  {createError ? (
                    <span className="text-xs text-red-500">{createError}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {newName.length}/{NAME_MAX}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 flex-1 rounded-xl sm:flex-none sm:px-3"
                    disabled={locked}
                    onClick={resetCreateForm}
                    aria-label="Cancel new folder"
                  >
                    <X className="h-4 w-4 sm:mr-0" />
                    <span className="sm:hidden">Cancel</span>
                  </Button>
                  <Button
                    type="button"
                    className="h-11 flex-1 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 text-white hover:from-fuchsia-700 hover:to-violet-800 sm:min-w-[7.5rem] sm:flex-none"
                    disabled={locked || !newName.trim()}
                    onClick={() => void handleCreate()}
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Create'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="col-span-12 max-h-[min(40vh,320px)] overflow-y-auto rounded-xl border border-border/60 p-2 sm:max-h-72">
            <button
              type="button"
              disabled={locked}
              onClick={() => setTarget(null)}
              className={cn(
                'mb-1 flex w-full min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm sm:py-2',
                target === null
                  ? 'bg-fuchsia-600 text-white'
                  : 'hover:bg-muted'
              )}
            >
              <Home className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 font-medium">All files (root)</span>
              {currentFolderId === null ? (
                <span
                  className={cn(
                    'shrink-0 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    target === null
                      ? 'bg-white/20 text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  Current
                </span>
              ) : null}
            </button>
            {searching ? (
              <div className="flex flex-col gap-1">
                {matchedFolders.map((folder) => {
                  const isCurrent = currentFolderId === folder.id;
                  const path = folderPathLabel(folder.id);
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      disabled={locked}
                      onClick={() => setTarget(folder.id)}
                      className={cn(
                        'flex min-w-0 flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors sm:py-2',
                        target === folder.id
                          ? 'bg-fuchsia-600 text-white'
                          : 'hover:bg-muted'
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2 text-sm">
                        <Folder className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {folder.name}
                        </span>
                        {isCurrent ? (
                          <span
                            className={cn(
                              'shrink-0 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                              target === folder.id
                                ? 'bg-white/20 text-white'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            Current
                          </span>
                        ) : null}
                      </span>
                      {path.includes(' / ') ? (
                        <span
                          className={cn(
                            'truncate pl-6 text-[11px]',
                            target === folder.id
                              ? 'text-white/80'
                              : 'text-muted-foreground'
                          )}
                        >
                          {path}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {matchedFolders.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No folders match “{q.trim()}”.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-1">{renderTree(null, 0)}</div>
            )}
            {!searching && folders.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No folders yet
                {canCreate ? ' — use New folder above.' : '.'}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-border/50 px-4 py-4 sm:flex-row sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl sm:h-10 sm:w-auto"
            disabled={locked}
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11 w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 text-white hover:from-fuchsia-700 hover:to-violet-800 sm:h-10 sm:w-auto"
            disabled={locked || isSameLocation || selectedCount < 1}
            onClick={() => void onConfirm(target)}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Move here'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
