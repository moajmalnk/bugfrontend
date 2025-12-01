import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ENV } from "@/lib/env";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Activity, Calendar, Clock, TrendingUp, Users } from "lucide-react";
import { useState } from "react";

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

export function ActiveHours({ userId, userName }: ActiveHoursProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');

  const { data: activeHoursData, isLoading, error } = useQuery<ActiveHoursData>({
    queryKey: ['activeHours', userId, selectedPeriod],
    queryFn: async () => {
      const response = await fetch(
        `${ENV.API_URL}/users/active_hours.php?id=${userId}&period=${selectedPeriod}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch active hours');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch active hours');
      }

      return data.data;
    },
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
        <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>

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
