import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { userService } from "@/services/userService";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Activity,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";

interface ActiveHoursData {
  period: string;
  date_range: {
    start: string;
    end: string;
  };
  summary: {
    total_hours: number;
    total_minutes: number;
    total_sessions: number;
    active_days: number;
    average_hours_per_day: number;
  };
  daily_breakdown: Array<{
    date: string;
    total_minutes: number;
    session_count: number;
  }>;
}

interface ActiveHoursProps {
  userId: string;
  userName: string;
}

type ActiveHoursPeriod = "daily" | "weekly" | "monthly" | "yearly";

const periodTabs: Array<{
  value: ActiveHoursPeriod;
  label: string;
  icon: typeof Clock;
}> = [
  { value: "daily", label: "Daily", icon: Clock },
  { value: "weekly", label: "Weekly", icon: CalendarDays },
  { value: "monthly", label: "Monthly", icon: Calendar },
  { value: "yearly", label: "Yearly", icon: TrendingUp },
];

export function ActiveHours({ userId, userName }: ActiveHoursProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<ActiveHoursPeriod>("daily");
  const [isMobileTabSelectorOpen, setIsMobileTabSelectorOpen] = useState(false);

  const activePeriodTab = useMemo(
    () => periodTabs.find((tab) => tab.value === selectedPeriod) ?? periodTabs[0],
    [selectedPeriod]
  );

  const { data: activeHoursData, isLoading, error } = useQuery<ActiveHoursData>({
    queryKey: ['activeHours', userId, selectedPeriod],
    queryFn: () => userService.getActiveHours(userId, selectedPeriod),
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds to keep data fresh
  });

  const formatHours = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
  };
  
  const formatHoursDecimal = (hours: number) => {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes}m`;
    }
    // Round to 1 decimal place for hours
    return `${hours.toFixed(1)}h`;
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'MMM dd, yyyy');
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'daily': return 'Today';
      case 'weekly': return 'This Week';
      case 'monthly': return 'This Month';
      case 'yearly': return 'This Year';
      default: return period;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Active Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/20 border-t-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Active Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Unable to load active hours data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeHoursData) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Active Hours - {getPeriodLabel(selectedPeriod)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={selectedPeriod}
          onValueChange={(value) => setSelectedPeriod(value as ActiveHoursPeriod)}
        >
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 rounded-2xl" />
            <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
              <div className="lg:hidden p-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-2xl justify-between border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70"
                  onClick={() => setIsMobileTabSelectorOpen(true)}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {activePeriodTab?.icon && (
                      <activePeriodTab.icon className="h-4 w-4" />
                    )}
                    {activePeriodTab?.label}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
              </div>

              <TabsList className="hidden lg:grid w-full grid-cols-4 h-14 bg-transparent p-1">
                {periodTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                  >
                    <tab.icon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <Drawer
            open={isMobileTabSelectorOpen}
            onOpenChange={setIsMobileTabSelectorOpen}
          >
            <DrawerContent className="lg:hidden rounded-t-3xl border-gray-200/70 dark:border-gray-800/70 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
              <DrawerHeader className="text-left pb-2">
                <DrawerTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  Select Period
                </DrawerTitle>
                <DrawerDescription>
                  View active hours by time period
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-6 space-y-3 max-h-[65vh] overflow-y-auto">
                {periodTabs.map((tab) => {
                  const isActive = selectedPeriod === tab.value;
                  return (
                    <Button
                      key={tab.value}
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setSelectedPeriod(tab.value);
                        setIsMobileTabSelectorOpen(false);
                      }}
                      className={cn(
                        "w-full h-auto min-h-20 rounded-3xl px-4 py-4 flex items-center justify-between",
                        isActive
                          ? "bg-lime-400 text-gray-950 hover:bg-lime-400"
                          : "bg-gray-100/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 hover:bg-gray-200/80 dark:hover:bg-gray-700/80"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={cn(
                            "inline-flex h-10 w-10 items-center justify-center rounded-full",
                            isActive
                              ? "bg-lime-500/80 text-gray-950"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                          )}
                        >
                          <tab.icon className="h-5 w-5" />
                        </span>
                        <span className="text-lg font-semibold">{tab.label}</span>
                      </span>
                      {isActive && (
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-950 text-white">
                          <Check className="h-5 w-5" />
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </DrawerContent>
          </Drawer>

          <TabsContent value={selectedPeriod} className="space-y-4">
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-center">
                <Clock className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {formatHoursDecimal(activeHoursData.summary.total_hours)}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Total Hours</p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 text-center">
                <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {formatHoursDecimal(activeHoursData.summary.average_hours_per_day)}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">Avg/Day</p>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 text-center">
                <Activity className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {activeHoursData.summary.total_sessions}
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400">Sessions</p>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-4 text-center">
                <Calendar className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {activeHoursData.summary.active_days}
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-400">Active Days</p>
              </div>
            </div>

            {/* Daily Breakdown */}
            {activeHoursData.daily_breakdown.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  Daily Breakdown
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activeHoursData.daily_breakdown.map((day, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="font-medium">{formatDate(day.date)}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatHours(day.total_minutes)}</span>
                        <span>{day.session_count} sessions</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Data State */}
            {activeHoursData.daily_breakdown.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No activity data available for {getPeriodLabel(selectedPeriod).toLowerCase()}</p>
                <p className="text-sm">Activity will be tracked once the user starts using the system</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
