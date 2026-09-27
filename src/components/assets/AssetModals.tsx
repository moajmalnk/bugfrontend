import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { clientService } from "@/services/clientService";
import { assetsService } from "@/services/assetsService";
import { userService } from "@/services/userService";
import type {
  AssetBilling,
  AssetDomain,
  AssetEmail,
  AssetHardware,
  AssetNode,
  AssetSubdomain,
  AssetTool,
  HardwareCategory,
  HardwareStatus,
  MailProvider,
  NodeKind,
  RecordType,
  TargetKind,
  ToolCategory,
  ToolStatus,
} from "@/types/assets";
import type { Client, User } from "@/types";
import { useEffect, useMemo, useState } from "react";
import {
  AssetDateField,
  AssetFormShell,
  AssetSelect,
  BillingFields,
  CreatableAssetSelect,
  DNS_PROVIDER_PRESETS,
  NameserversField,
  NotesField,
  QuickAddClientDialog,
  REGISTRAR_PRESETS,
} from "./AssetFormFields";

const emptyBilling: AssetBilling = {
  vendor: "",
  billing_cycle: "yearly",
  vendor_cost: "",
  client_charge: "",
  invoice_status: "not_billed",
  auto_renew: true,
  expires_at: "",
};

const MAIL_PROVIDERS: Array<{ value: MailProvider; label: string }> = [
  { value: "hostinger", label: "Hostinger" },
  { value: "google", label: "Google" },
  { value: "zoho", label: "Zoho" },
  { value: "microsoft", label: "Microsoft" },
  { value: "other", label: "Other" },
];

const RECORD_TYPES: Array<{ value: RecordType; label: string }> = [
  "A",
  "AAAA",
  "CNAME",
  "ALIAS",
  "MX",
  "TXT",
  "NS",
].map((r) => ({ value: r as RecordType, label: r }));

const TARGET_KINDS: Array<{ value: TargetKind; label: string }> = [
  { value: "raw", label: "Raw IP / CNAME" },
  { value: "server", label: "VPS / server" },
  { value: "hosting", label: "Shared hosting" },
  { value: "vercel", label: "Vercel project" },
];

const HARDWARE_CATEGORIES: Array<{ value: HardwareCategory; label: string }> = [
  { value: "laptop", label: "Laptop" },
  { value: "test_phone", label: "Test phone" },
  { value: "office_device", label: "Office device" },
  { value: "network", label: "Network" },
  { value: "other", label: "Other" },
];

const TOOL_CATEGORIES: Array<{ value: ToolCategory; label: string }> = [
  { value: "ai", label: "AI" },
  { value: "design", label: "Design" },
  { value: "devops", label: "DevOps" },
  { value: "productivity", label: "Productivity" },
  { value: "marketing", label: "Marketing" },
  { value: "communication", label: "Communication" },
  { value: "other", label: "Other" },
];

const TOOL_STATUSES: Array<{ value: ToolStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "trial", label: "Trial" },
  { value: "paused", label: "Paused" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

function clientLabel(c: Client): string {
  const code = (c as Client & { client_code?: string | null }).client_code;
  return code ? `${code} · ${c.corporate_name}` : c.corporate_name;
}

export function DomainFormModal({
  open,
  onClose,
  onSaved,
  initial,
  showFinance,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: AssetDomain | null;
  showFinance: boolean;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [fqdn, setFqdn] = useState("");
  const [clientId, setClientId] = useState("");
  const [registrar, setRegistrar] = useState("");
  const [dns, setDns] = useState("");
  const [nameservers, setNameservers] = useState("");
  const [notes, setNotes] = useState("");
  const [billing, setBilling] = useState<AssetBilling>(emptyBilling);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [catalogHints, setCatalogHints] = useState<{
    registrars: string[];
    dns: string[];
    vendors: string[];
    nameserverByProvider: Record<string, string[]>;
  }>({ registrars: [], dns: [], vendors: [], nameserverByProvider: {} });

  useEffect(() => {
    if (!open) return;
    clientService.getClients().then(setClients).catch(() => setClients([]));
    assetsService
      .listDomains({ page: 1, limit: 100 })
      .then((res) => {
        const registrars: string[] = [];
        const dnsList: string[] = [];
        const vendors: string[] = [];
        const nameserverByProvider: Record<string, string[]> = {};
        for (const d of res.items || []) {
          if (d.registrar) registrars.push(String(d.registrar));
          if (d.dns_provider) dnsList.push(String(d.dns_provider));
          if (d.vendor) vendors.push(String(d.vendor));
          const ns = (d.nameservers || []).map(String).filter(Boolean);
          if (ns.length && d.dns_provider) {
            const key = String(d.dns_provider).trim().toLowerCase();
            const joined = ns.join(", ");
            if (!nameserverByProvider[key]) nameserverByProvider[key] = [];
            if (!nameserverByProvider[key].includes(joined)) {
              nameserverByProvider[key].push(joined);
            }
          }
        }
        setCatalogHints({ registrars, dns: dnsList, vendors, nameserverByProvider });
      })
      .catch(() =>
        setCatalogHints({
          registrars: [],
          dns: [],
          vendors: [],
          nameserverByProvider: {},
        })
      );
    setFqdn(initial?.fqdn ?? "");
    setClientId(initial?.client_id ?? "");
    setRegistrar(initial?.registrar ?? "");
    setDns(initial?.dns_provider ?? "");
    setNameservers((initial?.nameservers || []).join(", "));
    setNotes(initial?.notes ?? "");
    setBilling({
      ...emptyBilling,
      vendor: initial?.vendor ?? "",
      billing_cycle: initial?.billing_cycle ?? "yearly",
      vendor_cost: initial?.vendor_cost ?? "",
      client_charge: initial?.client_charge ?? "",
      invoice_status: initial?.invoice_status ?? "not_billed",
      auto_renew: initial?.auto_renew ?? true,
      expires_at: initial?.expires_at ?? "",
    });
  }, [open, initial]);

  const clientOptions = useMemo(
    () =>
      [...clients]
        .sort((a, b) => clientLabel(a).localeCompare(clientLabel(b)))
        .map((c) => ({ value: c.id, label: clientLabel(c) })),
    [clients]
  );

  const registrarOptions = useMemo(
    () => [...REGISTRAR_PRESETS, ...catalogHints.registrars],
    [catalogHints.registrars]
  );
  const dnsOptions = useMemo(
    () => [...DNS_PROVIDER_PRESETS, ...catalogHints.dns],
    [catalogHints.dns]
  );

  const nsInventorySuggestions = useMemo(() => {
    const key = (dns || registrar || "").trim().toLowerCase();
    if (!key) return [];
    const exact = catalogHints.nameserverByProvider[key] || [];
    if (exact.length) return exact;
    // fuzzy: any inventory key contained in selection
    const fuzzy: string[] = [];
    for (const [k, sets] of Object.entries(catalogHints.nameserverByProvider)) {
      if (key.includes(k) || k.includes(key)) fuzzy.push(...sets);
    }
    return fuzzy;
  }, [catalogHints.nameserverByProvider, dns, registrar]);

  const dirty = fqdn !== (initial?.fqdn ?? "") || clientId !== (initial?.client_id ?? "");
  const canSubmit = fqdn.trim().length > 2 && clientId !== "";

  const submit = async () => {
    if (loading || !canSubmit) return;
    setLoading(true);
    try {
      await assetsService.saveDomain(
        {
          fqdn,
          client_id: clientId,
          registrar,
          dns_provider: dns,
          nameservers,
          notes,
          ...billing,
        },
        initial?.id
      );
      toast({ title: initial ? "Domain updated" : "Domain created" });
      onSaved();
      onClose();
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <AssetFormShell
      open={open}
      title={initial ? "Edit domain" : "Add domain"}
      submitLabel={initial ? "Save changes" : "Add domain"}
      loading={loading}
      canSubmit={canSubmit}
      dirty={dirty}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 space-y-1.5">
          <Label htmlFor="fqdn">FQDN</Label>
          <Input
            id="fqdn"
            maxLength={255}
            className="h-11 rounded-xl"
            placeholder="example.com"
            value={fqdn}
            onChange={(e) => setFqdn(e.target.value.toLowerCase().slice(0, 255))}
          />
        </div>
        <div className="col-span-12 space-y-1.5">
          <Label>Client</Label>
          <AssetSelect
            value={clientId}
            onValueChange={setClientId}
            placeholder="Select client"
            options={clientOptions}
            searchable
            addLabel="Add client"
            onAdd={() => setAddClientOpen(true)}
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label>Registrar</Label>
          <CreatableAssetSelect
            value={registrar}
            onValueChange={setRegistrar}
            placeholder="Select or add registrar"
            options={registrarOptions}
            addLabel="Add registrar…"
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label>DNS provider</Label>
          <CreatableAssetSelect
            value={dns}
            onValueChange={setDns}
            placeholder="Select or add DNS provider"
            options={dnsOptions}
            addLabel="Add DNS provider…"
          />
        </div>
        <NameserversField
          key={`ns-${initial?.id ?? "new"}-${open ? "1" : "0"}`}
          value={nameservers}
          onChange={setNameservers}
          dnsProvider={dns}
          registrar={registrar}
          inventorySuggestions={nsInventorySuggestions}
        />
        <BillingFields
          value={billing}
          onChange={setBilling}
          showFinance={showFinance}
          vendorSuggestions={catalogHints.vendors}
        />
        <NotesField value={notes} onChange={setNotes} />
      </div>
    </AssetFormShell>
    <QuickAddClientDialog
      open={addClientOpen}
      onOpenChange={setAddClientOpen}
      onCreated={(client) => {
        setClients((prev) => {
          if (prev.some((c) => c.id === client.id)) return prev;
          return [...prev, client];
        });
        setClientId(client.id);
      }}
    />
    </>
  );
}

export function MailFormModal({
  open,
  onClose,
  onSaved,
  domains,
  showFinance,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  domains: AssetDomain[];
  showFinance: boolean;
  initial?: AssetEmail | null;
}) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [address, setAddress] = useState("");
  const [domainId, setDomainId] = useState("");
  const [provider, setProvider] = useState<MailProvider>("hostinger");
  const [quota, setQuota] = useState("");
  const [contact, setContact] = useState("");
  const [signedInFrom, setSignedInFrom] = useState("");
  const [assignee, setAssignee] = useState("");
  const [status, setStatus] = useState<"active" | "suspended" | "deleted">("active");
  const [billing, setBilling] = useState<AssetBilling>(emptyBilling);

  useEffect(() => {
    if (!open) return;
    userService.getUsers().then(setUsers).catch(() => setUsers([]));
    setAddress(initial?.address ?? "");
    setDomainId(initial?.domain_id ?? domains[0]?.id ?? "");
    setProvider(initial?.provider ?? "hostinger");
    setQuota(
      initial?.storage_quota_mb != null && initial.storage_quota_mb !== undefined
        ? String(initial.storage_quota_mb)
        : ""
    );
    setContact(initial?.assigned_contact ?? "");
    setSignedInFrom(initial?.signed_in_from ?? "");
    setAssignee(initial?.assigned_user_id ?? "");
    setStatus(initial?.status ?? "active");
    setBilling({
      ...emptyBilling,
      vendor: initial?.vendor ?? "",
      billing_cycle: initial?.billing_cycle ?? "yearly",
      vendor_cost: initial?.vendor_cost ?? "",
      client_charge: initial?.client_charge ?? "",
      invoice_status: initial?.invoice_status ?? "not_billed",
      auto_renew: initial?.auto_renew ?? true,
      expires_at: initial?.expires_at ?? "",
    });
  }, [open, domains, initial]);

  const domainOptions = useMemo(
    () => domains.map((d) => ({ value: d.id, label: d.fqdn })),
    [domains]
  );

  const userOptions = useMemo(
    () =>
      [...users]
        .sort((a, b) =>
          (a.name || a.username || a.email || "").localeCompare(
            b.name || b.username || b.email || ""
          )
        )
        .map((u) => ({
          value: u.id,
          label: u.name || u.username || u.email || u.id,
        })),
    [users]
  );

  const canSubmit = address.includes("@") && domainId !== "";
  const dirty =
    address !== (initial?.address ?? "") ||
    domainId !== (initial?.domain_id ?? "") ||
    provider !== (initial?.provider ?? "hostinger") ||
    contact !== (initial?.assigned_contact ?? "") ||
    signedInFrom !== (initial?.signed_in_from ?? "") ||
    assignee !== (initial?.assigned_user_id ?? "") ||
    status !== (initial?.status ?? "active");

  const submit = async () => {
    if (loading || !canSubmit) return;
    setLoading(true);
    try {
      await assetsService.saveEmail(
        {
          address,
          domain_id: domainId,
          provider,
          storage_quota_mb: quota === "" ? null : Number(quota),
          assigned_contact: contact,
          signed_in_from: signedInFrom.trim() || null,
          assigned_user_id: assignee || null,
          status,
          ...billing,
        },
        initial?.id
      );
      toast({ title: initial ? "Mailbox updated" : "Mailbox created" });
      onSaved();
      onClose();
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AssetFormShell
      open={open}
      title={initial ? "Edit mailbox" : "Add mailbox"}
      submitLabel={initial ? "Save changes" : "Add mailbox"}
      loading={loading}
      canSubmit={canSubmit}
      dirty={dirty}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 space-y-1.5">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            maxLength={255}
            className="h-11 rounded-xl"
            value={address}
            onChange={(e) => setAddress(e.target.value.toLowerCase().slice(0, 255))}
          />
          {address && !address.includes("@") ? (
            <span className="text-red-500 text-xs">Invalid email</span>
          ) : null}
        </div>
        <div className="col-span-12 space-y-1.5">
          <Label>Domain</Label>
          <AssetSelect
            value={domainId}
            onValueChange={setDomainId}
            placeholder="Select domain"
            options={domainOptions}
            searchable
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label>Provider</Label>
          <AssetSelect
            value={provider}
            onValueChange={(v) => setProvider(v as MailProvider)}
            placeholder="Select provider"
            searchable={false}
            options={MAIL_PROVIDERS}
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label>Status</Label>
          <AssetSelect
            value={status}
            onValueChange={(v) => setStatus(v as "active" | "suspended" | "deleted")}
            placeholder="Status"
            searchable={false}
            options={[
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" },
              { value: "deleted", label: "Deleted" },
            ]}
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label htmlFor="quota">Quota (MB)</Label>
          <Input
            id="quota"
            inputMode="numeric"
            className="h-11 rounded-xl"
            value={quota}
            onChange={(e) => setQuota(e.target.value.replace(/\D/g, "").slice(0, 8))}
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label>Assigned user</Label>
          <AssetSelect
            value={assignee}
            onValueChange={setAssignee}
            placeholder="Assign a user"
            emptyLabel="Unassigned"
            options={userOptions}
            searchable
          />
        </div>
        <div className="col-span-12 space-y-1.5">
          <Label htmlFor="signed-in-from">Signed in from</Label>
          <Input
            id="signed-in-from"
            maxLength={150}
            className="h-11 rounded-xl"
            value={signedInFrom}
            onChange={(e) => setSignedInFrom(e.target.value.slice(0, 150))}
            placeholder="Chrome profile / workstation (e.g. inbox.pvk, CODO SALES)"
          />
          <p className="text-xs text-muted-foreground">
            Where this mailbox is signed in (Chrome profile name or device).
          </p>
        </div>
        <div className="col-span-12 space-y-1.5">
          <Label htmlFor="contact">Assigned contact</Label>
          <Input
            id="contact"
            maxLength={255}
            className="h-11 rounded-xl"
            value={contact}
            onChange={(e) => setContact(e.target.value.slice(0, 255))}
            placeholder="Optional external contact name"
          />
        </div>
        <BillingFields value={billing} onChange={setBilling} showFinance={showFinance} />
      </div>
    </AssetFormShell>
  );
}

export function SubdomainFormModal({
  open,
  onClose,
  onSaved,
  domainId,
  servers,
  hosting = [],
  vercel = [],
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  domainId: string;
  servers: AssetNode[];
  hosting?: AssetNode[];
  vercel?: AssetNode[];
  initial?: AssetSubdomain | null;
}) {
  const [loading, setLoading] = useState(false);
  const [host, setHost] = useState("www");
  const [purpose, setPurpose] = useState("");
  const [recordType, setRecordType] = useState<RecordType>("A");
  const [kind, setKind] = useState<TargetKind>("raw");
  const [targetValue, setTargetValue] = useState("");
  const [serverId, setServerId] = useState("");
  const [hostingId, setHostingId] = useState("");
  const [vercelId, setVercelId] = useState("");
  const [status, setStatus] = useState<"active" | "disabled">("active");

  const isEdit = Boolean(initial?.id);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setHost(initial.host || "@");
      setPurpose(initial.purpose || "");
      setRecordType(initial.record_type || "A");
      setKind(initial.target_kind || "raw");
      setTargetValue(initial.target_value || "");
      setServerId(initial.target_server_id || "");
      setHostingId(initial.target_hosting_id || "");
      setVercelId(initial.target_vercel_id || "");
      setStatus(initial.status || "active");
      return;
    }
    setHost("www");
    setPurpose("");
    setRecordType("A");
    setKind("raw");
    setTargetValue("");
    setServerId("");
    setHostingId("");
    setVercelId("");
    setStatus("active");
  }, [open, initial]);

  const serverOptions = useMemo(
    () =>
      servers.map((s) => ({
        value: s.id,
        label: "hostname" in s ? String(s.hostname) : s.id,
      })),
    [servers]
  );
  const hostingOptions = useMemo(
    () =>
      hosting.map((h) => ({
        value: h.id,
        label: "label" in h ? String(h.label) : h.id,
      })),
    [hosting]
  );
  const vercelOptions = useMemo(
    () =>
      vercel.map((v) => ({
        value: v.id,
        label: "project_name" in v ? String(v.project_name) : v.id,
      })),
    [vercel]
  );

  const canSubmit = host.trim() !== "" && domainId !== "";

  const dirty = isEdit
    ? host !== (initial?.host || "") ||
      purpose !== (initial?.purpose || "") ||
      recordType !== (initial?.record_type || "A") ||
      kind !== (initial?.target_kind || "raw") ||
      targetValue !== (initial?.target_value || "") ||
      serverId !== (initial?.target_server_id || "") ||
      hostingId !== (initial?.target_hosting_id || "") ||
      vercelId !== (initial?.target_vercel_id || "") ||
      status !== (initial?.status || "active")
    : host !== "www" || purpose !== "" || targetValue !== "" || kind !== "raw";

  const submit = async () => {
    if (loading || !canSubmit) return;
    setLoading(true);
    try {
      const payload = {
        domain_id: domainId,
        host,
        purpose,
        record_type: recordType,
        target_kind: kind,
        target_value: targetValue,
        target_server_id: kind === "server" ? serverId || null : null,
        target_hosting_id: kind === "hosting" ? hostingId || null : null,
        target_vercel_id: kind === "vercel" ? vercelId || null : null,
        status,
      };
      await assetsService.saveSubdomain(payload, initial?.id);
      toast({ title: isEdit ? "Subdomain updated" : "Subdomain created" });
      onSaved();
      onClose();
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AssetFormShell
      open={open}
      title={isEdit ? "Edit subdomain" : "Add subdomain"}
      submitLabel={isEdit ? "Save changes" : "Add subdomain"}
      loading={loading}
      canSubmit={canSubmit}
      dirty={dirty}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label htmlFor="host">Host</Label>
          <Input
            id="host"
            maxLength={255}
            className="h-11 rounded-xl"
            value={host}
            onChange={(e) => setHost(e.target.value.toLowerCase().slice(0, 255))}
            placeholder="@ or www or api"
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label>Record</Label>
          <AssetSelect
            value={recordType}
            onValueChange={(v) => setRecordType(v as RecordType)}
            placeholder="Record type"
            searchable={false}
            options={RECORD_TYPES}
          />
        </div>
        <div className="col-span-12 space-y-1.5">
          <Label htmlFor="purpose">Purpose</Label>
          <Input
            id="purpose"
            maxLength={255}
            className="h-11 rounded-xl"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value.slice(0, 255))}
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label>Points to</Label>
          <AssetSelect
            value={kind}
            onValueChange={(v) => setKind(v as TargetKind)}
            placeholder="Target kind"
            searchable={false}
            options={TARGET_KINDS}
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label>Status</Label>
          <AssetSelect
            value={status}
            onValueChange={(v) => setStatus(v as "active" | "disabled")}
            placeholder="Status"
            searchable={false}
            options={[
              { value: "active", label: "Active" },
              { value: "disabled", label: "Disabled" },
            ]}
          />
        </div>
        {kind === "server" ? (
          <div className="col-span-12 space-y-1.5">
            <Label>Server</Label>
            <AssetSelect
              value={serverId}
              onValueChange={setServerId}
              placeholder="Select server"
              options={serverOptions}
              searchable
              emptyLabel="None"
            />
          </div>
        ) : null}
        {kind === "hosting" ? (
          <div className="col-span-12 space-y-1.5">
            <Label>Hosting</Label>
            <AssetSelect
              value={hostingId}
              onValueChange={setHostingId}
              placeholder="Select hosting"
              options={hostingOptions}
              searchable
              emptyLabel="None"
            />
          </div>
        ) : null}
        {kind === "vercel" ? (
          <div className="col-span-12 space-y-1.5">
            <Label>Vercel project</Label>
            <AssetSelect
              value={vercelId}
              onValueChange={setVercelId}
              placeholder="Select Vercel project"
              options={vercelOptions}
              searchable
              emptyLabel="None"
            />
          </div>
        ) : null}
        <div className="col-span-12 space-y-1.5">
          <Label htmlFor="tval">Target value</Label>
          <Input
            id="tval"
            maxLength={500}
            className="h-11 rounded-xl"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value.slice(0, 500))}
            placeholder="IP, CNAME, or leave blank to use node"
          />
        </div>
      </div>
    </AssetFormShell>
  );
}

export function NodeFormModal({
  open,
  kind,
  onClose,
  onSaved,
  showFinance,
  initial,
}: {
  open: boolean;
  kind: NodeKind;
  onClose: () => void;
  onSaved: () => void;
  showFinance: boolean;
  initial?: AssetNode | null;
}) {
  const [loading, setLoading] = useState(false);
  const [hostname, setHostname] = useState("");
  const [ipv4, setIpv4] = useState("");
  const [sshUser, setSshUser] = useState("");
  const [osName, setOsName] = useState("");
  const [vcpus, setVcpus] = useState("");
  const [ram, setRam] = useState("");
  const [disk, setDisk] = useState("");
  const [label, setLabel] = useState("");
  const [projectName, setProjectName] = useState("");
  const [team, setTeam] = useState("");
  const [repo, setRepo] = useState("");
  const [prod, setProd] = useState("");
  const [billing, setBilling] = useState<AssetBilling>(emptyBilling);

  useEffect(() => {
    if (!open) return;
    const server = initial && "hostname" in initial ? initial : null;
    const hosting = initial && "label" in initial && !("hostname" in initial) ? initial : null;
    const vercel = initial && "project_name" in initial ? initial : null;

    setHostname(
      server?.hostname ??
        (hosting && "primary_domain" in hosting ? String(hosting.primary_domain || "") : "") ??
        ""
    );
    setIpv4(
      (server?.public_ipv4 as string | null | undefined) ??
        (hosting && "public_ipv4" in hosting ? String(hosting.public_ipv4 || "") : "") ??
        ""
    );
    setSshUser(server?.ssh_user ?? "");
    setOsName(server?.os_name ?? "");
    setVcpus(server?.vcpus != null ? String(server.vcpus) : "");
    setRam(server?.ram_mb != null ? String(server.ram_mb) : "");
    setDisk(server?.disk_gb != null ? String(server.disk_gb) : "");
    setLabel(hosting && "label" in hosting ? String(hosting.label || "") : "");
    setProjectName(vercel?.project_name ?? "");
    setTeam(vercel?.team_slug ?? "");
    setRepo(vercel?.repo_url ?? "");
    setProd(vercel?.production_domain ?? "");
    setBilling({
      ...emptyBilling,
      vendor: initial?.vendor ?? "",
      billing_cycle: initial?.billing_cycle ?? "yearly",
      vendor_cost: initial?.vendor_cost ?? "",
      client_charge: initial?.client_charge ?? "",
      invoice_status: initial?.invoice_status ?? "not_billed",
      auto_renew: initial?.auto_renew ?? true,
      expires_at: initial?.expires_at ?? "",
    });
  }, [open, kind, initial]);

  const canSubmit =
    kind === "server"
      ? hostname.trim().length > 1
      : kind === "hosting"
        ? label.trim() !== ""
        : projectName.trim().length > 0;

  const submit = async () => {
    if (loading || !canSubmit) return;
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { ...billing };
      if (kind === "server") {
        Object.assign(payload, {
          hostname,
          public_ipv4: ipv4,
          ssh_user: sshUser,
          os_name: osName,
          vcpus: vcpus === "" ? null : Number(vcpus),
          ram_mb: ram === "" ? null : Number(ram),
          disk_gb: disk === "" ? null : Number(disk),
        });
      } else if (kind === "hosting") {
        Object.assign(payload, { label, public_ipv4: ipv4, primary_domain: hostname });
      } else {
        Object.assign(payload, {
          project_name: projectName,
          team_slug: team,
          repo_url: repo,
          production_domain: prod,
        });
      }
      await assetsService.saveNode(kind, payload, initial?.id);
      toast({ title: initial ? "Node updated" : "Node created" });
      onSaved();
      onClose();
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTitle =
    kind === "server" ? "Add VPS" : kind === "hosting" ? "Add hosting" : "Add Vercel project";
  const editTitle =
    kind === "server" ? "Edit VPS" : kind === "hosting" ? "Edit hosting" : "Edit Vercel project";
  const title = initial ? editTitle : createTitle;

  return (
    <AssetFormShell
      open={open}
      title={title}
      submitLabel={initial ? "Save changes" : createTitle}
      large={kind === "server"}
      loading={loading}
      canSubmit={canSubmit}
      dirty={hostname !== "" || label !== "" || projectName !== ""}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="grid grid-cols-12 gap-4">
        {kind === "server" ? (
          <>
            <div className="col-span-12 md:col-span-6 space-y-1.5">
              <Label htmlFor="hostname">Hostname</Label>
              <Input
                id="hostname"
                maxLength={255}
                className="h-11 rounded-xl"
                value={hostname}
                onChange={(e) => setHostname(e.target.value.toLowerCase().slice(0, 255))}
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-1.5">
              <Label htmlFor="ipv4">Public IPv4</Label>
              <Input
                id="ipv4"
                maxLength={45}
                className="h-11 rounded-xl"
                value={ipv4}
                onChange={(e) => setIpv4(e.target.value.slice(0, 45))}
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-1.5">
              <Label htmlFor="ssh">SSH user</Label>
              <Input
                id="ssh"
                maxLength={64}
                className="h-11 rounded-xl"
                value={sshUser}
                onChange={(e) => setSshUser(e.target.value.slice(0, 64))}
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-1.5">
              <Label htmlFor="os">OS</Label>
              <Input
                id="os"
                maxLength={80}
                className="h-11 rounded-xl"
                value={osName}
                onChange={(e) => setOsName(e.target.value.slice(0, 80))}
              />
            </div>
            <div className="col-span-4 space-y-1.5">
              <Label htmlFor="vcpu">vCPU</Label>
              <Input
                id="vcpu"
                inputMode="numeric"
                className="h-11 rounded-xl"
                value={vcpus}
                onChange={(e) => setVcpus(e.target.value.replace(/\D/g, "").slice(0, 3))}
              />
            </div>
            <div className="col-span-4 space-y-1.5">
              <Label htmlFor="ram">RAM (MB)</Label>
              <Input
                id="ram"
                inputMode="numeric"
                className="h-11 rounded-xl"
                value={ram}
                onChange={(e) => setRam(e.target.value.replace(/\D/g, "").slice(0, 7))}
              />
            </div>
            <div className="col-span-4 space-y-1.5">
              <Label htmlFor="disk">Disk (GB)</Label>
              <Input
                id="disk"
                inputMode="numeric"
                className="h-11 rounded-xl"
                value={disk}
                onChange={(e) => setDisk(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
          </>
        ) : null}
        {kind === "hosting" ? (
          <>
            <div className="col-span-12 space-y-1.5">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                maxLength={255}
                className="h-11 rounded-xl"
                value={label}
                onChange={(e) => setLabel(e.target.value.slice(0, 255))}
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-1.5">
              <Label htmlFor="hdomain">Primary domain</Label>
              <Input
                id="hdomain"
                className="h-11 rounded-xl"
                value={hostname}
                onChange={(e) => setHostname(e.target.value.toLowerCase())}
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-1.5">
              <Label htmlFor="hip">IP</Label>
              <Input
                id="hip"
                className="h-11 rounded-xl"
                value={ipv4}
                onChange={(e) => setIpv4(e.target.value)}
              />
            </div>
          </>
        ) : null}
        {kind === "vercel" ? (
          <>
            <div className="col-span-12 space-y-1.5">
              <Label htmlFor="pname">Project name</Label>
              <Input
                id="pname"
                maxLength={255}
                className="h-11 rounded-xl"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value.slice(0, 255))}
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-1.5">
              <Label htmlFor="team">Team slug</Label>
              <Input
                id="team"
                className="h-11 rounded-xl"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-1.5">
              <Label htmlFor="prod">Production domain</Label>
              <Input
                id="prod"
                className="h-11 rounded-xl"
                value={prod}
                onChange={(e) => setProd(e.target.value.toLowerCase())}
              />
            </div>
            <div className="col-span-12 space-y-1.5">
              <Label htmlFor="repo">Repo URL</Label>
              <Input
                id="repo"
                maxLength={500}
                className="h-11 rounded-xl"
                value={repo}
                onChange={(e) => setRepo(e.target.value.slice(0, 500))}
              />
            </div>
          </>
        ) : null}
        <BillingFields value={billing} onChange={setBilling} showFinance={showFinance} />
      </div>
    </AssetFormShell>
  );
}

export function HardwareFormModal({
  open,
  onClose,
  onSaved,
  showFinance,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  showFinance: boolean;
  initial?: AssetHardware | null;
}) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [model, setModel] = useState("");
  const [brand, setBrand] = useState("");
  const [serial, setSerial] = useState("");
  const [imei, setImei] = useState("");
  const [category, setCategory] = useState<HardwareCategory>("laptop");
  const [status, setStatus] = useState<HardwareStatus>("in_stock");
  const [assignee, setAssignee] = useState("");
  const [warranty, setWarranty] = useState("");
  const [purchase, setPurchase] = useState("");
  const [vendorCost, setVendorCost] = useState("");

  useEffect(() => {
    if (!open) return;
    userService.getUsers().then(setUsers).catch(() => setUsers([]));
    setModel(initial?.model ?? "");
    setBrand(initial?.brand ?? "");
    setSerial(initial?.serial_no ?? "");
    setImei(initial?.imei ?? "");
    setCategory(initial?.category ?? "laptop");
    setStatus(initial?.status ?? "in_stock");
    setAssignee(initial?.assigned_user_id ?? "");
    setWarranty(initial?.warranty_expires_at ?? "");
    setPurchase(initial?.purchase_date ?? "");
    setVendorCost(
      initial?.vendor_cost != null && initial.vendor_cost !== undefined
        ? String(initial.vendor_cost)
        : ""
    );
  }, [open, initial]);

  const userOptions = useMemo(
    () =>
      [...users]
        .sort((a, b) =>
          (a.name || a.username || a.email || "").localeCompare(
            b.name || b.username || b.email || ""
          )
        )
        .map((u) => ({
          value: u.id,
          label: u.name || u.username || u.email || u.id,
        })),
    [users]
  );

  const canSubmit = model.trim() !== "" || brand.trim() !== "";
  const dirty =
    model !== (initial?.model ?? "") ||
    brand !== (initial?.brand ?? "") ||
    assignee !== (initial?.assigned_user_id ?? "");

  const submit = async () => {
    if (loading || !canSubmit) return;
    setLoading(true);
    try {
      await assetsService.saveHardware(
        {
          model,
          brand,
          serial_no: serial || null,
          imei: imei || null,
          category,
          status: assignee ? "assigned" : status,
          assigned_user_id: assignee || null,
          warranty_expires_at: warranty || null,
          purchase_date: purchase || null,
          vendor_cost: showFinance ? vendorCost || null : undefined,
        },
        initial?.id
      );
      toast({ title: initial ? "Hardware updated" : "Hardware added" });
      onSaved();
      onClose();
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AssetFormShell
      open={open}
      title={initial ? "Edit hardware" : "Add hardware"}
      submitLabel={initial ? "Save changes" : "Add hardware"}
      loading={loading}
      canSubmit={canSubmit}
      dirty={dirty}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            maxLength={80}
            className="h-11 rounded-xl"
            value={brand}
            onChange={(e) => setBrand(e.target.value.slice(0, 80))}
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            maxLength={120}
            className="h-11 rounded-xl"
            value={model}
            onChange={(e) => setModel(e.target.value.slice(0, 120))}
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label htmlFor="serial">Serial</Label>
          <Input
            id="serial"
            maxLength={120}
            className="h-11 rounded-xl"
            value={serial}
            onChange={(e) => setSerial(e.target.value.slice(0, 120))}
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label htmlFor="imei">IMEI</Label>
          <Input
            id="imei"
            inputMode="numeric"
            maxLength={15}
            className="h-11 rounded-xl"
            value={imei}
            onChange={(e) => setImei(e.target.value.replace(/\D/g, "").slice(0, 15))}
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label>Category</Label>
          <AssetSelect
            value={category}
            onValueChange={(v) => setCategory(v as HardwareCategory)}
            placeholder="Category"
            searchable={false}
            options={HARDWARE_CATEGORIES}
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label>Assignee</Label>
          <AssetSelect
            value={assignee}
            onValueChange={setAssignee}
            placeholder="Unassigned"
            emptyLabel="Unassigned"
            options={userOptions}
            searchable
          />
        </div>
        <div className="col-span-12 md:col-span-6">
          <AssetDateField
            label="Purchase date"
            value={purchase}
            onChange={setPurchase}
            placeholder="Pick purchase date"
          />
        </div>
        <div className="col-span-12 md:col-span-6">
          <AssetDateField
            label="Warranty expiry"
            value={warranty}
            onChange={setWarranty}
            placeholder="Pick warranty expiry"
          />
        </div>
        {showFinance ? (
          <div className="col-span-12 space-y-1.5">
            <Label htmlFor="hcost">Vendor cost (INR)</Label>
            <Input
              id="hcost"
              inputMode="decimal"
              className="h-11 rounded-xl"
              value={vendorCost}
              onChange={(e) => setVendorCost(e.target.value)}
            />
          </div>
        ) : null}
      </div>
    </AssetFormShell>
  );
}

export function ToolFormModal({
  open,
  onClose,
  onSaved,
  showFinance,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  showFinance: boolean;
  initial?: AssetTool | null;
}) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ToolCategory>("other");
  const [status, setStatus] = useState<ToolStatus>("active");
  const [planName, setPlanName] = useState("");
  const [loginUrl, setLoginUrl] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [seatsTotal, setSeatsTotal] = useState("");
  const [notes, setNotes] = useState("");
  const [billing, setBilling] = useState<AssetBilling>(emptyBilling);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setCategory(initial?.category ?? "other");
    setStatus(initial?.status ?? "active");
    setPlanName(initial?.plan_name ?? "");
    setLoginUrl(initial?.login_url ?? "");
    setAccountEmail(initial?.account_email ?? "");
    setSeatsTotal(
      initial?.seats_total != null && initial.seats_total !== undefined
        ? String(initial.seats_total)
        : ""
    );
    setNotes(initial?.notes ?? "");
    setBilling({
      ...emptyBilling,
      vendor: initial?.vendor ?? "",
      vendor_account: initial?.vendor_account ?? "",
      billing_cycle: initial?.billing_cycle ?? "monthly",
      vendor_cost:
        initial?.vendor_cost != null && initial.vendor_cost !== undefined
          ? String(initial.vendor_cost)
          : "",
      client_charge:
        initial?.client_charge != null && initial.client_charge !== undefined
          ? String(initial.client_charge)
          : "",
      invoice_status: initial?.invoice_status ?? "not_billed",
      auto_renew: initial?.auto_renew ?? true,
      purchased_at: initial?.purchased_at ?? "",
      expires_at: initial?.expires_at ?? "",
    });
  }, [open, initial]);

  const emailOk = !accountEmail.trim() || accountEmail.includes("@");
  const canSubmit = name.trim() !== "" && emailOk;
  const dirty =
    name !== (initial?.name ?? "") ||
    category !== (initial?.category ?? "other") ||
    status !== (initial?.status ?? "active") ||
    planName !== (initial?.plan_name ?? "") ||
    loginUrl !== (initial?.login_url ?? "") ||
    accountEmail !== (initial?.account_email ?? "") ||
    seatsTotal !==
      (initial?.seats_total != null ? String(initial.seats_total) : "") ||
    notes !== (initial?.notes ?? "");

  const submit = async () => {
    if (loading || !canSubmit) return;
    setLoading(true);
    try {
      await assetsService.saveTool(
        {
          name: name.trim(),
          category,
          status,
          plan_name: planName.trim() || null,
          login_url: loginUrl.trim() || null,
          account_email: accountEmail.trim() || null,
          seats_total: seatsTotal === "" ? null : Number(seatsTotal),
          notes: notes.trim() || null,
          ...billing,
          ...(showFinance ? {} : { vendor_cost: undefined, client_charge: undefined }),
        },
        initial?.id
      );
      toast({ title: initial ? "Tool updated" : "Tool added" });
      onSaved();
      onClose();
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AssetFormShell
      open={open}
      title={initial ? "Edit premium tool" : "Add premium tool"}
      submitLabel={initial ? "Save changes" : "Add tool"}
      loading={loading}
      canSubmit={canSubmit}
      dirty={dirty}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 space-y-1.5">
          <Label htmlFor="tool-name">Name</Label>
          <Input
            id="tool-name"
            maxLength={150}
            className="h-11 rounded-xl"
            placeholder="e.g. ChatGPT Team"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 150))}
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label>Category</Label>
          <AssetSelect
            value={category}
            onValueChange={(v) => setCategory(v as ToolCategory)}
            placeholder="Category"
            searchable={false}
            options={TOOL_CATEGORIES}
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label>Status</Label>
          <AssetSelect
            value={status}
            onValueChange={(v) => setStatus(v as ToolStatus)}
            placeholder="Status"
            searchable={false}
            options={TOOL_STATUSES}
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label htmlFor="tool-plan">Plan</Label>
          <Input
            id="tool-plan"
            maxLength={120}
            className="h-11 rounded-xl"
            placeholder="Team / Pro / Business"
            value={planName}
            onChange={(e) => setPlanName(e.target.value.slice(0, 120))}
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label htmlFor="tool-seats">Seats total</Label>
          <Input
            id="tool-seats"
            inputMode="numeric"
            maxLength={6}
            className="h-11 rounded-xl"
            placeholder="Unlimited if blank"
            value={seatsTotal}
            onChange={(e) => setSeatsTotal(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </div>
        <div className="col-span-12 space-y-1.5">
          <Label htmlFor="tool-email">Account email</Label>
          <Input
            id="tool-email"
            type="email"
            maxLength={255}
            className="h-11 rounded-xl"
            placeholder="billing@codo.ai"
            value={accountEmail}
            onChange={(e) => setAccountEmail(e.target.value.slice(0, 255))}
          />
          {accountEmail && !accountEmail.includes("@") ? (
            <span className="text-red-500 text-xs">Invalid email</span>
          ) : null}
        </div>
        <div className="col-span-12 space-y-1.5">
          <Label htmlFor="tool-url">Login URL</Label>
          <Input
            id="tool-url"
            maxLength={500}
            className="h-11 rounded-xl"
            placeholder="https://…"
            value={loginUrl}
            onChange={(e) => setLoginUrl(e.target.value.slice(0, 500))}
          />
        </div>
        <BillingFields value={billing} onChange={setBilling} showFinance={showFinance} />
        <NotesField value={notes} onChange={setNotes} />
      </div>
    </AssetFormShell>
  );
}
