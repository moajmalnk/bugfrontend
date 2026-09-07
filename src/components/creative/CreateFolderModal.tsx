import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type Props = {
  open: boolean;
  mode: 'create' | 'rename';
  initialName?: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void | Promise<void>;
};

const NAME_MAX = 100;

export function CreateFolderModal({
  open,
  mode,
  initialName = '',
  busy = false,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  const [baseline, setBaseline] = useState(initialName);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setBaseline(initialName);
    setError('');
  }, [open, initialName]);

  const dirty = name.trim() !== baseline.trim();
  const isValid = name.trim().length > 0 && name.trim().length <= NAME_MAX;

  const handleClose = () => {
    if (busy) return;
    if (dirty && !window.confirm('You have unsaved changes.')) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!isValid || busy) return;
    const trimmed = name.trim().slice(0, NAME_MAX);
    if (!trimmed) {
      setError('Folder name is required');
      return;
    }
    await onSubmit(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-[600px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'New folder' : 'Rename folder'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a folder in the current location.'
              : 'Update the folder name.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-12 gap-4 py-2">
          <div className="col-span-12 flex flex-col gap-2">
            <Label htmlFor="creative-folder-name">Name</Label>
            <Input
              id="creative-folder-name"
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => {
                const next = e.target.value.slice(0, NAME_MAX);
                setName(next);
                setError(next.trim() ? '' : 'Folder name is required');
              }}
              className="h-11 rounded-xl"
              placeholder="Campaign assets"
              autoFocus
              disabled={busy}
            />
            {error ? (
              <span className="text-xs text-red-500">{error}</span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {name.length}/{NAME_MAX}
              </span>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={busy}
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 text-white hover:from-fuchsia-700 hover:to-violet-800"
            disabled={!isValid || busy}
            onClick={() => void handleSubmit()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
