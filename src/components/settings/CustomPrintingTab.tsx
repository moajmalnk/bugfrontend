import { ThermalPrintDialog, type ReceiptBuilder } from "@/components/print/ThermalPrintDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { buildCustomImageReceipt } from "@/lib/customPrintReceipt";
import type { MonoBitmap } from "@/lib/escposReceipt";
import {
  DEFAULT_THERMAL_INK,
  imageFromDataTransfer,
  imageSourceToMonoBitmap,
  MAX_IMAGE_BYTES,
  ThermalImageError,
  type ThermalInkMode,
} from "@/lib/thermalImage";
import { cn } from "@/lib/utils";
import {
  ClipboardPaste,
  ImagePlus,
  Loader2,
  Printer,
  Trash2,
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
    const [caption, setCaption] = useState("");
    const [ink, setInk] = useState<ThermalInkMode>(DEFAULT_THERMAL_INK);
    const [converting, setConverting] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [printOpen, setPrintOpen] = useState(false);
    const convertIdRef = useRef(0);

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

    useEffect(() => {
      return () => {
        convertIdRef.current += 1;
        sourceBlobRef.current = null;
        setSourcePreviewUrl((prev) => {
          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
          return null;
        });
      };
    }, []);

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
      if (image) void ingestBlob(image, image instanceof File ? image.name : undefined);
      else {
        toast({
          title: "No image found",
          description: "Drop a PNG or JPEG onto this area.",
          variant: "destructive",
        });
      }
    };

    const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
      const image = imageFromDataTransfer(event.clipboardData);
      if (!image) return;
      event.preventDefault();
      void ingestBlob(image, image instanceof File ? image.name : "Pasted image");
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
        toast({
          title: "No image on clipboard",
          description: "Copy an image first, then paste here.",
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

    useImperativeHandle(ref, () => ({
      openPrint: () => {
        if (!mono || converting) {
          toast({
            title: "Add an image first",
            description: "Upload or paste a PNG, then print.",
            variant: "destructive",
          });
          return;
        }
        setPrintOpen(true);
      },
    }));

    const buildReceipt = useMemo<ReceiptBuilder | null>(() => {
      if (!mono) return null;
      return ({ copy, style }) =>
        buildCustomImageReceipt(mono, {
          caption,
          copy,
          // Why: slip is the uploaded image; do not prepend the BugRicer logo.
          style: { ...style, logo: null },
        });
    }, [mono, caption]);

    const ready = Boolean(mono) && !converting;

    return (
      <div className="flex flex-col gap-6 min-w-0">
        <div className="flex flex-col gap-2 min-w-0">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Printer className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" />
            Custom thermal print
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Photos print light by default so they do not flood black on 58mm paper.
            Use Soft/Rich only if you need more ink.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6 items-stretch min-w-0">
          {/* Source card */}
          <div className="col-span-12 lg:col-span-6 min-w-0">
            <div className="flex h-full min-h-[520px] flex-col gap-4 rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-foreground">Source image</h3>
                <p className="text-xs text-muted-foreground">
                  Upload, drop, or paste a Canva PNG / photo
                </p>
              </div>

              <div
                ref={dropRef}
                tabIndex={0}
                role="button"
                aria-label="Upload or paste an image to print"
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
                  "relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-4 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
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
                      className="max-h-full max-w-full rounded-xl object-contain shadow-sm"
                    />
                    <p className="text-xs text-muted-foreground truncate max-w-full shrink-0">
                      {fileName}
                    </p>
                  </div>
                ) : (
                  <>
                    <ImagePlus className="h-10 w-10 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Drop image here</p>
                      <p className="text-xs text-muted-foreground">
                        or click Upload · paste with ⌘V / Ctrl+V
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
                  disabled={converting}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => void pasteFromClipboard()}
                  disabled={converting}
                >
                  <ClipboardPaste className="mr-2 h-4 w-4" />
                  Paste
                </Button>
                {sourcePreviewUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-xl text-destructive hover:text-destructive"
                    onClick={clearImage}
                    disabled={converting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear
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
                        disabled={converting}
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

              <div className="flex flex-col gap-2 shrink-0">
                <Label htmlFor="custom-print-caption" className="text-sm font-semibold">
                  Caption (optional)
                </Label>
                <Textarea
                  id="custom-print-caption"
                  value={caption}
                  maxLength={200}
                  rows={2}
                  disabled={converting}
                  placeholder="Short note under the image…"
                  className="rounded-xl resize-none"
                  onChange={(e) => setCaption(e.target.value.slice(0, 200))}
                />
                <p className="text-xs text-muted-foreground">
                  Non-English characters may print as &quot;?&quot; on this printer. Keep
                  captions short and ASCII when possible.
                </p>
              </div>
            </div>
          </div>

          {/* Preview card */}
          <div className="col-span-12 lg:col-span-6 min-w-0">
            <div className="flex h-full min-h-[520px] flex-col gap-4 rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col gap-1 shrink-0">
                <h3 className="text-sm font-semibold text-foreground">Thermal preview</h3>
                <p className="text-xs text-muted-foreground">58mm · USB ESC/POS</p>
              </div>

              <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl border bg-white p-3 shadow-inner [scrollbar-width:thin]">
                {converting ? (
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                ) : mono ? (
                  <img
                    src={mono.previewUrl}
                    alt="Black and white thermal preview"
                    className="max-h-full max-w-full h-auto object-contain"
                    style={{ width: Math.min(mono.width, 280) }}
                  />
                ) : (
                  <p className="text-sm text-slate-500 text-center px-4">
                    Upload or paste an image to see the dithered print preview.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 shrink-0">
                {mono ? (
                  <p className="text-xs text-muted-foreground">
                    {mono.width}×{mono.height} dots · will print via USB ESC/POS
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Waiting for an image…</p>
                )}
                <Button
                  type="button"
                  className="h-11 w-full rounded-xl bg-sky-600 text-white hover:bg-sky-700"
                  disabled={!ready}
                  onClick={() => setPrintOpen(true)}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print on thermal printer
                </Button>
              </div>
            </div>
          </div>
        </div>

        <ThermalPrintDialog
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          title="Print custom image"
          subtitle={fileName || undefined}
          status={ready ? "ready" : converting ? "loading" : "error"}
          errorMessage="Add an image before printing."
          buildReceipt={buildReceipt}
          successDescription={(printer) => `Image sent to ${printer}.`}
        />
      </div>
    );
  }
);
