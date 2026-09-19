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
import { cn } from "@/lib/utils";
import type { AssetBilling, BillingCycle, InvoiceStatus } from "@/types/assets";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
}) {
  const NONE = "__none__";
  const hasEmpty = Boolean(emptyLabel);
  const selectValue = value === "" && hasEmpty ? NONE : value || undefined;

  return (
    <Select
      value={selectValue}
      onValueChange={(next) => onValueChange(next === NONE ? "" : next)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={assetSelectTriggerClass}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent searchable={searchable} className="rounded-xl z-[80]">
        {hasEmpty ? (
          <SelectItem value={NONE} className="rounded-lg">
            {emptyLabel}
          </SelectItem>
        ) : null}
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            className="rounded-lg"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
}: {
  value: AssetBilling;
  onChange: (next: AssetBilling) => void;
  showFinance: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

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
              <Label htmlFor="vendor">Vendor</Label>
              <Input
                id="vendor"
                maxLength={100}
                className="h-11 rounded-xl"
                value={value.vendor ?? ""}
                onChange={(e) =>
                  onChange({ ...value, vendor: e.target.value.slice(0, 100) })
                }
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
  const handleClose = () => {
    if (loading) return;
    if (dirty && !window.confirm("You have unsaved changes.")) return;
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : handleClose())}>
      <DialogContent
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
            onClick={handleClose}
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
