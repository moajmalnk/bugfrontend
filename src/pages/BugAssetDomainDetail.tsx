import { ConfirmAssetDelete } from "@/components/assets/ConfirmAssetDelete";
import { CopyValue } from "@/components/assets/CopyValue";
import {
  DomainFormModal,
  MailFormModal,
  SubdomainFormModal,
} from "@/components/assets/AssetModals";
import { nameserverDefaultsFor } from "@/components/assets/AssetFormFields";
import { VaultRevealModal } from "@/components/assets/VaultRevealModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { ListPageHeader, ListPageShell } from "@/components/layout/list-page";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { cn, getEffectiveRole, hasPermissionOrAdmin } from "@/lib/utils";
import { assetsService } from "@/services/assetsService";
import type {
  AssetDomain,
  AssetEmail,
  AssetNode,
  AssetSubdomain,
} from "@/types/assets";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  KeyRound,
  Mail,
  Pencil,
  Plus,
  Server,
  Shield,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

function statusTone(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "active" || s === "assigned" || s === "in_stock") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
  }
  if (s === "pending" || s === "repair" || s === "expiring" || s === "suspended") {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
  }
  if (s === "expired" || s === "retired" || s === "lost" || s === "cancelled" || s === "deleted") {
    return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20";
  }
  return "bg-muted text-muted-foreground border-border/60";
}

function formatQuotaMb(mb?: number | null) {
  if (mb == null || Number.isNaN(Number(mb))) return "—";
  const n = Number(mb);
  if (n >= 1024) return `${(n / 1024).toFixed(n % 1024 === 0 ? 0 : 1)} GB`;
  return `${n} MB`;
}

function daysUntil(date?: string | null) {
  if (!date) return null;
  const end = new Date(`${date}T00:00:00`);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}

function subdomainTarget(s: AssetSubdomain) {
  if (s.target_value) return { label: s.target_value, kind: "raw" as const, href: null };
  if (s.target_kind === "server") {
    const host = s.target_server_hostname || "Server";
    const ip = s.target_server_ipv4 ? ` · ${s.target_server_ipv4}` : "";
    return {
      label: `${host}${ip}`,
      kind: "server" as const,
      href: s.target_server_id ? `servers/${s.target_server_id}` : null,
    };
  }
  if (s.target_kind === "hosting") {
    return {
      label: s.target_hosting_label || "Hosting",
      kind: "hosting" as const,
      href: s.target_hosting_id ? `hosting/${s.target_hosting_id}` : null,
    };
  }
  if (s.target_kind === "vercel") {
    return {
      label: s.target_vercel_project || "Vercel",
      kind: "vercel" as const,
      href: s.target_vercel_id ? `vercel/${s.target_vercel_id}` : null,
    };
  }
  return { label: s.target_kind, kind: "raw" as const, href: null };
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 gap-2 py-2 border-b border-border/40 last:border-0">
      <div className="col-span-12 sm:col-span-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="col-span-12 sm:col-span-8 text-sm min-w-0 break-words">{children}</div>
    </div>
  );
}

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
  const [hostingNodes, setHostingNodes] = useState<AssetNode[]>([]);
  const [vercelNodes, setVercelNodes] = useState<AssetNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [subOpen, setSubOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState<AssetEmail | null>(null);
  const [editingSubdomain, setEditingSubdomain] = useState<AssetSubdomain | null>(null);

  const load = useCallback(async () => {
    if (!domainId) return;
    setLoading(true);
    try {
      const [d, n, h, v] = await Promise.all([
        assetsService.getDomain(domainId),
        assetsService.listNodes("server", { page: 1, limit: 100 }),
        assetsService.listNodes("hosting", { page: 1, limit: 100 }),
        assetsService.listNodes("vercel", { page: 1, limit: 100 }),
      ]);
      setDomain(d);
      setServers(n.items || []);
      setHostingNodes(h.items || []);
      setVercelNodes(v.items || []);
    } catch (err) {
      toast({
        title: "Domain not found",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
      navigate(`/${role}/bugassets`);
    } finally {
      setLoading(false);
    }
  }, [domainId, navigate, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const nameservers = useMemo(() => {
    const saved = (domain?.nameservers || []).map(String).filter(Boolean);
    if (saved.length) return { list: saved, inferred: false };
    const defaults = nameserverDefaultsFor(domain?.dns_provider || domain?.registrar);
    return { list: defaults, inferred: defaults.length > 0 };
  }, [domain]);

  const expiryDays = daysUntil(domain?.expires_at);

  if (loading || !domain) {
    return (
      <ListPageShell>
        <div className="grid grid-cols-12 gap-4">
          <Skeleton className="col-span-12 h-28 rounded-2xl" />
          <Skeleton className="col-span-12 md:col-span-4 h-40 rounded-xl" />
          <Skeleton className="col-span-12 md:col-span-4 h-40 rounded-xl" />
          <Skeleton className="col-span-12 md:col-span-4 h-40 rounded-xl" />
          <Skeleton className="col-span-12 h-64 rounded-xl" />
        </div>
      </ListPageShell>
    );
  }

  const emails = domain.emails || [];
  const subs = domain.subdomains || [];
  const ssl = domain.ssl_certs || [];
  const clientLabel = domain.client_code
    ? `${domain.client_code} · ${domain.client_name || "Client"}`
    : domain.client_name || "Unlinked client";

  return (
    <ListPageShell>
      <ListPageHeader
        leading={
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-xl shrink-0"
            asChild
          >
            <Link to={`/${role}/bugassets`} aria-label="Back to BugAssets">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        }
        icon={<Globe className="h-6 w-6" />}
        title={domain.fqdn}
        description={`${clientLabel} · ${domain.registrar || "No registrar"} · DNS ${domain.dns_provider || "—"}`}
        count={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn("rounded-xl capitalize", statusTone(domain.status))}>
              {domain.status}
            </Badge>
            {expiryDays != null && expiryDays <= 30 ? (
              <Badge
                variant="outline"
                className={cn("rounded-xl", statusTone(expiryDays < 0 ? "expired" : "pending"))}
              >
                {expiryDays < 0 ? `Expired ${Math.abs(expiryDays)}d ago` : `${expiryDays}d left`}
              </Badge>
            ) : null}
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setVaultOpen(true)}>
              <KeyRound className="h-4 w-4 mr-2" />
              Vault
            </Button>
            {canEdit && (
              <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit domain
              </Button>
            )}
            {canCreate && (
              <>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setEditingEmail(null);
                    setMailOpen(true);
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Mailbox
                </Button>
                <Button
                  className="rounded-xl"
                  onClick={() => {
                    setEditingSubdomain(null);
                    setSubOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Subdomain
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Metric strip */}
      <div className="grid grid-cols-12 gap-4">
        {[
          { label: "Subdomains", value: subs.length, icon: Server },
          { label: "Mailboxes", value: emails.length, icon: Mail },
          { label: "SSL certs", value: ssl.length, icon: Shield },
        ].map((m) => (
          <Card key={m.label} className="col-span-4 rounded-xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-xl bg-muted/50 p-2.5">
                <m.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums">{m.value}</div>
                <div className="text-xs text-muted-foreground">{m.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Overview */}
        <Card className="col-span-12 lg:col-span-4 rounded-xl">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Overview</h2>
            <DetailRow label="FQDN">
              <div className="flex flex-wrap items-center gap-2">
                <CopyValue value={domain.fqdn} label="domain" />
                <a
                  href={`https://${domain.fqdn}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-cyan-700 dark:text-cyan-300"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </DetailRow>
            <DetailRow label="Client">
              {domain.client_id ? (
                <Link className="font-medium hover:underline" to={`/${role}/clients/${domain.client_id}`}>
                  {clientLabel}
                </Link>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Project">{domain.project_name || "—"}</DetailRow>
            <DetailRow label="Registrar">{domain.registrar || "—"}</DetailRow>
            <DetailRow label="Vendor">{domain.vendor || domain.registrar || "—"}</DetailRow>
            <DetailRow label="WHOIS privacy">{domain.whois_privacy ? "On" : "Off"}</DetailRow>
            <DetailRow label="Purchased">{domain.purchased_at || "—"}</DetailRow>
            <DetailRow label="Expires">
              <span className="inline-flex flex-wrap items-center gap-2">
                {domain.expires_at || "—"}
                <span className="text-muted-foreground">
                  · Auto-renew {domain.auto_renew ? "on" : "off"}
                </span>
              </span>
            </DetailRow>
            <DetailRow label="Billing cycle">{domain.billing_cycle || "—"}</DetailRow>
            <DetailRow label="Invoice">
              <Badge variant="outline" className="rounded-xl capitalize">
                {domain.invoice_status || "not_billed"}
              </Badge>
            </DetailRow>
          </CardContent>
        </Card>

        {/* DNS */}
        <Card className="col-span-12 lg:col-span-4 rounded-xl">
          <CardContent className="p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">DNS</h2>
            <DetailRow label="Provider">{domain.dns_provider || "—"}</DetailRow>
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nameservers
                {nameservers.inferred ? (
                  <span className="ml-2 normal-case font-normal text-amber-600 dark:text-amber-300">
                    (provider defaults — not saved yet)
                  </span>
                ) : null}
              </div>
              {nameservers.list.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No nameservers saved. Edit the domain to add NS or pick a DNS provider with known defaults.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {nameservers.list.map((ns) => (
                    <CopyValue key={ns} value={ns} label="nameserver" />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Finance / notes */}
        <Card className="col-span-12 lg:col-span-4 rounded-xl">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {showFinance ? "Billing" : "Notes"}
            </h2>
            {showFinance ? (
              <>
                <DetailRow label="Vendor cost">
                  {domain.vendor_cost != null && domain.vendor_cost !== ""
                    ? `${domain.vendor_cost} ${domain.currency || "INR"}`
                    : "—"}
                </DetailRow>
                <DetailRow label="Client charge">
                  {domain.client_charge != null && domain.client_charge !== ""
                    ? `${domain.client_charge} ${domain.currency || "INR"}`
                    : "—"}
                </DetailRow>
                <DetailRow label="Margin">
                  {domain.margin_amount != null && domain.margin_amount !== ""
                    ? `${domain.margin_amount} ${domain.currency || "INR"}`
                    : "—"}
                </DetailRow>
                <DetailRow label="Account">{domain.vendor_account || "—"}</DetailRow>
              </>
            ) : null}
            <DetailRow label="Notes">
              {domain.notes?.trim() ? (
                <p className="whitespace-pre-wrap text-sm">{domain.notes}</p>
              ) : (
                <span className="text-muted-foreground">No notes</span>
              )}
            </DetailRow>
          </CardContent>
        </Card>

        {/* Mailboxes */}
        <Card className="col-span-12 rounded-xl">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Mailboxes ({emails.length})
              </h2>
              {canCreate && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setEditingEmail(null);
                    setMailOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add mailbox
                </Button>
              )}
            </div>
            {emails.length === 0 ? (
              <p className="text-sm text-muted-foreground">No mailboxes on this domain.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {emails.map((m) => (
                  <div
                    key={m.id}
                    className="grid grid-cols-12 gap-3 rounded-xl border border-border/60 p-3 items-start"
                  >
                    <div className="col-span-12 md:col-span-4 min-w-0 space-y-1.5">
                      <CopyValue value={m.address} label="mailbox" />
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className={cn("rounded-xl capitalize", statusTone(m.status))}>
                          {m.status}
                        </Badge>
                        <Badge variant="outline" className="rounded-xl capitalize">
                          {m.provider}
                        </Badge>
                      </div>
                    </div>
                    <div className="col-span-6 md:col-span-2 text-sm">
                      <div className="text-xs text-muted-foreground">Quota</div>
                      {formatQuotaMb(m.storage_quota_mb)}
                    </div>
                    <div className="col-span-6 md:col-span-2 text-sm min-w-0">
                      <div className="text-xs text-muted-foreground">Assignee</div>
                      <span className="truncate block">
                        {m.assigned_user_name || m.assigned_contact || "Unassigned"}
                      </span>
                    </div>
                    <div className="col-span-12 md:col-span-2 text-sm min-w-0">
                      <div className="text-xs text-muted-foreground">Signed in from</div>
                      <span className="truncate block">{m.signed_in_from || "—"}</span>
                    </div>
                    <div className="col-span-12 md:col-span-2 flex justify-end gap-1">
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-xl"
                          onClick={() => {
                            setEditingEmail(m);
                            setMailOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subdomains */}
        <Card className="col-span-12 rounded-xl">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Subdomains / websites ({subs.length})
              </h2>
              {canCreate && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setEditingSubdomain(null);
                    setSubOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add subdomain
                </Button>
              )}
            </div>
            {subs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subdomains yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {subs.map((s) => {
                  const target = subdomainTarget(s);
                  return (
                    <div
                      key={s.id}
                      className="grid grid-cols-12 gap-3 rounded-xl border border-border/60 p-3 items-center"
                    >
                      <div className="col-span-12 md:col-span-4 min-w-0 space-y-1">
                        <div className="font-medium truncate">{s.fqdn}</div>
                        <div className="text-xs text-muted-foreground">
                          host <span className="font-mono">{s.host}</span>
                          {s.purpose ? ` · ${s.purpose}` : ""}
                        </div>
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <Badge variant="outline" className="rounded-xl font-mono">
                          {s.record_type}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1 capitalize">{s.status}</div>
                      </div>
                      <div className="col-span-6 md:col-span-3 min-w-0 text-sm">
                        <div className="text-xs text-muted-foreground capitalize">{s.target_kind}</div>
                        {target.href ? (
                          <Link
                            className="font-medium hover:underline truncate block"
                            to={`/${role}/bugassets/${target.href}`}
                          >
                            {target.label}
                          </Link>
                        ) : (
                          <span className="truncate block">{target.label}</span>
                        )}
                      </div>
                      <div className="col-span-12 md:col-span-3 flex flex-wrap items-center justify-end gap-2">
                        {s.target_value ? <CopyValue value={s.target_value} label="target" /> : null}
                        <a
                          href={`https://${s.fqdn}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-cyan-700 dark:text-cyan-300"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => {
                              setEditingSubdomain(s);
                              setSubOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => setDeleteId(s.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SSL */}
        <Card className="col-span-12 rounded-xl">
          <CardContent className="p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              SSL certificates ({ssl.length})
            </h2>
            {ssl.length === 0 ? (
              <p className="text-sm text-muted-foreground">No SSL certificates tracked for this domain.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {ssl.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 p-3"
                  >
                    <div>
                      <div className="font-medium">{c.covers || domain.fqdn}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.issuer || "Unknown issuer"} · expires {c.expires_at}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("rounded-xl capitalize", statusTone(c.status))}>
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DomainFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          void load();
        }}
        initial={domain}
        showFinance={showFinance}
      />
      <MailFormModal
        open={mailOpen}
        onClose={() => {
          setMailOpen(false);
          setEditingEmail(null);
        }}
        onSaved={() => {
          setMailOpen(false);
          setEditingEmail(null);
          void load();
        }}
        domains={[domain]}
        showFinance={showFinance}
        initial={editingEmail}
      />
      <SubdomainFormModal
        open={subOpen}
        onClose={() => {
          setSubOpen(false);
          setEditingSubdomain(null);
        }}
        onSaved={() => {
          setSubOpen(false);
          setEditingSubdomain(null);
          void load();
        }}
        domainId={domain.id}
        servers={servers}
        hosting={hostingNodes}
        vercel={vercelNodes}
        initial={editingSubdomain}
      />
      <VaultRevealModal
        open={vaultOpen}
        onOpenChange={setVaultOpen}
        entityType="domain"
        entityId={domain.id}
        canReveal={canReveal}
        canEdit={canEdit}
      />
      <ConfirmAssetDelete
        open={Boolean(deleteId)}
        title="Delete subdomain"
        description="Remove this DNS record from the inventory?"
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
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
