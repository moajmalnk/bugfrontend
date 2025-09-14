import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  formatBugDate, 
  formatDetailedDate, 
  formatTooltipDate, 
  formatCompactTime,
  formatDateProfessional 
} from '@/lib/dateUtils';

/**
 * Demo component showcasing the new professional date formatting system
 * Remove this component before production deployment
 */
export const DateFormattingDemo = () => {
  // Sample dates for testing different scenarios
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const lastYear = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const testDates = [
    { label: "Just now", date: now },
    { label: "1 minute ago", date: oneMinuteAgo },
    { label: "30 minutes ago", date: thirtyMinutesAgo },
    { label: "3 hours ago", date: threeHoursAgo },
    { label: "Yesterday", date: yesterday },
    { label: "Last week", date: lastWeek },
    { label: "Last month", date: lastMonth },
    { label: "Last year", date: lastYear },
  ];

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🕒 Professional Date Formatting Demo</CardTitle>
          <CardDescription>
            Testing the new date formatting system used across bug tracking components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {testDates.map(({ label, date }) => (
              <div key={label} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{label}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {date.toISOString()}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  <div className="space-y-1">
                    <div className="font-medium text-blue-600">Bug Cards</div>
                    <div className="text-gray-700 font-mono">
                      {formatBugDate(date.toISOString())}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="font-medium text-green-600">Detailed Views</div>
                    <div className="text-gray-700 font-mono">
                      {formatDetailedDate(date.toISOString())}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="font-medium text-purple-600">Compact</div>
                    <div className="text-gray-700 font-mono">
                      {formatCompactTime(date.toISOString())}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="font-medium text-orange-600">Tooltip</div>
                    <div 
                      className="text-gray-700 font-mono cursor-help truncate"
                      title={formatTooltipDate(date.toISOString())}
                    >
                      {formatTooltipDate(date.toISOString()).substring(0, 20)}...
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Platform Comparison
            </h4>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <div><strong>GitHub style:</strong> "2 hours ago", "yesterday", "Dec 15"</div>
              <div><strong>Slack style:</strong> "Just now", "3h ago", "Yesterday at 14:30"</div>
              <div><strong>Linear style:</strong> Smart relative dates with time context</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 