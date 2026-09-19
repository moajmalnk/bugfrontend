import { ConfirmAssetDelete } from "@/components/assets/ConfirmAssetDelete";
import { CopyValue } from "@/components/assets/CopyValue";
import {
  DomainFormModal,
  HardwareFormModal,
  MailFormModal,
  NodeFormModal,
} from "@/components/assets/AssetModals";
import { ItemsPerPageSelect } from "@/components/pagination/ItemsPerPageSelect";
import { PageJumpSelect } from "@/components/pagination/PageJumpSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { BottomSheetTabs } from "@/components/ui/BottomSheetTabs";
import {
  ListPageHeader,
  ListPageShell,
  ListSearchFilterPanel,
  LIST_TABS_CONTENT,
} from "@/components/layout/list-page";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useUrlPagination } from "@/hooks/useUrlPagination";
import { cn, getEffectiveRole, hasPermissionOrAdmin } from "@/lib/utils";
import { notifyAdminNavCountsChanged } from "@/services/adminNavCountsService";
import { assetsService } from "@/services/assetsService";
import type {
  AssetDomain,
  AssetEmail,
  AssetHardware,
  AssetNode,
  AssetRenewalRow,
  AssetsSummary,
  NodeKind,
} from "@/types/assets";
import {
  Building2,
  Cloud,
  Globe,
  HardDrive,
  Layers,
  Mail,
  Plus,
  Server,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type TabValue = "domains" | "mail" | "nodes" | "hardware" | "renewals";

const NODE_KINDS: Array<{ value: NodeKind; label: string }> = [
  { value: "server", label: "VPS" },
  { value: "hosting", label: "Hosting" },
  { value: "vercel", label: "Vercel" },
];

function daysTone(days: number) {
  if (days <= 3) return "destructive" as const;
  if (days <= 14) return "secondary" as const;
  return "outline" as const;
}

function statusTone(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "active" || s === "assigned" || s === "in_stock") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
  }
  if (s === "pending" || s === "repair") {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
  }
  if (s === "expired" || s === "retired" || s === "lost" || s === "cancelled") {
    return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20";
  }
  return "bg-muted text-muted-foreground border-border/60";
}

function MetricButton({
  label,
  value,
  icon: Icon,
  active,
  alert,
  loading,
  onClick,
}: {
  label: string;
  value: number;
  icon: typeof Globe;
  active?: boolean;
  alert?: boolean;
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full min-w-0 rounded-xl border p-3 sm:p-3.5 text-left transition-all duration-200",
        "hover:border-cyan-500/40 hover:bg-cyan-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40",
        active
          ? "border-cyan-500/50 bg-cyan-500/10 shadow-sm"
          : "border-border/60 bg-background/80"
      )}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">
          {label}
        </span>
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100",
            alert && value > 0 && "text-amber-500 opacity-100"
          )}
        />
      </div>
      {loading ? (
        <Skeleton className="h-7 w-10 mt-2 rounded-lg" />
      ) : (
        <div
          className={cn(
            "text-xl sm:text-2xl font-bold tabular-nums mt-1 tracking-tight",
            alert && value > 0 && "text-amber-600 dark:text-amber-400"
          )}
        >
          {value}
        </div>
      )}
    </button>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/60 p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-xl" />
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Globe;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-6 py-12 sm:py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-600 to-cyan-600 text-white shadow-md">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

function AssetTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/50 overflow-hidden bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm shadow-sm">
      <div className="overflow-x-auto">
        <Table>{children}</Table>
      </div>
    </div>
  );
}

type PaginatedSafe<T> = { items: T[]; total: number };

export default function BugAssets() {
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions(null);
  const role = getEffectiveRole(currentUser || {});
  const canView = hasPermissionOrAdmin(role, hasPermission, "ASSETS_VIEW");
  const canCreate = hasPermissionOrAdmin(role, hasPermission, "ASSETS_CREATE");
  const canDelete = hasPermissionOrAdmin(role, hasPermission, "ASSETS_DELETE");
  const showFinance = hasPermissionOrAdmin(role, hasPermission, "ASSETS_FINANCE_VIEW");
  const navigate = useNavigate();
  const { page, pageSize, setPage, setPageSize } = useUrlPagination({ defaultPageSize: 10 });

  const [tab, setTab] = useState<TabValue>("domains");
  const [nodeKind, setNodeKind] = useState<NodeKind>("server");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [summary, setSummary] = useState<AssetsSummary | null>(null);
  const [domains, setDomains] = useState<PaginatedSafe<AssetDomain>>({ items: [], total: 0 });
  const [emails, setEmails] = useState<PaginatedSafe<AssetEmail>>({ items: [], total: 0 });
  const [nodes, setNodes] = useState<PaginatedSafe<AssetNode>>({ items: [], total: 0 });
  const [hardware, setHardware] = useState<PaginatedSafe<AssetHardware>>({ items: [], total: 0 });
  const [renewals, setRenewals] = useState<AssetRenewalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainOpen, setDomainOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [nodeOpen, setNodeOpen] = useState(false);
  const [hwOpen, setHwOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; label: string } | null>(
    null
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput, setPage]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, d, e, n, h, r] = await Promise.all([
        assetsService.summary(),
        assetsService.listDomains({ page, limit: pageSize, q }),
        assetsService.listEmails({ page, limit: pageSize, q }),
        assetsService.listNodes(nodeKind, { page, limit: pageSize, q }),
        assetsService.listHardware({ page, limit: pageSize, q }),
        assetsService.listRenewals(30),
      ]);
      setSummary(sum);
      setDomains({ items: d.items || [], total: d.total || 0 });
      setEmails({ items: e.items || [], total: e.total || 0 });
      setNodes({ items: n.items || [], total: n.total || 0 });
      setHardware({ items: h.items || [], total: h.total || 0 });
      setRenewals(r.items || []);
      notifyAdminNavCountsChanged();
    } catch (err) {
      toast({
        title: "Could not load BugAssets",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, nodeKind]);

  useEffect(() => {
    if (canView) void refresh();
  }, [canView, refresh]);

  const tabs = useMemo(
    () => [
      {
        value: "domains",
        label: "Domains",
        shortLabel: "Domains",
        icon: Globe,
        count: summary?.domains ?? 0,
      },
      {
        value: "mail",
        label: "Mailboxes",
        shortLabel: "Mail",
        icon: Mail,
        count: summary?.mailboxes ?? 0,
      },
      {
        value: "nodes",
        label: "Infrastructure",
        shortLabel: "Infra",
        icon: Layers,
        count: (summary?.servers ?? 0) + (summary?.hosting ?? 0) + (summary?.vercel ?? 0),
      },
      {
        value: "hardware",
        label: "Hardware",
        shortLabel: "HW",
        icon: HardDrive,
        count: summary?.hardware ?? 0,
      },
      {
        value: "renewals",
        label: "Renewals",
        shortLabel: "Due",
        icon: TriangleAlert,
        count: summary?.renewals_30 ?? 0,
        countClassName:
          (summary?.renewals_30 ?? 0) > 0
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
            : undefined,
      },
    ],
    [summary]
  );

  const metrics = useMemo(
    () =>
      [
        {
          key: "clients",
          label: "Clients",
          value: summary?.clients ?? 0,
          icon: Building2,
          tab: "domains" as TabValue,
        },
        {
          key: "domains",
          label: "Domains",
          value: summary?.domains ?? 0,
          icon: Globe,
          tab: "domains" as TabValue,
        },
        {
          key: "mail",
          label: "Mail",
          value: summary?.mailboxes ?? 0,
          icon: Mail,
          tab: "mail" as TabValue,
        },
        {
          key: "vps",
          label: "VPS",
          value: summary?.servers ?? 0,
          icon: Server,
          tab: "nodes" as TabValue,
          node: "server" as NodeKind,
        },
        {
          key: "hosting",
          label: "Hosting",
          value: summary?.hosting ?? 0,
          icon: Cloud,
          tab: "nodes" as TabValue,
          node: "hosting" as NodeKind,
        },
        {
          key: "vercel",
          label: "Vercel",
          value: summary?.vercel ?? 0,
          icon: Layers,
          tab: "nodes" as TabValue,
          node: "vercel" as NodeKind,
        },
        {
          key: "hardware",
          label: "Hardware",
          value: summary?.hardware ?? 0,
          icon: HardDrive,
          tab: "hardware" as TabValue,
        },
        {
          key: "renewals",
          label: "Due < 30d",
          value: summary?.renewals_30 ?? 0,
          icon: TriangleAlert,
          tab: "renewals" as TabValue,
          alert: true,
        },
      ] as const,
    [summary]
  );

  if (!canView) {
    return (
      <ListPageShell>
        <EmptyState
          icon={Server}
          title="Access restricted"
          description="You do not have permission to view BugAssets."
        />
      </ListPageShell>
    );
  }

  const totalForTab =
    tab === "domains"
      ? domains.total
      : tab === "mail"
        ? emails.total
        : tab === "nodes"
          ? nodes.total
          : tab === "hardware"
            ? hardware.total
            : renewals.length;
  const totalPages = Math.max(1, Math.ceil(totalForTab / pageSize));

  const openCreate = () => {
    if (tab === "mail") setMailOpen(true);
    else if (tab === "nodes") setNodeOpen(true);
    else if (tab === "hardware") setHwOpen(true);
    else setDomainOpen(true);
  };

  const createLabel =
    tab === "mail"
      ? "Mailbox"
      : tab === "nodes"
        ? "Node"
        : tab === "hardware"
          ? "Hardware"
          : "Domain";

  const runDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "domain") await assetsService.deleteDomain(deleteTarget.id);
    if (deleteTarget.type === "email") await assetsService.deleteEmail(deleteTarget.id);
    if (deleteTarget.type === "hardware") await assetsService.deleteHardware(deleteTarget.id);
    if (
      deleteTarget.type === "server" ||
      deleteTarget.type === "hosting" ||
      deleteTarget.type === "vercel"
    ) {
      await assetsService.deleteNode(deleteTarget.type, deleteTarget.id);
    }
    toast({ title: "Moved to recycle bin" });
    notifyAdminNavCountsChanged();
    await refresh();
  };

  const summaryLoading = loading && !summary;

  return (
    <ListPageShell>
      <ListPageHeader
        icon={<Server className="h-5 w-5 sm:h-6 sm:w-6" />}
        title="BugAssets"
        description="Domains, mail, cloud nodes, and office hardware — one inventory."
        accentBarClassName="from-slate-700 to-cyan-600"
        underlayClassName="from-slate-50/50 via-transparent to-cyan-50/50 dark:from-slate-950/20 dark:via-transparent dark:to-cyan-950/20"
        count={summary?.renewals_30 ?? 0}
        loading={summaryLoading}
        countIcon={<TriangleAlert className="h-4 w-4" />}
        countClassName="from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
        actions={
          canCreate && tab !== "renewals" ? (
            <Button
              size="lg"
              className="h-11 w-full sm:w-auto sm:h-12 px-6 font-semibold text-white shadow-lg rounded-xl bg-gradient-to-r from-slate-700 to-cyan-600 hover:from-slate-800 hover:to-cyan-700"
              onClick={openCreate}
            >
              <Plus className="mr-2 h-5 w-5" />
              New {createLabel}
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4">
        {metrics.map((m) => (
          <MetricButton
            key={m.key}
            label={m.label}
            value={m.value}
            icon={m.icon}
            alert={"alert" in m && m.alert}
            loading={summaryLoading}
            active={
              tab === m.tab &&
              (m.tab !== "nodes" || !("node" in m) || nodeKind === m.node)
            }
            onClick={() => {
              setTab(m.tab);
              if ("node" in m && m.node) setNodeKind(m.node);
              setPage(1);
            }}
          />
        ))}
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as TabValue);
          setPage(1);
        }}
        className="w-full min-w-0"
      >
        <BottomSheetTabs
          items={tabs}
          value={tab}
          onValueChange={(v) => {
            setTab(v as TabValue);
            setPage(1);
          }}
          title="BugAssets"
          description="Choose an inventory section"
          desktopBreakpoint="lg"
          desktopGridClassName="grid-cols-5"
          underlayClassName="from-slate-50/50 to-cyan-50/50 dark:from-slate-800/50 dark:to-cyan-900/50"
        />

        {tab !== "renewals" ? (
          <ListSearchFilterPanel
            accent="blue"
            title="Search inventory"
            description="Filter the active list by name, client, IP, or tag."
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder="Search domains, mail, nodes, hardware…"
            hasActiveFilters={Boolean(searchInput)}
            onClearAll={() => setSearchInput("")}
            headerExtra={
              tab === "nodes" ? (
                <div className="flex flex-wrap gap-1.5">
                  {NODE_KINDS.map((k) => (
                    <button
                      key={k.value}
                      type="button"
                      onClick={() => {
                        setNodeKind(k.value);
                        setPage(1);
                      }}
                      className={cn(
                        "rounded-xl px-2.5 py-1 text-xs font-semibold transition-colors",
                        nodeKind === k.value
                          ? "bg-cyan-600 text-white"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              ) : null
            }
          />
        ) : null}

        <TabsContent value="domains" className={LIST_TABS_CONTENT}>
          {loading ? (
            <TableSkeleton />
          ) : domains.items.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="No domains yet"
              description="Add a registrar record to start tracking renewals and DNS."
              action={
                canCreate ? (
                  <Button className="rounded-xl" onClick={() => setDomainOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add domain
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="md:hidden flex flex-col gap-3">
                {domains.items.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => navigate(`/${role}/bugassets/domains/${row.id}`)}
                    className="rounded-2xl border border-border/50 bg-background/80 p-4 text-left hover:border-cyan-500/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{row.fqdn}</div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {row.client_code || row.client_name || "No client"}
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("rounded-xl shrink-0", statusTone(row.status))}>
                        {row.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>Expires {row.expires_at || "—"}</span>
                      {showFinance ? <span className="tabular-nums">Margin {row.margin_amount ?? "—"}</span> : null}
                    </div>
                  </button>
                ))}
              </div>
              <div className="hidden md:block">
                <AssetTable>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Domain</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      {showFinance && <TableHead>Margin</TableHead>}
                      <TableHead className="w-[1%]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {domains.items.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/${role}/bugassets/domains/${row.id}`)}
                      >
                        <TableCell className="font-medium max-w-[16rem] truncate">{row.fqdn}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.client_code || row.client_name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("rounded-xl capitalize", statusTone(row.status))}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">{row.expires_at || "—"}</TableCell>
                        {showFinance && (
                          <TableCell className="tabular-nums">{row.margin_amount ?? "—"}</TableCell>
                        )}
                        <TableCell className="text-right">
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-xl"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget({ type: "domain", id: row.id, label: row.fqdn });
                              }}
                            >
                              Delete
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </AssetTable>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="mail" className={LIST_TABS_CONTENT}>
          {loading ? (
            <TableSkeleton />
          ) : emails.items.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No mailboxes yet"
              description="Track Google Workspace, Zoho, Hostinger, and other mailboxes per domain."
              action={
                canCreate ? (
                  <Button className="rounded-xl" onClick={() => setMailOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add mailbox
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="md:hidden flex flex-col gap-3">
                {emails.items.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-border/50 bg-background/80 p-4"
                  >
                    <div className="font-medium break-all">{row.address}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="rounded-xl capitalize">
                        {row.provider}
                      </Badge>
                      <span>{row.client_code || row.client_name || "—"}</span>
                    </div>
                    {canDelete ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl mt-2 -ms-2"
                        onClick={() =>
                          setDeleteTarget({ type: "email", id: row.id, label: row.address })
                        }
                      >
                        Delete
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="hidden md:block">
                <AssetTable>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Address</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="w-[1%]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emails.items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <CopyValue value={row.address} label="address" />
                        </TableCell>
                        <TableCell className="capitalize">{row.provider}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.client_code || row.client_name || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-xl"
                              onClick={() =>
                                setDeleteTarget({ type: "email", id: row.id, label: row.address })
                              }
                            >
                              Delete
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </AssetTable>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="nodes" className={LIST_TABS_CONTENT}>
          {loading ? (
            <TableSkeleton />
          ) : nodes.items.length === 0 ? (
            <EmptyState
              icon={Server}
              title={`No ${NODE_KINDS.find((k) => k.value === nodeKind)?.label ?? "nodes"} yet`}
              description="Shared VPS, hosting, and Vercel projects live here — then link them to clients."
              action={
                canCreate ? (
                  <Button className="rounded-xl" onClick={() => setNodeOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add node
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="md:hidden flex flex-col gap-3">
                {nodes.items.map((row) => {
                  const name =
                    "hostname" in row && row.hostname
                      ? String(row.hostname)
                      : "project_name" in row && row.project_name
                        ? String(row.project_name)
                        : "label" in row
                          ? String(row.label)
                          : row.id;
                  const addr =
                    "public_ipv4" in row
                      ? row.public_ipv4
                      : "production_domain" in row
                        ? row.production_domain
                        : null;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() =>
                        navigate(
                          `/${role}/bugassets/${nodeKind === "server" ? "servers" : nodeKind}/${row.id}`
                        )
                      }
                      className="rounded-2xl border border-border/50 bg-background/80 p-4 text-left hover:border-cyan-500/40 transition-colors"
                    >
                      <div className="font-semibold truncate">{name}</div>
                      <div className="mt-1 text-xs text-muted-foreground truncate">
                        {addr || "No address"} · Expires {row.expires_at || "—"}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="hidden md:block">
                <AssetTable>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="w-[1%]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nodes.items.map((row) => {
                      const name =
                        "hostname" in row && row.hostname
                          ? String(row.hostname)
                          : "project_name" in row && row.project_name
                            ? String(row.project_name)
                            : "label" in row
                              ? String(row.label)
                              : row.id;
                      const addr =
                        "public_ipv4" in row
                          ? row.public_ipv4
                          : "production_domain" in row
                            ? row.production_domain
                            : null;
                      return (
                        <TableRow
                          key={row.id}
                          className="cursor-pointer"
                          onClick={() =>
                            navigate(
                              `/${role}/bugassets/${nodeKind === "server" ? "servers" : nodeKind}/${row.id}`
                            )
                          }
                        >
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell>
                            <CopyValue value={addr} label="address" />
                          </TableCell>
                          <TableCell className="tabular-nums">{row.expires_at || "—"}</TableCell>
                          <TableCell className="text-right">
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-xl"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({ type: nodeKind, id: row.id, label: name });
                                }}
                              >
                                Delete
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </AssetTable>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="hardware" className={LIST_TABS_CONTENT}>
          {loading ? (
            <TableSkeleton />
          ) : hardware.items.length === 0 ? (
            <EmptyState
              icon={HardDrive}
              title="No hardware yet"
              description="Track laptops, test phones, and office devices with assignee and warranty."
              action={
                canCreate ? (
                  <Button className="rounded-xl" onClick={() => setHwOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add hardware
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="md:hidden flex flex-col gap-3">
                {hardware.items.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => navigate(`/${role}/bugassets/hardware/${row.id}`)}
                    className="rounded-2xl border border-border/50 bg-background/80 p-4 text-left hover:border-cyan-500/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-muted-foreground">{row.asset_tag}</div>
                        <div className="font-semibold mt-0.5 truncate">
                          {[row.brand, row.model].filter(Boolean).join(" ") || "Untitled"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {row.assigned_user_name || "Unassigned"}
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("rounded-xl capitalize", statusTone(row.status))}>
                        {row.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
              <div className="hidden md:block">
                <AssetTable>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Tag</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[1%]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hardware.items.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/${role}/bugassets/hardware/${row.id}`)}
                      >
                        <TableCell className="font-mono text-xs">{row.asset_tag}</TableCell>
                        <TableCell>
                          {[row.brand, row.model].filter(Boolean).join(" ") || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.assigned_user_name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("rounded-xl capitalize", statusTone(row.status))}
                          >
                            {row.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-xl"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget({
                                  type: "hardware",
                                  id: row.id,
                                  label: row.asset_tag,
                                });
                              }}
                            >
                              Delete
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </AssetTable>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="renewals" className={LIST_TABS_CONTENT}>
          {loading ? (
            <TableSkeleton />
          ) : renewals.length === 0 ? (
            <EmptyState
              icon={TriangleAlert}
              title="Nothing due in 30 days"
              description="Renewal alerts for domains, SSL, VPS, hosting, Vercel, and hardware warranties will show here."
            />
          ) : (
            <>
              <div className="md:hidden flex flex-col gap-3">
                {renewals.map((row) => (
                  <div
                    key={`${row.entity_type}-${row.entity_id}`}
                    className="rounded-2xl border border-border/50 bg-background/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{row.label}</div>
                        <div className="text-xs text-muted-foreground mt-1 capitalize">
                          {row.entity_type} · {row.client_code || "Shared"}
                        </div>
                      </div>
                      <Badge variant={daysTone(row.days_left)} className="rounded-xl tabular-nums">
                        {row.days_left}d
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground tabular-nums">
                      Expires {row.expires_at}
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block">
                <AssetTable>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Asset</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Days left</TableHead>
                      <TableHead>Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renewals.map((row) => (
                      <TableRow key={`${row.entity_type}-${row.entity_id}`}>
                        <TableCell className="font-medium">{row.label}</TableCell>
                        <TableCell className="capitalize text-muted-foreground">
                          {row.entity_type}
                        </TableCell>
                        <TableCell>{row.client_code || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={daysTone(row.days_left)} className="rounded-xl tabular-nums">
                            {row.days_left}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">{row.expires_at}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </AssetTable>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {tab !== "renewals" && totalForTab > 0 ? (
        <div className="flex flex-col-reverse sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3">
          <ItemsPerPageSelect value={pageSize} onChange={setPageSize} />
          <PageJumpSelect currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : null}

      <DomainFormModal
        open={domainOpen}
        onClose={() => setDomainOpen(false)}
        onSaved={() => void refresh()}
        showFinance={showFinance}
      />
      <MailFormModal
        open={mailOpen}
        onClose={() => setMailOpen(false)}
        onSaved={() => void refresh()}
        domains={domains.items}
        showFinance={showFinance}
      />
      <NodeFormModal
        open={nodeOpen}
        kind={nodeKind}
        onClose={() => setNodeOpen(false)}
        onSaved={() => void refresh()}
        showFinance={showFinance}
      />
      <HardwareFormModal
        open={hwOpen}
        onClose={() => setHwOpen(false)}
        onSaved={() => void refresh()}
        showFinance={showFinance}
      />
      <ConfirmAssetDelete
        open={Boolean(deleteTarget)}
        title="Delete asset"
        description={deleteTarget ? `Move ${deleteTarget.label} to the recycle bin?` : ""}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={runDelete}
      />
    </ListPageShell>
  );
}
