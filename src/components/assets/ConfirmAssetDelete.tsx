import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

interface ConfirmAssetDeleteProps {
  open: boolean;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmAssetDelete({
  open,
  title,
  description,
  onOpenChange,
  onConfirm,
}: ConfirmAssetDeleteProps) {
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (loading) return;
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[400px] rounded-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" className="rounded-xl" onClick={handleConfirm} disabled={loading}>
            {loading ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
