import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronsUpDown,
  FileText,
  FolderKanban,
  Search,
  Share2,
  Users,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/users/UserAvatar';
import { cn } from '@/lib/utils';
import type { Project } from '@/services/projectService';
import type { SharedTask } from '@/services/sharedTaskService';
import {
  TaskFormActions,
  TaskFormDialogShell,
  TaskFormField,
  TaskFormSection,
  taskFieldControlClass,
  taskTextareaClass,
} from './TaskFormDialogShell';

export type AssignableUser = {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  avatar?: string | null;
};

const TITLE_MAX = 255;
const DESCRIPTION_MAX = 2000;

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admins',
  developer: 'Developers',
  creator: 'Creators',
};

const ROLE_BADGE: Record<string, string> = {
  admin: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  developer: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  creator: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300',
};

const PRIORITIES: { value: SharedTask['priority']; label: string; dot: string; active: string }[] = [
  { value: 'low', label: 'Low', dot: 'bg-emerald-500', active: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  { value: 'medium', label: 'Medium', dot: 'bg-amber-500', active: 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  { value: 'high', label: 'High', dot: 'bg-rose-500', active: 'border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300' },
];

const STATUSES: { value: SharedTask['status']; label: string; dot: string }[] = [
  { value: 'pending', label: 'Pending', dot: 'bg-slate-400' },
  { value: 'in_progress', label: 'In progress', dot: 'bg-blue-500' },
  { value: 'completed', label: 'Completed', dot: 'bg-emerald-500' },
  { value: 'approved', label: 'Approved', dot: 'bg-purple-500' },
];

function displayName(user: AssignableUser): string {
  return user.name || user.username || user.email || 'User';
}

function roleLabel(role?: string): string {
  const r = (role || '').toLowerCase();
  if (!r) return 'User';
  return r.charAt(0).toUpperCase() + r.slice(1);
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: SharedTask | null;
  onChange: (next: SharedTask) => void;
  selectedUsers: string[];
  onSelectedUsersChange: (ids: string[]) => void;
  projects: Project[];
  users: AssignableUser[];
  submitting: boolean;
  onSubmit: () => void;
};

/**
 * Why: Shared task create/edit used to be a long inline block in MyTasks with
 * Admin/Dev-only filters and no validation feedback. This keeps the business rule
 * (testers are not assignable) while adding search, avatars, inline errors and an
 * unsaved-changes guard.
 */
export function SharedTaskFormDialog({
  open,
  onOpenChange,
  value,
  onChange,
  selectedUsers,
  onSelectedUsersChange,
  projects,
  users,
  submitting,
  onSubmit,
}: Props) {
  const isEdit = Boolean(value?.id);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [userQuery, setUserQuery] = useState('');
  const [touched, setTouched] = useState<{ title?: boolean }>({});
  const [attempted, setAttempted] = useState(false);
  const snapshotRef = useRef<string>('');

  const snapshot = JSON.stringify({ v: value, u: [...selectedUsers].sort() });

  useEffect(() => {
    if (open) {
      snapshotRef.current = snapshot;
      setRoleFilter('all');
      setUserQuery('');
      setTouched({});
      setAttempted(false);
      setProjectPickerOpen(false);
    }
    // Snapshot only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isDirty = open && snapshotRef.current !== '' && snapshotRef.current !== snapshot;

  const eligibleUsers = useMemo(
    () => users.filter((u) => (u.role || '').toLowerCase() !== 'tester'),
    [users]
  );

  const roleTabs = useMemo(() => {
    const counts = new Map<string, number>();
    eligibleUsers.forEach((u) => {
      const r = (u.role || 'user').toLowerCase();
      counts.set(r, (counts.get(r) || 0) + 1);
    });
    const order = ['admin', 'developer', 'creator'];
    const keys = [...counts.keys()].sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
    });
    return [
      { key: 'all', label: 'All', count: eligibleUsers.length },
      ...keys.map((k) => ({ key: k, label: ROLE_LABEL[k] || roleLabel(k) + 's', count: counts.get(k) || 0 })),
    ];
  }, [eligibleUsers]);

  const visibleUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return eligibleUsers
      .filter((u) => roleFilter === 'all' || (u.role || 'user').toLowerCase() === roleFilter)
      .filter(
        (u) =>
          !q ||
          displayName(u).toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
      )
      .sort((a, b) => displayName(a).localeCompare(displayName(b)));
  }, [eligibleUsers, roleFilter, userQuery]);

  const selectedSet = useMemo(() => new Set(selectedUsers), [selectedUsers]);
  const selectedUserObjects = useMemo(
    () => selectedUsers.map((id) => users.find((u) => u.id === id)).filter(Boolean) as AssignableUser[],
    [selectedUsers, users]
  );
  const allVisibleSelected = visibleUsers.length > 0 && visibleUsers.every((u) => selectedSet.has(u.id));

  const title = value?.title || '';
  const description = value?.description || '';
  const projectId = value?.project_ids?.[0];
  const projectName = projectId ? projects.find((p) => p.id === projectId)?.name : undefined;
  const dueDate = value?.due_date || '';
  const dueInPast = Boolean(dueDate) && dueDate.slice(0, 10) < todayYmd() && !isEdit;

  const titleError = !title.trim()
    ? 'Task title is required'
    : title.length > TITLE_MAX
      ? `Keep the title under ${TITLE_MAX} characters`
      : null;
  const projectError = !projectId ? 'Select a project' : null;
  const assigneeError = selectedUsers.length === 0 ? 'Assign at least one team member' : null;
  const isValid = !titleError && !projectError && !assigneeError;

  const missing = [
    titleError && 'a title',
    projectError && 'a project',
    assigneeError && 'an assignee',
  ].filter(Boolean) as string[];

  const patch = (next: Partial<SharedTask>) => onChange({ ...(value as SharedTask), ...next });

  const toggleUser = (id: string) => {
    onSelectedUsersChange(selectedSet.has(id) ? selectedUsers.filter((x) => x !== id) : [...selectedUsers, id]);
  };

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(visibleUsers.map((u) => u.id));
      onSelectedUsersChange(selectedUsers.filter((id) => !visibleIds.has(id)));
    } else {
      const merged = new Set(selectedUsers);
      visibleUsers.forEach((u) => merged.add(u.id));
      onSelectedUsersChange([...merged]);
    }
  };

  const handleSubmit = () => {
    setAttempted(true);
    if (!isValid || submitting) return;
    onSubmit();
  };

  return (
    <TaskFormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit shared task' : 'New shared task'}
      description={
        isEdit
          ? 'Update details, schedule, and who is working on it.'
          : 'Create a task for one or more team members on a project.'
      }
      icon={<Share2 />}
      headerClassName="bg-gradient-to-br from-indigo-600 to-blue-600"
      isDirty={isDirty}
      submitting={submitting}
      footer={(requestClose) => (
        <TaskFormActions
          onCancel={requestClose}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel={isEdit ? 'Save changes' : 'Create task'}
          disabled={attempted && !isValid}
          helper={
            missing.length > 0 ? (
              <span>Add {missing.join(', ').replace(/, ([^,]*)$/, ' and $1')} to continue.</span>
            ) : (
              <span>
                {selectedUsers.length} assignee{selectedUsers.length === 1 ? '' : 's'}
                {projectName ? ` · ${projectName}` : ''}
              </span>
            )
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
        <TaskFormSection title="Details" subtitle="What needs to be done" icon={<FileText className="h-4 w-4" />}>
          <div className="flex flex-col gap-4">
            <TaskFormField
              label="Title"
              required
              htmlFor="shared-task-title"
              counter={{ value: title.length, max: TITLE_MAX }}
              error={(touched.title || attempted) && titleError ? titleError : null}
            >
              <Input
                id="shared-task-title"
                name="shared-task-title"
                autoComplete="off"
                autoFocus={!isEdit}
                maxLength={TITLE_MAX}
                value={title}
                onChange={(e) => patch({ title: e.target.value.slice(0, TITLE_MAX) })}
                onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                placeholder="e.g. Prepare launch poster for Onam campaign"
                aria-invalid={Boolean((touched.title || attempted) && titleError)}
                className={cn(
                  taskFieldControlClass,
                  (touched.title || attempted) && titleError && 'border-destructive focus-visible:ring-destructive/30'
                )}
              />
            </TaskFormField>
            <TaskFormField
              label="Description"
              htmlFor="shared-task-description"
              counter={{ value: description.length, max: DESCRIPTION_MAX }}
              hint="Optional — add context, links, or acceptance notes."
            >
              <Textarea
                id="shared-task-description"
                autoComplete="off"
                maxLength={DESCRIPTION_MAX}
                value={description}
                onChange={(e) => patch({ description: e.target.value.slice(0, DESCRIPTION_MAX) })}
                placeholder="Describe the task, expected outcome, and any references…"
                className={taskTextareaClass}
              />
            </TaskFormField>
          </div>
        </TaskFormSection>

        <TaskFormSection
          title="Project & schedule"
          subtitle="Where it belongs and when it's due"
          icon={<Calendar className="h-4 w-4" />}
          accent="indigo"
        >
          <div className="grid grid-cols-12 gap-4">
            <TaskFormField
              label="Project"
              required
              className="col-span-12"
              error={attempted && projectError ? projectError : null}
            >
              <Popover open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={projectPickerOpen}
                    className={cn(
                      'w-full justify-between font-normal',
                      taskFieldControlClass,
                      attempted && projectError && 'border-destructive'
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className={cn('truncate', !projectName && 'text-muted-foreground')}>
                        {projectName || 'Select a project'}
                      </span>
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="z-[90] w-[--radix-popover-trigger-width] rounded-xl p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search projects…" />
                    <CommandList className="max-h-64">
                      <CommandEmpty>No project found.</CommandEmpty>
                      <CommandGroup>
                        {projects.map((project) => (
                          <CommandItem
                            key={project.id}
                            value={`${project.name} ${project.id}`}
                            onSelect={() => {
                              patch({ project_ids: project.id ? [project.id] : [] });
                              setProjectPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn('mr-2 h-4 w-4', projectId === project.id ? 'opacity-100' : 'opacity-0')}
                            />
                            <span className="truncate">{project.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </TaskFormField>

            <TaskFormField
              label="Due date"
              className="col-span-12 md:col-span-6"
              hint={dueInPast ? 'This date is in the past.' : 'Optional'}
            >
              <DatePicker
                value={dueDate}
                onChange={(next) => patch({ due_date: next || undefined })}
                placeholder="Select due date"
              />
            </TaskFormField>

            <TaskFormField label="Priority" className="col-span-12 md:col-span-6">
              <div role="radiogroup" aria-label="Priority" className="grid h-11 grid-cols-3 gap-1 rounded-xl border border-input bg-background p-1">
                {PRIORITIES.map((p) => {
                  const active = (value?.priority || 'medium') === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => patch({ priority: p.value })}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-lg border border-transparent text-xs font-medium transition-colors',
                        active ? p.active : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <span className={cn('h-2 w-2 rounded-full', p.dot)} />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </TaskFormField>

            {isEdit ? (
              <TaskFormField label="Status" className="col-span-12 md:col-span-6">
                <Select
                  value={value?.status || 'pending'}
                  onValueChange={(next) => patch({ status: next as SharedTask['status'] })}
                >
                  <SelectTrigger className={cn('w-full', taskFieldControlClass)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <span className="flex items-center gap-2">
                          <span className={cn('h-2 w-2 rounded-full', s.dot)} />
                          {s.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TaskFormField>
            ) : null}
          </div>
        </TaskFormSection>

        <TaskFormSection
          title="Assignees"
          subtitle="Who should work on this task"
          icon={<Users className="h-4 w-4" />}
          accent="purple"
          aside={
            <Badge variant="outline" className="rounded-xl tabular-nums">
              {selectedUsers.length} selected
            </Badge>
          }
        >
          <div className="flex flex-col gap-3">
            {selectedUserObjects.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {selectedUserObjects.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex max-w-full items-center gap-2 rounded-xl border border-border/60 bg-background py-0.5 pl-0.5 pr-1.5 text-xs"
                  >
                    <UserAvatar name={displayName(u)} avatar={u.avatar} size="sm" />
                    <span className="truncate font-medium">{displayName(u)}</span>
                    <button
                      type="button"
                      onClick={() => toggleUser(u.id)}
                      className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Remove ${displayName(u)}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => onSelectedUsersChange([])}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </button>
              </div>
            ) : null}

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value.slice(0, 100))}
                placeholder="Search by name or email…"
                autoComplete="off"
                className={cn(taskFieldControlClass, 'pl-9')}
                aria-label="Search team members"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by role">
                {roleTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={roleFilter === tab.key}
                    onClick={() => setRoleFilter(tab.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
                      roleFilter === tab.key
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border/60 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {tab.label}
                    <span className="tabular-nums opacity-70">{tab.count}</span>
                  </button>
                ))}
              </div>
              {visibleUsers.length > 0 ? (
                <button
                  type="button"
                  onClick={toggleAllVisible}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {allVisibleSelected ? 'Deselect shown' : `Select shown (${visibleUsers.length})`}
                </button>
              ) : null}
            </div>

            <div
              className={cn(
                'max-h-72 overflow-y-auto rounded-xl border bg-background [scrollbar-width:thin]',
                attempted && assigneeError ? 'border-destructive' : 'border-border/60'
              )}
            >
              {visibleUsers.length === 0 ? (
                <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
                  <Users className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-medium">No team members found</p>
                  <p className="text-xs text-muted-foreground">Try another name or role filter.</p>
                </div>
              ) : (
                <ul className="flex flex-col divide-y divide-border/60">
                  {visibleUsers.map((user) => {
                    const checked = selectedSet.has(user.id);
                    const role = (user.role || 'user').toLowerCase();
                    return (
                      <li key={user.id}>
                        <label
                          className={cn(
                            'flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors',
                            checked ? 'bg-primary/5' : 'hover:bg-muted/60'
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleUser(user.id)}
                            aria-label={`Assign ${displayName(user)}`}
                            className="rounded-md"
                          />
                          <UserAvatar name={displayName(user)} avatar={user.avatar} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{displayName(user)}</p>
                            {user.email ? (
                              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                            ) : null}
                          </div>
                          <Badge
                            variant="outline"
                            className={cn('shrink-0 rounded-xl text-[11px]', ROLE_BADGE[role])}
                          >
                            {roleLabel(role)}
                          </Badge>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {attempted && assigneeError ? (
              <p className="text-xs text-destructive" role="alert">
                {assigneeError}
              </p>
            ) : null}
          </div>
        </TaskFormSection>
      </form>
    </TaskFormDialogShell>
  );
}
