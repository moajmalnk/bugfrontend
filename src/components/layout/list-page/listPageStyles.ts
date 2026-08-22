import { cn } from "@/lib/utils";

/** Content-only shell — MainLayout owns padding and max width. */
export const LIST_PAGE_SHELL = "min-w-0 w-full space-y-6 sm:space-y-8";

/** Alias used by dashboards and legacy pages migrating off nested <main> shells. */
export const APP_PAGE_SHELL = LIST_PAGE_SHELL;

export const LIST_HEADER_CARD =
  "relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 lg:p-8 min-w-0";

export const LIST_HEADER_TITLE =
  "text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight";

export const LIST_HEADER_DESCRIPTION =
  "text-gray-600 dark:text-gray-400 text-sm sm:text-base lg:text-lg font-medium max-w-2xl break-words";

export const LIST_TABS_CONTENT = "space-y-6 sm:space-y-8 min-w-0";

export const LIST_FILTER_PANEL =
  "relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-5 md:p-6 min-w-0";

export const LIST_FILTER_GRID = "grid grid-cols-12 gap-4 min-w-0";

export const LIST_FILTER_COL = "col-span-12 sm:col-span-6 lg:col-span-3";

export const LIST_FILTER_LABEL =
  "text-xs font-medium text-muted-foreground mb-1.5 block";

export const LIST_FILTER_ICON =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground";

export type ListPageAccent =
  | "blue"
  | "orange"
  | "amber"
  | "emerald"
  | "green";

const ACCENT_RING: Record<ListPageAccent, string> = {
  blue: "focus:ring-blue-500/40 focus:border-blue-500/50",
  orange: "focus:ring-orange-500/40 focus:border-orange-500/50",
  amber: "focus:ring-amber-500/40 focus:border-amber-500/50",
  emerald: "focus:ring-emerald-500/40 focus:border-emerald-500/50",
  green: "focus:ring-green-500/40 focus:border-green-500/50",
};

const ACCENT_ICON_BG: Record<ListPageAccent, string> = {
  blue: "bg-blue-600",
  orange: "bg-orange-600",
  amber: "bg-amber-600",
  emerald: "bg-emerald-600",
  green: "bg-green-600",
};

const ACCENT_GRADIENT_UNDERLAY: Record<ListPageAccent, string> = {
  blue: "from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30",
  orange: "from-gray-50/30 to-orange-50/30 dark:from-gray-800/30 dark:to-orange-900/30",
  amber: "from-gray-50/30 to-amber-50/30 dark:from-gray-800/30 dark:to-amber-900/30",
  emerald: "from-gray-50/30 to-emerald-50/30 dark:from-gray-800/30 dark:to-emerald-900/30",
  green: "from-gray-50/30 to-green-50/30 dark:from-gray-800/30 dark:to-green-900/30",
};

export function listFilterTriggerClass(accent: ListPageAccent = "blue"): string {
  return cn(
    "w-full min-w-0 h-11 bg-background border-border/70 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-0 data-[state=open]:ring-2",
    ACCENT_RING[accent]
  );
}

export function listSearchInputClass(accent: ListPageAccent = "blue"): string {
  return cn(
    "w-full min-w-0 pl-10 sm:pl-12 pr-10 py-2.5 sm:py-3 border border-border/70 rounded-xl bg-background focus:outline-none focus:ring-2 text-sm font-medium transition-all duration-300 shadow-sm",
    ACCENT_RING[accent]
  );
}

export function listFilterIconBg(accent: ListPageAccent = "blue"): string {
  return cn("p-1.5 rounded-lg shrink-0 text-white", ACCENT_ICON_BG[accent]);
}

export function listFilterUnderlay(accent: ListPageAccent = "blue"): string {
  return cn(
    "absolute inset-0 bg-gradient-to-r rounded-2xl pointer-events-none",
    ACCENT_GRADIENT_UNDERLAY[accent]
  );
}
