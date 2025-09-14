import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil } from 'lucide-react';
import { Project, UpdateProjectData } from '@/services/projectService';

interface EditProjectDialogProps {
  project: Project;
  onSubmit: (data: UpdateProjectData) => Promise<boolean>;
  children?: React.ReactNode;
}

export function EditProjectDialog({ project, onSubmit, children }: EditProjectDialogProps) {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'completed' | 'archived'>('active');
  const [error, setError] = useState<string | null>(null);

  // Initialize form with project data when dialog opens
  useEffect(() => {
    if (isOpen && project) {
      setName(project.name);
      setDescription(project.description);
      setStatus(project.status);
      setError(null);
    }
  }, [isOpen, project]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'name') {
      setName(value);
    } else if (name === 'description') {
      setDescription(value);
    }
  };

  const handleStatusChange = (value: 'active' | 'completed' | 'archived') => {
    setStatus(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Basic validation
    if (!name.trim()) {
      setError("Project name is required");
      setIsLoading(false);
      return;
    }

    if (!description.trim()) {
      setError("Project description is required");
      setIsLoading(false);
      return;
    }

    try {
      const updateData: UpdateProjectData = {};
      
      // Only include fields that have changed
      if (name !== project.name) {
        updateData.name = name;
      }
      
      if (description !== project.description) {
        updateData.description = description;
      }
      
      if (status !== project.status) {
        updateData.status = status;
      }

      // Check if anything actually changed
      if (Object.keys(updateData).length === 0) {
        setError("No changes were made");
        setIsLoading(false);
        return;
      }

      const success = await onSubmit(updateData);
      if (success) {
        setIsOpen(false);
      }
    } catch (err) {
      // console.error('Error updating project:', err);
      setError("Failed to update project. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Only allow admin to edit projects
  if (currentUser?.role !== 'admin') {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="w-full md:w-auto mt-2 md:mt-0 flex-shrink-0" size="sm">
            <Pencil className="mr-2 h-4 w-4" /> Edit Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the project details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Project name"
                value={name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Project description"
                value={description}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && (
              <div className="text-sm font-medium text-red-500">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name || !description}>
              {isLoading ? 'Updating...' : 'Update Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 