import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

type TaskFormDialogShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  icon: ReactNode;
  headerClassName?: string;
  children: ReactNode;
  footer: ReactNode;
  maxWidthClassName?: string;
};

export function TaskFormDialogShell({
  open,
  onOpenChange,
  title,
  description,
  icon,
  headerClassName = 'bg-gradient-to-br from-blue-600 via-emerald-600 to-teal-600',
  children,
  footer,
  maxWidthClassName = 'max-w-2xl',
}: TaskFormDialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`flex max-h-[92vh] w-[95vw] ${maxWidthClassName} flex-col gap-0 overflow-hidden p-0 [&>button[data-radix-dialog-close]]:hidden`}
      >
        <div className={`relative overflow-visible p-6 text-white ${headerClassName}`}>
          <div className="absolute inset-0 bg-black/10" />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 z-[100] rounded-lg border-2 border-white/40 bg-white/25 p-2.5 shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-110 hover:border-white/60 hover:bg-white/40 active:scale-95"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5 text-white" strokeWidth={3} />
          </button>
          <div className="relative z-10">
            <DialogHeader className="space-y-2 pr-14 text-left">
              <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
                <div className="rounded-xl bg-white/20 p-2 backdrop-blur-sm">{icon}</div>
                {title}
              </DialogTitle>
              <DialogDescription className="text-base text-white/90">{description}</DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-5 dark:bg-gray-900/50 sm:p-6">{children}</div>

        <DialogFooter className="border-t border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:px-6">
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TaskFormSection({
  title,
  subtitle,
  icon,
  accent = 'blue',
  children,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  accent?: 'blue' | 'emerald' | 'indigo' | 'amber' | 'purple';
  children: ReactNode;
}) {
  const accents = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-5 flex items-center gap-3">
        <div className={`rounded-lg p-1.5 ${accents[accent]}`}>{icon}</div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
          {subtitle ? <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

export function TaskFormField({
  label,
  required,
  htmlFor,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className || ''}`}>
      <LabelLike htmlFor={htmlFor} required={required}>
        {label}
      </LabelLike>
      {children}
    </div>
  );
}

function LabelLike({
  children,
  required,
  htmlFor,
}: {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-medium leading-5 text-gray-700 dark:text-gray-300"
    >
      {children}
      {required ? <span className="text-red-500"> *</span> : null}
    </label>
  );
}

export const taskFieldControlClass =
  'h-11 border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900';

export const taskTextareaClass =
  'min-h-[100px] resize-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900';

export function TaskFormActions({
  onCancel,
  onSubmit,
  submitting,
  submitLabel,
  disabled,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className="h-11 w-full border-2 sm:w-auto sm:min-w-[120px]"
      >
        Cancel
      </Button>
      <Button
        type="button"
        onClick={onSubmit}
        disabled={disabled || submitting}
        className="h-11 w-full bg-gradient-to-r from-blue-600 to-emerald-600 font-semibold text-white hover:from-blue-700 hover:to-emerald-700 sm:w-auto sm:min-w-[180px]"
      >
        {submitting ? 'Saving…' : submitLabel}
      </Button>
    </div>
  );
}
