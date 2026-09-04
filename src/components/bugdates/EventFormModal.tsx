import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
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
import { grantOfficialLeave } from '@/services/leaveService';
import { userService } from '@/services/userService';
import type { User } from '@/types';

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
  const [creditOfficialLeave, setCreditOfficialLeave] = useState(false);
  const [leaveScope, setLeaveScope] = useState<'all' | 'users'>('all');
  const [leaveUsers, setLeaveUsers] = useState<User[]>([]);
  const [leaveSelectedIds, setLeaveSelectedIds] = useState<Set<string>>(new Set());
  const [leaveUserQuery, setLeaveUserQuery] = useState('');
  const [loadingLeaveUsers, setLoadingLeaveUsers] = useState(false);

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
      setCreditOfficialLeave(false);
      setLeaveScope('all');
      setLeaveSelectedIds(new Set());
      setLeaveUserQuery('');
    } else {
      setForm({ ...INITIAL, start_date: new Date().toISOString().slice(0, 10) });
      setDays([]);
      setCreativeHook(false);
      setTodoHook('');
      setCreditOfficialLeave(false);
      setLeaveScope('all');
      setLeaveSelectedIds(new Set());
      setLeaveUserQuery('');
    }
    setDirty(false);
  }, [open, initial]);

  const showOfficialLeaveOptions =
    String(form.category || '') === 'holiday' && !!form.is_office_closed;

  useEffect(() => {
    if (!open || !showOfficialLeaveOptions || !creditOfficialLeave || leaveScope !== 'users') {
      return;
    }
    if (leaveUsers.length > 0) return;
    let cancelled = false;
    (async () => {
      setLoadingLeaveUsers(true);
      try {
        const list = await userService.getUsers();
        if (!cancelled) {
          setLeaveUsers(
            list.filter((u) => {
              const active =
                u.account_active === undefined || u.account_active === null
                  ? true
                  : Number(u.account_active) === 1;
              return active;
            })
          );
        }
      } catch {
        if (!cancelled) setLeaveUsers([]);
      } finally {
        if (!cancelled) setLoadingLeaveUsers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, showOfficialLeaveOptions, creditOfficialLeave, leaveScope, leaveUsers.length]);

  const filteredLeaveUsers = useMemo(() => {
    const q = leaveUserQuery.trim().toLowerCase();
    if (!q) return leaveUsers;
    return leaveUsers.filter((u) => {
      const hay = `${u.username || ''} ${u.name || ''} ${u.role || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [leaveUsers, leaveUserQuery]);

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
    if (
      showOfficialLeaveOptions &&
      creditOfficialLeave &&
      leaveScope === 'users' &&
      leaveSelectedIds.size === 0
    ) {
      toast({
        title: 'Select users',
        description: 'Pick at least one user for Official Leave, or choose All users.',
        variant: 'destructive',
      });
      return;
    }
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

      if (showOfficialLeaveOptions && creditOfficialLeave && form.start_date) {
        try {
          const result = await grantOfficialLeave({
            start_date: form.start_date,
            end_date: form.end_date || form.start_date,
            title: form.title.trim().slice(0, 255),
            scope: leaveScope,
            user_ids: leaveScope === 'users' ? Array.from(leaveSelectedIds) : undefined,
            notify: true,
            replace_admin_hours: true,
          });
          const skipN = Array.isArray(result.skipped) ? result.skipped.length : 0;
          toast({
            title: 'Official Leave credited',
            description: `${result.created} user${result.created === 1 ? '' : 's'} · 8h/day${
              skipN ? ` · ${skipN} skipped` : ''
            }.`,
          });
        } catch (leaveErr) {
          toast({
            title: 'Holiday saved, but Official Leave failed',
            description:
              leaveErr instanceof Error ? leaveErr.message : 'Grant leave from Official Leave page',
            variant: 'destructive',
          });
        }
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

          {showOfficialLeaveOptions ? (
            <div className="col-span-12 space-y-3 rounded-xl border border-amber-200/70 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={creditOfficialLeave}
                  onCheckedChange={(v) => {
                    setCreditOfficialLeave(v === true);
                    setDirty(true);
                  }}
                  className="mt-0.5 h-5 w-5 rounded-md border-amber-500/70 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600 data-[state=checked]:text-white"
                  aria-label="Credit Official Leave"
                />
                <span className="text-sm font-medium leading-snug text-amber-950 dark:text-amber-100">
                  Credit Official Leave (8h)
                  <span className="block text-xs font-normal text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                    Grant company leave hours for this holiday date range
                  </span>
                </span>
              </label>
              {creditOfficialLeave ? (
                <div className="space-y-2 pl-8">
                  <div className="grid grid-cols-12 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLeaveScope('all');
                        setDirty(true);
                      }}
                      className={`col-span-6 rounded-xl border px-3 py-2 text-left text-xs ${
                        leaveScope === 'all'
                          ? 'border-amber-400 bg-amber-100/80 dark:border-amber-600 dark:bg-amber-900/40'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      All users
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLeaveScope('users');
                        setDirty(true);
                      }}
                      className={`col-span-6 rounded-xl border px-3 py-2 text-left text-xs ${
                        leaveScope === 'users'
                          ? 'border-amber-400 bg-amber-100/80 dark:border-amber-600 dark:bg-amber-900/40'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      Selected users ({leaveSelectedIds.size})
                    </button>
                  </div>
                  {leaveScope === 'users' ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          value={leaveUserQuery}
                          onChange={(e) => setLeaveUserQuery(e.target.value)}
                          placeholder="Search users…"
                          className="pl-8 h-9 rounded-xl text-xs"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto rounded-xl border border-amber-200/50 dark:border-amber-800/40 bg-white/70 dark:bg-gray-900/50">
                        {loadingLeaveUsers ? (
                          <p className="text-xs text-muted-foreground p-3 flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                          </p>
                        ) : filteredLeaveUsers.length === 0 ? (
                          <p className="text-xs text-muted-foreground p-3">No users</p>
                        ) : (
                          filteredLeaveUsers.map((u) => {
                            const id = String(u.id);
                            const checked = leaveSelectedIds.has(id);
                            return (
                              <label
                                key={id}
                                className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-amber-50/60 dark:hover:bg-amber-950/30"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => {
                                    setLeaveSelectedIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(id)) next.delete(id);
                                      else next.add(id);
                                      return next;
                                    });
                                    setDirty(true);
                                  }}
                                  className="rounded-md"
                                />
                                <span className="text-xs truncate">
                                  {u.username || u.name || id}
                                  <span className="text-muted-foreground ml-1 uppercase">
                                    {u.role || ''}
                                  </span>
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

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
