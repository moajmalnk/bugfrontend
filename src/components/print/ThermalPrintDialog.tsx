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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { ReceiptPreview } from "@/components/print/ReceiptPreview";
import {
  fontColumns,
  MAX_OFFSET_DOTS,
  type CutMode,
  type MonoBitmap,
  type ReceiptCopy,
  type ReceiptFont,
  type ReceiptResult,
  type ReceiptStyle,
} from "@/lib/escposReceipt";
import {
  forgetThermalPrinter,
  getPairedThermalPrinter,
  getThermalPrinter,
  isDirectPrintSupported,
  sendToThermalPrinter,
  ThermalPrinterError,
} from "@/lib/escposPrinter";
import {
  clampOffset,
  clearLegacyLogoPrefs,
  getCutMode,
  getPrintFont,
  getPrintOffset,
  OFFSET_STEP_DOTS,
  setCutMode,
  setPrintFont,
  setPrintOffset,
} from "@/lib/printerPrefs";
import { loadReceiptLogo } from "@/lib/receiptLogo";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Loader2,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  Usb,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const MIN_COPIES = 1;
const MAX_COPIES = 10;

export type ThermalPrintStatus = "loading" | "ready" | "error";

export type ReceiptBuilder = (options: {
  printedAt: Date;
  copy: ReceiptCopy;
  style: ReceiptStyle;
}) => ReceiptResult;

const fontOptions = (offsetDots: number): { value: ReceiptFont; label: string; hint: string }[] => [
  { value: "B", label: "Compact", hint: `${fontColumns("B", offsetDots)} per line` },
  { value: "A", label: "Standard", hint: `${fontColumns("A", offsetDots)} per line` },
];

const CUT_OPTIONS: { value: CutMode; label: string; hint: string }[] = [
  { value: "tear", label: "Tear line", hint: "No cutter" },
  { value: "full", label: "Full cut", hint: "Auto-cutter" },
  { value: "partial", label: "Partial cut", hint: "Leaves a tab" },
];

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          "grid gap-1 rounded-xl border bg-muted/40 p-1",
          options.length === 3 ? "grid-cols-3" : "grid-cols-2"
        )}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex flex-col items-center rounded-xl px-2 py-1.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-60",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-xs font-semibold">{option.label}</span>
              <span className="text-[10px] leading-tight opacity-80">{option.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ThermalPrintDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  status: ThermalPrintStatus;
  errorMessage?: string;
  onRetry?: () => void;
  /** Null while data is not ready; called once for the preview and once per printed copy. */
  buildReceipt: ReceiptBuilder | null;
  /** Report-specific controls (month, sections…) rendered above the copies stepper. */
  options?: ReactNode | ((ctx: { printing: boolean }) => ReactNode);
  /** Extra gate from `options`, e.g. at least one section selected. */
  blockedReason?: string | null;
  successDescription?: (printerName: string) => string;
  size?: "md" | "lg";
}

export function ThermalPrintDialog({
  open,
  onClose,
  title,
  subtitle,
  status,
  errorMessage = "Could not load the data for this slip.",
  onRetry,
  buildReceipt,
  options,
  blockedReason,
  successDescription,
  size = "md",
}: ThermalPrintDialogProps) {
  const supported = isDirectPrintSupported();
  const [copiesInput, setCopiesInput] = useState("1");
  const [printing, setPrinting] = useState(false);
  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null);
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [font, setFont] = useState<ReceiptFont>(getPrintFont);
  const [cut, setCut] = useState<CutMode>(getCutMode);
  const [offsetDots, setOffsetDots] = useState<number>(getPrintOffset);
  const [logo, setLogo] = useState<MonoBitmap | null>(null);
  const [logoState, setLogoState] = useState<"loading" | "ready" | "error">("loading");
  /** Synchronous lock so a double click never starts two USB sessions. */
  const busyRef = useRef(false);
  const busy = printing;

  const copies = Number(copiesInput);
  const copiesValid =
    /^\d+$/.test(copiesInput) && copies >= MIN_COPIES && copies <= MAX_COPIES;
  const ready = status === "ready" && buildReceipt !== null;
  const canPrint =
    ready && copiesValid && supported && !blockedReason && logoState !== "loading";

  const refreshPrinter = useCallback(async () => {
    const device = await getPairedThermalPrinter().catch(() => null);
    setPrinterName(device ? device.productName || "USB thermal printer" : null);
  }, []);

  useEffect(() => {
    if (!open) {
      setCopiesInput("1");
      setProgress(null);
      return;
    }
    clearLegacyLogoPrefs();
    void refreshPrinter();
  }, [open, refreshPrinter]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLogoState("loading");
    loadReceiptLogo()
      .then((bitmap) => {
        if (!active) return;
        setLogo(bitmap);
        setLogoState("ready");
      })
      .catch(() => active && setLogoState("error"));
    return () => {
      active = false;
    };
  }, [open]);

  const style = useMemo<ReceiptStyle>(
    () => ({ font, cut, logo, offsetDots }),
    [font, cut, logo, offsetDots]
  );

  const requestClose = useCallback(() => {
    if (busyRef.current) return;
    onClose();
  }, [onClose]);

  const receipt = useMemo(() => {
    if (!ready || logoState === "loading") return null;
    return buildReceipt({
      printedAt: new Date(),
      copy: { index: 1, total: copiesValid ? copies : 1 },
      style,
    });
  }, [ready, logoState, buildReceipt, copies, copiesValid, style]);

  const setCopies = (next: number) =>
    setCopiesInput(String(Math.min(MAX_COPIES, Math.max(MIN_COPIES, next))));

  const changeFont = (next: ReceiptFont) => {
    setFont(next);
    setPrintFont(next);
  };

  const changeCut = (next: CutMode) => {
    setCut(next);
    setCutMode(next);
  };

  const changeOffset = (next: number) => {
    const dots = clampOffset(next);
    setOffsetDots(dots);
    setPrintOffset(dots);
  };
  const offsetMm = offsetDots / OFFSET_STEP_DOTS;

  const handlePrint = async () => {
    if (busyRef.current || !canPrint || !buildReceipt) return;
    busyRef.current = true;
    setPrinting(true);
    setProgress({ sent: 0, total: copies });

    try {
      // Must run before any other await so Chrome still sees the click gesture.
      const device = await getThermalPrinter();
      const deviceName = device.productName || "USB thermal printer";
      setPrinterName(deviceName);
      const printedAt = new Date();
      const jobs = Array.from(
        { length: copies },
        (_, i) => buildReceipt({ printedAt, copy: { index: i + 1, total: copies }, style }).bytes
      );
      await sendToThermalPrinter(device, jobs, (sent, total) => setProgress({ sent, total }));
      toast({
        title: copies === 1 ? "Printed 1 copy" : `Printed ${copies} copies`,
        description: successDescription?.(deviceName) ?? `Sent to ${deviceName}.`,
      });
      busyRef.current = false;
      requestClose();
    } catch (error) {
      if (!(error instanceof ThermalPrinterError) && import.meta.env.DEV) {
        console.error("Thermal print failed:", error);
      }
      toast({
        title: "Print failed",
        description:
          error instanceof ThermalPrinterError
            ? error.message
            : "Could not reach the thermal printer. Please try again.",
        variant: "destructive",
      });
    } finally {
      busyRef.current = false;
      setPrinting(false);
      setProgress(null);
    }
  };

  const handleChangePrinter = async () => {
    await forgetThermalPrinter().catch(() => undefined);
    setPrinterName(null);
    toast({
      title: "Printer unpaired",
      description: "Chrome will ask you to choose a printer on the next print.",
    });
  };

  const printLabel = printing
    ? progress && progress.total > 1
      ? `Printing ${Math.min(progress.sent + 1, progress.total)} of ${progress.total}…`
      : "Printing…"
    : !copiesValid
      ? "Print"
      : copies > 1
        ? `Print ${copies} copies`
        : "Print 1 copy";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && requestClose()}>
      <DialogContent
        className={cn(
          "w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-2xl p-0",
          size === "lg" ? "max-w-[960px]" : "max-w-[600px]"
        )}
        onInteractOutside={(e) => busy && e.preventDefault()}
        onEscapeKeyDown={(e) => busy && e.preventDefault()}
        showCloseButton={false}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handlePrint();
          }}
          className="flex max-h-[90vh] flex-col"
        >
          <DialogHeader className="flex-row items-start justify-between gap-3 space-y-0 border-b p-5 text-left">
            <div className="flex min-w-0 flex-col gap-1">
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
                {title}
              </DialogTitle>
              <DialogDescription className="truncate">
                {subtitle ? `${subtitle} · ` : ""}58mm thermal receipt
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
              aria-label="Close"
              disabled={busy}
              onClick={requestClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="grid grid-cols-12 gap-4 overflow-y-auto p-5 [scrollbar-width:thin]">
            <div
              className={cn(
                "col-span-12 flex flex-col",
                size === "lg" ? "md:col-span-6" : "md:col-span-7"
              )}
            >
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preview · copy 1
              </Label>
              {/* Absolute scroller so the pane takes the row height set by the settings column, not the slip length. */}
              <div className="relative min-h-[360px] flex-1">
                <div className="absolute inset-0 overflow-auto rounded-xl border bg-white p-3 shadow-inner [scrollbar-width:thin]">
                  {status === "loading" || (status === "ready" && !receipt) ? (
                    <div className="flex flex-col gap-2" aria-busy="true">
                      {Array.from({ length: 14 }, (_, i) => (
                        <Skeleton
                          key={i}
                          className={cn("h-3 bg-slate-200", i % 3 === 0 ? "w-2/3" : "w-full")}
                        />
                      ))}
                    </div>
                  ) : status === "error" ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-slate-600">
                      <AlertTriangle className="h-6 w-6 text-amber-500" />
                      {errorMessage}
                      {onRetry ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={onRetry}
                        >
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                          Retry
                        </Button>
                      ) : null}
                    </div>
                  ) : receipt ? (
                    <ReceiptPreview
                      blocks={receipt.blocks}
                      columns={receipt.columns}
                      areaDots={receipt.areaDots}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div
              className={cn(
                "col-span-12 flex flex-col gap-4",
                size === "lg" ? "md:col-span-6" : "md:col-span-5"
              )}
            >
              {typeof options === "function" ? options({ printing: busy }) : options}

              <div className="flex flex-col gap-2">
                <Label htmlFor="thermal-copies" className="text-sm font-semibold">
                  Number of copies
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-xl"
                    aria-label="Fewer copies"
                    disabled={busy || !copiesValid || copies <= MIN_COPIES}
                    onClick={() => setCopies(copies - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="thermal-copies"
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={copiesInput}
                    disabled={busy}
                    aria-invalid={!copiesValid}
                    aria-describedby="thermal-copies-hint"
                    className="h-10 rounded-xl text-center text-base font-semibold tabular-nums"
                    onChange={(e) => setCopiesInput(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    onBlur={() => !copiesValid && setCopies(Number(copiesInput) || MIN_COPIES)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-xl"
                    aria-label="More copies"
                    disabled={busy || (copiesValid && copies >= MAX_COPIES)}
                    onClick={() => setCopies(copiesValid ? copies + 1 : MIN_COPIES)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p
                  id="thermal-copies-hint"
                  className={cn(
                    "text-xs",
                    copiesValid ? "text-muted-foreground" : "text-destructive"
                  )}
                >
                  {!copiesValid
                    ? `Enter a number from ${MIN_COPIES} to ${MAX_COPIES}.`
                    : `${copies > 1 ? `Labelled "Copy 1 of ${copies}"` : `Labelled "Copy 1 of 1"`}, ${
                        cut === "tear"
                          ? "with a tear line after each copy."
                          : "and cut after each copy."
                      }`}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-sm font-semibold">Print settings</span>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12">
                    <SegmentedControl
                      label="Text size"
                      value={font}
                      options={fontOptions(offsetDots)}
                      onChange={changeFont}
                      disabled={busy}
                    />
                  </div>
                  <div className="col-span-12">
                    <SegmentedControl
                      label="After each copy"
                      value={cut}
                      options={CUT_OPTIONS}
                      onChange={changeCut}
                      disabled={busy}
                    />
                  </div>
                  <div className="col-span-12 flex flex-col gap-1.5">
                    <span
                      id="thermal-offset-label"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Paper position · shift right
                    </span>
                    <div
                      role="group"
                      aria-labelledby="thermal-offset-label"
                      className="flex items-center gap-2"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-xl"
                        aria-label="Shift left 1mm"
                        disabled={busy || offsetDots <= 0}
                        onClick={() => changeOffset(offsetDots - OFFSET_STEP_DOTS)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span
                        aria-live="polite"
                        className="flex h-9 min-w-[72px] items-center justify-center rounded-xl border bg-background px-3 text-sm font-semibold tabular-nums"
                      >
                        {offsetMm} mm
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-xl"
                        aria-label="Shift right 1mm"
                        disabled={busy || offsetDots >= MAX_OFFSET_DOTS}
                        onClick={() => changeOffset(offsetDots + OFFSET_STEP_DOTS)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      0 mm uses the full paper width. Raise it only if the slip prints too close
                      to the left edge; each step shortens lines by about one character.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border bg-muted/40 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Usb className="h-4 w-4 text-muted-foreground" />
                  Printer
                </div>
                {!supported ? (
                  <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Direct USB printing needs Chrome or Edge on https or localhost.
                  </p>
                ) : printerName ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-xs text-foreground">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                      <span className="truncate">{printerName}</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-xl px-2 text-xs"
                      disabled={busy}
                      onClick={() => void handleChangePrinter()}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Not paired yet. Chrome will ask you to pick the printer when you print.
                  </p>
                )}

                {supported && logoState === "error" ? (
                  <p className="flex items-start gap-1.5 border-t pt-2 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Logo could not load; slips use the text heading.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col items-center gap-2 border-t p-4 sm:flex-col sm:justify-center sm:space-x-0">
            {blockedReason && ready ? (
              <p className="text-xs text-destructive">{blockedReason}</p>
            ) : null}
            <Button
              type="submit"
              className="h-11 w-full rounded-xl bg-sky-600 text-white hover:bg-sky-700 sm:w-auto sm:min-w-[220px]"
              disabled={busy || !canPrint}
            >
              {printing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Printer className="mr-2 h-4 w-4" />
              )}
              {printLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
