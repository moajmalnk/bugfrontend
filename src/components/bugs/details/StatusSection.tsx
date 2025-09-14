
import { BugStatus } from '@/types';
import { BugStatusSelect } from './BugStatusSelect';

interface StatusSectionProps {
  status: BugStatus;
  canUpdateStatus: boolean;
  onChange: (status: BugStatus) => Promise<void>;
  statusColors: Record<string, string>;
}

export const StatusSection = ({ 
  status, 
  canUpdateStatus, 
  onChange, 
  statusColors 
}: StatusSectionProps) => {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
      {canUpdateStatus ? (
        <BugStatusSelect 
          status={status} 
          onChange={onChange}
        />
      ) : (
        <div className={`text-base font-medium capitalize ${statusColors[status]}`}>
          {status}
        </div>
      )}
    </div>
  );
};
