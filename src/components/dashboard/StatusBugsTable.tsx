import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Bug } from "@/types";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const PANEL =
  "relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg";

function priorityBadgeClass(priority: Bug["priority"]): string {
  if (priority === "high") return "bg-red-600 text-white dark:bg-red-600 dark:text-white";
  if (priority === "medium") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
}


export function StatusBugsTable({
  bugs,
  role,
  mode,
  emptyLabel,
  pageSize = 12,
}: {
  bugs: Bug[];
  role: string;
  mode: "open" | "fixed";
  emptyLabel: string;
  pageSize?: number;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(bugs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageBugs = bugs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (bugs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 px-4 py-12 text-center text-sm text-gray-500">
        {emptyLabel}
      </div>
    );
  }

  const bugHref = (bug: Bug) =>
    `/${role}/bugs/${bug.id}${mode === "fixed" ? "?from=fixes" : ""}`;

  const metaLabel = (bug: Bug) =>
    mode === "fixed"
      ? bug.fixed_by_name || bug.updated_by_name || "—"
      : bug.status.replace("_", " ");

  const pagination = (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-muted-foreground">
      <span className="font-medium">
        Showing {(currentPage - 1) * pageSize + 1}–
        {Math.min(currentPage * pageSize, bugs.length)} of {bugs.length.toLocaleString()}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <span className="tabular-nums px-1">
          {currentPage}/{totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Mobile / tablet: card grid */}
      <div className="grid grid-cols-12 gap-3 lg:hidden">
        {pageBugs.map((bug) => (
          <Link
            key={bug.id}
            to={bugHref(bug)}
            className={cn(
              PANEL,
              "col-span-12 sm:col-span-6 p-4 space-y-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 via-transparent to-red-50/20 dark:from-orange-950/10 dark:via-transparent dark:to-red-950/10 pointer-events-none" />
            <div className="relative space-y-3">
              <p className="font-semibold text-gray-900 dark:text-white line-clamp-3 text-[15px] leading-snug">
                {bug.title}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn("border-0 capitalize", priorityBadgeClass(bug.priority))}>
                  {bug.priority}
                </Badge>
                <Badge
                  variant="outline"
                  className="capitalize font-semibold border-gray-200 dark:border-gray-700"
                >
                  {metaLabel(bug)}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate min-w-0">
                  {bug.project_name || "No project"}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground shrink-0">
                  View
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop: table */}
      <div className={cn(PANEL, "overflow-hidden hidden lg:block")}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 dark:bg-gray-800/50 hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
                <TableHead className="font-semibold">Bug</TableHead>
                <TableHead className="font-semibold">Project</TableHead>
                <TableHead className="font-semibold">Priority</TableHead>
                <TableHead className="font-semibold">
                  {mode === "fixed" ? "Fixed by" : "Status"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageBugs.map((bug) => (
                <TableRow key={bug.id}>
                  <TableCell className="max-w-[280px]">
                    <Link
                      to={bugHref(bug)}
                      className="font-semibold hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2"
                    >
                      {bug.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[140px] truncate">
                    {bug.project_name || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("border-0 capitalize", priorityBadgeClass(bug.priority))}>
                      {bug.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {metaLabel(bug)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {pagination}
    </div>
  );
}


