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
import type {
  CursorTip,
  CursorTipPayload,
  CursorTipPhase,
} from '@/services/cursorTipsService';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const INITIAL = {
  phase: 'modes' as CursorTipPhase,
  tipKey: '',
  title: '',
  subtitle: '',
  description: '',
  analogyEn: '',
  analogyMl: '',
  whenToUse: '',
  whenNotToUse: '',
  exampleBad: '',
  exampleGood: '',
  exampleLanguage: 'Prompt',
  sortOrder: '',
  isActive: true,
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initial?: CursorTip | null;
  defaultPhase?: CursorTipPhase;
  onSubmit: (payload: CursorTipPayload) => Promise<void>;
};

export function CursorTipDialog({
  open,
  onOpenChange,
  mode,
  initial,
  defaultPhase = 'modes',
  onSubmit,
}: Props) {
  const [phase, setPhase] = useState<CursorTipPhase>(defaultPhase);
  const [tipKey, setTipKey] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [analogyEn, setAnalogyEn] = useState('');
  const [analogyMl, setAnalogyMl] = useState('');
  const [whenToUse, setWhenToUse] = useState('');
  const [whenNotToUse, setWhenNotToUse] = useState('');
  const [exampleBad, setExampleBad] = useState('');
  const [exampleGood, setExampleGood] = useState('');
  const [exampleLanguage, setExampleLanguage] = useState('Prompt');
  const [sortOrder, setSortOrder] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [baseline, setBaseline] = useState(INITIAL);

  const resetForm = (next = INITIAL) => {
    setPhase(next.phase);
    setTipKey(next.tipKey);
    setTitle(next.title);
    setSubtitle(next.subtitle);
    setDescription(next.description);
    setAnalogyEn(next.analogyEn);
    setAnalogyMl(next.analogyMl);
    setWhenToUse(next.whenToUse);
    setWhenNotToUse(next.whenNotToUse);
    setExampleBad(next.exampleBad);
    setExampleGood(next.exampleGood);
    setExampleLanguage(next.exampleLanguage);
    setSortOrder(next.sortOrder);
    setIsActive(next.isActive);
  };

  useEffect(() => {
    if (!open) {
      resetForm(INITIAL);
      setBaseline(INITIAL);
      setIsSubmitting(false);
      return;
    }
    if (mode === 'edit' && initial) {
      const next = {
        phase: initial.phase,
        tipKey: initial.tip_key || '',
        title: initial.title || '',
        subtitle: initial.subtitle || '',
        description: initial.description || '',
        analogyEn: initial.analogy_en || '',
        analogyMl: initial.analogy_ml || '',
        whenToUse: initial.when_to_use || '',
        whenNotToUse: initial.when_not_to_use || '',
        exampleBad: initial.example_bad || '',
        exampleGood: initial.example_good || '',
        exampleLanguage: initial.example_language || 'Prompt',
        sortOrder:
          initial.sort_order != null ? String(initial.sort_order) : '',
        isActive: initial.is_active !== false,
      };
      resetForm(next);
      setBaseline(next);
    } else {
      const next = { ...INITIAL, phase: defaultPhase };
      resetForm(next);
      setBaseline(next);
    }
  }, [open, mode, initial, defaultPhase]);

  useEffect(() => {
    return () => {
      resetForm(INITIAL);
      setIsSubmitting(false);
    };
  }, []);

  const isDirty = useMemo(() => {
    return (
      phase !== baseline.phase ||
      tipKey !== baseline.tipKey ||
      title !== baseline.title ||
      subtitle !== baseline.subtitle ||
      description !== baseline.description ||
      analogyEn !== baseline.analogyEn ||
      analogyMl !== baseline.analogyMl ||
      whenToUse !== baseline.whenToUse ||
      whenNotToUse !== baseline.whenNotToUse ||
      exampleBad !== baseline.exampleBad ||
      exampleGood !== baseline.exampleGood ||
      exampleLanguage !== baseline.exampleLanguage ||
      sortOrder !== baseline.sortOrder ||
      isActive !== baseline.isActive
    );
  }, [
    phase,
    tipKey,
    title,
    subtitle,
    description,
    analogyEn,
    analogyMl,
    whenToUse,
    whenNotToUse,
    exampleBad,
    exampleGood,
    exampleLanguage,
    sortOrder,
    isActive,
    baseline,
  ]);

  const canSubmit =
    title.trim().length >= 3 &&
    description.trim().length >= 10 &&
    !isSubmitting;

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && isDirty && !window.confirm('You have unsaved changes.')) {
      return;
    }
    if (!nextOpen) {
      resetForm(INITIAL);
      setBaseline(INITIAL);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const payload: CursorTipPayload = {
        phase,
        title: title.trim(),
        description: description.trim(),
        subtitle: subtitle.trim() || undefined,
        tip_key: tipKey.trim() || undefined,
        analogy_en: analogyEn.trim() || null,
        analogy_ml: analogyMl.trim() || null,
        when_to_use: whenToUse.trim() || null,
        when_not_to_use: whenNotToUse.trim() || null,
        example_bad: exampleBad.trim() || null,
        example_good: exampleGood.trim() || null,
        example_language: exampleLanguage.trim() || 'Prompt',
        is_active: isActive,
      };
      if (sortOrder.trim() !== '') {
        payload.sort_order = Number.parseInt(sortOrder, 10) || 0;
      }
      await onSubmit(payload);
      resetForm(INITIAL);
      setBaseline(INITIAL);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[min(96vw,840px)] max-w-none rounded-2xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
              {mode === 'edit' ? (
                <Pencil className="h-5 w-5" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-left text-lg">
                {mode === 'edit' ? 'Edit Cursor tip' : 'Add Cursor tip'}
              </DialogTitle>
              <DialogDescription className="text-left text-sm">
                Bilingual operating standard for the engineering team
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label>Category</Label>
              <Select
                value={phase}
                onValueChange={(v) => setPhase(v as CursorTipPhase)}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="modes">Modes</SelectItem>
                  <SelectItem value="commands">Commands</SelectItem>
                  <SelectItem value="skills">Skills</SelectItem>
                  <SelectItem value="workflow">Workflow</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="tip-key">Tip key</Label>
              <Input
                id="tip-key"
                value={tipKey}
                maxLength={64}
                onChange={(e) =>
                  setTipKey(e.target.value.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 64))
                }
                placeholder="cursor_mode_ask"
                className="h-11 rounded-xl font-mono text-sm"
                disabled={mode === 'edit'}
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="tip-title">Title</Label>
              <Input
                id="tip-title"
                value={title}
                maxLength={255}
                onChange={(e) => setTitle(e.target.value.slice(0, 255))}
                placeholder="Ask"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="tip-subtitle">Subtitle</Label>
              <Input
                id="tip-subtitle"
                value={subtitle}
                maxLength={255}
                onChange={(e) => setSubtitle(e.target.value.slice(0, 255))}
                placeholder="Mode 1"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="col-span-12 space-y-2">
              <Label htmlFor="tip-description">
                Description (Requirement + Malayalam:)
              </Label>
              <Textarea
                id="tip-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder={
                  'English requirement…\n\nMalayalam: മലയാളം വിശദീകരണം…'
                }
                className="rounded-xl min-h-[120px]"
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="analogy-en">Analogy (EN)</Label>
              <Textarea
                id="analogy-en"
                value={analogyEn}
                onChange={(e) => setAnalogyEn(e.target.value)}
                rows={2}
                className="rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="analogy-ml">Analogy (ML)</Label>
              <Textarea
                id="analogy-ml"
                value={analogyMl}
                onChange={(e) => setAnalogyMl(e.target.value)}
                rows={2}
                className="rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="when-to-use">Use when</Label>
              <Textarea
                id="when-to-use"
                value={whenToUse}
                onChange={(e) => setWhenToUse(e.target.value)}
                rows={2}
                className="rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="when-not">Avoid when</Label>
              <Textarea
                id="when-not"
                value={whenNotToUse}
                onChange={(e) => setWhenNotToUse(e.target.value)}
                rows={2}
                className="rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="example-bad">Weak example</Label>
              <Textarea
                id="example-bad"
                value={exampleBad}
                onChange={(e) => setExampleBad(e.target.value)}
                rows={3}
                className="rounded-xl font-mono text-sm"
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="example-good">Strong example</Label>
              <Textarea
                id="example-good"
                value={exampleGood}
                onChange={(e) => setExampleGood(e.target.value)}
                rows={3}
                className="rounded-xl font-mono text-sm"
              />
            </div>
            <div className="col-span-12 md:col-span-4 space-y-2">
              <Label htmlFor="example-lang">Example language</Label>
              <Input
                id="example-lang"
                value={exampleLanguage}
                maxLength={40}
                onChange={(e) => setExampleLanguage(e.target.value.slice(0, 40))}
                placeholder="Prompt"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-4 space-y-2">
              <Label htmlFor="sort-order">Sort order</Label>
              <Input
                id="sort-order"
                inputMode="numeric"
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="Auto"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-4 space-y-2">
              <Label>Active</Label>
              <Select
                value={isActive ? '1' : '0'}
                onValueChange={(v) => setIsActive(v === '1')}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="1">Active</SelectItem>
                  <SelectItem value="0">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-gray-200/50 dark:border-gray-700/50 px-6 py-4 shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : mode === 'edit' ? (
              'Save tip'
            ) : (
              'Add tip'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
