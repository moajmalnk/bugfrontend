import { Badge } from '@/components/ui/badge';
import {
  getComplianceStatusBadgeClass,
  getComplianceStatusLabel,
  type CompliancePhaseStatus,
} from '@/lib/codo/complianceStatus';
import { cn } from '@/lib/utils';

interface ComplianceStatusBadgeProps {
  status: CompliancePhaseStatus;
  className?: string;
}

export function ComplianceStatusBadge({ status, className }: ComplianceStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 shrink-0',
        getComplianceStatusBadgeClass(status),
        className
      )}
    >
      {getComplianceStatusLabel(status)}
    </Badge>
  );
}
