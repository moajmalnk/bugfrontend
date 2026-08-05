import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type DashboardKpiCardProps = {
  title: string;
  value: number | string;
  hint: string;
  icon: LucideIcon;
  gradient: string;
  chip: string;
  valueClass: string;
  onClick?: () => void;
};

export function DashboardKpiCard({
  title,
  value,
  hint,
  icon: Icon,
  gradient,
  chip,
  valueClass,
  onClick,
}: DashboardKpiCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "col-span-6 sm:col-span-4 xl:col-span-2 group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 sm:p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 text-left w-full min-w-0",
        chip
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 leading-snug line-clamp-2 min-w-0">
          {title}
        </span>
        <div
          className={cn(
            "p-2 rounded-xl bg-gradient-to-br text-white shadow-md shrink-0",
            gradient
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className={cn("text-2xl sm:text-3xl font-bold tabular-nums tracking-tight", valueClass)}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1 font-medium">{hint}</p>
    </button>
  );
}
