import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Filter, Search, X } from "lucide-react";

export type PeriodDetailFilters = {
  search: string;
  userId: string;
  project: string;
  day: string;
  role: string;
};

export const EMPTY_PERIOD_FILTERS: PeriodDetailFilters = {
  search: "",
  userId: "all",
  project: "all",
  day: "all",
  role: "all",
};

export function isPeriodFiltersActive(filters: PeriodDetailFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.userId !== "all" ||
    filters.project !== "all" ||
    filters.day !== "all" ||
    filters.role !== "all"
  );
}

export function countActivePeriodFilters(filters: PeriodDetailFilters): number {
  let n = 0;
  if (filters.search.trim()) n++;
  if (filters.userId !== "all") n++;
  if (filters.project !== "all") n++;
  if (filters.day !== "all") n++;
  if (filters.role !== "all") n++;
  return n;
}

type FilterOption = { value: string; label: string };

type PeriodDetailsFilterBarProps = {
  filters: PeriodDetailFilters;
  onChange: (next: PeriodDetailFilters) => void;
  onClear: () => void;
  showUserFilter: boolean;
  showRoleFilter: boolean;
  users: FilterOption[];
  projects: FilterOption[];
  days: FilterOption[];
  resultCount: number;
  totalCount: number;
};

export function PeriodDetailsFilterBar({
  filters,
  onChange,
  onClear,
  showUserFilter,
  showRoleFilter,
  users,
  projects,
  days,
  resultCount,
  totalCount,
}: PeriodDetailsFilterBarProps) {
  const activeCount = countActivePeriodFilters(filters);
  const isFiltered = activeCount > 0;

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-xl" />
      <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/40 dark:border-gray-700/40 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shrink-0">
              <Filter className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Search &amp; Filter
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isFiltered
                  ? `Showing ${resultCount} of ${totalCount} submissions`
                  : `${totalCount} submissions in this period`}
              </p>
            </div>
          </div>
          {isFiltered ? (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border/60 hover:bg-muted/50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {activeCount}
              </Badge>
            </button>
          ) : null}
        </div>

        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search submissions..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="h-10 w-full pl-9"
          />
        </div>

        <div
          className={`grid grid-cols-1 gap-3 ${
            showUserFilter && showRoleFilter
              ? "sm:grid-cols-2 lg:grid-cols-4"
              : showUserFilter || showRoleFilter
                ? "sm:grid-cols-2 lg:grid-cols-3"
                : "sm:grid-cols-2"
          }`}
        >
          {showUserFilter ? (
            <div className="flex min-w-0 flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Team member
              </label>
              <Select
                value={filters.userId}
                onValueChange={(userId) => onChange({ ...filters, userId })}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="All members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All members</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {showRoleFilter ? (
            <div className="flex min-w-0 flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Role
              </label>
              <Select
                value={filters.role}
                onValueChange={(role) => onChange({ ...filters, role })}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="tester">Tester</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="flex min-w-0 flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Project
            </label>
            <Select
              value={filters.project}
              onValueChange={(project) => onChange({ ...filters, project })}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Day
            </label>
            <Select value={filters.day} onValueChange={(day) => onChange({ ...filters, day })}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="All days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All days</SelectItem>
                {days.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isFiltered ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {filters.search.trim() ? (
              <Badge variant="outline" className="text-xs gap-1">
                Search: {filters.search.trim()}
                <button
                  type="button"
                  className="ml-0.5 hover:text-foreground"
                  onClick={() => onChange({ ...filters, search: "" })}
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null}
            {filters.userId !== "all" ? (
              <Badge variant="outline" className="text-xs gap-1">
                Member: {users.find((u) => u.value === filters.userId)?.label ?? filters.userId}
                <button
                  type="button"
                  className="ml-0.5 hover:text-foreground"
                  onClick={() => onChange({ ...filters, userId: "all" })}
                  aria-label="Clear member filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null}
            {filters.role !== "all" ? (
              <Badge variant="outline" className="text-xs gap-1 capitalize">
                Role: {filters.role}
                <button
                  type="button"
                  className="ml-0.5 hover:text-foreground"
                  onClick={() => onChange({ ...filters, role: "all" })}
                  aria-label="Clear role filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null}
            {filters.project !== "all" ? (
              <Badge variant="outline" className="text-xs gap-1">
                Project: {filters.project}
                <button
                  type="button"
                  className="ml-0.5 hover:text-foreground"
                  onClick={() => onChange({ ...filters, project: "all" })}
                  aria-label="Clear project filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null}
            {filters.day !== "all" ? (
              <Badge variant="outline" className="text-xs gap-1">
                Day:{" "}
                {days.find((d) => d.value === filters.day)?.label ??
                  format(new Date(`${filters.day}T00:00:00`), "MMM dd, yyyy")}
                <button
                  type="button"
                  className="ml-0.5 hover:text-foreground"
                  onClick={() => onChange({ ...filters, day: "all" })}
                  aria-label="Clear day filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
