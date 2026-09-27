import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { clientService } from "@/services/clientService";
import type { AssetBilling, BillingCycle, InvoiceStatus } from "@/types/assets";
import type { Client } from "@/types";
import { ChevronDown, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export const assetSelectTriggerClass =
  "h-11 w-full rounded-xl border-border/70 bg-background shadow-sm";

export type AssetSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

/** Shared searchable Select used across BugAssets create/edit modals. */
export function AssetSelect({
  id,
  value,
  onValueChange,
  placeholder,
  options,
  disabled,
  searchable = true,
  emptyLabel,
  addLabel,
  onAdd,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: AssetSelectOption[];
  disabled?: boolean;
  searchable?: boolean;
  /** Radix forbids empty string values — use this sentinel for “none”. */
  emptyLabel?: string;
  /** Sticky footer CTA inside the dropdown (e.g. “Add client”). */
  addLabel?: string;
  onAdd?: () => void;
}) {
  // Why: Radix Select flips uncontrolled↔controlled if `value` is sometimes undefined.
  // Always pass a string sentinel for empty so the control mode never changes.
  const NONE = "__none__";
  const hasEmpty = Boolean(emptyLabel);
  const selectValue = value ? value : NONE;
  const [open, setOpen] = useState(false);

  return (
    <Select
      open={open}
      onOpenChange={setOpen}
      value={selectValue}
      onValueChange={(next) => onValueChange(next === NONE ? "" : next)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={assetSelectTriggerClass}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        searchable={searchable}
        className="rounded-xl z-[80]"
        footer={
          addLabel && onAdd ? (
            <Button
              type="button"
              variant="ghost"
              className="h-10 w-full justify-start gap-2 rounded-lg px-2 font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                // Why: Close the menu first so the nested dialog receives focus cleanly.
                window.setTimeout(() => onAdd(), 0);
              }}
            >
              <Plus className="h-4 w-4 shrink-0" />
              {addLabel}
            </Button>
          ) : undefined
        }
      >
        {hasEmpty ? (
          <SelectItem value={NONE} className="rounded-lg">
            {emptyLabel}
          </SelectItem>
        ) : (
          // Hidden placeholder so empty state stays controlled without a visible “None”.
          <SelectItem value={NONE} disabled className="hidden" aria-hidden>
            {placeholder}
          </SelectItem>
        )}
        {value &&
        !options.some((opt) => opt.value === value) ? (
          <SelectItem value={value} className="hidden" aria-hidden>
            {value}
          </SelectItem>
        ) : null}
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value || NONE}
            disabled={opt.disabled || !opt.value}
            className="rounded-lg"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Why: Registrar / DNS / vendor are free-text in the DB but should pick from
 * known values — with an in-menu “Add” path for one-off names.
 */
export function CreatableAssetSelect({
  id,
  value,
  onValueChange,
  placeholder,
  options,
  disabled,
  addLabel = "Add custom…",
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: string[];
  disabled?: boolean;
  addLabel?: string;
}) {
  const [extras, setExtras] = useState<string[]>([]);
  const [promptOpen, setPromptOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const merged = useMemo(() => {
    const seen = new Set<string>();
    const out: AssetSelectOption[] = [];
    for (const raw of [...options, ...extras, value]) {
      const label = String(raw || "").trim();
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ value: label, label });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }, [options, extras, value]);

  const commitCustom = () => {
    const next = draft.trim().slice(0, 100);
    if (!next || saving) return;
    setSaving(true);
    setExtras((prev) => (prev.some((p) => p.toLowerCase() === next.toLowerCase()) ? prev : [...prev, next]));
    onValueChange(next);
    setDraft("");
    setPromptOpen(false);
    setSaving(false);
  };

  return (
    <>
      <AssetSelect
        id={id}
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        options={merged}
        disabled={disabled}
        searchable
        emptyLabel="None"
        addLabel={addLabel}
        onAdd={() => {
          setDraft(value || "");
          setPromptOpen(true);
        }}
      />
      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent className="max-w-[400px] rounded-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{addLabel.replace(/…$/, "")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            <Label htmlFor="creatable-asset-value">Name</Label>
            <Input
              id="creatable-asset-value"
              maxLength={100}
              className="h-11 rounded-xl"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 100))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitCustom();
                }
              }}
              placeholder={placeholder}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setPromptOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={saving || !draft.trim()}
              onClick={commitCustom}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Compact client create for BugAssets forms — corporate name only. */
export function QuickAddClientDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (client: Client) => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setLoading(false);
    }
  }, [open]);

  const submit = async () => {
    const corporate = name.trim().slice(0, 200);
    if (!corporate || loading) return;
    setLoading(true);
    try {
      const created = await clientService.createClient({
        corporate_name: corporate,
        commercial_status: "active",
      });
      toast({ title: "Client added", description: corporate });
      onCreated(created);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Could not add client",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] rounded-2xl z-[90]" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Add client</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5 py-1">
          <Label htmlFor="quick-client-name">Corporate name</Label>
          <Input
            id="quick-client-name"
            maxLength={200}
            className="h-11 rounded-xl"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 200))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="Acme Corp"
          />
          <p className="text-xs text-muted-foreground">
            A client code is assigned automatically. You can fill more details later on Clients.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-gradient-to-r from-slate-700 to-cyan-600"
            disabled={loading || !name.trim()}
            onClick={() => void submit()}
          >
            {loading ? "Adding…" : "Add client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const REGISTRAR_PRESETS = [
  "Hostinger",
  "GoDaddy",
  "Namecheap",
  "Cloudflare",
  "Google Domains",
  "Name.com",
  "Porkbun",
  "Spaceship",
];

export const DNS_PROVIDER_PRESETS = [
  "Cloudflare",
  "Hostinger",
  "AWS Route 53",
  "Google Cloud DNS",
  "Namecheap BasicDNS",
  "DigitalOcean",
];

export const VENDOR_PRESETS = [
  "Hostinger",
  "AWS",
  "Google",
  "Microsoft",
  "DigitalOcean",
  "Vercel",
  "Cloudflare",
  "Zoho",
];

/**
 * Why: Stable public NS defaults for common DNS hosts. Cloudflare is
 * account-specific, so we only hint — inventory suggestions fill the gap.
 */
export const NAMESERVER_DEFAULTS: Record<string, string[]> = {
  hostinger: ["ns1.dns-parking.com", "ns2.dns-parking.com"],
  godaddy: ["ns1.domaincontrol.com", "ns2.domaincontrol.com"],
  namecheap: ["dns1.registrar-servers.com", "dns2.registrar-servers.com"],
  "google domains": ["ns-cloud-a1.googledomains.com", "ns-cloud-a2.googledomains.com"],
  "google cloud dns": ["ns-cloud-a1.googledomains.com", "ns-cloud-a2.googledomains.com"],
  digitalocean: ["ns1.digitalocean.com", "ns2.digitalocean.com", "ns3.digitalocean.com"],
  "aws route 53": [], // zone-specific
  cloudflare: [], // account-specific
};

export function normalizeProviderKey(value?: string | null): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function nameserverDefaultsFor(provider?: string | null): string[] {
  const key = normalizeProviderKey(provider);
  if (!key) return [];
  if (NAMESERVER_DEFAULTS[key]) return [...NAMESERVER_DEFAULTS[key]];
  // fuzzy contains match
  for (const [k, ns] of Object.entries(NAMESERVER_DEFAULTS)) {
    if (key.includes(k) || k.includes(key)) return [...ns];
  }
  return [];
}

export function formatNameservers(list: string[]): string {
  return list
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .join(", ");
}

export function NameserversField({
  value,
  onChange,
  dnsProvider,
  registrar,
  inventorySuggestions = [],
}: {
  value: string;
  onChange: (next: string) => void;
  dnsProvider?: string;
  registrar?: string;
  /** Nameserver sets previously used with the same DNS/registrar in inventory. */
  inventorySuggestions?: string[];
}) {
  const [touched, setTouched] = useState(false);
  const lastAutoRef = useRef("");

  const provider = dnsProvider?.trim() || registrar?.trim() || "";
  const builtIn = useMemo(
    () => formatNameservers(nameserverDefaultsFor(dnsProvider || registrar)),
    [dnsProvider, registrar]
  );

  const suggestionOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: AssetSelectOption[] = [];
    const push = (label: string, raw: string) => {
      const key = raw.toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push({ value: raw, label });
    };
    if (builtIn) {
      push(`Default · ${provider || "provider"}`, builtIn);
    }
    for (const s of inventorySuggestions) {
      const formatted = formatNameservers(
        String(s)
          .split(/[,;\s]+/)
          .filter(Boolean)
      );
      if (formatted) push(`From inventory · ${formatted}`, formatted);
    }
    return out;
  }, [builtIn, inventorySuggestions, provider]);

  // Auto-fill when DNS/registrar changes and the field is empty or still the last auto value.
  useEffect(() => {
    if (!builtIn) return;
    const current = value.trim();
    const lastAuto = lastAutoRef.current.trim();
    // Preserve manually typed / previously saved values.
    if (touched && current && current !== lastAuto) return;
    if (current && current !== lastAuto) return;
    if (current === builtIn) {
      lastAutoRef.current = builtIn;
      return;
    }
    lastAutoRef.current = builtIn;
    onChange(builtIn);
    setTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builtIn]);

  return (
    <div className="col-span-12 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="ns">Nameservers</Label>
        {builtIn ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-xl text-xs font-semibold text-cyan-700 dark:text-cyan-300"
            onClick={() => {
              lastAutoRef.current = builtIn;
              onChange(builtIn);
              setTouched(false);
            }}
          >
            Apply {provider || "provider"} defaults
          </Button>
        ) : provider.toLowerCase().includes("cloudflare") ? (
          <span className="text-[11px] text-muted-foreground">
            Cloudflare NS are account-specific — paste from the dashboard
          </span>
        ) : null}
      </div>
      {suggestionOptions.length > 0 ? (
        <AssetSelect
          value=""
          onValueChange={(next) => {
            if (!next) return;
            lastAutoRef.current = next;
            onChange(next);
            setTouched(false);
          }}
          placeholder="Pick a nameserver set…"
          options={suggestionOptions}
          searchable
          emptyLabel="Type manually below"
        />
      ) : null}
      <Input
        id="ns"
        className="h-11 rounded-xl font-mono text-sm"
        value={value}
        onChange={(e) => {
          setTouched(true);
          onChange(e.target.value);
        }}
        placeholder="ns1.example.com, ns2.example.com"
      />
      <p className="text-xs text-muted-foreground">
        Auto-fills from DNS provider when possible. You can still type or paste custom NS.
      </p>
    </div>
  );
}

const BILLING_CYCLES: Array<{ value: BillingCycle; label: string }> = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "biennial", label: "Biennial" },
  { value: "one_time", label: "One time" },
];

const INVOICE_STATUSES: Array<{ value: InvoiceStatus; label: string }> = [
  { value: "not_billed", label: "Not billed" },
  { value: "invoiced", label: "Invoiced" },
  { value: "paid", label: "Paid" },
  { value: "waived", label: "Waived" },
];

export function BillingFields({
  value,
  onChange,
  showFinance,
  defaultOpen = false,
  vendorSuggestions = [],
}: {
  value: AssetBilling;
  onChange: (next: AssetBilling) => void;
  showFinance: boolean;
  defaultOpen?: boolean;
  /** Extra vendor names learned from inventory. */
  vendorSuggestions?: string[];
}) {
  const [open, setOpen] = useState(defaultOpen);
  const vendorOptions = useMemo(
    () => [...VENDOR_PRESETS, ...vendorSuggestions],
    [vendorSuggestions]
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="col-span-12">
      <div className="rounded-2xl border border-border/60 bg-muted/10 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold">Billing details</div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                {(value.billing_cycle || "yearly").replace("_", " ")}
                {value.expires_at ? ` · expires ${value.expires_at}` : ""}
                {value.auto_renew ? " · auto-renew" : ""}
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid grid-cols-12 gap-4 border-t border-border/50 p-4">
            <div className="col-span-12 md:col-span-6 space-y-1.5">
              <Label>Vendor</Label>
              <CreatableAssetSelect
                value={value.vendor ?? ""}
                onValueChange={(v) => onChange({ ...value, vendor: v })}
                placeholder="Select or add vendor"
                options={vendorOptions}
                addLabel="Add vendor…"
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-1.5">
              <Label>Billing cycle</Label>
              <AssetSelect
                value={value.billing_cycle ?? "yearly"}
                onValueChange={(v) =>
                  onChange({ ...value, billing_cycle: v as BillingCycle })
                }
                placeholder="Select cycle"
                searchable={false}
                options={BILLING_CYCLES}
              />
            </div>
            {showFinance ? (
              <>
                <div className="col-span-12 md:col-span-6 space-y-1.5">
                  <Label htmlFor="vendor_cost">Vendor cost (INR)</Label>
                  <Input
                    id="vendor_cost"
                    inputMode="decimal"
                    className="h-11 rounded-xl"
                    value={value.vendor_cost ?? ""}
                    onChange={(e) =>
                      onChange({ ...value, vendor_cost: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6 space-y-1.5">
                  <Label htmlFor="client_charge">Client charge (INR)</Label>
                  <Input
                    id="client_charge"
                    inputMode="decimal"
                    className="h-11 rounded-xl"
                    value={value.client_charge ?? ""}
                    onChange={(e) =>
                      onChange({ ...value, client_charge: e.target.value })
                    }
                  />
                </div>
              </>
            ) : null}
            <div className="col-span-12 md:col-span-6 space-y-1.5">
              <Label>Expires</Label>
              <DatePicker
                value={value.expires_at ?? ""}
                onChange={(next) =>
                  onChange({ ...value, expires_at: next || null })
                }
                placeholder="Pick expiry date"
                disableFuture={false}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-1.5">
              <Label>Invoice</Label>
              <AssetSelect
                value={value.invoice_status ?? "not_billed"}
                onValueChange={(v) =>
                  onChange({ ...value, invoice_status: v as InvoiceStatus })
                }
                placeholder="Invoice status"
                searchable={false}
                options={INVOICE_STATUSES}
              />
            </div>
            <div className="col-span-12">
              <label className="inline-flex items-center gap-2.5 text-sm cursor-pointer">
                <Checkbox
                  checked={Boolean(value.auto_renew ?? true)}
                  onCheckedChange={(checked) =>
                    onChange({ ...value, auto_renew: checked === true })
                  }
                  className="rounded-md"
                />
                Auto-renew
              </label>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface FormShellProps {
  open: boolean;
  title: string;
  submitLabel?: string;
  large?: boolean;
  loading: boolean;
  canSubmit: boolean;
  dirty: boolean;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}

export function AssetFormShell({
  open,
  title,
  submitLabel,
  large,
  loading,
  canSubmit,
  dirty,
  onClose,
  onSubmit,
  children,
}: FormShellProps) {
  const [unsavedOpen, setUnsavedOpen] = useState(false);

  useEffect(() => {
    if (!open) setUnsavedOpen(false);
  }, [open]);

  const requestClose = () => {
    if (loading) return;
    if (dirty) {
      setUnsavedOpen(true);
      return;
    }
    onClose();
  };

  const discardAndClose = () => {
    setUnsavedOpen(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? undefined : requestClose())}>
        <DialogContent
          aria-describedby={undefined}
          className={cn(
            "flex max-h-[92vh] w-[95vw] flex-col gap-0 overflow-hidden rounded-2xl p-0",
            large ? "max-w-[950px]" : "max-w-[600px]"
          )}
        >
          <DialogHeader className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3 border-b border-border/50 shrink-0">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 min-h-0">{children}</div>
          <DialogFooter className="gap-2 px-5 sm:px-6 py-4 border-t border-border/50 shrink-0">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={requestClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-gradient-to-r from-slate-700 to-cyan-600 hover:from-slate-800 hover:to-cyan-700"
              onClick={onSubmit}
              disabled={loading || !canSubmit}
            >
              {loading ? "Saving…" : submitLabel || "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={unsavedOpen} onOpenChange={setUnsavedOpen}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Close anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="mt-0 rounded-xl">Keep editing</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl" onClick={discardAndClose}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function useDirtyForm<T>(initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    setValue(initial);
  }, [initial]);
  const dirty = useMemo(
    () => JSON.stringify(value) !== JSON.stringify(initial),
    [value, initial]
  );
  return { value, setValue, dirty, reset: () => setValue(initial) };
}

export function NotesField({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (next: string) => void;
}) {
  return (
    <div className="col-span-12 space-y-1.5">
      <Label htmlFor="notes">Notes</Label>
      <Textarea
        id="notes"
        maxLength={5000}
        className="rounded-xl min-h-[88px]"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value.slice(0, 5000))}
      />
    </div>
  );
}

export function AssetDateField({
  label,
  value,
  onChange,
  placeholder = "Pick a date",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <DatePicker
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disableFuture={false}
        className="h-11 rounded-xl"
      />
    </div>
  );
}
