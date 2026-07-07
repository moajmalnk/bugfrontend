import { Badge } from "@/components/ui/badge";
import { formatWorkSubmissionSubmittedAt, normalizeYmdDateString } from "@/lib/dateUtils";
import { lookupProjectName, parsePlannedProjectIds, resolveSubmissionProjectNames } from "@/lib/periodDetailsFilters";
import { formatProjectUpdatesForText, parseProjectUpdatesFromRow } from "@/lib/projectWorkUpdates";
import { formatWorkingDaysPeriodLabel } from "@/lib/workPeriodUtils";
import { format } from "date-fns";
import { Calendar, Clock, FolderOpen, UserRound } from "lucide-react";

function splitLines(text?: string | null): string[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
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

export function DailySubmissionDetailCard({
  submission,
  showUser = false,
  monthToDate,
}: {
  submission: Record<string, any>;
  showUser?: boolean;
  monthToDate?: { days: number; hours: number; date: string } | null;
}) {
  const dayKey = normalizeYmdDateString(submission.date ?? submission.submission_date);
  const hours = Number(submission.hours ?? submission.hours_today ?? 0);
  const ot = Number(submission.overtime_hours ?? 0);
  const requested = Number(submission.requested_extra_hours ?? 0);
  const breakMin = Math.max(0, Number(submission.break_minutes ?? 0));

  const completed =
    submission.tasks?.completed ?? splitLines(submission.completed_tasks);
  const pending = submission.tasks?.pending ?? splitLines(submission.pending_tasks);
  const ongoing = submission.tasks?.ongoing ?? splitLines(submission.ongoing_tasks);
  const upcoming =
    submission.tasks?.upcoming ?? splitLines(submission.upcoming_tasks ?? submission.notes);

  const projectNames = parseProjectNames(submission);
  const periodLabel = dayKey ? formatWorkingDaysPeriodLabel(dayKey) : "";
  const mtd = monthToDate ?? null;
  const submittedAt = formatWorkSubmissionSubmittedAt(
    dayKey,
    submission.submitted_at ?? submission.updated_at,
    submission.created_at,
    submission.check_in_time
  );

  return (
    <div className="rounded-2xl border border-border/60 bg-background/50 p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatDayLabel(dayKey)}
            </span>
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
        <div className="text-right shrink-0">
          <div className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
            {hours.toFixed(1)}h
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">OT {ot.toFixed(1)}h</div>
        </div>
      </div>

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
    </div>
  );
}
