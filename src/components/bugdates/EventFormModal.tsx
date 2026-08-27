import { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/DatePicker';
import { TimePicker } from '@/components/ui/TimePicker';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import {
  createBugDatesEvent,
  updateBugDatesEvent,
  type BugDatesEvent,
  type BugDatesEventInput,
} from '@/services/bugDatesService';

const pickerClass =
  'h-11 w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300';

const INITIAL: BugDatesEventInput = {
  title: '',
  description: '',
  category: 'company_event',
  recurrence_type: 'none',
  recurrence_days: null,
  start_date: '',
  end_date: '',
  start_time: '',
  end_time: '',
  location_or_link: '',
  is_office_closed: false,
  auto_hooks: null,
  visibility: 'company',
  status: 'approved',
};

const WEEKDAYS = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

type Props = {
  open: boolean;
  initial?: BugDatesEvent | null;
  onClose: () => void;
  onSaved: () => void;
};

export function EventFormModal({ open, initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState<BugDatesEventInput>(INITIAL);
  const [days, setDays] = useState<string[]>([]);
  const [creativeHook, setCreativeHook] = useState(false);
  const [todoHook, setTodoHook] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setUnsavedOpen(false);
      return;
    }
    if (initial) {
      setForm({
        title: initial.title,
        description: initial.description ?? '',
        category: initial.category,
        recurrence_type: initial.recurrence_type || 'none',
        start_date: initial.start_date,
        end_date: initial.end_date ?? '',
        start_time: (initial.start_time || '').slice(0, 5),
        end_time: (initial.end_time || '').slice(0, 5),
        location_or_link: initial.location_or_link ?? '',
        is_office_closed: !!initial.is_office_closed,
        visibility: initial.visibility || 'company',
        status: initial.status || 'approved',
      });
      const rd = Array.isArray(initial.recurrence_days)
        ? initial.recurrence_days.map((d) => String(d).toLowerCase())
        : [];
      setDays(rd);
      const hooks = (initial.auto_hooks || {}) as Record<string, unknown>;
      setCreativeHook(!!hooks.creative);
      setTodoHook(typeof hooks.todo === 'string' ? hooks.todo : '');
    } else {
      setForm({ ...INITIAL, start_date: new Date().toISOString().slice(0, 10) });
      setDays([]);
      setCreativeHook(false);
      setTodoHook('');
    }
    setDirty(false);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onPop = () => onClose();
    window.history.pushState({ modal: 'bugdates-event' }, '');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [open, onClose]);

  const isValid = useMemo(() => {
    return !!form.title.trim() && !!form.start_date && !!form.category;
  }, [form]);

  const patch = (partial: Partial<BugDatesEventInput>) => {
    setForm((prev) => ({ ...prev, ...partial }));
    setDirty(true);
  };

  const handleClose = () => {
    if (dirty) {
      setUnsavedOpen(true);
      return;
    }
    onClose();
  };

  const discardAndClose = () => {
    setUnsavedOpen(false);
    setDirty(false);
    onClose();
  };

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const auto_hooks: Record<string, unknown> = {};
      if (creativeHook) auto_hooks.creative = true;
      if (todoHook) auto_hooks.todo = todoHook;
      const payload: BugDatesEventInput = {
        ...form,
        title: form.title.trim().slice(0, 255),
        description: form.description?.trim() || null,
        end_date: form.end_date || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location_or_link: form.location_or_link?.trim() || null,
        recurrence_days:
          form.recurrence_type === 'weekly' && days.length ? days : null,
        auto_hooks: Object.keys(auto_hooks).length ? auto_hooks : null,
      };
      if (initial?.id) {
        await updateBugDatesEvent({ ...payload, id: initial.id });
        toast({ title: 'Event updated' });
      } else {
        await createBugDatesEvent(payload);
        toast({ title: 'Event created' });
      }
      setDirty(false);
      onSaved();
      onClose();
    } catch (e) {
      toast({
        title: 'Could not save event',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-[600px] overflow-hidden rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bugdates-event-title"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-indigo-50/40 dark:from-blue-950/20 dark:via-transparent dark:to-indigo-950/20 pointer-events-none" />
        <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-gray-200/50 dark:border-gray-700/50 px-5 py-4">
          <div>
            <h2 id="bugdates-event-title" className="text-lg font-bold text-gray-900 dark:text-white">
              {initial ? 'Edit event' : 'New BugDates event'}
            </h2>
            <div className="mt-2 h-1 w-16 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700" />
          </div>
          <Button type="button" variant="outline" size="icon" className="rounded-xl h-10 w-10 border-gray-200 dark:border-gray-700" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid max-h-[70vh] grid-cols-12 gap-4 overflow-y-auto p-5">
          <div className="col-span-12 space-y-2">
            <Label htmlFor="bd-title" className="text-sm font-semibold">Title</Label>
            <Input
              id="bd-title"
              className="rounded-xl h-11 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              maxLength={255}
              value={form.title}
              onChange={(e) => patch({ title: e.target.value.slice(0, 255) })}
            />
          </div>

          <div className="col-span-12 md:col-span-6 space-y-2">
            <Label className="text-sm font-semibold">Category</Label>
            <Select value={String(form.category)} onValueChange={(v) => patch({ category: v })}>
              <SelectTrigger className="rounded-xl h-11 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="growth_program">Growth program</SelectItem>
                <SelectItem value="observance">Observance</SelectItem>
                <SelectItem value="holiday">Holiday</SelectItem>
                <SelectItem value="company_event">Company event</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-12 md:col-span-6 space-y-2">
            <Label className="text-sm font-semibold">Recurrence</Label>
            <Select
              value={String(form.recurrence_type)}
              onValueChange={(v) => patch({ recurrence_type: v })}
            >
              <SelectTrigger className="rounded-xl h-11 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.recurrence_type === 'weekly' && (
            <div className="col-span-12 flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const on = days.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition-all ${
                      on
                        ? 'border-blue-500/60 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                    onClick={() => {
                      setDirty(true);
                      setDays((prev) =>
                        on ? prev.filter((x) => x !== d.value) : [...prev, d.value]
                      );
                    }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="col-span-12 md:col-span-6 space-y-2">
            <Label className="text-sm font-semibold">Start date</Label>
            <DatePicker
              value={form.start_date}
              onChange={(v) => {
                if (form.end_date && v && form.end_date < v) {
                  patch({ start_date: v, end_date: v });
                } else {
                  patch({ start_date: v });
                }
              }}
              placeholder="Select start date"
              disableFuture={false}
              className={pickerClass}
            />
          </div>
          <div className="col-span-12 md:col-span-6 space-y-2">
            <Label className="text-sm font-semibold">End date</Label>
            <DatePicker
              value={form.end_date || ''}
              onChange={(v) => patch({ end_date: v })}
              placeholder="Select end date"
              disableFuture={false}
              className={pickerClass}
            />
          </div>

          <div className="col-span-12 md:col-span-6 space-y-2">
            <Label className="text-sm font-semibold">Start time</Label>
            <TimePicker
              value={form.start_time || ''}
              onChange={(v) => patch({ start_time: v })}
              placeholder="Select start time"
              className={pickerClass}
              aria-label="Start time"
            />
          </div>
          <div className="col-span-12 md:col-span-6 space-y-2">
            <Label className="text-sm font-semibold">End time</Label>
            <TimePicker
              value={form.end_time || ''}
              onChange={(v) => patch({ end_time: v })}
              placeholder="Select end time"
              className={pickerClass}
              aria-label="End time"
            />
          </div>

          <div className="col-span-12 space-y-2">
            <Label htmlFor="bd-desc" className="text-sm font-semibold">Description</Label>
            <Textarea
              id="bd-desc"
              className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              maxLength={5000}
              value={form.description || ''}
              onChange={(e) => patch({ description: e.target.value.slice(0, 5000) })}
            />
          </div>

          <div className="col-span-12 space-y-2">
            <Label htmlFor="bd-link" className="text-sm font-semibold">Location / link</Label>
            <Input
              id="bd-link"
              className="rounded-xl h-11 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              maxLength={2000}
              value={form.location_or_link || ''}
              onChange={(e) => patch({ location_or_link: e.target.value.slice(0, 2000) })}
            />
          </div>

          <label className="col-span-12 flex items-start gap-3 cursor-pointer group rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/60 dark:bg-gray-800/40 px-3 py-3 transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-950/20">
            <Checkbox
              checked={!!form.is_office_closed}
              onCheckedChange={(v) => patch({ is_office_closed: v === true })}
              className="mt-0.5 h-5 w-5 rounded-md border-blue-500/70 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=checked]:text-white"
              aria-label="Office closed"
            />
            <span className="text-sm font-medium leading-snug text-gray-800 dark:text-gray-200">
              Office closed
              <span className="block text-xs font-normal text-gray-500 dark:text-gray-400 mt-0.5">
                Holiday / checkout bypass — no late check-in
              </span>
            </span>
          </label>

          <label className="col-span-12 md:col-span-6 flex items-start gap-3 cursor-pointer group rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/60 dark:bg-gray-800/40 px-3 py-3 transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-950/20">
            <Checkbox
              checked={creativeHook}
              onCheckedChange={(v) => {
                setCreativeHook(v === true);
                setDirty(true);
              }}
              className="mt-0.5 h-5 w-5 rounded-md border-blue-500/70 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=checked]:text-white"
              aria-label="Auto BugCreative card"
            />
            <span className="text-sm font-medium leading-snug text-gray-800 dark:text-gray-200">
              Auto BugCreative card
              <span className="block text-xs font-normal text-gray-500 dark:text-gray-400 mt-0.5">
                Queue a draft poster for this occurrence
              </span>
            </span>
          </label>

          <div className="col-span-12 md:col-span-6 space-y-2">
            <Label className="text-sm font-semibold">Auto BugToDo</Label>
            <Select
              value={todoHook || 'none'}
              onValueChange={(v) => {
                setTodoHook(v === 'none' ? '' : v);
                setDirty(true);
              }}
            >
              <SelectTrigger className="rounded-xl h-11 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="session_notes">Session notes</SelectItem>
                <SelectItem value="weekly_report">Weekly report</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200/50 dark:border-gray-700/50 px-5 py-4">
          <Button type="button" variant="outline" className="rounded-xl h-11 border-gray-200 dark:border-gray-700" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold shadow-lg"
            disabled={!isValid || saving}
            onClick={handleSave}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : initial ? 'Save' : 'Create'}
          </Button>
        </div>
        </div>
      </div>
    </div>

    <AlertDialog open={unsavedOpen} onOpenChange={setUnsavedOpen}>
      <AlertDialogContent className="max-w-[400px] rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Close anyway?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Keep editing</AlertDialogCancel>
          <AlertDialogAction className="rounded-xl" onClick={discardAndClose}>
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
