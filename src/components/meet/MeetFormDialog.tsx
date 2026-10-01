import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, KeyRound, RefreshCw, Search, Users, Video, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TimePicker } from '@/components/ui/TimePicker';
import { UserAvatar } from '@/components/users/UserAvatar';
import {
  TaskFormActions,
  TaskFormDialogShell,
  TaskFormField,
  TaskFormSection,
  taskFieldControlClass,
} from '@/components/tasks/TaskFormDialogShell';
import { cn } from '@/lib/utils';
import { normalizeMeetCode } from '@/lib/meetCode';

export type MeetInvitee = {
  id?: string;
  username?: string | null;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  role: 'admin' | 'developer' | 'tester' | 'creator';
};

const TITLE_MAX = 120;
const DURATION_MINUTES = 60;

const ROLE_TABS: { key: 'all' | MeetInvitee['role']; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'admin', label: 'Admins' },
  { key: 'developer', label: 'Developers' },
  { key: 'tester', label: 'Testers' },
  { key: 'creator', label: 'Creators' },
];

const ROLE_BADGE: Record<MeetInvitee['role'], string> = {
  admin: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  developer: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  tester: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  creator: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300',
};

function inviteeName(m: MeetInvitee): string {
  return (m.username || '').trim() || m.email.split('@')[0];
}

function startDate(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatSlot(start: Date): string {
  const end = new Date(start.getTime() + DURATION_MINUTES * 60_000);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const day = sameDay(start, today)
    ? 'Today'
    : sameDay(start, tomorrow)
      ? 'Tomorrow'
      : start.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
  const t = (d: Date) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return `${day}, ${t(start)} – ${t(end)}`;
}

type Props = {
  open: boolean;
  mode: 'create' | 'join';
  onClose: () => void;
  title: string;
  onTitleChange: (v: string) => void;
  code: string;
  onCodeChange: (v: string) => void;
  meetingDate: string;
  onMeetingDateChange: (v: string) => void;
  meetingTime: string;
  onMeetingTimeChange: (v: string) => void;
  members: MeetInvitee[];
  loadingMembers: boolean;
  onRetryMembers: () => void;
  selectedEmails: string[];
  onSelectedEmailsChange: (emails: string[]) => void;
  submitting: boolean;
  onCreate: () => void;
  onJoin: () => void;
};

export function MeetFormDialog({
  open,
  mode,
  onClose,
  title,
  onTitleChange,
  code,
  onCodeChange,
  meetingDate,
  onMeetingDateChange,
  meetingTime,
  onMeetingTimeChange,
  members,
  loadingMembers,
  onRetryMembers,
  selectedEmails,
  onSelectedEmailsChange,
  submitting,
  onCreate,
  onJoin,
}: Props) {
  const isCreate = mode === 'create';
  const [roleFilter, setRoleFilter] = useState<'all' | MeetInvitee['role']>('all');
  const [query, setQuery] = useState('');
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (open) {
      setRoleFilter('all');
      setQuery('');
      setAttempted(false);
    }
  }, [open, mode]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: members.length };
    members.forEach((m) => {
      c[m.role] = (c[m.role] || 0) + 1;
    });
    return c;
  }, [members]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => roleFilter === 'all' || m.role === roleFilter)
      .filter((m) => !q || inviteeName(m).toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      .sort((a, b) => inviteeName(a).localeCompare(inviteeName(b)));
  }, [members, roleFilter, query]);

  const selectedSet = useMemo(() => new Set(selectedEmails), [selectedEmails]);
  const selectedMembers = useMemo(
    () => selectedEmails.map((e) => members.find((m) => m.email === e)).filter(Boolean) as MeetInvitee[],
    [selectedEmails, members]
  );
  const allVisibleSelected = visible.length > 0 && visible.every((m) => selectedSet.has(m.email));

  const toggle = (email: string) =>
    onSelectedEmailsChange(selectedSet.has(email) ? selectedEmails.filter((e) => e !== email) : [...selectedEmails, email]);

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      const ids = new Set(visible.map((m) => m.email));
      onSelectedEmailsChange(selectedEmails.filter((e) => !ids.has(e)));
    } else {
      const merged = new Set(selectedEmails);
      visible.forEach((m) => merged.add(m.email));
      onSelectedEmailsChange([...merged]);
    }
  };

  const start = startDate(meetingDate, meetingTime);
  const scheduleError = isCreate
    ? !start
      ? 'Pick a date and time'
      : start.getTime() < Date.now() - 5 * 60_000
        ? 'This time has already passed'
        : null
    : null;
  const normalizedCode = normalizeMeetCode(code);
  const codeError = !isCreate && !normalizedCode ? 'Enter a code like abc-defg-hij or paste the Meet link' : null;
  const isValid = isCreate ? !scheduleError : !codeError;
  const isDirty = isCreate ? Boolean(title.trim() || selectedEmails.length) : false;

  const handleSubmit = () => {
    setAttempted(true);
    if (!isValid || submitting) return;
    if (isCreate) onCreate();
    else onJoin();
  };

  const helper = isCreate
    ? scheduleError && attempted
      ? scheduleError
      : start
        ? `${formatSlot(start)} · ${selectedEmails.length} invitee${selectedEmails.length === 1 ? '' : 's'}`
        : null
    : 'Opens Google Meet in this tab.';

  return (
    <TaskFormDialogShell
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={isCreate ? 'Start a meet' : 'Join with code'}
      description={
        isCreate
          ? 'Schedule a Google Meet and send calendar invites to your team.'
          : 'Enter a meeting code or paste a Google Meet link.'
      }
      icon={isCreate ? <Video /> : <KeyRound />}
      headerClassName={isCreate ? 'bg-gradient-to-br from-blue-600 to-indigo-600' : 'bg-gradient-to-br from-emerald-600 to-teal-600'}
      maxWidthClassName={isCreate ? 'max-w-2xl' : 'max-w-md'}
      isDirty={isDirty}
      submitting={submitting}
      footer={(requestClose) => (
        <TaskFormActions
          onCancel={requestClose}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel={isCreate ? 'Create meeting' : 'Join meeting'}
          disabled={attempted && !isValid}
          helper={
            helper ? (
              <span className={cn(attempted && !isValid && 'text-destructive')}>{helper}</span>
            ) : null
          }
        />
      )}
    >
      <form
        className="flex flex-col gap-4"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {isCreate ? (
          <>
            <TaskFormSection title="Meeting" subtitle="Title and schedule" icon={<CalendarClock className="h-4 w-4" />}>
              <div className="grid grid-cols-12 gap-4">
                <TaskFormField
                  label="Title"
                  htmlFor="meet-title"
                  className="col-span-12"
                  counter={{ value: title.length, max: TITLE_MAX }}
                  hint="Optional — defaults to “BugMeet Session”."
                >
                  <Input
                    id="meet-title"
                    autoFocus
                    autoComplete="off"
                    maxLength={TITLE_MAX}
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value.slice(0, TITLE_MAX))}
                    placeholder="e.g. Sprint planning"
                    className={taskFieldControlClass}
                  />
                </TaskFormField>
                <TaskFormField
                  label="Date"
                  required
                  className="col-span-12 sm:col-span-6"
                  error={attempted && scheduleError ? scheduleError : null}
                >
                  <DatePicker
                    value={meetingDate}
                    onChange={onMeetingDateChange}
                    placeholder="Select date"
                    className={cn(taskFieldControlClass, 'w-full')}
                  />
                </TaskFormField>
                <TaskFormField
                  label="Start time"
                  required
                  className="col-span-12 sm:col-span-6"
                  hint={`Lasts ${DURATION_MINUTES} minutes`}
                >
                  <TimePicker
                    value={meetingTime}
                    onChange={onMeetingTimeChange}
                    placeholder="Select time"
                    className={cn(taskFieldControlClass, 'w-full')}
                  />
                </TaskFormField>
              </div>
            </TaskFormSection>

            <TaskFormSection
              title="Invite people"
              subtitle="They’ll receive a Google Calendar invite"
              icon={<Users className="h-4 w-4" />}
              accent="purple"
              aside={
                <Badge variant="outline" className="rounded-xl tabular-nums">
                  {selectedEmails.length} selected
                </Badge>
              }
            >
              <div className="flex flex-col gap-3">
                {selectedMembers.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedMembers.map((m) => (
                      <span
                        key={m.email}
                        className="inline-flex max-w-full items-center gap-2 rounded-xl border border-border/60 bg-background py-0.5 pl-0.5 pr-1.5 text-xs"
                      >
                        <UserAvatar name={inviteeName(m)} avatar={m.avatar} size="sm" />
                        <span className="truncate font-medium">{inviteeName(m)}</span>
                        <button
                          type="button"
                          onClick={() => toggle(m.email)}
                          className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={`Remove ${inviteeName(m)}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => onSelectedEmailsChange([])}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Clear all
                    </button>
                  </div>
                ) : null}

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value.slice(0, 100))}
                    placeholder="Search by name or email…"
                    autoComplete="off"
                    className={cn(taskFieldControlClass, 'pl-9')}
                    aria-label="Search team members"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by role">
                    {ROLE_TABS.filter((t) => t.key === 'all' || (counts[t.key] || 0) > 0).map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={roleFilter === t.key}
                        onClick={() => setRoleFilter(t.key)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
                          roleFilter === t.key
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border/60 text-muted-foreground hover:bg-muted'
                        )}
                      >
                        {t.label}
                        <span className="tabular-nums opacity-70">{counts[t.key] || 0}</span>
                      </button>
                    ))}
                  </div>
                  {visible.length > 0 ? (
                    <button
                      type="button"
                      onClick={toggleAllVisible}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {allVisibleSelected ? 'Deselect shown' : `Select shown (${visible.length})`}
                    </button>
                  ) : null}
                </div>

                <div className="max-h-72 overflow-y-auto rounded-xl border border-border/60 bg-background [scrollbar-width:thin]">
                  {loadingMembers ? (
                    <div className="flex flex-col divide-y divide-border/60">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                          <Skeleton className="h-4 w-4 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="flex flex-1 flex-col gap-1.5">
                            <Skeleton className="h-3.5 w-1/3 rounded-md" />
                            <Skeleton className="h-3 w-1/2 rounded-md" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : members.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                      <Users className="h-6 w-6 text-muted-foreground" />
                      <p className="text-sm font-medium">Couldn’t load team members</p>
                      <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={onRetryMembers}>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Retry
                      </Button>
                    </div>
                  ) : visible.length === 0 ? (
                    <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
                      <Users className="h-6 w-6 text-muted-foreground" />
                      <p className="text-sm font-medium">No matches</p>
                      <p className="text-xs text-muted-foreground">Try another name or role filter.</p>
                    </div>
                  ) : (
                    <ul className="flex flex-col divide-y divide-border/60">
                      {visible.map((m) => {
                        const checked = selectedSet.has(m.email);
                        return (
                          <li key={m.email}>
                            <label
                              className={cn(
                                'flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors',
                                checked ? 'bg-primary/5' : 'hover:bg-muted/60'
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggle(m.email)}
                                aria-label={`Invite ${inviteeName(m)}`}
                                className="rounded-md"
                              />
                              <UserAvatar name={inviteeName(m)} avatar={m.avatar} size="sm" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">{inviteeName(m)}</p>
                                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                              </div>
                              <Badge variant="outline" className={cn('shrink-0 rounded-xl text-[11px] capitalize', ROLE_BADGE[m.role])}>
                                {m.role}
                              </Badge>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </TaskFormSection>
          </>
        ) : (
          <TaskFormSection title="Meeting code" subtitle="From the invite or Meet link" icon={<KeyRound className="h-4 w-4" />} accent="emerald">
            <TaskFormField
              label="Code or link"
              required
              htmlFor="meet-code"
              error={attempted && codeError ? codeError : null}
              hint={normalizedCode ? `Joining meet.google.com/${normalizedCode}` : 'e.g. abc-defg-hij'}
            >
              <Input
                id="meet-code"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                maxLength={120}
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                placeholder="abc-defg-hij"
                className={cn(
                  taskFieldControlClass,
                  'font-mono tracking-wider',
                  attempted && codeError && 'border-destructive'
                )}
              />
            </TaskFormField>
          </TaskFormSection>
        )}
      </form>
    </TaskFormDialogShell>
  );
}
