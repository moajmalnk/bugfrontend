import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatWorkSubmissionSubmittedAt, normalizeYmdDateString } from "@/lib/dateUtils";
import { lookupProjectName, parsePlannedProjectIds, resolveSubmissionProjectNames } from "@/lib/periodDetailsFilters";
import { formatProjectUpdatesForText, parseProjectUpdatesFromRow } from "@/lib/projectWorkUpdates";
import { formatWorkingDaysPeriodLabel } from "@/lib/workPeriodUtils";
import {
  adminUpdateWorkSubmission,
  deleteSubmission,
} from "@/services/todoService";
import { format } from "date-fns";
import { Calendar, Clock, FolderOpen, Loader2, Pencil, Trash2, UserRound } from "lucide-react";

function splitLines(text?: string | null): string[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(items: string[]): string {
  return items.map((l) => l.trim()).filter(Boolean).join("\n");
}

function formatDayLabel(value: unknown): string {
  const ymd = normalizeYmdDateString(value);
  if (!ymd) return "—";
  const d = new Date(`${ymd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? ymd : format(d, "MMM dd, yyyy");
}

function parseProjectNames(
  submission: Record<string, any>,
  projectNameById?: Map<string, string>
): string[] {
  if (projectNameById && projectNameById.size > 0) {
    return resolveSubmissionProjectNames(submission, projectNameById);
  }
  if (Array.isArray(submission.project_names) && submission.project_names.length > 0) {
    return submission.project_names
      .map((name: unknown) => String(name).trim())
      .filter(Boolean)
      .filter(
        (name) =>
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name)
      );
  }
  const ids = parsePlannedProjectIds(submission);
  return ids
    .map((id) => (projectNameById ? lookupProjectName(id, projectNameById) : id))
    .filter((name) => name && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name));
}

function TaskBlock({
  title,
  colorClass,
  borderClass,
  items,
}: {
  title: string;
  colorClass: string;
  borderClass: string;
  items: string[];
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-1.5">
      <p className={`text-xs font-semibold ${colorClass}`}>
        {title} ({items.length})
      </p>
      <ul className="space-y-1">
        {items.map((item, idx) => (
          <li
            key={idx}
            className={`text-sm text-gray-700 dark:text-gray-300 pl-3 border-l-2 ${borderClass} whitespace-pre-wrap break-words`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

type EditFormState = {
  hours_today: string;
  overtime_hours: string;
  requested_extra_hours: string;
  extra_hours_approval_status: string;
  check_in_time: string;
  start_time: string;
  completed_tasks: string;
  pending_tasks: string;
  ongoing_tasks: string;
  notes: string;
  planned_work: string;
  planned_work_status: string;
  planned_work_notes: string;
  planned_projects: string;
  break_entries: string;
  total_break_minutes: string;
  approval_reason: string;
  admin_note: string;
};

function buildEditForm(submission: Record<string, any>): EditFormState {
  const completed =
    submission.tasks?.completed ?? splitLines(submission.completed_tasks);
  const pending = submission.tasks?.pending ?? splitLines(submission.pending_tasks);
  const ongoing = submission.tasks?.ongoing ?? splitLines(submission.ongoing_tasks);
  const upcoming =
    submission.tasks?.upcoming ?? splitLines(submission.upcoming_tasks ?? submission.notes);
  const projectIds = parsePlannedProjectIds(submission);
  const breakEntries = Array.isArray(submission.break_entries)
    ? submission.break_entries.map((e: unknown) => String(e))
    : [];

  return {
    hours_today: String(Number(submission.hours ?? submission.hours_today ?? 0)),
    overtime_hours: String(Number(submission.overtime_hours ?? 0)),
    requested_extra_hours: String(Number(submission.requested_extra_hours ?? 0)),
    extra_hours_approval_status: String(submission.extra_hours_approval_status || "none"),
    check_in_time: String(submission.check_in_time || ""),
    start_time: String(submission.start_time || ""),
    completed_tasks: joinLines(completed),
    pending_tasks: joinLines(pending),
    ongoing_tasks: joinLines(ongoing),
    notes: joinLines(upcoming),
    planned_work: String(submission.planned_work || ""),
    planned_work_status: String(submission.planned_work_status || ""),
    planned_work_notes: String(submission.planned_work_notes || ""),
    planned_projects: projectIds.join("\n"),
    break_entries: breakEntries.join("\n"),
    total_break_minutes: String(Math.max(0, Number(submission.break_minutes ?? 0))),
    approval_reason: String(submission.approval_reason || ""),
    admin_note: "",
  };
}

export function DailySubmissionDetailCard({
  submission,
  showUser = false,
  monthToDate,
  projectNameById,
  canAdminEdit = false,
  onChanged,
}: {
  submission: Record<string, any>;
  showUser?: boolean;
  monthToDate?: { days: number; hours: number; date: string } | null;
  projectNameById?: Map<string, string>;
  canAdminEdit?: boolean;
  onChanged?: () => void | Promise<void>;
}) {
  const dayKey = normalizeYmdDateString(submission.date ?? submission.submission_date);
  const hours = Number(submission.hours ?? submission.hours_today ?? 0);
  const ot = Number(submission.overtime_hours ?? 0);
  const requested = Number(submission.requested_extra_hours ?? 0);
  const breakMin = Math.max(0, Number(submission.break_minutes ?? 0));
  const submissionId = Number(submission.id ?? 0);

  const completed =
    submission.tasks?.completed ?? splitLines(submission.completed_tasks);
  const pending = submission.tasks?.pending ?? splitLines(submission.pending_tasks);
  const ongoing = submission.tasks?.ongoing ?? splitLines(submission.ongoing_tasks);
  const upcoming =
    submission.tasks?.upcoming ?? splitLines(submission.upcoming_tasks ?? submission.notes);

  const projectNames = parseProjectNames(submission, projectNameById);
  const periodLabel = dayKey ? formatWorkingDaysPeriodLabel(dayKey) : "";
  const mtd = monthToDate ?? null;
  const submittedAt = formatWorkSubmissionSubmittedAt(
    dayKey,
    submission.submitted_at ?? submission.updated_at,
    submission.created_at,
    submission.check_in_time
  );

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<EditFormState>(() => buildEditForm(submission));

  useEffect(() => {
    if (editOpen) setForm(buildEditForm(submission));
  }, [editOpen, submission]);

  const canMutate = canAdminEdit && submissionId > 0;

  const setField = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    if (!canMutate) return;
    const hoursNum = Number(form.hours_today);
    if (Number.isNaN(hoursNum) || hoursNum < 0 || hoursNum > 24) {
      toast({
        title: "Invalid hours",
        description: "Hours must be between 0 and 24.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await adminUpdateWorkSubmission({
        id: submissionId,
        hours_today: hoursNum,
        overtime_hours: Math.max(0, Number(form.overtime_hours) || 0),
        requested_extra_hours: Math.max(0, Number(form.requested_extra_hours) || 0),
        extra_hours_approval_status: form.extra_hours_approval_status || "none",
        approval_reason: form.approval_reason.trim() || null,
        check_in_time: form.check_in_time.trim() || null,
        start_time: form.start_time.trim() || null,
        completed_tasks: form.completed_tasks,
        pending_tasks: form.pending_tasks,
        ongoing_tasks: form.ongoing_tasks,
        notes: form.notes,
        planned_work: form.planned_work.trim() || null,
        planned_work_status: form.planned_work_status.trim() || null,
        planned_work_notes: form.planned_work_notes.trim() || null,
        planned_projects: form.planned_projects
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        break_entries: form.break_entries
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        total_break_minutes: Math.max(0, Number(form.total_break_minutes) || 0),
        admin_note: form.admin_note.trim() || undefined,
      });
      toast({ title: "Submission updated", description: formatDayLabel(dayKey) });
      setEditOpen(false);
      await onChanged?.();
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!canMutate) return;
    setDeleting(true);
    try {
      await deleteSubmission({ id: submissionId });
      toast({ title: "Submission deleted", description: formatDayLabel(dayKey) });
      setDeleteOpen(false);
      await onChanged?.();
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const fieldClass =
    "rounded-xl border-border/60 bg-background/60 focus-visible:ring-blue-500/40";

  return (
    <div className="rounded-2xl border border-border/60 bg-background/50 p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatDayLabel(dayKey)}
            </span>
            {String(submission.day_status || '') === 'leave' ? (
              <Badge className="bg-teal-100 text-teal-900 border-teal-200 dark:bg-teal-950/50 dark:text-teal-200 dark:border-teal-800">
                On leave
                {submission.leave_type_name ? ` (${submission.leave_type_name})` : ''}
              </Badge>
            ) : null}
            {showUser && submission.username ? (
              <Badge variant="outline" className="gap-1 text-xs">
                <UserRound className="h-3 w-3" />
                {submission.username}
                {submission.role ? ` · ${String(submission.role).toUpperCase()}` : ""}
              </Badge>
            ) : null}
          </div>
          {submittedAt ? (
            <div className="flex items-start gap-2 text-xs text-muted-foreground ml-6">
              <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                {submittedAt.label} ·{" "}
                <span className="tabular-nums text-foreground/80">{submittedAt.text}</span>
              </span>
            </div>
          ) : null}
          {submission.start_time || submission.check_in_time ? (
            <p className="text-xs text-muted-foreground ml-6">
              {submission.check_in_time
                ? `Check-in: ${submission.check_in_time}`
                : submission.start_time
                  ? `Start: ${submission.start_time}`
                  : null}
            </p>
          ) : null}
        </div>
        <div className="flex items-start gap-2 shrink-0">
          {canMutate ? (
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg gap-1.5"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg gap-1.5 text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          ) : null}
          <div className="text-right">
            <div className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
              {hours.toFixed(1)}h
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">OT {ot.toFixed(1)}h</div>
          </div>
        </div>
      </div>

      {String(submission.day_status || '') === 'leave' ? (
        <div className="rounded-xl border border-teal-200/70 dark:border-teal-800/50 bg-teal-50/70 dark:bg-teal-950/30 px-3 py-2.5 text-xs space-y-1">
          <div className="font-semibold text-teal-800 dark:text-teal-200">
            Leave day
            {submission.leave_type_name ? ` · ${submission.leave_type_name}` : ''}
          </div>
          <p className="text-teal-700/90 dark:text-teal-300/90">
            {String(submission.leave_type_code || '').toLowerCase() === 'paid'
              ? 'Paid leave credited as 8 work hours for this day.'
              : 'Attendance is blocked for this approved leave day.'}
            {submission.leave_request_id
              ? ` · Request #${submission.leave_request_id}`
              : ''}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="rounded-xl border border-border/50 bg-card/40 px-3 py-2">
          <span className="text-muted-foreground">Completed</span>
          <div className="font-semibold text-red-600 dark:text-red-400">
            {submission.completed_count ?? completed.length}
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/40 px-3 py-2">
          <span className="text-muted-foreground">Pending</span>
          <div className="font-semibold text-yellow-600 dark:text-yellow-400">
            {submission.pending_count ?? pending.length}
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/40 px-3 py-2">
          <span className="text-muted-foreground">Ongoing</span>
          <div className="font-semibold text-blue-600 dark:text-blue-400">
            {submission.ongoing_count ?? ongoing.length}
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/40 px-3 py-2">
          <span className="text-muted-foreground">Upcoming</span>
          <div className="font-semibold text-purple-600 dark:text-purple-400">
            {submission.upcoming_count ?? upcoming.length}
          </div>
        </div>
      </div>

      {mtd && periodLabel ? (
        <div className="rounded-xl border border-blue-200/40 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 px-3 py-2 text-xs text-blue-900 dark:text-blue-100">
          <span className="font-medium">Month to date ({periodLabel}):</span>{" "}
          <span className="tabular-nums">{mtd.days} days</span> ·{" "}
          <span className="tabular-nums">{mtd.hours} hours</span>
        </div>
      ) : null}

      {projectNames.length > 0 ? (
        <div className="rounded-xl border border-emerald-200/40 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 px-3 py-2.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            <FolderOpen className="h-3.5 w-3.5 shrink-0" />
            Projects
          </div>
          <div className="flex flex-wrap gap-1.5">
            {projectNames.map((name, idx) => (
              <Badge
                key={`${name}-${idx}`}
                variant="secondary"
                className="text-xs bg-white/70 dark:bg-gray-900/50 border border-emerald-200/50 dark:border-emerald-800/50"
              >
                {name}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-3 pt-1 border-t border-border/40">
        <TaskBlock
          title="Completed"
          colorClass="text-red-600 dark:text-red-400"
          borderClass="border-red-400/60"
          items={completed}
        />
        <TaskBlock
          title="Pending"
          colorClass="text-yellow-600 dark:text-yellow-400"
          borderClass="border-yellow-400/60"
          items={pending}
        />
        <TaskBlock
          title="Ongoing"
          colorClass="text-blue-600 dark:text-blue-400"
          borderClass="border-blue-400/60"
          items={ongoing}
        />
        <TaskBlock
          title="Upcoming"
          colorClass="text-purple-600 dark:text-purple-400"
          borderClass="border-purple-400/60"
          items={upcoming}
        />
      </div>

      {(() => {
        const projectUpdates = parseProjectUpdatesFromRow(submission.project_updates);
        if (!projectUpdates.length) return null;
        const text = formatProjectUpdatesForText(
          projectUpdates.map((u) => ({
            ...u,
            project_name:
              u.project_name ||
              (projectNameById ? lookupProjectName(u.project_id, projectNameById) : u.project_id),
          }))
        );
        if (!text) return null;
        return (
          <div className="pt-2 border-t border-border/40 space-y-2">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Project progress</p>
            <pre className="text-xs whitespace-pre-wrap break-words text-gray-600 dark:text-gray-400 font-sans">
              {text}
            </pre>
          </div>
        );
      })()}

      {submission.planned_work ? (
        <div className="pt-2 border-t border-border/40 space-y-1">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Planned work</p>
          <p className="text-sm whitespace-pre-wrap break-words text-gray-600 dark:text-gray-400">
            {submission.planned_work}
          </p>
          {submission.planned_work_status ? (
            <Badge variant="outline" className="text-xs capitalize">
              {String(submission.planned_work_status).replace(/_/g, " ")}
            </Badge>
          ) : null}
          {submission.planned_work_notes ? (
            <p className="text-xs italic text-muted-foreground whitespace-pre-wrap">
              {submission.planned_work_notes}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
        <div className="rounded-lg bg-card/30 px-2.5 py-2">
          <span className="text-muted-foreground">OT requested</span>
          <div className="font-semibold text-amber-600 tabular-nums">{requested.toFixed(1)}h</div>
        </div>
        <div className="rounded-lg bg-card/30 px-2.5 py-2">
          <span className="text-muted-foreground">Break</span>
          <div className="font-semibold text-cyan-600 tabular-nums">{breakMin}m</div>
        </div>
        {submission.extra_hours_approval_status ? (
          <div className="rounded-lg bg-card/30 px-2.5 py-2 col-span-2 sm:col-span-2">
            <span className="text-muted-foreground">OT status</span>
            <div className="font-semibold capitalize">
              {String(submission.extra_hours_approval_status).replace(/_/g, " ")}
            </div>
          </div>
        ) : null}
      </div>

      {Array.isArray(submission.break_entries) && submission.break_entries.length > 0 ? (
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1 font-medium text-cyan-700 dark:text-cyan-300">
            <Clock className="h-3.5 w-3.5" />
            Break entries
          </div>
          {submission.break_entries.map((entry: string, idx: number) => (
            <div key={idx}>{entry}</div>
          ))}
        </div>
      ) : null}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit submission · {formatDayLabel(dayKey)}</DialogTitle>
            <DialogDescription>
              Update hours, tasks, breaks, OT, and planned work for this day.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor={`hours-${submissionId}`}>Hours today</Label>
              <Input
                id={`hours-${submissionId}`}
                type="number"
                min={0}
                max={24}
                step={0.5}
                className={fieldClass}
                value={form.hours_today}
                onChange={(e) => setField("hours_today", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`ot-${submissionId}`}>Approved OT (h)</Label>
              <Input
                id={`ot-${submissionId}`}
                type="number"
                min={0}
                step={0.5}
                className={fieldClass}
                value={form.overtime_hours}
                onChange={(e) => setField("overtime_hours", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`req-ot-${submissionId}`}>OT requested (h)</Label>
              <Input
                id={`req-ot-${submissionId}`}
                type="number"
                min={0}
                step={0.5}
                className={fieldClass}
                value={form.requested_extra_hours}
                onChange={(e) => setField("requested_extra_hours", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`ot-status-${submissionId}`}>OT status</Label>
              <Select
                value={form.extra_hours_approval_status || "none"}
                onValueChange={(v) => setField("extra_hours_approval_status", v)}
              >
                <SelectTrigger
                  id={`ot-status-${submissionId}`}
                  className={`h-10 ${fieldClass}`}
                >
                  <SelectValue placeholder="Select OT status" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="changed">Changed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`checkin-${submissionId}`}>Check-in time</Label>
              <Input
                id={`checkin-${submissionId}`}
                className={fieldClass}
                placeholder="2026-07-10 09:49:36"
                value={form.check_in_time}
                onChange={(e) => setField("check_in_time", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`start-${submissionId}`}>Start time</Label>
              <Input
                id={`start-${submissionId}`}
                className={fieldClass}
                placeholder="09:49:00"
                value={form.start_time}
                onChange={(e) => setField("start_time", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`break-min-${submissionId}`}>Break minutes</Label>
              <Input
                id={`break-min-${submissionId}`}
                type="number"
                min={0}
                className={fieldClass}
                value={form.total_break_minutes}
                onChange={(e) => setField("total_break_minutes", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`plan-status-${submissionId}`}>Planned work status</Label>
              <Select
                value={form.planned_work_status || "__none__"}
                onValueChange={(v) =>
                  setField("planned_work_status", v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger
                  id={`plan-status-${submissionId}`}
                  className={`h-10 ${fieldClass}`}
                >
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="__none__">—</SelectItem>
                  <SelectItem value="not_started">Not started</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">✓ Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`completed-${submissionId}`}>Completed tasks (one per line)</Label>
              <Textarea
                id={`completed-${submissionId}`}
                className={`min-h-[72px] ${fieldClass}`}
                value={form.completed_tasks}
                onChange={(e) => setField("completed_tasks", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`pending-${submissionId}`}>Pending tasks</Label>
              <Textarea
                id={`pending-${submissionId}`}
                className={`min-h-[72px] ${fieldClass}`}
                value={form.pending_tasks}
                onChange={(e) => setField("pending_tasks", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`ongoing-${submissionId}`}>Ongoing tasks</Label>
              <Textarea
                id={`ongoing-${submissionId}`}
                className={`min-h-[72px] ${fieldClass}`}
                value={form.ongoing_tasks}
                onChange={(e) => setField("ongoing_tasks", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`upcoming-${submissionId}`}>Upcoming / notes</Label>
              <Textarea
                id={`upcoming-${submissionId}`}
                className={`min-h-[72px] ${fieldClass}`}
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`projects-${submissionId}`}>Project IDs (one per line)</Label>
              <Textarea
                id={`projects-${submissionId}`}
                className={`min-h-[56px] font-mono text-xs ${fieldClass}`}
                value={form.planned_projects}
                onChange={(e) => setField("planned_projects", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`planned-${submissionId}`}>Planned work</Label>
              <Textarea
                id={`planned-${submissionId}`}
                className={`min-h-[56px] ${fieldClass}`}
                value={form.planned_work}
                onChange={(e) => setField("planned_work", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`planned-notes-${submissionId}`}>Planned work notes</Label>
              <Textarea
                id={`planned-notes-${submissionId}`}
                className={`min-h-[56px] ${fieldClass}`}
                value={form.planned_work_notes}
                onChange={(e) => setField("planned_work_notes", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`breaks-${submissionId}`}>Break entries (one per line)</Label>
              <Textarea
                id={`breaks-${submissionId}`}
                className={`min-h-[56px] ${fieldClass}`}
                value={form.break_entries}
                onChange={(e) => setField("break_entries", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`approval-reason-${submissionId}`}>OT approval reason</Label>
              <Textarea
                id={`approval-reason-${submissionId}`}
                className={`min-h-[48px] ${fieldClass}`}
                value={form.approval_reason}
                onChange={(e) => setField("approval_reason", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`admin-note-${submissionId}`}>Admin note (optional audit)</Label>
              <Textarea
                id={`admin-note-${submissionId}`}
                className={`min-h-[48px] ${fieldClass}`}
                placeholder="Why this change was made…"
                value={form.admin_note}
                onChange={(e) => setField("admin_note", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white"
              onClick={() => void onSave()}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this day’s submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the work update for {formatDayLabel(dayKey)}
              {submission.username ? ` (${submission.username})` : ""}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void onConfirmDelete();
              }}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
