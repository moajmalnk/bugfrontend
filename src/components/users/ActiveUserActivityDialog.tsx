import { Badge } from "@/components/ui/badge";
import {
  Dialog,
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
} from "@/services/userService";
import { User } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Bug,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Loader2,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";

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
    <Badge variant="secondary" className="gap-1.5 font-normal">
      <span className={cn("h-1.5 w-1.5 rounded-full", color, status === "active" && "animate-pulse")} />
      {label}
    </Badge>
  );
}

function RoleBadge({ role }: { role?: string }) {
  return (
    <Badge variant="outline" className="capitalize font-normal">
      {role || "user"}
    </Badge>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
      <ClipboardList className="mb-2 h-8 w-8 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function TaskSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((item, idx) => (
          <li
            key={`${title}-${idx}`}
            className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground"
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
}: {
  item: UserActivitySnapshotItem;
  href: string;
  meta?: string;
}) {
  return (
    <Link
      to={href}
      className="group flex items-start gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-accent/40"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
          {item.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {item.project_name ? <span className="truncate">{item.project_name}</span> : null}
          {item.status ? (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] capitalize">
              {item.status.replace(/_/g, " ")}
            </Badge>
          ) : null}
          {item.priority ? (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] capitalize">
              {item.priority}
            </Badge>
          ) : null}
          {meta ? <span>{meta}</span> : null}
        </div>
      </div>
      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

function formatRelative(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value.includes("T") ? value : value.replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T"));
  if (Number.isNaN(date.getTime())) return undefined;
  return formatDistanceToNow(date, { addSuffix: true });
}

export function ActiveUserActivityDialog({
  user,
  open,
  onOpenChange,
}: ActiveUserActivityDialogProps) {
  const { currentUser } = useAuth();
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
  const counts = data?.counts;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 space-y-3 border-b px-6 pb-4 pt-6 text-left">
          <div className="flex items-start gap-3">
            <img
              src={avatar}
              alt={snapshotUser?.username || "User"}
              className="h-12 w-12 rounded-full border object-cover"
            />
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-lg">
                {snapshotUser?.username || snapshotUser?.name || "User"}
              </DialogTitle>
              <DialogDescription className="mt-1 truncate">
                {snapshotUser?.email || "Team member activity for today"}
              </DialogDescription>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <RoleBadge role={snapshotUser?.role} />
                <PresenceBadge status={snapshotUser?.status || user?.status} />
              </div>
            </div>
          </div>

          <ActiveTodayWorkSummary
            checkInTime={work?.check_in_time ?? user?.check_in_time}
            breakMinutes={work?.break_minutes ?? user?.today_break_minutes ?? 0}
            hoursWorked={work?.hours_today ?? user?.today_hours_worked ?? 0}
            checkoutTime={work?.checkout_time ?? user?.checkout_time}
          />
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading activity…
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : error ? (
            <EmptyState message={error instanceof Error ? error.message : "Failed to load activity"} />
          ) : (
            <Tabs defaultValue="work" className="w-full">
              <TabsList className="mb-4 grid h-auto w-full grid-cols-4">
                <TabsTrigger value="work" className="gap-1 text-xs sm:text-sm">
                  Work
                </TabsTrigger>
                <TabsTrigger value="bugs" className="gap-1 text-xs sm:text-sm">
                  <Bug className="hidden h-3.5 w-3.5 sm:inline" />
                  Bugs
                  {typeof counts?.bugs === "number" ? (
                    <span className="text-muted-foreground">({counts.bugs})</span>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="fixes" className="gap-1 text-xs sm:text-sm">
                  <Wrench className="hidden h-3.5 w-3.5 sm:inline" />
                  Fixes
                  {typeof counts?.fixes === "number" ? (
                    <span className="text-muted-foreground">({counts.fixes})</span>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="updates" className="gap-1 text-xs sm:text-sm">
                  <CheckCircle2 className="hidden h-3.5 w-3.5 sm:inline" />
                  Updates
                  {typeof counts?.updates === "number" ? (
                    <span className="text-muted-foreground">({counts.updates})</span>
                  ) : null}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="work" className="mt-0 space-y-4">
                {!work ? (
                  <EmptyState message="No work submission for today yet." />
                ) : (
                  <>
                    {work.planned_work ? (
                      <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Planned work
                          </h4>
                          {work.planned_work_status ? (
                            <Badge variant="secondary" className="h-5 capitalize">
                              {work.planned_work_status.replace(/_/g, " ")}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="whitespace-pre-wrap text-sm">{work.planned_work}</p>
                        {work.planned_work_notes ? (
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                            {work.planned_work_notes}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {work.project_names && work.project_names.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {work.project_names.map((name) => (
                          <Badge key={name} variant="outline">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    ) : null}

                    <TaskSection title="Completed" items={work.tasks?.completed || []} />
                    <TaskSection title="Ongoing" items={work.tasks?.ongoing || []} />
                    <TaskSection title="Pending" items={work.tasks?.pending || []} />
                    <TaskSection title="Notes / upcoming" items={work.tasks?.upcoming || []} />

                    {work.project_updates && work.project_updates.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Project updates
                        </h4>
                        {work.project_updates.map((pu, idx) => (
                          <div key={idx} className="rounded-md border px-3 py-2 text-sm">
                            {pu.project_name ? (
                              <p className="mb-1 text-xs font-medium text-muted-foreground">
                                {pu.project_name}
                              </p>
                            ) : null}
                            <p className="whitespace-pre-wrap">{pu.update || "—"}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {!work.planned_work &&
                    !(work.tasks?.completed?.length ||
                      work.tasks?.ongoing?.length ||
                      work.tasks?.pending?.length ||
                      work.tasks?.upcoming?.length) &&
                    !(work.project_updates?.length) ? (
                      <EmptyState message="Checked in, but no work details submitted yet." />
                    ) : null}
                  </>
                )}
              </TabsContent>

              <TabsContent value="bugs" className="mt-0 space-y-2">
                {(data?.bugs || []).length === 0 ? (
                  <EmptyState message="No bugs raised by this user." />
                ) : (
                  (data?.bugs || []).map((bug) => (
                    <ActivityListItem
                      key={bug.id}
                      item={bug}
                      href={`/${rolePath}/bugs/${bug.id}`}
                      meta={formatRelative(bug.created_at)}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="fixes" className="mt-0 space-y-2">
                {(data?.fixes || []).length === 0 ? (
                  <EmptyState message="No fixes recorded for this user." />
                ) : (
                  (data?.fixes || []).map((fix) => (
                    <ActivityListItem
                      key={fix.id}
                      item={fix}
                      href={`/${rolePath}/bugs/${fix.id}`}
                      meta={formatRelative(fix.updated_at || fix.created_at)}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="updates" className="mt-0 space-y-2">
                {(data?.updates || []).length === 0 ? (
                  <EmptyState message="No project updates authored by this user." />
                ) : (
                  (data?.updates || []).map((update) => (
                    <ActivityListItem
                      key={update.id}
                      item={update}
                      href={`/${rolePath}/updates/${update.id}`}
                      meta={formatRelative(update.created_at)}
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
