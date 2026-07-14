import { ClientForm } from '@/components/clients/ClientForm';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  clientToFormValues,
  emptyClientFormValues,
  formValuesToClientPayload,
} from '@/lib/utils/clientUtils';
import { getEffectiveRole } from '@/lib/utils';
import { clientService } from '@/services/clientService';
import { ArrowLeft, Building2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

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
  const [existingAttachments, setExistingAttachments] = useState(
    [] as import('@/types').ClientAttachment[]
  );
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
      toast({ title: isEdit ? 'Client updated' : 'Client created' });
      navigate(`/${role}/clients/${savedId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save client');
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

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Loading client...</div>;
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/${role}/clients`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {isEdit ? 'Edit Client' : 'Add Client'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isEdit ? 'Update client profile and documents' : 'Create a new client profile'}
              </p>
            </div>
          </div>
        </div>

        <ClientForm
          mode={mode}
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => navigate(isEdit && clientId ? `/${role}/clients/${clientId}` : `/${role}/clients`)}
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
