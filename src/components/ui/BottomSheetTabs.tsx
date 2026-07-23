import { useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";

export type BottomSheetTabItem = {
  value: string;
  label: string;
  shortLabel?: string;
  icon?: LucideIcon | ComponentType<{ className?: string }>;
  count?: number | string;
  countClassName?: string;
};

export type BottomSheetTabsProps = {
  items: BottomSheetTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  title?: string;
  description?: string;
  /** Show full tab row from this breakpoint up. Prefer `xl` when a sidebar is present. */
  desktopBreakpoint?: "lg" | "xl";
  /** Extra classes for the desktop TabsList grid (e.g. grid-cols-5). */
  desktopGridClassName?: string;
  className?: string;
};

/**
 * Shared tab chrome: full TabsList on desktop, bottom-sheet selector on tablet/mobile.
 * Must be rendered inside a shadcn `<Tabs>` so TabsTrigger stays in context.
 */
export function BottomSheetTabs({
  items,
  value,
  onValueChange,
  title = "Select Section",
  description = "Choose a section to navigate",
  desktopBreakpoint = "xl",
  desktopGridClassName,
  className,
}: BottomSheetTabsProps) {
  const [open, setOpen] = useState(false);
  const active = items.find((item) => item.value === value) ?? items[0];
  const ActiveIcon = active?.icon;

  const mobileOnly =
    desktopBreakpoint === "xl" ? "xl:hidden" : "lg:hidden";
  const desktopOnly =
    desktopBreakpoint === "xl" ? "hidden xl:grid" : "hidden lg:grid";

  const select = (next: string) => {
    onValueChange(next);
    setOpen(false);
  };

  const gridClass =
    desktopGridClassName ??
    (items.length <= 1
      ? "grid-cols-1"
      : items.length === 2
        ? "grid-cols-2"
        : items.length === 3
          ? "grid-cols-3"
          : items.length === 4
            ? "grid-cols-4"
            : items.length === 5
              ? "grid-cols-5"
              : "grid-cols-6");

  return (
    <div className={cn("relative w-full", className)}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-gray-50/50 to-blue-50/50 pointer-events-none dark:from-gray-800/50 dark:to-blue-900/50" />
      <div className="relative rounded-2xl border border-gray-200/50 bg-white/60 p-2 backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/60">
        {/* Mobile / tablet: bottom sheet trigger */}
        <div className={cn("p-1", mobileOnly)}>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full justify-between rounded-2xl border-gray-200/70 bg-white/70 dark:border-gray-700/70 dark:bg-gray-800/70"
            onClick={() => setOpen(true)}
          >
            <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              {ActiveIcon ? <ActiveIcon className="h-4 w-4 shrink-0" /> : null}
              <span className="truncate">{active?.label}</span>
              {active?.count != null ? (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
                    active.countClassName ??
                      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  )}
                >
                  {active.count}
                </span>
              ) : null}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
          </Button>
        </div>

        {/* Desktop: equal-width tab row */}
        <TabsList
          className={cn(
            "h-14 w-full gap-1 bg-transparent p-1",
            desktopOnly,
            gridClass
          )}
        >
          {items.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex h-full min-w-0 items-center justify-center gap-1.5 rounded-xl px-1 text-sm font-semibold transition-all duration-300 data-[state=active]:border data-[state=active]:border-gray-200 data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:border-gray-700 dark:data-[state=active]:bg-gray-800 sm:text-base sm:gap-2 sm:px-2"
              >
                {Icon ? <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" /> : null}
                <span className="truncate">{tab.label}</span>
                {tab.count != null ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums sm:px-2 sm:py-1 sm:text-xs",
                      tab.countClassName ??
                        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    )}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent
          className={cn(
            "rounded-t-3xl border-gray-200/70 bg-white/95 backdrop-blur-sm dark:border-gray-800/70 dark:bg-gray-900/95",
            mobileOnly
          )}
        >
          <DrawerHeader className="pb-2 text-left">
            <DrawerTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[65vh] space-y-3 overflow-y-auto px-4 pb-6 hide-scrollbar">
            {items.map((tab) => {
              const isActive = value === tab.value;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => select(tab.value)}
                  className={cn(
                    "flex min-h-20 w-full items-center justify-between rounded-3xl px-4 py-4 transition-colors",
                    isActive
                      ? "bg-gradient-to-r from-orange-500 to-red-600 text-white"
                      : "bg-gray-100/80 text-gray-900 dark:bg-gray-800/80 dark:text-gray-100"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                      )}
                    >
                      {Icon ? <Icon className="h-5 w-5" /> : null}
                    </span>
                    <span className="truncate text-lg font-semibold">{tab.label}</span>
                  </span>
                  <span
                    className={cn(
                      "inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full px-2",
                      isActive
                        ? "bg-gray-950 text-white"
                        : "bg-gray-200 dark:bg-gray-700"
                    )}
                  >
                    {isActive ? (
                      <Check className="h-5 w-5" />
                    ) : tab.count != null ? (
                      <span className="text-sm font-bold tabular-nums">{tab.count}</span>
                    ) : (
                      <ChevronDown className="h-4 w-4 -rotate-90 opacity-80" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
