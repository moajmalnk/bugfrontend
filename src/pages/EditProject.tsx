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
import { ArrowLeft, FolderKanban, Pencil } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w mx-auto space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </section>
      </main>
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
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w mx-auto space-y-6 sm:space-y-8">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    className="flex items-center text-muted-foreground hover:text-foreground p-2"
                    onClick={() => navigate(`/${currentUser.role}/projects/${projectId}`)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-emerald-600 rounded-xl shadow-lg">
                    <FolderKanban className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Edit Project
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-emerald-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Update {project.name} — client details, team, timeline, and docs
                </p>
              </div>

              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                <div className="p-1.5 bg-emerald-500 rounded-lg">
                  <Pencil className="h-5 w-5 text-white" />
                </div>
                <div className="text-lg font-bold text-blue-700 dark:text-blue-300 truncate max-w-[200px]">
                  {project.name}
                </div>
              </div>
            </div>
          </div>
        </div>

        <ProjectForm
          mode="edit"
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/${currentUser.role}/projects/${projectId}`)}
          isSubmitting={isSubmitting}
          users={users}
          existingAttachments={allAttachments}
          projectMeta={project}
          createdByName={createdByName}
          attachmentFiles={attachmentFiles}
          onAttachmentFilesChange={setAttachmentFiles}
          error={error}
        />
      </section>
    </main>
  );
};

export default EditProject;
