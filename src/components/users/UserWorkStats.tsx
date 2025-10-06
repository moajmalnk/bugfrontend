import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { userService } from "@/services/userService";
import { Calendar, Clock, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";

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
              {period_trend.slice(0, 6).map((period, index) => (
                <div key={period.period} className="group p-3 rounded-xl bg-gradient-to-r from-gray-50/50 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/20 hover:from-gray-100/70 hover:to-blue-100/50 dark:hover:from-gray-700/50 dark:hover:to-blue-800/30 transition-all duration-200 border border-gray-200/30 dark:border-gray-700/30">
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
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-gray-600 dark:text-gray-400">Completed</span>
                      <span className="font-medium text-red-600 dark:text-red-400">{period.task_counts.completed}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-gray-600 dark:text-gray-400">Pending</span>
                      <span className="font-medium text-yellow-600 dark:text-yellow-400">{period.task_counts.pending}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-600 dark:text-gray-400">Ongoing</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">{period.task_counts.ongoing}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-gray-600 dark:text-gray-400">Upcoming</span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">{period.task_counts.upcoming}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
