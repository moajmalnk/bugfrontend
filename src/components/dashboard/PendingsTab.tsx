import { DeadlineTable, type ProjectHealth } from "@/components/dashboard/DeadlineTable";
import { StatusBugsTable } from "@/components/dashboard/StatusBugsTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UpdateReviewStatusCell } from "@/components/updates/UpdateTimingInfo";
import { cn } from "@/lib/utils";
import { bugService } from "@/services/bugService";
import type { Update } from "@/services/updateService";
import type { Bug } from "@/types";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Bug as BugIcon,
  CalendarClock,
  ClipboardCheck,
  ListChecks,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

const PANEL =
  "relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg";

function SectionTitle({
  icon: Icon,
  title,
  description,
  gradient = "from-blue-500 to-indigo-600",
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  gradient?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            "shrink-0 rounded-xl bg-gradient-to-br p-2.5 text-white shadow-lg",
            gradient
          )}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white sm:text-xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

function updateTypeLabel(type: Update["type"]): string {
  if (type === "updation") return "Update";
  if (type === "maintenance") return "Maintenance";
  return "Feature";
}

function formatShortDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type QueueChip = {
  id: string;
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  gradient: string;
  chip: string;
  valueClass: string;
};

export type PendingsTabProps = {
  role: string;
  overdue: ProjectHealth[];
  upcoming: ProjectHealth[];
  pendingBugs: Bug[];
  pendingBugCount: number;
  pendingUpdates: Update[];
  retestsPendingCount: number;
  enabled: boolean;
};

export function PendingsTab({
  role,
  overdue,
  upcoming,
  pendingBugs,
  pendingBugCount,
  pendingUpdates,
  retestsPendingCount,
  enabled,
}: PendingsTabProps) {
  const {
    data: retestBugs = [],
    isLoading: retestsLoading,
    isError: retestsError,
  } = useQuery({
    queryKey: ["pending-retests", role],
    queryFn: async () => {
      const result = await bugService.getBugs({
        page: 1,
        limit: 20,
        status: "fixed",
        verificationFilter: "retest_pending",
      });
      return result.bugs ?? [];
    },
    enabled,
    staleTime: 60_000,
  });

  const chips: QueueChip[] = [
    {
      id: "pendings-overdue",
      label: "Overdue",
      value: overdue.length,
      hint: "Past deadline",
      icon: AlertTriangle,
      gradient: "from-red-500 to-orange-600",
      chip: "from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200 dark:border-red-800",
      valueClass: "text-red-700 dark:text-red-300",
    },
    {
      id: "pendings-upcoming",
      label: "Due soon",
      value: upcoming.length,
      hint: "Next 7 days",
      icon: CalendarClock,
      gradient: "from-amber-500 to-yellow-600",
      chip: "from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800",
      valueClass: "text-amber-700 dark:text-amber-300",
    },
    {
      id: "pendings-bugs",
      label: "Pending bugs",
      value: pendingBugCount,
      hint: "Awaiting work",
      icon: BugIcon,
      gradient: "from-orange-500 to-red-600",
      chip: "from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-orange-200 dark:border-orange-800",
      valueClass: "text-orange-700 dark:text-orange-300",
    },
    {
      id: "pendings-retests",
      label: "Retests",
      value: retestsPendingCount,
      hint: "Awaiting verification",
      icon: ClipboardCheck,
      gradient: "from-violet-500 to-purple-600",
      chip: "from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-violet-200 dark:border-violet-800",
      valueClass: "text-violet-700 dark:text-violet-300",
    },
    {
      id: "pendings-updates",
      label: "Pending updates",
      value: pendingUpdates.length,
      hint: "Awaiting approval",
      icon: Megaphone,
      gradient: "from-blue-500 to-indigo-600",
      chip: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800",
      valueClass: "text-blue-700 dark:text-blue-300",
    },
  ];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className={cn(PANEL, "space-y-4 p-5 sm:p-6")}>
        <SectionTitle
          icon={ListChecks}
          title="Action queue"
          description="Everything waiting on a decision or follow-up, ordered by urgency"
          gradient="from-slate-600 to-slate-800"
        />
        <div
          className={cn(
            "grid gap-4 grid-cols-2",
            chips.length <= 3 && "sm:grid-cols-3",
            chips.length === 4 && "sm:grid-cols-2 lg:grid-cols-4",
            chips.length === 5 && "sm:grid-cols-3 xl:grid-cols-5",
            chips.length >= 6 && "sm:grid-cols-3 xl:grid-cols-6"
          )}
        >
          {chips.map((chip) => {
            const Icon = chip.icon;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => scrollTo(chip.id)}
                className={cn(
                  "min-w-0 w-full rounded-2xl border bg-gradient-to-br p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
                  chip.chip
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <span className="min-w-0 line-clamp-2 text-[10px] font-semibold uppercase leading-snug tracking-wider text-gray-500 dark:text-gray-400 sm:text-[11px]">
                    {chip.label}
                  </span>
                  <div
                    className={cn(
                      "shrink-0 rounded-xl bg-gradient-to-br p-2 text-white shadow-md",
                      chip.gradient
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p
                  className={cn(
                    "text-2xl font-bold tabular-nums tracking-tight sm:text-3xl",
                    chip.valueClass
                  )}
                >
                  {chip.value.toLocaleString()}
                </p>
                <p className="mt-1.5 line-clamp-1 text-xs font-medium text-muted-foreground">
                  {chip.hint}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div id="pendings-overdue" className="scroll-mt-24 space-y-4">
        <SectionTitle
          icon={AlertTriangle}
          title="Overdue deadlines"
          description="Active projects past their deadline"
          gradient="from-red-500 to-orange-600"
          action={
            <Badge variant="outline" className="px-2.5 py-1 font-bold tabular-nums">
              {overdue.length}
            </Badge>
          }
        />
        <DeadlineTable
          rows={overdue}
          role={role}
          emptyLabel="No overdue project deadlines."
        />
      </div>

      <div id="pendings-upcoming" className="scroll-mt-24 space-y-4">
        <SectionTitle
          icon={CalendarClock}
          title="Upcoming deadlines"
          description="Due today or within 7 days"
          gradient="from-amber-500 to-yellow-600"
          action={
            <Badge variant="outline" className="px-2.5 py-1 font-bold tabular-nums">
              {upcoming.length}
            </Badge>
          }
        />
        <DeadlineTable
          rows={upcoming}
          role={role}
          emptyLabel="No deadlines in the next week."
        />
      </div>

      <div id="pendings-bugs" className={cn(PANEL, "scroll-mt-24 space-y-4 p-5 sm:p-6")}>
        <SectionTitle
          icon={BugIcon}
          title="Pending bugs"
          description="Bugs waiting to be picked up"
          gradient="from-orange-500 to-red-600"
          action={
            <Button asChild variant="ghost" size="sm" className="font-semibold">
              <Link to={`/${role}/bugs`}>
                All bugs
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          }
        />
        <StatusBugsTable
          bugs={pendingBugs}
          role={role}
          mode="open"
          emptyLabel="No pending bugs right now."
          pageSize={12}
        />
      </div>

      <div id="pendings-retests" className={cn(PANEL, "scroll-mt-24 space-y-4 p-5 sm:p-6")}>
        <SectionTitle
          icon={ClipboardCheck}
          title="Pending retests"
          description="Fixed bugs awaiting tester verification"
          gradient="from-violet-500 to-purple-600"
          action={
            <Button asChild variant="ghost" size="sm" className="font-semibold">
              <Link to={`/${role}/retests`}>
                Open retests
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          }
        />
        {retestsLoading ? (
          <div className="grid grid-cols-12 gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="col-span-12 h-24 rounded-2xl sm:col-span-6" />
            ))}
          </div>
        ) : retestsError ? (
          <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-12 text-center text-sm text-gray-500 dark:border-gray-700">
            Could not load pending retests. Open the Retests page to continue.
          </div>
        ) : (
          <StatusBugsTable
            bugs={retestBugs}
            role={role}
            mode="fixed"
            emptyLabel="No bugs waiting for retest."
            pageSize={12}
          />
        )}
      </div>

      <div id="pendings-updates" className={cn(PANEL, "scroll-mt-24 space-y-4 p-5 sm:p-6")}>
        <SectionTitle
          icon={Megaphone}
          title="Pending updates"
          description="Update requests awaiting approval"
          gradient="from-blue-500 to-indigo-600"
          action={
            <Button asChild variant="ghost" size="sm" className="font-semibold">
              <Link to={`/${role}/updates`}>
                All updates
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          }
        />
        {pendingUpdates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-12 text-center text-sm text-gray-500 dark:border-gray-700">
            No updates awaiting approval.
          </div>
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 dark:bg-gray-800/50 dark:hover:bg-gray-800/50">
                  <TableHead className="font-semibold">Update</TableHead>
                  <TableHead className="font-semibold">Project</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Owner</TableHead>
                  <TableHead className="font-semibold">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUpdates.slice(0, 20).map((update) => (
                  <TableRow key={update.id}>
                    <TableCell>
                      <Link
                        to={`/${role}/updates/${update.id}`}
                        className="line-clamp-1 max-w-[220px] font-semibold hover:text-violet-600 dark:hover:text-violet-400 sm:max-w-xs"
                      >
                        {update.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {update.project_id ? (
                        <Link
                          to={`/${role}/projects/${update.project_id}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {update.project_name || "—"}
                        </Link>
                      ) : (
                        update.project_name || "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium capitalize">
                        {updateTypeLabel(update.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <UpdateReviewStatusCell update={update} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {update.created_by_name || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                      {formatShortDate(update.updated_at || update.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
