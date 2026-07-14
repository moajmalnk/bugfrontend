import { ClientForm } from '@/components/clients/ClientForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  clientToFormValues,
  emptyClientFormValues,
  formValuesToClientPayload,
} from '@/lib/utils/clientUtils';
import { getEffectiveRole } from '@/lib/utils';
import { clientService } from '@/services/clientService';
import { ClientAttachment } from '@/types';
import { ArrowLeft, Building2, Pencil, Plus } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface FileWithPreview extends File {
  preview?: string;
}

const ClientFormPage = () => {
  const { clientId } = useParams<{ clientId?: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const role = getEffectiveRole(currentUser || {});
  const isEdit = Boolean(clientId && clientId !== 'new');
  const mode = isEdit ? 'edit' : 'create';

  const [values, setValues] = useState(emptyClientFormValues());
  const [attachmentFiles, setAttachmentFiles] = useState<FileWithPreview[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<ClientAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !clientId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const client = await clientService.getClient(clientId);
        setValues(clientToFormValues(client));
        setExistingAttachments(client.attachments || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load client');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [clientId, isEdit]);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        You do not have permission to manage clients.
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = formValuesToClientPayload(values);
      let savedId = clientId;
      if (isEdit && clientId) {
        await clientService.updateClient(clientId, payload);
      } else {
        const created = await clientService.createClient(payload);
        savedId = created.id;
      }
      if (attachmentFiles.length > 0 && savedId) {
        await clientService.uploadAttachments(savedId, attachmentFiles);
      }
      toast({
        title: 'Success',
        description: isEdit ? 'Client updated successfully' : 'Client created successfully',
      });
      navigate(`/${role}/clients/${savedId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save client';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await clientService.deleteAttachment(attachmentId);
      setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast({ title: 'Attachment removed' });
    } catch (err) {
      toast({
        title: 'Failed to remove attachment',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const backTarget =
    isEdit && clientId ? `/${role}/clients/${clientId}` : `/${role}/clients`;

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w mx-auto space-y-6 sm:space-y-8">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </section>
      </main>
    );
  }

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
                    onClick={() => navigate(backTarget)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-emerald-600 rounded-xl shadow-lg">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      {isEdit ? 'Edit Client' : 'New Client'}
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-emerald-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  {isEdit
                    ? 'Update client profile, contacts, lifecycle, and documents'
                    : 'Add a new client with contact details, status, and supporting docs'}
                </p>
              </div>

              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                <div className="p-1.5 bg-blue-500 rounded-lg">
                  {isEdit ? (
                    <Pencil className="h-5 w-5 text-white" />
                  ) : (
                    <Plus className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {isEdit ? 'Edit' : 'New'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <ClientForm
          mode={mode}
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => navigate(backTarget)}
          isSubmitting={isSubmitting}
          attachmentFiles={attachmentFiles}
          onAttachmentFilesChange={setAttachmentFiles}
          existingAttachments={existingAttachments}
          onDeleteAttachment={isEdit ? handleDeleteAttachment : undefined}
          error={error}
        />
      </section>
    </main>
  );
};

export default ClientFormPage;
