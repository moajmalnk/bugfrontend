import { Link, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Trash2 } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useState, useEffect } from 'react';
import { projectService } from '@/services/projectService';
import { userService } from '@/services/userService';
import { bugService } from '@/services/bugService';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Bug {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'fixed' | 'declined' | 'rejected';
  project_id: string;
  project_name?: string;
  reported_by: string;
  created_at: string;
}

interface BugCardProps {
  bug: Bug;
  onDelete?: () => void;
}

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

export function BugCard({ bug, onDelete }: BugCardProps) {
  const { currentUser } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const location = useLocation();
  const isFromProject = location.pathname.startsWith('/projects/');

  const canDelete = currentUser?.role === 'admin' || currentUser?.id === bug.reported_by;

  const handleDeleteClick = () => {
    if (canDelete) {
      setShowDeleteDialog(true);
    } else {
      setShowPermissionDialog(true);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await bugService.deleteBug(bug.id);
      toast({
        title: "Success",
        description: "Bug deleted successfully",
      });
      onDelete?.();
    } catch (error) {
      console.error('Error deleting bug:', error);
      toast({
        title: "Error",
        description: "Failed to delete bug",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Card className="w-full h-full flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:shadow-md transition-shadow">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-base sm:text-lg break-words whitespace-pre-line w-full">
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
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Created {formatDistanceToNow(parseISO(bug.created_at), { addSuffix: true })}
            </p>
          </div>
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
          
          {(currentUser?.role === "admin" || currentUser?.role === "tester") && (
            <Button 
              variant="destructive" 
              size="sm"
              className="text-xs sm:text-sm px-3 py-1"
              onClick={handleDeleteClick}
              disabled={isDeleting}
            >
              Delete
            </Button>
          )}
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bug?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the bug and all its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Permission Denied</AlertDialogTitle>
            <AlertDialogDescription>
              You don't have permission to delete this bug. Only the bug reporter and administrators can delete bugs.
              
              <div className="mt-4 bg-muted p-3 rounded-md text-sm">
                <p className="font-medium mb-2">Who can delete bugs:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>The tester who originally reported the bug</li>
                  <li>System administrators</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowPermissionDialog(false)}>
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
