
import { BugPriority } from '@/types';

interface PrioritySectionProps {
  priority: BugPriority;
  priorityColors: Record<string, string>;
}

export const PrioritySection = ({ priority, priorityColors }: PrioritySectionProps) => {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-1">Priority</h3>
      <div className={`text-base font-medium capitalize ${priorityColors[priority]}`}>
        {priority}
      </div>
    </div>
  );
};
