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
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AddComplianceRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: 'developer' | 'tester' | 'project';
  onSubmit: (payload: {
    title: string;
    description: string;
    subtitle?: string;
  }) => Promise<void>;
}

export function AddComplianceRuleDialog({
  open,
  onOpenChange,
  phase,
  onSubmit,
}: AddComplianceRuleDialogProps) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setSubtitle('');
      setDescription('');
    }
  }, [open]);

  const canSubmit =
    title.trim().length >= 3 &&
    description.trim().length >= 10 &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        subtitle: subtitle.trim() || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const phaseLabel =
    phase === 'developer' ? 'Developer' : phase === 'tester' ? 'Tester / QA' : 'Project';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,480px)] max-w-none rounded-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-left text-lg">Add {phaseLabel} Rule</DialogTitle>
              <DialogDescription className="text-left text-sm">
                Create a project-specific compliance rule for your team
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="rule-title" className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Rule title
            </Label>
            <Input
              id="rule-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. API rate limiting on login"
              className="h-11"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rule-subtitle">Subtitle (optional)</Label>
            <Input
              id="rule-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Short label or localized title"
              className="h-11"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rule-description" className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Description
            </Label>
            <Textarea
              id="rule-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what must be verified for this rule..."
              rows={4}
              className="resize-none"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter className="border-t border-gray-200/50 dark:border-gray-700/50 px-6 py-4 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-11"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-11 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Rule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
