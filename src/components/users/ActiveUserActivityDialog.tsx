import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActiveTodayWorkSummary } from "@/components/users/ActiveTodayWorkSummary";
import { useAuth } from "@/context/AuthContext";
import { cn, getEffectiveRole } from "@/lib/utils";
import {
  userService,
  type UserActivitySnapshot,
  type UserActivitySnapshotItem,
  type UserActivityWorkHistoryDay,
} from "@/services/userService";
import { User } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import {
  Bug,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FolderKanban,
  Loader2,
  StickyNote,
  X,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ActiveUserActivityDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PresenceBadge({ status }: { status?: User["status"] }) {
  const label = status === "active" ? "Active" : status === "idle" ? "Idle" : "Offline";
  const color =
    status === "active"
      ? "bg-emerald-500"
      : status === "idle"
        ? "bg-amber-500"
        : "bg-muted-foreground/50";

  return (
    <Badge variant="secondary" className="gap-1.5 rounded-full px-2.5 font-normal">
      <span className={cn("h-1.5 w-1.5 rounded-full", color, status === "active" && "animate-pulse")} />
      {label}
    </Badge>
  );
}

function RoleBadge({ role }: { role?: string }) {
  return (
    <Badge variant="outline" className="rounded-full capitalize font-normal">
      {role || "user"}
    </Badge>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/10 py-12 text-center text-muted-foreground">
      <ClipboardList className="mb-3 h-8 w-8 opacity-35" />
      <p className="max-w-xs text-sm leading-relaxed">{message}</p>
    </div>
  );
}

function TaskSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2.5">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h4>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li
            key={`${title}-${idx}`}
            className="rounded-xl border border-border/50 bg-muted/20 px-3.5 py-2.5 text-sm leading-relaxed text-foreground"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActivityListItem({
  item,
  href,
  meta,
  onNavigate,
}: {
  item: UserActivitySnapshotItem;
  href: string;
  meta?: string;
  onNavigate: (href: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(href)}
      className="group flex w-full items-start gap-3 rounded-xl border border-border/50 bg-card/60 px-3.5 py-3 text-left transition-colors hover:border-border hover:bg-accent/30"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
          {item.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {item.project_name ? <span className="truncate">{item.project_name}</span> : null}
          {item.status ? (
            <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px] capitalize">
              {item.status.replace(/_/g, " ")}
            </Badge>
          ) : null}
          {item.priority ? (
            <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] capitalize">
              {item.priority}
            </Badge>
          ) : null}
          {meta ? <span>{meta}</span> : null}
        </div>
      </div>
      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function formatRelative(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value.includes("T") ? value : value.replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T"));
  if (Number.isNaN(date.getTime())) return undefined;
  return formatDistanceToNow(date, { addSuffix: true });
}

function formatDayLabel(dateStr?: string | null, isToday?: boolean) {
  if (!dateStr) return isToday ? "Today" : "Unknown day";
  const parsed = parseISO(dateStr.length > 10 ? dateStr : `${dateStr}T00:00:00`);
  if (!isValid(parsed)) return dateStr;
  if (isToday) return `Today · ${format(parsed, "EEE, d MMM yyyy")}`;
  return format(parsed, "EEE, d MMM yyyy");
}

function PlannedDayCard({ day }: { day: UserActivityWorkHistoryDay }) {
  const projectNames = day.project_names || [];
  const notesLines = day.tasks?.upcoming || [];
  const plannedWork = (day.planned_work || "").trim();
  const plannedNotes = (day.planned_work_notes || "").trim();
  const rawNotes = (day.notes || "").trim();
  const hasNotes = notesLines.length > 0 || !!plannedNotes || (!!rawNotes && notesLines.length === 0);

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border px-4 py-3.5",
        day.is_today
          ? "border-primary/30 bg-gradient-to-br from-primary/10 via-muted/20 to-muted/5"
          : "border-border/50 bg-muted/10"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-foreground">
            {formatDayLabel(day.submission_date, day.is_today)}
          </h4>
          {day.is_today ? (
            <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px]">
              Today
            </Badge>
          ) : null}
        </div>
        {typeof day.hours_today === "number" && day.hours_today > 0 ? (
          <span className="text-xs tabular-nums text-muted-foreground">
            {Number.isInteger(day.hours_today) ? `${day.hours_today}h` : `${day.hours_today.toFixed(1)}h`} worked
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <FolderKanban className="h-3.5 w-3.5" />
          Planned projects
        </div>
        {projectNames.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {projectNames.map((name) => (
              <Badge key={name} variant="secondary" className="rounded-full font-normal">
                {name}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No planned projects</p>
        )}
      </div>

      {plannedWork ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Planned work
            </span>
            {day.planned_work_status ? (
              <Badge variant="outline" className="h-5 rounded-full capitalize text-[10px]">
                {day.planned_work_status.replace(/_/g, " ")}
              </Badge>
            ) : null}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{plannedWork}</p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <StickyNote className="h-3.5 w-3.5" />
          Notes
        </div>
        {hasNotes ? (
          <div className="space-y-2">
            {plannedNotes ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {plannedNotes}
              </p>
            ) : null}
            {notesLines.length > 0 ? (
              <ul className="space-y-1.5">
                {notesLines.map((line, idx) => (
                  <li
                    key={`${day.submission_date}-note-${idx}`}
                    className="rounded-lg border border-border/40 bg-background/50 px-3 py-2 text-sm leading-relaxed"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            ) : rawNotes && !plannedNotes ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{rawNotes}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No notes</p>
        )}
      </div>
    </div>
  );
}

export function ActiveUserActivityDialog({
  user,
  open,
  onOpenChange,
}: ActiveUserActivityDialogProps) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const rolePath = getEffectiveRole(currentUser || { role: "admin" });

  const { data, isLoading, error } = useQuery<UserActivitySnapshot>({
    queryKey: ["user-activity-snapshot", user?.id],
    queryFn: () => userService.getActivitySnapshot(user!.id),
    enabled: open && !!user?.id,
    staleTime: 30_000,
  });

  const snapshotUser = data?.user ?? user;
  const avatar =
    snapshotUser?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      snapshotUser?.username || snapshotUser?.name || "U"
    )}&background=3b82f6&color=fff`;

  const work = data?.work;
  const workHistory = data?.work_history || [];
  const counts = data?.counts;
  const assignedProjects = data?.assigned_projects || [];

  const navigateAndClose = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[88vh] max-w-2xl flex-col gap-0 overflow-hidden border-border/60 bg-background p-0 shadow-2xl sm:max-w-2xl sm:rounded-2xl"
      >
        <DialogHeader className="relative shrink-0 space-y-4 border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent px-5 pb-4 pt-5 text-left sm:px-6 sm:pt-6">
          <div className="flex items-start gap-3.5 pr-12">
            <div className="relative shrink-0">
              <img
                src={avatar}
                alt={snapshotUser?.username || "User"}
                className="h-14 w-14 rounded-full border border-border/60 object-cover shadow-sm"
              />
              <span
                className={cn(
                  "absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-background",
                  snapshotUser?.status === "active"
                    ? "bg-emerald-500"
                    : snapshotUser?.status === "idle"
                      ? "bg-amber-500"
                      : "bg-muted-foreground/60"
                )}
                aria-hidden
              />
            </div>

            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-xl font-semibold tracking-tight">
                {snapshotUser?.username || snapshotUser?.name || "User"}
              </DialogTitle>
              <DialogDescription className="mt-1 truncate text-sm">
                {snapshotUser?.email || "Team member activity for today"}
              </DialogDescription>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <RoleBadge role={snapshotUser?.role} />
                <PresenceBadge status={snapshotUser?.status || user?.status} />
              </div>
            </div>
          </div>

          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 h-9 w-9 rounded-full border border-border/60 bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm hover:bg-accent hover:text-foreground sm:right-4 sm:top-4"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>

          <ActiveTodayWorkSummary
            checkInTime={work?.check_in_time ?? user?.check_in_time}
            breakMinutes={work?.break_minutes ?? user?.today_break_minutes ?? 0}
            hoursWorked={work?.hours_today ?? user?.today_hours_worked ?? 0}
            checkoutTime={work?.checkout_time ?? user?.checkout_time}
          />
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {isLoading ? (
            <div className="space-y-3 py-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading activity…
              </div>
              <Skeleton className="h-11 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : error ? (
            <EmptyState message={error instanceof Error ? error.message : "Failed to load activity"} />
          ) : (
            <Tabs defaultValue="work" className="w-full">
              <TabsList className="mb-5 grid h-11 w-full grid-cols-4 rounded-xl bg-muted/50 p-1">
                <TabsTrigger value="work" className="rounded-lg text-xs sm:text-sm">
                  Work
                </TabsTrigger>
                <TabsTrigger value="bugs" className="gap-1.5 rounded-lg text-xs sm:text-sm">
                  <Bug className="hidden h-3.5 w-3.5 sm:inline" />
                  Bugs
                  {typeof counts?.bugs === "number" ? (
                    <span className="tabular-nums text-muted-foreground">{counts.bugs}</span>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="fixes" className="gap-1.5 rounded-lg text-xs sm:text-sm">
                  <Wrench className="hidden h-3.5 w-3.5 sm:inline" />
                  Fixes
                  {typeof counts?.fixes === "number" ? (
                    <span className="tabular-nums text-muted-foreground">{counts.fixes}</span>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="updates" className="gap-1.5 rounded-lg text-xs sm:text-sm">
                  <CheckCircle2 className="hidden h-3.5 w-3.5 sm:inline" />
                  Updates
                  {typeof counts?.updates === "number" ? (
                    <span className="tabular-nums text-muted-foreground">{counts.updates}</span>
                  ) : null}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="work" className="mt-0 space-y-4">
                {assignedProjects.length > 0 ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Assigned projects
                      </h4>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        ({assignedProjects.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {assignedProjects.map((project) => (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => navigateAndClose(`/${rolePath}/projects/${project.id}`)}
                          className="inline-flex"
                        >
                          <Badge
                            variant="outline"
                            className="rounded-full border-border/70 px-2.5 py-1 font-normal transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
                          >
                            {project.name}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Planned projects &amp; notes
                    </h4>
                    {workHistory.length > 0 ? (
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {workHistory.length} day{workHistory.length === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>

                  {workHistory.length > 0 ? (
                    <div className="space-y-3">
                      {workHistory.map((day) => (
                        <PlannedDayCard
                          key={`${day.submission_date}-${day.id ?? "row"}`}
                          day={day}
                        />
                      ))}
                    </div>
                  ) : !work ? (
                    <EmptyState message="No planned projects or notes for today or previous days." />
                  ) : (
                    <EmptyState message="Checked in, but no planned projects or notes yet." />
                  )}
                </div>

                {work &&
                ((work.tasks?.completed?.length || 0) > 0 ||
                  (work.tasks?.ongoing?.length || 0) > 0 ||
                  (work.tasks?.pending?.length || 0) > 0 ||
                  (work.project_updates?.length || 0) > 0) ? (
                  <div className="space-y-4 border-t border-border/40 pt-4">
                    <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Today&apos;s task update
                    </h4>
                    <TaskSection title="Completed" items={work.tasks?.completed || []} />
                    <TaskSection title="Ongoing" items={work.tasks?.ongoing || []} />
                    <TaskSection title="Pending" items={work.tasks?.pending || []} />

                    {work.project_updates && work.project_updates.length > 0 ? (
                      <div className="space-y-2.5">
                        <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          Project updates
                        </h4>
                        {work.project_updates.map((pu, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-border/50 bg-muted/15 px-3.5 py-3 text-sm"
                          >
                            {pu.project_name ? (
                              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                                {pu.project_name}
                              </p>
                            ) : null}
                            <p className="whitespace-pre-wrap leading-relaxed">{pu.update || "—"}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="bugs" className="mt-0 space-y-2.5">
                {(data?.bugs || []).length === 0 ? (
                  <EmptyState message="No bugs raised by this user." />
                ) : (
                  (data?.bugs || []).map((bug) => (
                    <ActivityListItem
                      key={bug.id}
                      item={bug}
                      href={`/${rolePath}/bugs/${bug.id}`}
                      meta={formatRelative(bug.created_at)}
                      onNavigate={navigateAndClose}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="fixes" className="mt-0 space-y-2.5">
                {(data?.fixes || []).length === 0 ? (
                  <EmptyState message="No fixes recorded for this user." />
                ) : (
                  (data?.fixes || []).map((fix) => (
                    <ActivityListItem
                      key={fix.id}
                      item={fix}
                      href={`/${rolePath}/bugs/${fix.id}`}
                      meta={formatRelative(fix.updated_at || fix.created_at)}
                      onNavigate={navigateAndClose}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="updates" className="mt-0 space-y-2.5">
                {(data?.updates || []).length === 0 ? (
                  <EmptyState message="No project updates authored by this user." />
                ) : (
                  (data?.updates || []).map((update) => (
                    <ActivityListItem
                      key={update.id}
                      item={update}
                      href={`/${rolePath}/updates/${update.id}`}
                      meta={formatRelative(update.created_at)}
                      onNavigate={navigateAndClose}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
