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
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EmergencyBypassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
}

const CONFIRM_PHRASE = 'AUTHORIZE BYPASS';

export function EmergencyBypassDialog({
  open,
  onOpenChange,
  onConfirm,
}: EmergencyBypassDialogProps) {
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setConfirmText('');
      setIsSubmitting(false);
    }
  }, [open]);

  const reasonValid = reason.trim().length >= 3;
  const confirmValid = confirmText.trim().toUpperCase() === CONFIRM_PHRASE;
  const canSubmit = reasonValid && confirmValid && !isSubmitting;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      setConfirmText('');
      onOpenChange(false);
    } catch {
      // Parent shows toast; keep dialog open so the user can retry.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,400px)] max-w-none rounded-2xl border border-amber-800/50 bg-slate-900/95 p-0 shadow-2xl backdrop-blur-md">
        <DialogHeader className="space-y-3 border-b border-slate-800 px-6 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-950/50 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-left text-base text-slate-100">
                Emergency Hotfix Bypass
              </DialogTitle>
              <DialogDescription className="text-left text-xs text-slate-400">
                Master Admin authorization required
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 px-6 py-4">
          <p className="text-sm leading-relaxed text-slate-300">
            This action bypasses all Developer and QA compliance checks. Document the critical
            reason below and type the confirmation phrase to proceed.
          </p>
          <div className="space-y-2">
            <Label htmlFor="bypass-reason" className="text-slate-300">
              Bypass reason
            </Label>
            <Input
              id="bypass-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the critical hotfix scenario..."
              className="rounded-xl border-slate-700 bg-slate-800/50 text-slate-200"
              disabled={isSubmitting}
            />
            {reason.trim().length > 0 && !reasonValid && (
              <p className="text-xs text-amber-400">
                Reason must be at least 3 characters ({reason.trim().length}/3).
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bypass-confirm" className="text-slate-300">
              Type {CONFIRM_PHRASE} to confirm
            </Label>
            <Input
              id="bypass-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              className="rounded-xl border-slate-700 bg-slate-800/50 text-slate-200"
              disabled={isSubmitting}
            />
            {confirmText.trim().length > 0 && !confirmValid && (
              <p className="text-xs text-amber-400">Type exactly: {CONFIRM_PHRASE}</p>
            )}
          </div>
        </div>
        <DialogFooter className="border-t border-slate-800 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="rounded-xl border-slate-700"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="rounded-xl disabled:opacity-40"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authorizing...
              </>
            ) : (
              'Authorize Bypass'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
