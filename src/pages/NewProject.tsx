import { ProjectForm } from '@/components/projects/ProjectForm';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { googleDocsService } from '@/services/googleDocsService';
import { googleSheetsService } from '@/services/googleSheetsService';
import {
  emptyProjectFormValues,
  formValuesToPayload,
  projectService,
} from '@/services/projectService';
import { userService } from '@/services/userService';
import { clientService } from '@/services/clientService';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FolderKanban, Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface FileWithPreview extends File {
  preview?: string;
}

const NewProject = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [values, setValues] = useState(emptyProjectFormValues());
  const [attachmentFiles, setAttachmentFiles] = useState<FileWithPreview[]>([]);
  const [selectedBugDocIds, setSelectedBugDocIds] = useState<number[]>([]);
  const [selectedBugSheetIds, setSelectedBugSheetIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users', 'project-form'],
    queryFn: () => userService.getUsers(),
    enabled: currentUser?.role === 'admin',
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', 'project-form'],
    queryFn: () => clientService.getClients(),
    enabled: currentUser?.role === 'admin',
  });

  const { data: allBugDocs = [] } = useQuery({
    queryKey: ['project-form-all-bugdocs'],
    queryFn: async () => {
      const result = await googleDocsService.getAllDocuments(false);
      return result.documents.flatMap((group) => group.documents);
    },
    enabled: currentUser?.role === 'admin',
  });

  const { data: allBugSheets = [] } = useQuery({
    queryKey: ['project-form-all-bugsheets'],
    queryFn: async () => {
      const result = await googleSheetsService.getAllSheets(false);
      return result.sheets.flatMap((group) => group.sheets);
    },
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

      if (selectedBugDocIds.length > 0) {
        const docsToLink = allBugDocs.filter((doc) => selectedBugDocIds.includes(doc.id));
        await Promise.all(
          docsToLink.map((doc) =>
            googleDocsService.updateDocument(
              doc.id,
              doc.doc_title,
              project.id,
              null,
              doc.role || 'all'
            )
          )
        );
      }

      if (selectedBugSheetIds.length > 0) {
        const sheetsToLink = allBugSheets.filter((sheet) => selectedBugSheetIds.includes(sheet.id));
        await Promise.all(
          sheetsToLink.map((sheet) =>
            googleSheetsService.updateSheet(
              sheet.id,
              sheet.sheet_title,
              project.id,
              null,
              sheet.role || 'all'
            )
          )
        );
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
                    onClick={() => navigate(`/${currentUser.role}/projects`)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-emerald-600 rounded-xl shadow-lg">
                    <FolderKanban className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      New Project
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-emerald-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Add a new project with client details, team, timeline, and docs
                </p>
              </div>

              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                <div className="p-1.5 bg-blue-500 rounded-lg">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">New</div>
              </div>
            </div>
          </div>
        </div>

        <ProjectForm
          mode="create"
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/${currentUser.role}/projects`)}
          isSubmitting={isSubmitting}
          users={users}
          clients={clients}
          attachmentFiles={attachmentFiles}
          onAttachmentFilesChange={setAttachmentFiles}
          availableBugDocs={allBugDocs.map((doc) => ({
            id: doc.id,
            title: doc.doc_title,
            creatorName: doc.creator_name || null,
            projectId: doc.project_id,
            projectName: doc.project_name,
          }))}
          selectedBugDocIds={selectedBugDocIds}
          onSelectedBugDocIdsChange={setSelectedBugDocIds}
          availableBugSheets={allBugSheets.map((sheet) => ({
            id: sheet.id,
            title: sheet.sheet_title,
            creatorName: sheet.creator_name || null,
            projectId: sheet.project_id,
            projectName: sheet.project_name,
          }))}
          selectedBugSheetIds={selectedBugSheetIds}
          onSelectedBugSheetIdsChange={setSelectedBugSheetIds}
          error={error}
        />
      </section>
    </main>
  );
};

export default NewProject;
