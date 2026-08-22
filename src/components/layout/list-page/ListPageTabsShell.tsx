import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ListPageTabsShellProps {
  children: React.ReactNode;
  /** Tailwind gradient for tab bar underlay */
  underlayClassName?: string;
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}

export function ListPageTabsShell({
  children,
  underlayClassName = "from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50",
  columns = 2,
  className,
}: ListPageTabsShellProps) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-r rounded-2xl pointer-events-none",
          underlayClassName
        )}
      />
      <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-1.5 sm:p-2 min-w-0">
        <TabsList
          className={cn(
            "grid w-full h-auto min-h-12 sm:min-h-14 bg-transparent p-1 gap-1",
            columns === 2 && "grid-cols-2",
            columns === 3 && "grid-cols-3",
            columns === 4 && "grid-cols-2 sm:grid-cols-4",
            columns === 6 && "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"
          )}
        >
          {children}
        </TabsList>
      </div>
    </div>
  );
}

export const listTabTriggerClass =
  "text-xs sm:text-sm md:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300 px-2 py-2.5 sm:px-3";

export function ListPageTabTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsTrigger>) {
  return <TabsTrigger className={cn(listTabTriggerClass, className)} {...props} />;
}
