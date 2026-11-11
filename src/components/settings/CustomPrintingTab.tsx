import { ThermalPrintDialog, type ReceiptBuilder } from "@/components/print/ThermalPrintDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import {
  buildCustomPrintReceipt,
  customPrintColumns,
  CUSTOM_PRINT_MESSAGE_MAX,
  formatCustomPrintPreview,
  normalizeCustomPrintMessage,
} from "@/lib/customPrintReceipt";
import type { MonoBitmap } from "@/lib/escposReceipt";
import {
  DEFAULT_THERMAL_INK,
  imageFromDataTransfer,
  imageSourceToMonoBitmap,
  MAX_IMAGE_BYTES,
  ThermalImageError,
  type ThermalInkMode,
} from "@/lib/thermalImage";
import {
  needsUnicodeThermalRaster,
  textToThermalMonoBitmap,
} from "@/lib/thermalText";
import { cn } from "@/lib/utils";
import {
  ClipboardPaste,
  ImagePlus,
  Loader2,
  Printer,
  Rows3,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
} from "react";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/bmp";

const INK_OPTIONS: { value: ThermalInkMode; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "Best for photos" },
  { value: "soft", label: "Soft", hint: "A bit more detail" },
  { value: "rich", label: "Rich", hint: "Darker ink" },
];

function textFromDataTransfer(data: DataTransfer | null | undefined): string {
  if (!data) return "";
  const plain = data.getData("text/plain")?.trim() ?? "";
  if (plain) return normalizeCustomPrintMessage(plain);
  const html = data.getData("text/html")?.trim() ?? "";
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return normalizeCustomPrintMessage(tmp.innerText || tmp.textContent || "");
}

export type CustomPrintingTabHandle = {
  openPrint: () => void;
};

export const CustomPrintingTab = forwardRef<CustomPrintingTabHandle>(
  function CustomPrintingTab(_props, ref) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropRef = useRef<HTMLDivElement>(null);
    const sourceBlobRef = useRef<Blob | null>(null);
    const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);
    const [mono, setMono] = useState<MonoBitmap | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [messageRaster, setMessageRaster] = useState<MonoBitmap | null>(null);
    const [rasterizingText, setRasterizingText] = useState(false);
    const [ink, setInk] = useState<ThermalInkMode>(DEFAULT_THERMAL_INK);
    const [converting, setConverting] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [printOpen, setPrintOpen] = useState(false);
    const convertIdRef = useRef(0);
    const textRasterIdRef = useRef(0);

    const clearImage = useCallback(() => {
      convertIdRef.current += 1;
      sourceBlobRef.current = null;
      setMono(null);
      setFileName(null);
      setSourcePreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    const clearAll = useCallback(() => {
      clearImage();
      textRasterIdRef.current += 1;
      setMessage("");
      setMessageRaster(null);
      setRasterizingText(false);
    }, [clearImage]);

    useEffect(() => {
      return () => {
        convertIdRef.current += 1;
        textRasterIdRef.current += 1;
        sourceBlobRef.current = null;
        setSourcePreviewUrl((prev) => {
          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
          return null;
        });
      };
    }, []);

    /**
     * Why: Malayalam cannot ride ESC/POS text (code page 437 → "?"). Rasterize
     * any Unicode message to a mono bitmap before print/preview.
     */
    useEffect(() => {
      const cleaned = normalizeCustomPrintMessage(message);
      if (!cleaned) {
        textRasterIdRef.current += 1;
        setMessageRaster(null);
        setRasterizingText(false);
        return;
      }
      if (!needsUnicodeThermalRaster(cleaned)) {
        textRasterIdRef.current += 1;
        setMessageRaster(null);
        setRasterizingText(false);
        return;
      }

      const requestId = ++textRasterIdRef.current;
      setRasterizingText(true);
      const timer = window.setTimeout(() => {
        void (async () => {
          try {
            const bitmap = await textToThermalMonoBitmap(cleaned);
            if (requestId !== textRasterIdRef.current) return;
            setMessageRaster(bitmap);
          } catch (error) {
            if (requestId !== textRasterIdRef.current) return;
            setMessageRaster(null);
            toast({
              title: "Could not prepare Malayalam text",
              description:
                error instanceof Error
                  ? error.message
                  : "Try again or shorten the message.",
              variant: "destructive",
            });
          } finally {
            if (requestId === textRasterIdRef.current) setRasterizingText(false);
          }
        })();
      }, 280);

      return () => {
        window.clearTimeout(timer);
      };
    }, [message]);

    const convertBlob = useCallback(
      async (blob: Blob, mode: ThermalInkMode, options?: { announce?: boolean }) => {
        const requestId = ++convertIdRef.current;
        setConverting(true);
        setMono(null);
        try {
          const bitmap = await imageSourceToMonoBitmap(blob, { ink: mode });
          if (requestId !== convertIdRef.current) return;
          setMono(bitmap);
          if (options?.announce) {
            toast({
              title: "Image ready",
              description: "Light preview — faces stay open on thermal paper.",
            });
          }
        } catch (error) {
          if (requestId !== convertIdRef.current) return;
          clearImage();
          toast({
            title: "Could not prepare image",
            description:
              error instanceof ThermalImageError
                ? error.message
                : "Try another PNG or JPEG.",
            variant: "destructive",
          });
        } finally {
          if (requestId === convertIdRef.current) setConverting(false);
        }
      },
      [clearImage]
    );

    const ingestBlob = useCallback(
      async (blob: Blob, name?: string) => {
        if (blob.size > MAX_IMAGE_BYTES) {
          toast({
            title: "Image too large",
            description: "Use a file under 15 MB.",
            variant: "destructive",
          });
          return;
        }
        if (blob.type && !blob.type.startsWith("image/")) {
          toast({
            title: "Not an image",
            description: "Paste or upload a PNG, JPEG, or WebP file.",
            variant: "destructive",
          });
          return;
        }

        sourceBlobRef.current = blob;
        const previewUrl = URL.createObjectURL(blob);
        setSourcePreviewUrl((prev) => {
          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
          return previewUrl;
        });
        setFileName(name?.trim() || (blob instanceof File ? blob.name : "Pasted image"));
        await convertBlob(blob, ink, { announce: true });
      },
      [convertBlob, ink]
    );

    const applyMessage = useCallback((text: string, announce = true) => {
      const next = normalizeCustomPrintMessage(text);
      setMessage(next);
      if (announce) {
        toast({
          title: "Text ready",
          description: "Reflowed to fit 58mm paper top to bottom.",
        });
      }
    }, []);

    const reflowMessage = useCallback(() => {
      if (!message.trim()) return;
      const next = normalizeCustomPrintMessage(message);
      setMessage(next);
      toast({
        title: "Layout fixed",
        description: "Broken PDF wraps joined — slip fits top to bottom.",
      });
    }, [message]);

    const changeInk = (next: ThermalInkMode) => {
      setInk(next);
      const blob = sourceBlobRef.current;
      if (blob) void convertBlob(blob, next);
    };

    const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) void ingestBlob(file, file.name);
    };

    const onDrop = (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragOver(false);
      const image = imageFromDataTransfer(event.dataTransfer);
      if (image) {
        void ingestBlob(image, image instanceof File ? image.name : undefined);
        return;
      }
      const text = textFromDataTransfer(event.dataTransfer);
      if (text) {
        applyMessage(text);
        return;
      }
      toast({
        title: "Nothing to print",
        description: "Drop a PNG/JPEG image or plain text here.",
        variant: "destructive",
      });
    };

    const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
      const image = imageFromDataTransfer(event.clipboardData);
      if (image) {
        event.preventDefault();
        void ingestBlob(image, image instanceof File ? image.name : "Pasted image");
        return;
      }
      const text = textFromDataTransfer(event.clipboardData);
      if (text) {
        event.preventDefault();
        applyMessage(text);
      }
    };

    const pasteFromClipboard = async () => {
      try {
        if (!navigator.clipboard?.read) {
          toast({
            title: "Paste with keyboard",
            description: "Click the drop zone, then press ⌘V / Ctrl+V.",
          });
          dropRef.current?.focus();
          return;
        }
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const type = item.types.find((t) => t.startsWith("image/"));
          if (!type) continue;
          const blob = await item.getType(type);
          await ingestBlob(blob, "Clipboard image");
          return;
        }
        for (const item of items) {
          if (!item.types.includes("text/plain")) continue;
          const blob = await item.getType("text/plain");
          const text = (await blob.text()).trim();
          if (!text) continue;
          applyMessage(text);
          return;
        }
        toast({
          title: "Clipboard empty",
          description: "Copy an image or text message first, then paste here.",
          variant: "destructive",
        });
      } catch {
        toast({
          title: "Clipboard blocked",
          description: "Click the drop zone and press ⌘V / Ctrl+V instead.",
        });
        dropRef.current?.focus();
      }
    };

    const hasMessage = Boolean(message.trim());
    const messageNeedsRaster =
      hasMessage && needsUnicodeThermalRaster(normalizeCustomPrintMessage(message));
    const messageReady =
      !hasMessage ||
      (messageNeedsRaster ? Boolean(messageRaster) && !rasterizingText : true);
    const busy = converting || rasterizingText;
    const ready = (Boolean(mono) || hasMessage) && messageReady && !busy;

    useImperativeHandle(ref, () => ({
      openPrint: () => {
        if (!ready) {
          toast({
            title: busy ? "Still preparing…" : "Add image or text first",
            description: busy
              ? "Malayalam text is being rendered for the thermal printer."
              : "Upload/paste an image, or type a message, then print.",
            variant: "destructive",
          });
          return;
        }
        setPrintOpen(true);
      },
    }));

    const buildReceipt = useMemo<ReceiptBuilder | null>(() => {
      if (!mono && !hasMessage) return null;
      if (messageNeedsRaster && !messageRaster) return null;
      return ({ copy, style }) =>
        buildCustomPrintReceipt({
          image: mono,
          message: messageNeedsRaster ? null : message,
          messageRaster: messageNeedsRaster ? messageRaster : null,
          copy,
          // Why: slip is custom content; do not prepend the BugRicer logo.
          style: { ...style, logo: null },
        });
    }, [mono, message, hasMessage, messageNeedsRaster, messageRaster]);

    const previewText = useMemo(() => {
      if (!hasMessage || messageNeedsRaster) return "";
      return formatCustomPrintPreview(message);
    }, [hasMessage, message, messageNeedsRaster]);

    const previewCols = customPrintColumns();

    return (
      <div className="flex flex-col gap-6 min-w-0">
        <div className="flex flex-col gap-2 min-w-0">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Printer className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" />
            Custom thermal print
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Print an image, a text message, or both on 58mm USB ESC/POS paper.
            Photos default to Light so they do not flood black — use Soft/Rich only
            if you need more ink.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6 items-start min-w-0">
          {/* Source card */}
          <div className="col-span-12 lg:col-span-6 min-w-0">
            <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-foreground">Source</h3>
                <p className="text-xs text-muted-foreground">
                  Image and/or text — WhatsApp notes, screenshots, HQ lists
                </p>
              </div>

              <div
                ref={dropRef}
                tabIndex={0}
                role="button"
                aria-label="Upload or paste an image or text message to print"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onPaste={onPaste}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
                }}
                onDrop={onDrop}
                className={cn(
                  "relative flex min-h-[120px] max-h-[200px] flex-col items-center justify-center gap-3 overflow-y-auto rounded-xl border-2 border-dashed p-4 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-500 [scrollbar-width:thin]",
                  dragOver
                    ? "border-sky-500 bg-sky-50/80 dark:bg-sky-950/40"
                    : "border-muted-foreground/25 bg-muted/30 hover:border-sky-400/60 hover:bg-muted/50"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  className="sr-only"
                  onChange={onFileChange}
                />
                {converting ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
                    <p className="text-sm font-medium">Preparing for thermal print…</p>
                  </>
                ) : sourcePreviewUrl ? (
                  <div className="flex w-full min-h-0 flex-1 flex-col items-center justify-center gap-3">
                    <img
                      src={sourcePreviewUrl}
                      alt={fileName || "Selected image"}
                      className="max-h-40 max-w-full rounded-xl object-contain shadow-sm"
                    />
                    <p className="text-xs text-muted-foreground truncate max-w-full shrink-0">
                      {fileName}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ImagePlus className="h-8 w-8" />
                      <Type className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Drop image or text here</p>
                      <p className="text-xs text-muted-foreground">
                        Upload · Paste image · Paste message (⌘V / Ctrl+V)
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => void pasteFromClipboard()}
                  disabled={busy}
                >
                  <ClipboardPaste className="mr-2 h-4 w-4" />
                  Paste
                </Button>
                {sourcePreviewUrl || hasMessage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-xl text-destructive hover:text-destructive"
                    onClick={clearAll}
                    disabled={busy}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                ) : null}
                {sourcePreviewUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-xl"
                    onClick={clearImage}
                    disabled={busy}
                  >
                    Remove image
                  </Button>
                ) : null}
                {hasMessage ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={reflowMessage}
                    disabled={busy}
                    title="Join broken PDF line wraps and fit 58mm width"
                  >
                    <Rows3 className="mr-2 h-4 w-4" />
                    Fit top–bottom
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5 shrink-0">
                <span className="text-sm font-semibold">Print lightness</span>
                <div
                  role="radiogroup"
                  aria-label="Print lightness"
                  className="grid grid-cols-3 gap-1 rounded-xl border bg-muted/40 p-1"
                >
                  {INK_OPTIONS.map((option) => {
                    const active = ink === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={busy || !sourcePreviewUrl}
                        onClick={() => changeInk(option.value)}
                        className={cn(
                          "flex flex-col items-center rounded-xl px-2 py-1.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-60",
                          active
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <span className="text-xs font-semibold">{option.label}</span>
                        <span className="text-[10px] leading-tight opacity-80">
                          {option.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-0">
                <Label htmlFor="custom-print-message" className="text-sm font-semibold">
                  Message / text
                </Label>
                <Textarea
                  id="custom-print-message"
                  value={message}
                  maxLength={CUSTOM_PRINT_MESSAGE_MAX}
                  rows={12}
                  disabled={busy}
                  placeholder={
                    "Paste a WhatsApp message or type notes to print…\n\nExample:\n1. Task Manager — fix scroll\n2. HQ Events — view details\n3. Franchise — add State / District"
                  }
                  className="rounded-xl resize-y min-h-[180px] max-h-[min(50vh,420px)] overflow-y-auto [scrollbar-width:thin]"
                  onChange={(e) =>
                    setMessage(e.target.value.slice(0, CUSTOM_PRINT_MESSAGE_MAX))
                  }
                  onPaste={(e) => {
                    const text = textFromDataTransfer(e.clipboardData);
                    if (!text) return;
                    e.preventDefault();
                    applyMessage(text);
                  }}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Malayalam prints as a sharp image on the slip (not &quot;?&quot;).
                    Use Fit top–bottom if PDF words look split.
                  </p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {message.length}/{CUSTOM_PRINT_MESSAGE_MAX}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Preview card — sticky so Print stays reachable while scrolling */}
          <div className="col-span-12 lg:col-span-6 min-w-0 lg:sticky lg:top-4 self-start">
            <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col gap-1 shrink-0">
                <h3 className="text-sm font-semibold text-foreground">Thermal preview</h3>
                <p className="text-xs text-muted-foreground">
                  58mm ·{" "}
                  {messageNeedsRaster
                    ? "Malayalam as image"
                    : `${previewCols} cols`}{" "}
                  · scroll if long
                </p>
              </div>

              <div
                className={cn(
                  "flex max-h-[min(65vh,560px)] flex-col items-center justify-start",
                  "overflow-y-auto overscroll-contain rounded-xl border bg-white p-3 shadow-inner",
                  "[scrollbar-width:thin] custom-scrollbar",
                  mono || hasMessage ? "min-h-0" : "min-h-[180px]"
                )}
              >
                {busy ? (
                  <div className="flex min-h-[160px] w-full flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    <p className="text-xs text-slate-500">
                      {rasterizingText
                        ? "Rendering Malayalam for thermal…"
                        : "Preparing image…"}
                    </p>
                  </div>
                ) : mono || hasMessage ? (
                  <div className="flex w-full flex-col items-center gap-3">
                    {mono ? (
                      <img
                        src={mono.previewUrl}
                        alt="Black and white thermal preview"
                        className="max-h-[220px] max-w-full h-auto shrink-0 object-contain"
                        style={{ width: Math.min(mono.width, 280) }}
                      />
                    ) : null}
                    {messageNeedsRaster && messageRaster ? (
                      <img
                        src={messageRaster.previewUrl}
                        alt="Malayalam thermal text preview"
                        className="max-w-full h-auto shrink-0 object-contain"
                        style={{ width: Math.min(messageRaster.width, 280) }}
                      />
                    ) : null}
                    {!messageNeedsRaster && hasMessage ? (
                      <pre
                        className="w-full whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-slate-900"
                        style={{ width: `${previewCols}ch`, maxWidth: "100%" }}
                      >
                        {previewText}
                      </pre>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex min-h-[160px] w-full items-center justify-center">
                    <p className="text-sm text-slate-500 text-center px-4">
                      Add an image and/or message to see the thermal preview.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 shrink-0">
                {mono || hasMessage ? (
                  <p className="text-xs text-muted-foreground">
                    {[
                      mono ? `${mono.width}×${mono.height} dots` : null,
                      messageNeedsRaster && messageRaster
                        ? `Malayalam ${messageRaster.width}×${messageRaster.height}`
                        : hasMessage
                          ? "text message"
                          : null,
                      "USB ESC/POS",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Waiting for an image or text message…
                  </p>
                )}
                <Button
                  type="button"
                  className="h-11 w-full rounded-xl bg-sky-600 text-white hover:bg-sky-700"
                  disabled={!ready}
                  onClick={() => setPrintOpen(true)}
                >
                  {rasterizingText ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="mr-2 h-4 w-4" />
                  )}
                  {rasterizingText ? "Preparing Malayalam…" : "Print on thermal printer"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <ThermalPrintDialog
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          title="Print custom slip"
          subtitle={
            fileName ||
            (messageNeedsRaster
              ? "Malayalam / Unicode message"
              : hasMessage
                ? "Text message"
                : undefined)
          }
          status={
            ready ? "ready" : busy ? "loading" : "error"
          }
          errorMessage="Add an image or text message before printing."
          buildReceipt={buildReceipt}
          successDescription={(printer) => `Slip sent to ${printer}.`}
        />
      </div>
    );
  }
);
