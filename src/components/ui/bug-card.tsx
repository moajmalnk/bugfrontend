import { Link, useLocation } from 'react-router-dom';
import { Button } from './button';
import { Badge } from './badge';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { bugService } from '@/services/bugService';

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

  return (
    <div className="w-full h-full flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 rounded-lg border bg-background transition-shadow hover:shadow-md">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-medium text-base sm:text-lg break-words">{bug.title}</h4>
          <Badge variant="outline" className="text-xs sm:text-sm">{bug.priority}</Badge>
          <Badge variant="outline" className="text-xs sm:text-sm">{bug.status.replace('_', ' ')}</Badge>
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
              }
            }}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
};