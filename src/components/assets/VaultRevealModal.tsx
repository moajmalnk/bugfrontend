import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { assetsService } from "@/services/assetsService";
import type { VaultKind, VaultSecretMeta } from "@/types/assets";
import { useEffect, useState } from "react";
import { AssetSelect } from "./AssetFormFields";
import { CopyValue } from "./CopyValue";

interface VaultRevealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: string;
  entityId: string;
  canReveal: boolean;
  canEdit: boolean;
}

const INITIAL = { label: "", kind: "password" as VaultKind, secret: "" };

const VAULT_KINDS: Array<{ value: VaultKind; label: string }> = [
  { value: "password", label: "Password" },
  { value: "ssh_private_key", label: "SSH private key" },
  { value: "api_token", label: "API token" },
  { value: "recovery_code", label: "Recovery code" },
  { value: "other", label: "Other" },
];

export function VaultRevealModal({
  open,
  onOpenChange,
  entityType,
  entityId,
  canReveal,
  canEdit,
}: VaultRevealModalProps) {
  const [items, setItems] = useState<VaultSecretMeta[]>([]);
  const [form, setForm] = useState(INITIAL);
  const [revealed, setRevealed] = useState<{ id: string; secret: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(INITIAL);
      setRevealed(null);
      setDirty(false);
      return;
    }
    assetsService
      .listVault(entityType, entityId)
      .then(setItems)
      .catch(() => setItems([]));
  }, [open, entityType, entityId]);

  const handleClose = () => {
    if (dirty && !window.confirm("You have unsaved changes.")) return;
    setForm(INITIAL);
    setRevealed(null);
    setDirty(false);
    onOpenChange(false);
  };

  const store = async () => {
    if (loading || !form.secret.trim()) return;
    setLoading(true);
    try {
      await assetsService.storeVault({
        entity_type: entityType,
        entity_id: entityId,
        kind: form.kind,
        label: form.label || "Secret",
        secret: form.secret,
      });
      toast({ title: "Secret stored" });
      setForm(INITIAL);
      setDirty(false);
      setItems(await assetsService.listVault(entityType, entityId));
    } catch (err) {
      toast({
        title: "Vault store failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const reveal = async (id: string) => {
    if (!canReveal || loading) return;
    setLoading(true);
    try {
      const data = await assetsService.revealVault(id);
      setRevealed({ id, secret: data.secret });
    } catch (err) {
      toast({
        title: "Reveal failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-w-[400px] rounded-xl">
        <DialogHeader>
          <DialogTitle>Credential vault</DialogTitle>
          <DialogDescription>Secrets are encrypted at rest. Reveal is audited.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No secrets stored for this asset.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/60 p-3">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.kind} · {item.fingerprint || "no fingerprint"}
                  </div>
                  {revealed?.id === item.id ? (
                    <div className="mt-2">
                      <CopyValue value={revealed.secret} label="secret" />
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 rounded-xl"
                      disabled={!canReveal || loading}
                      onClick={() => reveal(item.id)}
                    >
                      Reveal
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {canEdit && (
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12">
                <Label htmlFor="vault-label">Label</Label>
                <Input
                  id="vault-label"
                  maxLength={120}
                  className="rounded-xl"
                  value={form.label}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, label: e.target.value.slice(0, 120) }));
                    setDirty(true);
                  }}
                />
              </div>
              <div className="col-span-12 space-y-1.5">
                <Label>Kind</Label>
                <AssetSelect
                  value={form.kind}
                  onValueChange={(v) => {
                    setForm((f) => ({ ...f, kind: v as VaultKind }));
                    setDirty(true);
                  }}
                  placeholder="Secret kind"
                  searchable={false}
                  options={VAULT_KINDS}
                />
              </div>
              <div className="col-span-12">
                <Label htmlFor="vault-secret">Secret</Label>
                <Input
                  id="vault-secret"
                  type="password"
                  className="rounded-xl"
                  value={form.secret}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, secret: e.target.value }));
                    setDirty(true);
                  }}
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" onClick={handleClose} disabled={loading}>
            Close
          </Button>
          {canEdit && (
            <Button className="rounded-xl" onClick={store} disabled={loading || !form.secret.trim()}>
              {loading ? "Saving…" : "Store"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
