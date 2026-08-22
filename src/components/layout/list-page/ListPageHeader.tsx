import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  LIST_HEADER_CARD,
  LIST_HEADER_DESCRIPTION,
  LIST_HEADER_TITLE,
} from "./listPageStyles";

interface ListPageHeaderProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  /** Tailwind gradient classes, e.g. from-blue-600 to-emerald-600 */
  accentBarClassName?: string;
  /** Tailwind gradient for header underlay */
  underlayClassName?: string;
  count?: number | string | React.ReactNode;
  countIcon?: React.ReactNode;
  countClassName?: string;
  actions?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export function ListPageHeader({
  icon,
  title,
  description,
  accentBarClassName = "from-blue-600 to-emerald-600",
  underlayClassName = "from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20",
  count,
  countIcon,
  countClassName = "from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
  actions,
  loading = false,
  className,
}: ListPageHeaderProps) {
  return (
    <div className={cn("relative overflow-hidden min-w-0", className)}>
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-r pointer-events-none",
          underlayClassName
        )}
      />
      <div className={LIST_HEADER_CARD}>
        <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:justify-between lg:items-center min-w-0">
          <div className="space-y-2 sm:space-y-3 min-w-0 flex-1">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "p-2 rounded-xl shadow-lg shrink-0 bg-gradient-to-br text-white",
                  accentBarClassName
                )}
              >
                {icon}
              </div>
              <div className="min-w-0">
                <h1 className={cn(LIST_HEADER_TITLE, "truncate")}>{title}</h1>
                <div
                  className={cn(
                    "h-1 w-16 sm:w-20 bg-gradient-to-r rounded-full mt-2",
                    accentBarClassName
                  )}
                />
              </div>
            </div>
            <p className={LIST_HEADER_DESCRIPTION}>{description}</p>
          </div>

          {(actions || count !== undefined) && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 shrink-0 w-full lg:w-auto">
              {actions}
              {count !== undefined ? (
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 bg-gradient-to-r border rounded-xl shadow-sm w-full sm:w-auto justify-center sm:justify-start",
                    countClassName
                  )}
                >
                  {countIcon ? (
                    <div className="p-1.5 rounded-lg shrink-0 bg-current/10">
                      {countIcon}
                    </div>
                  ) : null}
                  <div className="text-2xl font-bold tabular-nums">
                    {loading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      count
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
