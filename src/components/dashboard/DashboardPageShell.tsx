import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardPeriodFilter } from "@/components/dashboard/DashboardPeriodFilter";
import { TeamBirthdayBanner } from "@/components/dashboard/TeamBirthdayBanner";
import type { DashboardPeriod, WorkPeriodPreset } from "@/lib/dashboardPeriod";
import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronDown, LayoutDashboard, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

export const DASHBOARD_PANEL =
  "relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg";

export type DashboardTabItem = {
  value: string;
  label: string;
  icon: LucideIcon;
};

type ShellProps = {
  title: string;
  description: string;
  headerIcon?: LucideIcon;
  periodPreset: WorkPeriodPreset;
  customFrom: string;
  customTo: string;
  period: DashboardPeriod;
  onPresetChange: (value: WorkPeriodPreset) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  periodFetching?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  kpiSlot?: ReactNode;
  tabs: DashboardTabItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  children?: ReactNode;
};

export function DashboardPageShell({
  title,
  description,
  headerIcon: HeaderIcon = LayoutDashboard,
  periodPreset,
  customFrom,
  customTo,
  period,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
  periodFetching,
  isLoading,
  isError,
  onRetry,
  kpiSlot,
  tabs,
  activeTab,
  onTabChange,
  children,
}: ShellProps) {
  const [tabSheetOpen, setTabSheetOpen] = useState(false);
  const activeItem = tabs.find((t) => t.value === activeTab) ?? tabs[0];
  const ActiveIcon = activeItem?.icon ?? LayoutDashboard;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8 min-w-0 w-full">
        <TeamBirthdayBanner />
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5 min-w-0">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shrink-0">
                    <HeaderIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      {title}
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base lg:text-lg font-medium max-w-2xl break-words">
                  {description}
                </p>
              </div>

              <div className="min-w-0 w-full lg:w-auto shrink-0">
                <DashboardPeriodFilter
                  preset={periodPreset}
                  customFrom={customFrom}
                  customTo={customTo}
                  period={period}
                  onPresetChange={onPresetChange}
                  onCustomFromChange={onCustomFromChange}
                  onCustomToChange={onCustomToChange}
                  isFetching={periodFetching}
                />
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-12 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="col-span-6 sm:col-span-4 xl:col-span-2 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 p-4 space-y-3"
                >
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-14" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton className="h-72 rounded-2xl" />
              <Skeleton className="h-72 rounded-2xl" />
            </div>
          </div>
        ) : isError ? (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-yellow-50/30 to-red-50/50 dark:from-orange-950/20 dark:via-yellow-950/10 dark:to-red-950/20 rounded-2xl" />
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center space-y-4">
              <AlertTriangle className="h-10 w-10 mx-auto text-amber-500" />
              <h2 className="text-xl font-bold">Could not load dashboard</h2>
              {onRetry ? <Button onClick={onRetry}>Try again</Button> : null}
            </div>
          </div>
        ) : (
          <>
            {kpiSlot}

            <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6 sm:space-y-8">
              <div className={DASHBOARD_PANEL}>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/40 via-transparent to-emerald-50/30 dark:from-blue-950/15 dark:via-transparent dark:to-emerald-950/10 pointer-events-none" />
                <div className="relative p-2 sm:p-2.5">
                  <div className="p-1 lg:hidden">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-full justify-between rounded-2xl border-gray-200/70 bg-white/70 dark:border-gray-700/70 dark:bg-gray-800/70"
                      onClick={() => setTabSheetOpen(true)}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold min-w-0">
                        <ActiveIcon className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
                        <span className="truncate">{activeItem?.label}</span>
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                    </Button>
                  </div>

                  <TabsList className="hidden lg:flex h-auto min-h-14 w-full flex-wrap gap-1.5 bg-transparent p-1">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="flex h-11 min-w-[7.5rem] flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition-all duration-300 data-[state=active]:border data-[state=active]:border-gray-200 data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:border-gray-700 dark:data-[state=active]:bg-gray-800"
                        >
                          <Icon className="h-4 w-4 shrink-0 opacity-80" />
                          <span className="truncate">{tab.label}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>
              </div>

              <Drawer open={tabSheetOpen} onOpenChange={setTabSheetOpen}>
                <DrawerContent className="rounded-t-3xl border-gray-200/70 bg-white/95 backdrop-blur-sm dark:border-gray-800/70 dark:bg-gray-900/95 lg:hidden">
                  <DrawerHeader className="pb-2 text-left">
                    <DrawerTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                      Dashboard section
                    </DrawerTitle>
                    <DrawerDescription>Jump to a dashboard section</DrawerDescription>
                  </DrawerHeader>
                  <div className="max-h-[65vh] space-y-3 overflow-y-auto px-4 pb-6">
                    {tabs.map((tab) => {
                      const isActive = activeTab === tab.value;
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.value}
                          type="button"
                          onClick={() => {
                            onTabChange(tab.value);
                            setTabSheetOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all",
                            isActive
                              ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40"
                              : "border-gray-200/70 bg-white/80 dark:border-gray-700/70 dark:bg-gray-800/50"
                          )}
                        >
                          <Icon className="h-5 w-5 shrink-0 opacity-80" />
                          <span className="font-semibold">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </DrawerContent>
              </Drawer>

              {children}
            </Tabs>
          </>
        )}
      </section>
    </main>
  );
}
