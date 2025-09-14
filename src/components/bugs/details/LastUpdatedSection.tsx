
import { Clock } from 'lucide-react';

interface LastUpdatedSectionProps {
  formattedUpdatedDate: string;
}

export const LastUpdatedSection = ({ formattedUpdatedDate }: LastUpdatedSectionProps) => {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h3>
      <div className="flex items-center text-sm">
        <Clock className="mr-1 h-3 w-3" />
        {formattedUpdatedDate}
      </div>
    </div>
  );
};
