import { ProjectForm } from '@/components/projects/ProjectForm';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  emptyProjectFormValues,
  formValuesToPayload,
  projectService,
} from '@/services/projectService';
import { userService } from '@/services/userService';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FolderKanban } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface FileWithPreview extends File {
  preview?: string;
}

const NewProject = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [values, setValues] = useState(emptyProjectFormValues());
  const [attachmentFiles, setAttachmentFiles] = useState<FileWithPreview[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users', 'project-form'],
    queryFn: () => userService.getUsers(),
    enabled: currentUser?.role === 'admin',
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        You do not have permission to create projects.
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = formValuesToPayload(values);
      const project = await projectService.createProject(payload);

      if (attachmentFiles.length > 0) {
        await projectService.uploadAttachments(project.id, attachmentFiles);
      }

      toast({
        title: 'Success',
        description: 'Project created successfully',
      });

      navigate(`/${currentUser.role}/projects/${project.id}`);
    } catch {
      setError('Failed to create project. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to create project. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-3 sm:p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <Link
        to={`/${currentUser.role}/projects`}
        className="inline-flex items-center text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
        Back to Projects
      </Link>

      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-500">
          <FolderKanban className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Create New Project</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Add a new project with client details, team, timeline, and docs.
          </p>
        </div>
      </div>

      <ProjectForm
        mode="create"
        values={values}
        onChange={setValues}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        users={users}
        attachmentFiles={attachmentFiles}
        onAttachmentFilesChange={setAttachmentFiles}
        error={error}
      />

      <div className="flex justify-end pb-4 -mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(`/${currentUser.role}/projects`)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default NewProject;
