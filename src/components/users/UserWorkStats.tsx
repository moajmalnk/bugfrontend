import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { userService } from "@/services/userService";
import { Calendar, Clock, TrendingUp, Users, X, CheckCircle2, AlertCircle, PlayCircle, CalendarDays, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";

interface TaskCounts {
  completed: number;
  pending: number;
  ongoing: number;
  upcoming: number;
}

interface WorkStats {
  user_id: string;
  username: string;
  role: string;
  current_period: {
    period_start: string;
    period_end: string;
    period_name: string;
    days: number;
    hours: number;
    task_counts: TaskCounts;
  };
  period_trend: Array<{
    period: string;
    period_name: string;
    days: number;
    hours: number;
    task_counts: TaskCounts;
  }>;
  last_updated: string;
}

interface UserWorkStatsProps {
  userId: string;
  compact?: boolean;
  showTrend?: boolean;
}

export function UserWorkStats({ userId, compact = false, showTrend = true }: UserWorkStatsProps) {
  const [stats, setStats] = useState<WorkStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<WorkStats['period_trend'][0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [periodDetails, setPeriodDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await userService.getUserWorkStats(userId);
        setStats(data);
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to fetch work stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchStats();
    }
  }, [userId]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-4">
        <div className="text-sm text-muted-foreground">
          {error ? 'Failed to load work stats' : 'No work data available'}
        </div>
      </div>
    );
  }

  const { current_period, period_trend } = stats;

  // Deduplicate period_trend by period identifier to ensure each period appears only once
  // Use a Map with period.period as key (unique identifier) to efficiently remove duplicates
  const periodMap = new Map<string, typeof period_trend[0]>();
  period_trend.forEach(period => {
    // Use period.period as the unique key (fallback to period_name if period is missing)
    const key = period.period || period.period_name;
    if (!periodMap.has(key)) {
      periodMap.set(key, period);
    }
  });
  const uniquePeriodTrend = Array.from(periodMap.values());

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-blue-700 dark:text-blue-300">{current_period.hours}h</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded-md">
          <Calendar className="h-3 w-3 text-green-600 dark:text-green-400" />
          <span className="font-semibold text-green-700 dark:text-green-300">{current_period.days}d</span>
        </div>
        <div className="text-gray-500 dark:text-gray-400 text-xs">
          {current_period.period_name}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Month Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Hours Worked</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {current_period.hours}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {current_period.period_name}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Days Active</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {current_period.days}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {current_period.period_name}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Trend */}
      {showTrend && period_trend.length > 0 && (
        <Card className="border-0 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Work Trend</h4>
            </div>
            <div className="space-y-3">
              {uniquePeriodTrend.slice(0, 6).map((period, index) => (
                <div 
                  key={period.period} 
                  onClick={async () => {
                    setSelectedPeriod(period);
                    setIsModalOpen(true);
                    setIsLoadingDetails(true);
                    setPeriodDetails(null);
                    
                    try {
                      // Calculate period dates from period string (format: YYYY-MM-DD)
                      const periodStart = period.period;
                      
                      let periodEnd: string;
                      if (periodStart) {
                        // Parse the period start date (6th of month)
                        const startDate = new Date(periodStart + 'T00:00:00');
                        // Calculate end date (5th of next month)
                        const endDate = new Date(startDate);
                        endDate.setMonth(endDate.getMonth() + 1);
                        endDate.setDate(5);
                        periodEnd = endDate.toISOString().split('T')[0];
                      } else {
                        // Fallback: use current period calculation
                        const today = new Date();
                        const day = today.getDate();
                        const endDate = new Date(today);
                        if (day >= 6) {
                          endDate.setMonth(endDate.getMonth() + 1);
                          endDate.setDate(5);
                        } else {
                          endDate.setDate(5);
                        }
                        periodEnd = endDate.toISOString().split('T')[0];
                      }
                      
                      const details = await userService.getPeriodDetails(userId, periodStart, periodEnd);
                      setPeriodDetails(details);
                    } catch (err: any) {
                      console.error('Failed to fetch period details:', err);
                      setError(err.message);
                    } finally {
                      setIsLoadingDetails(false);
                    }
                  }}
                  className="group p-3 rounded-xl bg-gradient-to-r from-gray-50/50 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/20 hover:from-gray-100/70 hover:to-blue-100/50 dark:hover:from-gray-700/50 dark:hover:to-blue-800/30 transition-all duration-200 border border-gray-200/30 dark:border-gray-700/30 cursor-pointer hover:shadow-md active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {period.period_name}
                    </span>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-500" />
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{period.hours}h</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-green-500" />
                        <span className="font-semibold text-green-600 dark:text-green-400">{period.days}d</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-600 dark:text-gray-400 hidden sm:inline">Completed</span>
                      <span className="text-gray-600 dark:text-gray-400 sm:hidden">Completed</span>
                      <span className="font-medium text-red-600 dark:text-red-400">{period.task_counts.completed}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-500 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-600 dark:text-gray-400 hidden sm:inline">Pending</span>
                      <span className="text-gray-600 dark:text-gray-400 sm:hidden">Pending</span>
                      <span className="font-medium text-yellow-600 dark:text-yellow-400">{period.task_counts.pending}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-600 dark:text-gray-400 hidden sm:inline">Ongoing</span>
                      <span className="text-gray-600 dark:text-gray-400 sm:hidden">Ongoing</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">{period.task_counts.ongoing}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-600 dark:text-gray-400 hidden sm:inline">Upcoming</span>
                      <span className="text-gray-600 dark:text-gray-400 sm:hidden">Upcoming</span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">{period.task_counts.upcoming}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="relative">
            <DialogTitle className="flex items-center gap-3 pr-8">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <CalendarDays className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedPeriod?.period_name || 'Period Details'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Work Statistics & Task Breakdown
                </div>
              </div>
            </DialogTitle>
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-0 right-0 h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>
          </DialogHeader>

          {selectedPeriod && (
            <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-6 mt-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Hours</p>
                        <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                          {selectedPeriod.hours.toFixed(1)}h
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Worked during this period
                        </p>
                      </div>
                      <div className="p-3 bg-blue-200/50 dark:bg-blue-900/40 rounded-xl">
                        <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Active Days</p>
                        <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                          {selectedPeriod.days}d
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Days with work submissions
                        </p>
                      </div>
                      <div className="p-3 bg-green-200/50 dark:bg-green-900/40 rounded-xl">
                        <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Task Breakdown */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Task Breakdown
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Completed Tasks */}
                  <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100/30 dark:from-red-950/20 dark:to-red-900/10">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">Completed</span>
                        </div>
                        <Badge className="bg-red-600 text-white text-lg px-3 py-1">
                          {selectedPeriod.task_counts.completed}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Tasks completed during this period
                      </p>
                    </CardContent>
                  </Card>

                  {/* Pending Tasks */}
                  <Card className="border-0 shadow-sm bg-gradient-to-br from-yellow-50 to-yellow-100/30 dark:from-yellow-950/20 dark:to-yellow-900/10">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">Pending</span>
                        </div>
                        <Badge className="bg-yellow-600 text-white text-lg px-3 py-1">
                          {selectedPeriod.task_counts.pending}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Tasks pending completion
                      </p>
                    </CardContent>
                  </Card>

                  {/* Ongoing Tasks */}
                  <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <PlayCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">Ongoing</span>
                        </div>
                        <Badge className="bg-blue-600 text-white text-lg px-3 py-1">
                          {selectedPeriod.task_counts.ongoing}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Tasks currently in progress
                      </p>
                    </CardContent>
                  </Card>

                  {/* Upcoming Tasks */}
                  <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <CalendarDays className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">Upcoming</span>
                        </div>
                        <Badge className="bg-purple-600 text-white text-lg px-3 py-1">
                          {selectedPeriod.task_counts.upcoming}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Tasks planned for future
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Additional Statistics */}
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedPeriod.task_counts.completed + selectedPeriod.task_counts.pending + selectedPeriod.task_counts.ongoing + selectedPeriod.task_counts.upcoming}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Tasks</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedPeriod.days > 0 ? (selectedPeriod.hours / selectedPeriod.days).toFixed(1) : '0.0'}h
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Avg Hours/Day</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedPeriod.days > 0 ? Math.round((selectedPeriod.task_counts.completed + selectedPeriod.task_counts.pending + selectedPeriod.task_counts.ongoing + selectedPeriod.task_counts.upcoming) / selectedPeriod.days) : 0}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Avg Tasks/Day</p>
                </div>
              </div>

              {/* Detailed Task Lists */}
              {periodDetails && (
                <>
                  <Separator />
                  
                  {/* Completed Tasks Details */}
                  {periodDetails.tasks?.completed?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                        Completed Tasks ({periodDetails.tasks.completed.length})
                      </h3>
                      <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50/50 to-red-100/20 dark:from-red-950/10 dark:to-red-900/5">
                        <CardContent className="p-4">
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {periodDetails.tasks.completed.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-white/50 dark:bg-gray-800/30 hover:bg-white/70 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-900 dark:text-white">{item.task}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {format(new Date(item.date), 'MMM dd, yyyy')}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Pending Tasks Details */}
                  {periodDetails.tasks?.pending?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        Pending Tasks ({periodDetails.tasks.pending.length})
                      </h3>
                      <Card className="border-0 shadow-sm bg-gradient-to-br from-yellow-50/50 to-yellow-100/20 dark:from-yellow-950/10 dark:to-yellow-900/5">
                        <CardContent className="p-4">
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {periodDetails.tasks.pending.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-white/50 dark:bg-gray-800/30 hover:bg-white/70 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-900 dark:text-white">{item.task}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {format(new Date(item.date), 'MMM dd, yyyy')}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Ongoing Tasks Details */}
                  {periodDetails.tasks?.ongoing?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <PlayCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        Ongoing Tasks ({periodDetails.tasks.ongoing.length})
                      </h3>
                      <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50/50 to-blue-100/20 dark:from-blue-950/10 dark:to-blue-900/5">
                        <CardContent className="p-4">
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {periodDetails.tasks.ongoing.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-white/50 dark:bg-gray-800/30 hover:bg-white/70 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-900 dark:text-white">{item.task}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {format(new Date(item.date), 'MMM dd, yyyy')}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Upcoming Tasks Details */}
                  {periodDetails.tasks?.upcoming?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        Upcoming Tasks ({periodDetails.tasks.upcoming.length})
                      </h3>
                      <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50/50 to-purple-100/20 dark:from-purple-950/10 dark:to-purple-900/5">
                        <CardContent className="p-4">
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {periodDetails.tasks.upcoming.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-white/50 dark:bg-gray-800/30 hover:bg-white/70 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-900 dark:text-white">{item.task}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {format(new Date(item.date), 'MMM dd, yyyy')}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Work Notes */}
                  {periodDetails.notes && periodDetails.notes.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                        Work Notes ({periodDetails.notes.length})
                      </h3>
                      <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50/50 to-green-100/20 dark:from-green-950/10 dark:to-green-900/5">
                        <CardContent className="p-4">
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {periodDetails.notes.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-white/50 dark:bg-gray-800/30 hover:bg-white/70 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-900 dark:text-white">{item.note}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {format(new Date(item.date), 'MMM dd, yyyy')}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Daily Breakdown */}
                  {periodDetails.submissions && periodDetails.submissions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        Daily Breakdown ({periodDetails.submissions.length} days)
                      </h3>
                      <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50/50 to-indigo-100/20 dark:from-indigo-950/10 dark:to-indigo-900/5">
                        <CardContent className="p-4">
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {periodDetails.submissions.map((submission: any, idx: number) => (
                              <div key={idx} className="p-3 rounded-lg bg-white/50 dark:bg-gray-800/30 border border-gray-200/50 dark:border-gray-700/30">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                      {format(new Date(submission.date), 'MMM dd, yyyy')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3 text-blue-500" />
                                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                        {submission.hours}h
                                      </span>
                                    </div>
                                    {submission.start_time && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Start: {submission.start_time}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                    <span className="text-gray-600 dark:text-gray-400">Completed:</span>
                                    <span className="font-medium text-red-600 dark:text-red-400">{submission.completed_count}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                                    <span className="text-gray-600 dark:text-gray-400">Pending:</span>
                                    <span className="font-medium text-yellow-600 dark:text-yellow-400">{submission.pending_count}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                    <span className="text-gray-600 dark:text-gray-400">Ongoing:</span>
                                    <span className="font-medium text-blue-600 dark:text-blue-400">{submission.ongoing_count}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                                    <span className="text-gray-600 dark:text-gray-400">Upcoming:</span>
                                    <span className="font-medium text-purple-600 dark:text-purple-400">{submission.upcoming_count}</span>
                                  </div>
                                </div>
                                {submission.planned_work && (
                                  <div className="mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-700/30">
                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Planned Work:</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">{submission.planned_work}</p>
                                    {submission.planned_work_status && (
                                      <Badge className="mt-1 text-xs" variant="outline">
                                        {submission.planned_work_status}
                                      </Badge>
                                    )}
                                    {submission.planned_work_notes && (
                                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 italic">
                                        {submission.planned_work_notes}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              )}
                </div>
              )}
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
