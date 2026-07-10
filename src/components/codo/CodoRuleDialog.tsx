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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CodoCommonRule, CodoRulePhase } from '@/services/codoRulesService';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initial?: CodoCommonRule | null;
  defaultPhase?: CodoRulePhase;
  onSubmit: (payload: {
    phase: CodoRulePhase;
    title: string;
    subtitle?: string;
    description: string;
  }) => Promise<void>;
};

export function CodoRuleDialog({
  open,
  onOpenChange,
  mode,
  initial,
  defaultPhase = 'developer',
  onSubmit,
}: Props) {
  const [phase, setPhase] = useState<CodoRulePhase>(defaultPhase);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setPhase(initial.phase);
      setTitle(initial.title || '');
      setSubtitle(initial.subtitle || '');
      setDescription(initial.description || '');
    } else {
      setPhase(defaultPhase);
      setTitle('');
      setSubtitle('');
      setDescription('');
    }
  }, [open, mode, initial, defaultPhase]);

  const canSubmit =
    title.trim().length >= 3 &&
    description.trim().length >= 10 &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        phase,
        title: title.trim(),
        description: description.trim(),
        subtitle: subtitle.trim() || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,520px)] max-w-none rounded-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
              {mode === 'edit' ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-left text-lg">
                {mode === 'edit' ? 'Edit CODO rule' : 'Add CODO rule'}
              </DialogTitle>
              <DialogDescription className="text-left text-sm">
                Shared catalog rule visible to the whole team
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            <Label>Phase</Label>
            <Select value={phase} onValueChange={(v) => setPhase(v as CodoRulePhase)}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Select phase" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                <SelectItem value="developer">Developer</SelectItem>
                <SelectItem value="tester">Tester / QA</SelectItem>
                <SelectItem value="project">Project</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="codo-rule-title">Title</Label>
            <Input
              id="codo-rule-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hard State Reset"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="codo-rule-subtitle">Subtitle (optional)</Label>
            <Input
              id="codo-rule-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. Rule 1"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="codo-rule-desc">Description</Label>
            <Textarea
              id="codo-rule-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what must be verified…"
              className="min-h-[110px] rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-gray-200/50 dark:border-gray-700/50 px-6 py-4 gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : mode === 'edit' ? (
              'Save changes'
            ) : (
              'Create rule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
