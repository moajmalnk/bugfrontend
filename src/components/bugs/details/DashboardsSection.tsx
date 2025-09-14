
import { Badge } from '@/components/ui/badge';

interface DashboardsSectionProps {
  affectedDashboards: string[];
}

export const DashboardsSection = ({ 
  affectedDashboards, 
}: DashboardsSectionProps) => {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-1">Affected Dashboards</h3>
      <div className="flex flex-wrap gap-2">
        {affectedDashboards.length === 0 ? (
          <span className="text-muted-foreground">None specified</span>
        ) : (
          affectedDashboards.map(dashboardId => {
            return (
              <Badge key={dashboardId} variant="outline">
                {dashboardId}
              </Badge>
            );
          })
        )}
      </div>
    </div>
  );
};
