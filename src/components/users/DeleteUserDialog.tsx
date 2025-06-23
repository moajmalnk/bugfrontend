import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, X } from "lucide-react";
import { User } from "@/types";
import { useState } from "react";

interface DeleteUserDialogProps {
  user: User;
  onUserDelete: (userId: string, force?: boolean) => Promise<void>;
  trigger: React.ReactNode;
}

export function DeleteUserDialog({
  user,
  onUserDelete,
  trigger,
}: DeleteUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForceOption, setShowForceOption] = useState(false);
  const [dependencyError, setDependencyError] = useState<string>("");

  const handleDelete = async (force = false) => {
    setIsLoading(true);
    try {
      await onUserDelete(user.id, force);
      setOpen(false);
      setShowForceOption(false);
      setDependencyError("");
    } catch (error: any) {
      if (error.message.includes("associated data") || error.message.includes("Cannot delete user")) {
        setDependencyError(error.message);
        setShowForceOption(true);
      } else {
        // Re-throw other errors to be handled by parent
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setShowForceOption(false);
      setDependencyError("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {showForceOption && <AlertTriangle className="h-5 w-5 text-orange-500" />}
            Delete User
          </DialogTitle>
          <DialogDescription>
            {showForceOption 
              ? "This user has associated data that needs to be handled before deletion."
              : "Are you sure you want to delete this user? This action cannot be undone."
            }
          </DialogDescription>
        </DialogHeader>
        <DialogClose asChild>
            <Button variant="ghost" size="icon" className="absolute top-3 right-4">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
            </Button>
        </DialogClose>
        
        <div className="py-4">
          {showForceOption ? (
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-sm text-orange-800 dark:text-orange-200 font-medium mb-2">
                  Dependency Conflict
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  {dependencyError}
                </p>
              </div>
              
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
                  Force Delete Options:
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  <li>• Project ownership will be removed (projects remain)</li>
                  <li>• Bug authorship will be removed (bugs remain)</li>
                  <li>• Project memberships will be deleted</li>
                  <li>• User updates will be deleted</li>
                  <li>• File uploads will be deleted</li>
                  <li>• Activity logs will be deleted</li>
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This will permanently delete{" "}
              <span className="font-medium text-foreground">{user.username}</span>'s
              account and remove their access to the system.
            </p>
          )}
        </div>
        
        <DialogFooter>
          {showForceOption ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForceOption(false);
                  setDependencyError("");
                }}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(true)}
                disabled={isLoading}
              >
                {isLoading ? "Force Deleting..." : "Force Delete User"}
              </Button>
            </>
          ) : (
            <Button
              variant="destructive"
              onClick={() => handleDelete(false)}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete User"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
