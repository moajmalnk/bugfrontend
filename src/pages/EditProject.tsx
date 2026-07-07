import { ProjectForm } from '@/components/projects/ProjectForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { ENV } from '@/lib/env';
import {
  formValuesToPayload,
  projectService,
  projectToFormValues,
} from '@/services/projectService';
import { userService } from '@/services/userService';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pencil } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

interface FileWithPreview extends File {
  preview?: string;
}

const EditProject = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [values, setValues] = useState(projectToFormValues({
    id: '',
    name: '',
    description: '',
    status: 'active',
    created_by: '',
    created_at: '',
    updated_at: '',
  }));
  const [attachmentFiles, setAttachmentFiles] = useState<FileWithPreview[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdByName, setCreatedByName] = useState('');

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId!),
    enabled: !!projectId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users', 'project-form'],
    queryFn: () => userService.getUsers(),
    enabled: currentUser?.role === 'admin',
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ['project-attachments', projectId],
    queryFn: () => projectService.getAttachments(projectId!),
    enabled: !!projectId,
  });

  useEffect(() => {
    if (project) {
      setValues(projectToFormValues(project));
    }
  }, [project]);

  useEffect(() => {
    const fetchCreator = async () => {
      if (!project?.created_by) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${ENV.API_URL}/users/get.php?id=${project.created_by}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success && data.data) {
          setCreatedByName(data.data.username || data.data.name || 'System');
        }
      } catch {
        setCreatedByName('System');
      }
    };
    fetchCreator();
  }, [project?.created_by]);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        You do not have permission to edit projects.
      </div>
    );
  }

  if (projectLoading) {
    return (
      <div className="space-y-6 p-3 sm:p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        Project not found
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = formValuesToPayload(values);
      await projectService.updateProject(projectId!, payload);

      if (attachmentFiles.length > 0) {
        await projectService.uploadAttachments(projectId!, attachmentFiles);
      }

      toast({
        title: 'Success',
        description: 'Project updated successfully',
      });

      navigate(`/${currentUser!.role}/projects/${projectId}`);
    } catch {
      setError('Failed to update project. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to update project. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const allAttachments = [
    ...(project.attachments || []),
    ...attachments.filter((a) => !(project.attachments || []).some((p) => p.id === a.id)),
  ];

  return (
    <div className="space-y-6 p-3 sm:p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <Link
        to={`/${currentUser.role}/projects/${projectId}`}
        className="inline-flex items-center text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
        Back to Project
      </Link>

      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-500">
          <Pencil className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Edit Project</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Update {project.name}
          </p>
        </div>
      </div>

      <ProjectForm
        mode="edit"
        values={values}
        onChange={setValues}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        users={users}
        existingAttachments={allAttachments}
        projectMeta={project}
        createdByName={createdByName}
        attachmentFiles={attachmentFiles}
        onAttachmentFilesChange={setAttachmentFiles}
        error={error}
      />

      <div className="flex justify-end pb-4 -mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(`/${currentUser.role}/projects/${projectId}`)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default EditProject;
