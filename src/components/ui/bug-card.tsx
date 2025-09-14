import { Link, useLocation } from 'react-router-dom';
import { Button } from './button';
import { Badge } from './badge';
import { useAuth } from '@/context/AuthContext';
import { BugCreatedDate } from '@/components/ui/DateDisplay';

const priorityColors = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
};

const statusColors = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  declined: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
};

interface Bug {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  project_id?: string;
  project_name?: string;
  reported_by: string;
}

interface BugCardProps {
  bug: Bug;
  onDelete: () => void;
}

export const BugCard = ({ bug }: BugCardProps) => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const isFromProject = location.pathname.startsWith('/projects/');

  return (
      <div className="w-full h-full flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 rounded-lg border bg-background transition-shadow hover:shadow-md">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-base sm:text-lg break-all whitespace-pre-line w-full max-w-full">
              {bug.title || 'Untitled Bug'}
            </h4>
            <Badge 
              variant="outline" 
              className={`text-xs ${priorityColors[bug.priority] || priorityColors.medium}`}
            >
              {bug.priority || 'medium'}
            </Badge>
            <Badge 
              variant="outline" 
              className={`text-xs ${statusColors[bug.status] || statusColors.pending}`}
            >
              {(bug.status || 'pending').replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="flex flex-col gap-1">
            {bug.project_name && !isFromProject && (
              <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">
                Project: {bug.project_name}
              </p>
            )}
            <BugCreatedDate date={bug.created_at} />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-3 sm:mt-0 sm:ml-4">
          <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm px-3 py-1">
            <Link 
              to={currentUser?.role ? `/${currentUser.role}/bugs/${bug.id}` : `/bugs/${bug.id}`}
              state={{ from: isFromProject ? 'project' : 'bugs' }}
            >
              View
            </Link>
          </Button>
      </div>
              </div>
  );
};