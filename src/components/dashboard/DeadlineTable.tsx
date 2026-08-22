import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  formatProjectDate,
  getProjectStatusLabel,
  type Project,
  type ProjectStatus,
} from "@/lib/utils/projectUtils";
import { CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";

export type DeadlineBucket = "overdue" | "today" | "week" | "later" | "none";

export type ProjectHealth = {
  project: Project;
  openBugs: number;
  highBugs: number;
  fixedBugs: number;
  updatesCount: number;
  totalBugs: number;
  deadline: Date | null;
  bucket: DeadlineBucket;
  daysUntil: number | null;
};

const PANEL =
  "relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg";

function statusBadgeClass(status: ProjectStatus): string {
  switch (status) {
    case "active":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
    case "release_ready":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
    case "completed":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
    case "archived":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
    default:
      return "";
  }
}

function deadlineLabel(bucket: DeadlineBucket, daysUntil: number | null): string {
  if (bucket === "none" || daysUntil === null) return "No deadline";
  if (bucket === "overdue") return `${Math.abs(daysUntil)}d overdue`;
  if (bucket === "today") return "Due today";
  if (daysUntil === 1) return "1 day left";
  return `${daysUntil} days left`;
}

function deadlineTone(bucket: DeadlineBucket): string {
  if (bucket === "overdue") return "text-red-600 dark:text-red-400";
  if (bucket === "today") return "text-orange-600 dark:text-orange-400";
  if (bucket === "week") return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}


export function DeadlineTable({
  rows,
  role,
  emptyLabel,
}: {
  rows: ProjectHealth[];
  role: string;
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <div className={cn(PANEL, "border-dashed px-4 py-14 text-center")}>
        <CalendarClock className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className={cn(PANEL, "overflow-hidden")}>
      <div className="flex flex-col gap-3 p-3 md:hidden">
        {rows.map((row) => (
          <Link
            key={row.project.id}
            to={`/${role}/projects/${row.project.id}`}
            className="block min-w-0 rounded-xl border border-border/60 bg-background/70 p-4 hover:bg-muted/40"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{row.project.name}</p>
                {row.project.client_name ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {row.project.client_name}
                  </p>
                ) : null}
              </div>
              <Badge className={cn("shrink-0 rounded-xl border-0", statusBadgeClass(row.project.status))}>
                {getProjectStatusLabel(row.project.status)}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-12 gap-3">
              <div className="col-span-7 min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Deadline
                </p>
                <p className={cn("mt-0.5 text-sm font-medium", deadlineTone(row.bucket))}>
                  {formatProjectDate(row.project.deadline_date)}
                </p>
                <p className={cn("text-xs", deadlineTone(row.bucket))}>
                  {deadlineLabel(row.bucket, row.daysUntil)}
                </p>
              </div>
              <div className="col-span-5 min-w-0 text-right">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Open bugs
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-sm tabular-nums font-semibold",
                    row.openBugs > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                  )}
                >
                  {row.openBugs}
                </p>
                {row.highBugs > 0 ? (
                  <p className="text-xs text-red-600 dark:text-red-400">{row.highBugs} high</p>
                ) : null}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/80 dark:bg-gray-800/50 hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
            <TableHead className="font-semibold">Project</TableHead>
            <TableHead className="font-semibold">Deadline</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="text-right font-semibold">Open bugs</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.project.id}>
              <TableCell>
                <Link
                  to={`/${role}/projects/${row.project.id}`}
                  className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {row.project.name}
                </Link>
                {row.project.client_name ? (
                  <p className="text-xs text-muted-foreground mt-0.5">{row.project.client_name}</p>
                ) : null}
              </TableCell>
              <TableCell>
                <div className={cn("font-medium", deadlineTone(row.bucket))}>
                  {formatProjectDate(row.project.deadline_date)}
                </div>
                <div className={cn("text-xs", deadlineTone(row.bucket))}>
                  {deadlineLabel(row.bucket, row.daysUntil)}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={cn("border-0", statusBadgeClass(row.project.status))}>
                  {getProjectStatusLabel(row.project.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <span
                  className={
                    row.openBugs > 0 ? "text-amber-600 dark:text-amber-400 font-semibold" : ""
                  }
                >
                  {row.openBugs}
                </span>
                {row.highBugs > 0 ? (
                  <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                    {row.highBugs} high
                  </span>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}


