import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { clientService } from '@/services/clientService';
import { useState } from 'react';

interface DeleteClientDialogProps {
  clientId: string;
  clientName: string;
  projectCount?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteClientDialog({
  clientId,
  clientName,
  projectCount = 0,
  open,
  onOpenChange,
  onDeleted,
}: DeleteClientDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await clientService.deleteClient(clientId, projectCount > 0);
      toast({ title: 'Client deleted' });
      onOpenChange(false);
      onDeleted();
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Client</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{clientName}</strong>?
            {projectCount > 0
              ? ` This client has ${projectCount} linked project(s). Deletion will unlink them.`
              : ' This action cannot be undone.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
