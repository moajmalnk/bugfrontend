import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bug } from '@/types';
import EditBugDialog from '@/components/bugs/EditBugDialog';
import { Badge } from '@/components/ui/badge';
import { CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Add getStatusColor function
const getStatusColor = (status: string) => {
  switch (status) {
    case 'fixed':
      return 'bg-green-100 text-green-800 hover:bg-green-100';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
    case 'declined':
      return 'bg-red-100 text-red-800 hover:bg-red-100';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
  }
};

interface BugHeaderProps {
  bug: Bug;
  formattedCreatedDate: string;
  canEditBug: boolean;
  currentUser: any;
}

export const BugHeader = ({ bug, formattedCreatedDate, canEditBug, currentUser }: BugHeaderProps) => {
  const location = useLocation();
  const isFromProject = location.state?.from === 'project';
  const navigate = useNavigate();

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

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="text-xs">
          ID: {bug.id.substring(0, 8)}
        </Badge>
        <Badge variant="outline" className={getStatusColor(bug.status)}>
          {bug.status.replace(/_/g, " ").toUpperCase()}
        </Badge>
        {(currentUser?.role === 'admin' || currentUser?.role === 'developer') && bug.status !== 'fixed' && (
            <Button
                variant="default"
                size="sm"
                className="ml-auto hidden sm:flex"
                onClick={() => navigate(`/bugs/${bug.id}/fix`)}
            >
                <CheckSquare className="mr-2 h-4 w-4" /> Fix Bug
            </Button>
        )}
      </div>
    </div>
  );
};
