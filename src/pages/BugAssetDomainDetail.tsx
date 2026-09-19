import { ConfirmAssetDelete } from "@/components/assets/ConfirmAssetDelete";
import { CopyValue } from "@/components/assets/CopyValue";
import { SubdomainFormModal } from "@/components/assets/AssetModals";
import { VaultRevealModal } from "@/components/assets/VaultRevealModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { ListPageHeader, ListPageShell } from "@/components/layout/list-page";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { getEffectiveRole, hasPermissionOrAdmin } from "@/lib/utils";
import { assetsService } from "@/services/assetsService";
import type { AssetDomain, AssetNode } from "@/types/assets";
import { ArrowLeft, Globe, KeyRound, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

export default function BugAssetDomainDetail() {
  const { domainId } = useParams<{ domainId: string }>();
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions(null);
  const role = getEffectiveRole(currentUser || {});
  const canEdit = hasPermissionOrAdmin(role, hasPermission, "ASSETS_EDIT");
  const canCreate = hasPermissionOrAdmin(role, hasPermission, "ASSETS_CREATE");
  const canDelete = hasPermissionOrAdmin(role, hasPermission, "ASSETS_DELETE");
  const canReveal = hasPermissionOrAdmin(role, hasPermission, "ASSETS_VAULT_REVEAL");
  const showFinance = hasPermissionOrAdmin(role, hasPermission, "ASSETS_FINANCE_VIEW");
  const navigate = useNavigate();
  const [domain, setDomain] = useState<AssetDomain | null>(null);
  const [servers, setServers] = useState<AssetNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [subOpen, setSubOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!domainId) return;
    setLoading(true);
    try {
      const [d, n] = await Promise.all([
        assetsService.getDomain(domainId),
        assetsService.listNodes("server", { page: 1, limit: 100 }),
      ]);
      setDomain(d);
      setServers(n.items || []);
    } catch (err) {
      toast({ title: "Domain not found", description: err instanceof Error ? err.message : "", variant: "destructive" });
      navigate(`/${role}/bugassets`);
    } finally {
      setLoading(false);
    }
  }, [domainId, navigate, role]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !domain) {
    return (
      <ListPageShell>
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-xl" />
      </ListPageShell>
    );
  }

  return (
    <ListPageShell>
      <div className="flex items-center gap-2">
        <Button variant="ghost" className="rounded-xl" asChild>
          <Link to={`/${role}/bugassets`}><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
        </Button>
      </div>
      <ListPageHeader
        icon={<Globe className="h-6 w-6" />}
        title={domain.fqdn}
        description={`${domain.client_code || domain.client_name || "Unlinked client"} · ${domain.registrar || "No registrar"}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setVaultOpen(true)}>
              <KeyRound className="h-4 w-4 mr-2" />Vault
            </Button>
            {canCreate && (
              <Button className="rounded-xl" onClick={() => setSubOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />Subdomain
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-6 rounded-xl">
          <CardContent className="p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">DNS</h2>
            <div className="text-sm">Provider: {domain.dns_provider || "—"}</div>
            <div className="flex flex-col gap-2">
              {(domain.nameservers || []).length === 0 ? (
                <span className="text-muted-foreground text-sm">No nameservers</span>
              ) : (
                (domain.nameservers || []).map((ns) => <CopyValue key={ns} value={ns} label="nameserver" />)
              )}
            </div>
            <div className="text-sm">Expires: {domain.expires_at || "—"} · Auto-renew {domain.auto_renew ? "yes" : "no"}</div>
            {showFinance && <div className="text-sm">Margin: {domain.margin_amount ?? "—"} INR</div>}
          </CardContent>
        </Card>
        <Card className="col-span-12 lg:col-span-6 rounded-xl">
          <CardContent className="p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Mailboxes</h2>
            {(domain.emails || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No mailboxes on this domain.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {(domain.emails || []).map((m) => (
                  <CopyValue key={m.id} value={m.address} label="mailbox" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-12 rounded-xl">
          <CardContent className="p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Subdomains</h2>
            {(domain.subdomains || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No subdomains yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {(domain.subdomains || []).map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{s.fqdn}</div>
                      <div className="text-xs text-muted-foreground">{s.record_type} → {s.target_value || s.target_kind}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CopyValue value={s.target_value} label="target" />
                      {canDelete && (
                        <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => setDeleteId(s.id)}>Delete</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SubdomainFormModal open={subOpen} onClose={() => setSubOpen(false)} onSaved={() => void load()} domainId={domain.id} servers={servers} />
      <VaultRevealModal open={vaultOpen} onOpenChange={setVaultOpen} entityType="domain" entityId={domain.id} canReveal={canReveal} canEdit={canEdit} />
      <ConfirmAssetDelete
        open={Boolean(deleteId)}
        title="Delete subdomain"
        description="Remove this DNS record from the inventory?"
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={async () => {
          if (!deleteId) return;
          await assetsService.deleteSubdomain(deleteId);
          toast({ title: "Subdomain deleted" });
          await load();
        }}
      />
    </ListPageShell>
  );
}
