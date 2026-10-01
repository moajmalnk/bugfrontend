import { useState, type ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
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

type TaskFormDialogShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  icon: ReactNode;
  /** Gradient classes for the header icon tile. */
  headerClassName?: string;
  children: ReactNode;
  /** Pass a function to receive the guarded close handler (for Cancel buttons). */
  footer: ReactNode | ((requestClose: () => void) => ReactNode);
  maxWidthClassName?: string;
  /** When true, closing asks to discard unsaved changes. */
  isDirty?: boolean;
  /** Blocks closing while a save is in flight. */
  submitting?: boolean;
};

/**
 * Why: Shared shell for task create/edit dialogs — compact header that never covers
 * the form, scrollable body, sticky footer, and an unsaved-changes guard so a stray
 * backdrop click or Esc doesn't silently drop a half-written task.
 */
export function TaskFormDialogShell({
  open,
  onOpenChange,
  title,
  description,
  icon,
  headerClassName = 'bg-gradient-to-br from-blue-600 to-emerald-600',
  children,
  footer,
  maxWidthClassName = 'max-w-2xl',
  isDirty = false,
  submitting = false,
}: TaskFormDialogShellProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const requestClose = () => {
    if (submitting) return;
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    onOpenChange(false);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) onOpenChange(true);
          else requestClose();
        }}
      >
        <DialogContent
          className={cn(
            'flex max-h-[92vh] w-[95vw] flex-col gap-0 overflow-hidden rounded-2xl border-border/60 p-0 [&>button[data-radix-dialog-close]]:hidden',
            maxWidthClassName
          )}
        >
          <div className="flex items-start gap-3 border-b border-border/60 bg-background px-5 py-4 sm:px-6">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm [&_svg]:h-5 [&_svg]:w-5',
                headerClassName
              )}
            >
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-lg font-semibold leading-6 text-foreground">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={requestClose}
              disabled={submitting}
              className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto bg-muted/30 px-5 py-5 sm:px-6">{children}</div>

          <DialogFooter className="border-t border-border/60 bg-background px-5 py-4 sm:px-6">
            {typeof footer === 'function' ? footer(requestClose) : footer}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have edits in this form. Closing now will lose them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmDiscard(false);
                onOpenChange(false);
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function TaskFormSection({
  title,
  subtitle,
  icon,
  accent = 'blue',
  aside,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  accent?: 'blue' | 'emerald' | 'indigo' | 'amber' | 'purple';
  /** Optional right-aligned slot in the section header (e.g. a counter). */
  aside?: ReactNode;
  children: ReactNode;
}) {
  const accents = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', accents[accent])}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function TaskFormField({
  label,
  required,
  htmlFor,
  children,
  className,
  error,
  hint,
  counter,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  /** Inline validation message shown under the control. */
  error?: string | null;
  hint?: ReactNode;
  counter?: { value: number; max: number };
}) {
  const nearLimit = counter ? counter.value >= counter.max * 0.9 : false;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium leading-5 text-foreground">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </label>
        {counter ? (
          <span
            className={cn(
              'text-[11px] tabular-nums',
              nearLimit ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
            )}
          >
            {counter.value}/{counter.max}
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export const taskFieldControlClass =
  'h-11 rounded-xl border-input bg-background shadow-none focus-visible:ring-2 focus-visible:ring-primary/30';

export const taskTextareaClass =
  'min-h-[110px] resize-y rounded-xl border-input bg-background shadow-none focus-visible:ring-2 focus-visible:ring-primary/30';

export function TaskFormActions({
  onCancel,
  onSubmit,
  submitting,
  submitLabel,
  disabled,
  helper,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  submitLabel: string;
  disabled?: boolean;
  /** Left-aligned note, e.g. what is still missing before submit. */
  helper?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 text-xs text-muted-foreground sm:max-w-[55%]">{helper}</div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
          className="h-10 w-full rounded-xl sm:w-auto sm:min-w-[110px]"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={disabled || submitting}
          className="h-10 w-full rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 font-semibold text-white hover:from-blue-700 hover:to-emerald-700 sm:w-auto sm:min-w-[150px]"
        >
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </div>
  );
}
