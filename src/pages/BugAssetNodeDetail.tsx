import { CopyValue } from "@/components/assets/CopyValue";
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
import { clientService } from "@/services/clientService";
import type { AssetHosting, AssetServer, AssetVercel, NodeKind } from "@/types/assets";
import type { Client } from "@/types";
import { ArrowLeft, KeyRound, Server } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

export default function BugAssetNodeDetail() {
  const { kind = "servers", nodeId } = useParams<{ kind: string; nodeId: string }>();
  const nodeKind: NodeKind = kind === "hosting" ? "hosting" : kind === "vercel" ? "vercel" : "server";
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions(null);
  const role = getEffectiveRole(currentUser || {});
  const canEdit = hasPermissionOrAdmin(role, hasPermission, "ASSETS_EDIT");
  const canReveal = hasPermissionOrAdmin(role, hasPermission, "ASSETS_VAULT_REVEAL");
  const showFinance = hasPermissionOrAdmin(role, hasPermission, "ASSETS_FINANCE_VIEW");
  const navigate = useNavigate();
  const [node, setNode] = useState<AssetServer | AssetHosting | AssetVercel | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [linkClient, setLinkClient] = useState("");
  const [vaultOpen, setVaultOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);

  const load = useCallback(async () => {
    if (!nodeId) return;
    setLoading(true);
    try {
      const [n, c] = await Promise.all([assetsService.getNode(nodeKind, nodeId), clientService.getClients()]);
      setNode(n);
      setClients(c);
    } catch (err) {
      toast({ title: "Node not found", description: err instanceof Error ? err.message : "", variant: "destructive" });
      navigate(`/${role}/bugassets`);
    } finally {
      setLoading(false);
    }
  }, [nodeId, nodeKind, navigate, role]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !node) {
    return (
      <ListPageShell>
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-xl" />
      </ListPageShell>
    );
  }

  const title =
    "hostname" in node && node.hostname
      ? node.hostname
      : "project_name" in node && node.project_name
        ? node.project_name
        : "label" in node
          ? node.label
          : node.id;
  const ip = "public_ipv4" in node ? node.public_ipv4 : null;
  const inbound = node.inbound_subdomains || [];
  const linked = node.clients || [];

  const link = async () => {
    if (!linkClient || linking) return;
    setLinking(true);
    try {
      await assetsService.linkNode({ client_id: linkClient, node_kind: nodeKind, node_id: node.id });
      toast({ title: "Client linked" });
      setLinkClient("");
      await load();
    } catch (err) {
      toast({ title: "Link failed", description: err instanceof Error ? err.message : "", variant: "destructive" });
    } finally {
      setLinking(false);
    }
  };

  return (
    <ListPageShell>
      <Button variant="ghost" className="rounded-xl" asChild>
        <Link to={`/${role}/bugassets`}><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
      </Button>
      <ListPageHeader
        icon={<Server className="h-6 w-6" />}
        title={title}
        description={`${nodeKind} · expires ${node.expires_at || "n/a"}`}
        actions={
          <Button variant="outline" className="rounded-xl" onClick={() => setVaultOpen(true)}>
            <KeyRound className="h-4 w-4 mr-2" />Vault
          </Button>
        }
      />
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-6 rounded-xl">
          <CardContent className="p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Connectivity</h2>
            <CopyValue value={ip} label="IPv4" />
            {"hostname" in node && <CopyValue value={node.hostname} label="hostname" />}
            {"ssh_user" in node && node.ssh_user && <div className="text-sm">SSH user: {node.ssh_user}</div>}
            {"os_name" in node && node.os_name && <div className="text-sm">{node.os_name}</div>}
            {showFinance && <div className="text-sm">Margin: {node.margin_amount ?? "—"} INR</div>}
          </CardContent>
        </Card>
        <Card className="col-span-12 lg:col-span-6 rounded-xl">
          <CardContent className="p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Linked clients</h2>
            {linked.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clients linked. Shared nodes can serve many clients.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {linked.map((c) => (
                  <div key={c.link_id} className="flex items-center justify-between gap-2 rounded-xl border p-3">
                    <Link className="text-sm font-medium truncate" to={`/${role}/clients/${c.client_id}`}>
                      {c.client_code} · {c.corporate_name}
                    </Link>
                    {canEdit && (
                      <Button variant="ghost" size="sm" className="rounded-xl" onClick={async () => {
                        await assetsService.unlinkNode(c.link_id);
                        toast({ title: "Unlinked" });
                        await load();
                      }}>Unlink</Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canEdit && (
              <div className="flex gap-2">
                <select className="flex-1 h-10 rounded-xl border bg-background px-3 text-sm" value={linkClient} onChange={(e) => setLinkClient(e.target.value)}>
                  <option value="">Link a client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.corporate_name}</option>
                  ))}
                </select>
                <Button className="rounded-xl" disabled={!linkClient || linking} onClick={() => void link()}>
                  {linking ? "Linking…" : "Link"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-12 rounded-xl">
          <CardContent className="p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Inbound subdomains</h2>
            {inbound.length === 0 ? (
              <p className="text-sm text-muted-foreground">No DNS records point at this node yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {inbound.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
                    <div>
                      <div className="font-medium">{s.fqdn}</div>
                      <div className="text-xs text-muted-foreground">{s.client_code} · {s.client_name}</div>
                    </div>
                    <CopyValue value={s.target_value} label="target" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <VaultRevealModal
        open={vaultOpen}
        onOpenChange={setVaultOpen}
        entityType={nodeKind}
        entityId={node.id}
        canReveal={canReveal}
        canEdit={canEdit}
      />
    </ListPageShell>
  );
}
