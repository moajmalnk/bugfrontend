import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CreativeFolder } from '@/services/creativeService';
import { Folder, Pencil, Trash2 } from 'lucide-react';

type Props = {
  folder: CreativeFolder;
  onOpen: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  canManage: boolean;
};

export function CreativeFolderCard({
  folder,
  onOpen,
  onRename,
  onDelete,
  canManage,
}: Props) {
  const childCount = folder.child_count ?? 0;
  const assetCount = folder.asset_count ?? 0;

  return (
    <div className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:border-fuchsia-300/60 hover:shadow-md dark:hover:border-fuchsia-700/50">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/40"
      >
        <div className="relative flex h-40 w-full items-center justify-center bg-gradient-to-br from-fuchsia-500/10 via-violet-500/10 to-muted">
          <Folder
            className={cn(
              'h-16 w-16 text-fuchsia-600 transition-transform duration-300 group-hover:scale-105 dark:text-fuchsia-400'
            )}
            strokeWidth={1.25}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
          <p className="truncate text-base font-semibold text-foreground">
            {folder.name}
          </p>
          <p className="truncate text-xs font-medium text-muted-foreground">
            {assetCount} asset{assetCount === 1 ? '' : 's'}
            {childCount > 0
              ? ` · ${childCount} folder${childCount === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>
      </button>
      {canManage ? (
        <div className="flex items-center gap-2 border-t border-border/50 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 flex-1 rounded-xl"
            onClick={onOpen}
          >
            Open
          </Button>
          {onRename ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 rounded-xl px-3"
              onClick={onRename}
              aria-label={`Rename ${folder.name}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 rounded-xl px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onDelete}
              aria-label={`Delete ${folder.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="border-t border-border/50 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 w-full rounded-xl"
            onClick={onOpen}
          >
            Open
          </Button>
        </div>
      )}
    </div>
  );
}
