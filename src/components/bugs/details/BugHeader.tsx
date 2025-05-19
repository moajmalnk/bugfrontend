import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bug } from '@/types';
import EditBugDialog from '@/components/bugs/EditBugDialog';

interface BugHeaderProps {
  bug: Bug;
  formattedCreatedDate: string;
  canEditBug: boolean;
}

export const BugHeader = ({ bug, formattedCreatedDate, canEditBug }: BugHeaderProps) => {
  const location = useLocation();
  const isFromProject = location.state?.from === 'project';

  const backLink = isFromProject 
    ? `/projects/${bug.project_id}?tab=bugs`
    : '/bugs';

  const backText = isFromProject 
    ? 'Back to Project Bugs'
    : 'Back to Bugs';

  return (
    <div className="space-y-3 sm:space-y-4">
      <Link 
        to={backLink}
        className="inline-flex items-center text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
        {backText}
      </Link>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight break-words">{bug.title}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Bug ID: {bug.id} • Reported on {formattedCreatedDate}
          </p>
        </div>
        
        {canEditBug && (
          <EditBugDialog bug={bug}>
            <Button 
              variant="outline"
              size="sm"
              className="w-full sm:w-auto h-8 sm:h-9 text-xs sm:text-sm"
            >
              Edit Bug
            </Button>
          </EditBugDialog>
        )}
      </div>
    </div>
  );
};
