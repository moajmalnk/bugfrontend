import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { clientService } from "@/services/clientService";
import { assetsService } from "@/services/assetsService";
import { userService } from "@/services/userService";
import type {
  AssetBilling,
  AssetDomain,
  AssetNode,
  HardwareCategory,
  HardwareStatus,
  MailProvider,
  NodeKind,
  RecordType,
  TargetKind,
} from "@/types/assets";
import type { Client, User } from "@/types";
import { useEffect, useMemo, useState } from "react";
import {
  AssetDateField,
  AssetFormShell,
  AssetSelect,
  BillingFields,
  NotesField,
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

  useEffect(() => {
    if (!open) return;
    clientService.getClients().then(setClients).catch(() => setClients([]));
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
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label htmlFor="registrar">Registrar</Label>
          <Input
            id="registrar"
            maxLength={80}
            className="h-11 rounded-xl"
            value={registrar}
            onChange={(e) => setRegistrar(e.target.value.slice(0, 80))}
          />
        </div>
        <div className="col-span-12 md:col-span-6 space-y-1.5">
          <Label htmlFor="dns">DNS provider</Label>
          <Input
            id="dns"
            maxLength={80}
            className="h-11 rounded-xl"
            value={dns}
            onChange={(e) => setDns(e.target.value.slice(0, 80))}
          />
        </div>
        <div className="col-span-12 space-y-1.5">
          <Label htmlFor="ns">Nameservers</Label>
          <Input
            id="ns"
            className="h-11 rounded-xl"
            value={nameservers}
            onChange={(e) => setNameservers(e.target.value)}
            placeholder="ns1.example.com, ns2.example.com"
          />
        </div>
        <BillingFields value={billing} onChange={setBilling} showFinance={showFinance} />
        <NotesField value={notes} onChange={setNotes} />
      </div>
    </AssetFormShell>
  );
}

export function MailFormModal({
  open,
  onClose,
  onSaved,
  domains,
  showFinance,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  domains: AssetDomain[];
  showFinance: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState("");
  const [domainId, setDomainId] = useState("");
  const [provider, setProvider] = useState<MailProvider>("hostinger");
  const [quota, setQuota] = useState("");
  const [contact, setContact] = useState("");
  const [billing, setBilling] = useState<AssetBilling>(emptyBilling);

  useEffect(() => {
    if (!open) return;
    setAddress("");
    setDomainId(domains[0]?.id ?? "");
    setProvider("hostinger");
    setQuota("");
    setContact("");
    setBilling(emptyBilling);
  }, [open, domains]);

  const domainOptions = useMemo(
    () => domains.map((d) => ({ value: d.id, label: d.fqdn })),
    [domains]
  );

  const canSubmit = address.includes("@") && domainId !== "";

  const submit = async () => {
    if (loading || !canSubmit) return;
    setLoading(true);
    try {
      await assetsService.saveEmail({
        address,
        domain_id: domainId,
        provider,
        storage_quota_mb: quota === "" ? null : Number(quota),
        assigned_contact: contact,
        ...billing,
      });
      toast({ title: "Mailbox created" });
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
      title="Add mailbox"
      submitLabel="Add mailbox"
      loading={loading}
      canSubmit={canSubmit}
      dirty={address !== ""}
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
          <Label htmlFor="quota">Quota (MB)</Label>
          <Input
            id="quota"
            inputMode="numeric"
            className="h-11 rounded-xl"
            value={quota}
            onChange={(e) => setQuota(e.target.value.replace(/\D/g, "").slice(0, 8))}
          />
        </div>
        <div className="col-span-12 space-y-1.5">
          <Label htmlFor="contact">Assigned contact</Label>
          <Input
            id="contact"
            maxLength={255}
            className="h-11 rounded-xl"
            value={contact}
            onChange={(e) => setContact(e.target.value.slice(0, 255))}
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
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  domainId: string;
  servers: AssetNode[];
}) {
  const [loading, setLoading] = useState(false);
  const [host, setHost] = useState("www");
  const [purpose, setPurpose] = useState("");
  const [recordType, setRecordType] = useState<RecordType>("A");
  const [kind, setKind] = useState<TargetKind>("raw");
  const [targetValue, setTargetValue] = useState("");
  const [serverId, setServerId] = useState("");

  useEffect(() => {
    if (!open) return;
    setHost("www");
    setPurpose("");
    setRecordType("A");
    setKind("raw");
    setTargetValue("");
    setServerId("");
  }, [open]);

  const serverOptions = useMemo(
    () =>
      servers.map((s) => ({
        value: s.id,
        label: "hostname" in s ? String(s.hostname) : s.id,
      })),
    [servers]
  );

  const canSubmit = host.trim() !== "" && domainId !== "";

  const submit = async () => {
    if (loading || !canSubmit) return;
    setLoading(true);
    try {
      await assetsService.saveSubdomain({
        domain_id: domainId,
        host,
        purpose,
        record_type: recordType,
        target_kind: kind,
        target_value: targetValue,
        target_server_id: kind === "server" ? serverId : null,
      });
      toast({ title: "Subdomain created" });
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
      title="Add subdomain"
      submitLabel="Add subdomain"
      loading={loading}
      canSubmit={canSubmit}
      dirty={host !== "www"}
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
        <div className="col-span-12 space-y-1.5">
          <Label>Points to</Label>
          <AssetSelect
            value={kind}
            onValueChange={(v) => setKind(v as TargetKind)}
            placeholder="Target kind"
            searchable={false}
            options={TARGET_KINDS}
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
}: {
  open: boolean;
  kind: NodeKind;
  onClose: () => void;
  onSaved: () => void;
  showFinance: boolean;
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
    setHostname("");
    setIpv4("");
    setSshUser("");
    setOsName("");
    setVcpus("");
    setRam("");
    setDisk("");
    setLabel("");
    setProjectName("");
    setTeam("");
    setRepo("");
    setProd("");
    setBilling(emptyBilling);
  }, [open, kind]);

  const canSubmit =
    kind === "server"
      ? hostname.trim().length > 1
      : kind === "hosting"
        ? label.trim() !== ""
        : projectName.trim() !== "";

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
      await assetsService.saveNode(kind, payload);
      toast({ title: "Node created" });
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

  const title =
    kind === "server" ? "Add VPS" : kind === "hosting" ? "Add hosting" : "Add Vercel project";

  return (
    <AssetFormShell
      open={open}
      title={title}
      submitLabel={title}
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
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  showFinance: boolean;
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
    setModel("");
    setBrand("");
    setSerial("");
    setImei("");
    setCategory("laptop");
    setStatus("in_stock");
    setAssignee("");
    setWarranty("");
    setPurchase("");
    setVendorCost("");
  }, [open]);

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

  const submit = async () => {
    if (loading || !canSubmit) return;
    setLoading(true);
    try {
      await assetsService.saveHardware({
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
      });
      toast({ title: "Hardware added" });
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
      title="Add hardware"
      submitLabel="Add hardware"
      loading={loading}
      canSubmit={canSubmit}
      dirty={model !== "" || brand !== ""}
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
