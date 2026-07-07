import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const helpGlassCard =
  "rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm";

export const helpInnerCard =
  "rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm";

/** Prevents long words / translated text from overflowing flex layouts */
export const helpTextWrap = "min-w-0 break-words [overflow-wrap:anywhere]";

interface HelpPageShellProps {
  children: ReactNode;
  className?: string;
}

export function HelpPageShell({ children, className }: HelpPageShellProps) {
  return (
    <main
      className={cn(
        "min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8",
        className
      )}
    >
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">{children}</section>
    </main>
  );
}

interface HelpPageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}

export function HelpPageHeader({ icon: Icon, title, description, children }: HelpPageHeaderProps) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20" />
      <div className={cn("relative p-6 sm:p-8", helpGlassCard)}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 min-w-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg shrink-0">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                  {title}
                </h1>
                <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2" />
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
              {description}
            </p>
          </div>
          {children && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface HelpContentCardProps {
  children: ReactNode;
  className?: string;
  padding?: "default" | "none";
}

export function HelpContentCard({
  children,
  className,
  padding = "default",
}: HelpContentCardProps) {
  return (
    <div
      className={cn(
        helpGlassCard,
        "min-w-0 overflow-x-hidden",
        padding === "default" && "p-5 sm:p-6 md:p-8",
        className
      )}
    >
      {children}
    </div>
  );
}
