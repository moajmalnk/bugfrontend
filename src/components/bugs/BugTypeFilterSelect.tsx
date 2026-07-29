import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { bugTypeService } from "@/services/bugTypeService";
import type { BugType, BugTypeRef } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Tags } from "lucide-react";

export function bugMatchesTypeFilter(
  bugTypes: BugTypeRef[] | undefined,
  bugTypeFilter: string
): boolean {
  if (!bugTypeFilter || bugTypeFilter === "all") return true;
  return (bugTypes ?? []).some((t) => String(t.id) === String(bugTypeFilter));
}

type BugTypeFilterSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
  /** Accent color for the icon chip */
  accent?: "sky" | "violet" | "emerald";
};

const ACCENT: Record<
  NonNullable<BugTypeFilterSelectProps["accent"]>,
  string
> = {
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
};

export function BugTypeFilterSelect({
  value,
  onValueChange,
  className,
  triggerClassName,
  accent = "sky",
}: BugTypeFilterSelectProps) {
  const { data: types = [], isLoading } = useQuery({
    queryKey: ["bug-types", "active"],
    queryFn: () => bugTypeService.list(),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <div className={cn("p-1.5 rounded-lg shrink-0", ACCENT[accent])}>
        <Tags className="h-4 w-4 text-white" />
      </div>
      <Select value={value || "all"} onValueChange={onValueChange}>
        <SelectTrigger
          className={cn(
            "w-full sm:w-[150px] md:w-[170px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300",
            triggerClassName
          )}
        >
          <SelectValue placeholder={isLoading ? "Loading…" : "Bug type"} />
        </SelectTrigger>
        <SelectContent position="popper" className="z-[60]">
          <SelectItem value="all">All Types</SelectItem>
          {types.map((type: BugType) => (
            <SelectItem key={type.id} value={type.id}>
              {type.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
