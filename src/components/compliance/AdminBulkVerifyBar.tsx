import { useState } from 'react';
import { CheckCheck, ListChecks, Loader2, ShieldCheck, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export type AdminBulkAction = { scope: 'selected' | 'all'; verified: boolean };

type Props = {
  matrixLabel: string;
  totalCount: number;
  pendingCount: number;
  selectMode: boolean;
  selectedCount: number;
  selectedPendingCount: number;
  selectedVerifiedCount: number;
  busy: boolean;
  onToggleSelectMode: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onRun: (action: AdminBulkAction) => Promise<void>;
};

function describe(action: AdminBulkAction, matrixLabel: string, count: number): string {
  const rules = `${count} ${matrixLabel} rule${count === 1 ? '' : 's'}`;
  return action.verified
    ? `Mark ${rules} as verified by you. Developers and testers keep their own verify controls.`
    : `Clear verification on ${rules}. The compliance pipeline stage is recalculated.`;
}

/** Admin-only bulk verify toolbar for one compliance matrix. */
export function AdminBulkVerifyBar({
  matrixLabel,
  totalCount,
  pendingCount,
  selectMode,
  selectedCount,
  selectedPendingCount,
  selectedVerifiedCount,
  busy,
  onToggleSelectMode,
  onSelectAll,
  onClearSelection,
  onRun,
}: Props) {
  const [confirm, setConfirm] = useState<{ action: AdminBulkAction; count: number } | null>(null);
  const verifiedCount = totalCount - pendingCount;

  const run = async () => {
    if (!confirm || busy) return;
    const { action } = confirm;
    setConfirm(null);
    await onRun(action);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-indigo-200/70 bg-indigo-50/60 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/20 sm:p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="shrink-0 rounded-lg bg-indigo-600 p-1.5 text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">Admin verification</p>
            <p className="truncate text-xs text-gray-600 dark:text-gray-400">
              {selectMode
                ? `${selectedCount} selected · click rules to select`
                : 'Click any rule to verify it, or verify in bulk'}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant={selectMode ? 'secondary' : 'outline'}
          size="sm"
          className="h-9 rounded-xl"
          disabled={busy}
          onClick={onToggleSelectMode}
        >
          {selectMode ? <X className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
          <span className="ms-1.5">{selectMode ? 'Done selecting' : 'Select rules'}</span>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {selectMode ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-9 rounded-xl"
              disabled={busy}
              onClick={selectedCount === totalCount ? onClearSelection : onSelectAll}
            >
              {selectedCount === totalCount ? 'Clear selection' : `Select all (${totalCount})`}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={busy || selectedPendingCount === 0}
              onClick={() =>
                setConfirm({ action: { scope: 'selected', verified: true }, count: selectedPendingCount })
              }
            >
              <CheckCheck className="h-4 w-4" />
              <span className="ms-1.5">Verify selected ({selectedPendingCount})</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 rounded-xl"
              disabled={busy || selectedVerifiedCount === 0}
              onClick={() =>
                setConfirm({ action: { scope: 'selected', verified: false }, count: selectedVerifiedCount })
              }
            >
              <Undo2 className="h-4 w-4" />
              <span className="ms-1.5">Unverify selected ({selectedVerifiedCount})</span>
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={busy || pendingCount === 0}
              onClick={() => setConfirm({ action: { scope: 'all', verified: true }, count: pendingCount })}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              <span className="ms-1.5">
                {pendingCount === 0 ? 'All verified' : `Verify all pending (${pendingCount})`}
              </span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn('h-9 rounded-xl', verifiedCount === 0 && 'hidden')}
              disabled={busy}
              onClick={() => setConfirm({ action: { scope: 'all', verified: false }, count: verifiedCount })}
            >
              <Undo2 className="h-4 w-4" />
              <span className="ms-1.5">Unverify all ({verifiedCount})</span>
            </Button>
          </>
        )}
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent className="rounded-2xl sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action.verified ? 'Verify rules?' : 'Unverify rules?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm ? describe(confirm.action, matrixLabel, confirm.count) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                'rounded-xl',
                confirm?.action.verified
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-rose-600 text-white hover:bg-rose-700'
              )}
              onClick={run}
            >
              {confirm?.action.verified ? 'Verify' : 'Unverify'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
