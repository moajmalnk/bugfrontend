import { Link, useLocation } from 'react-router-dom';
import { Button } from './button';
import { Badge } from './badge';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { bugService } from '@/services/bugService';
import { useState } from 'react';

const priorityColors = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800'
};

const statusColors = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  fixed: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  rejected: 'bg-red-100 text-red-800'
};

interface Bug {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  project_id?: string;
}

interface BugCardProps {
  bug: Bug;
  onDelete: () => void;
}

export const BugCard = ({ bug, onDelete }: BugCardProps) => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const isFromProject = location.pathname.startsWith('/projects/');
  const [isDeleting, setIsDeleting] = useState(false);

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
        <p className="text-xs sm:text-sm text-muted-foreground truncate">
          Created {new Date(bug.created_at).toLocaleDateString()}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 mt-3 sm:mt-0 sm:ml-4">
        <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm px-3 py-1">
          <Link 
            to={`/bugs/${bug.id}`}
            state={{ from: isFromProject ? 'project' : 'bugs' }}
          >
            View Details
          </Link>
        </Button>
        {(currentUser?.role === 'admin' || currentUser?.role === 'tester') && (
          <Button 
            variant="destructive" 
            size="sm"
            className="text-xs sm:text-sm px-3 py-1"
            onClick={async () => {
              setIsDeleting(true);
              try {
                await bugService.deleteBug(bug.id);
                toast({
                  title: "Success",
                  description: "Bug has been deleted successfully",
                });
                onDelete();
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to delete bug",
                  variant: "destructive",
                });
              } finally {
                setIsDeleting(false);
              }
            }}
            disabled={isDeleting}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
};