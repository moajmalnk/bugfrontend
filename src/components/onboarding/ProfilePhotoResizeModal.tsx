/**
 * Why: Force a square cropped profile photo so avatars stay consistent across
 * sidebar, profile, and admin lists — raw uploads vary wildly in aspect ratio.
 *
 * Round avatars clip square corners. Default zoom fits the entire photo inside
 * the circle (circumscribed) so logos, names, and edge detail stay visible.
 */
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area, type MediaSize, type Size } from "react-easy-crop";

const OUTPUT_SIZE = 512;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_ZOOM = 3;
/** Floor so a very tall/wide image can still sit fully inside the circle. */
const MIN_ZOOM_FLOOR = 0.35;
/** Keep a sliver of dimmed stage around the circle so the mask reads clearly. */
const CROP_INSET_PX = 20;
/** Slight inset so photo edges are not flush against the circle. */
const FIT_PADDING = 0.92;

/** Must sit above OnboardingWizard (z-[1000]) or the crop UI is trapped underneath. */
const NESTED_MODAL_Z = "z-[1100]";

type Props = {
  open: boolean;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onApply: (file: File) => void;
};

async function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

/**
 * Why: A circle cannot cover a square. Zoom is the ratio of crop diameter to
 * the photo's displayed diagonal so the full rectangle sits inside the mask.
 */
function zoomToFitInCircle(media: MediaSize, crop: Size): number {
  const diameter = Math.min(crop.width, crop.height);
  const diagonal = Math.hypot(media.width, media.height);
  if (diameter <= 0 || diagonal <= 0) return 1;
  return Math.min(1, Math.max(MIN_ZOOM_FLOOR, (diameter * FIT_PADDING) / diagonal));
}

function measureCropSize(el: HTMLElement): Size {
  const { width, height } = el.getBoundingClientRect();
  const diameter = Math.floor(
    Math.max(160, Math.min(width, height) - CROP_INSET_PX * 2)
  );
  return { width: diameter, height: diameter };
}

/**
 * Why: Zoomed-out crops include pixels outside the bitmap. Sample corners so
 * the padded ring matches the photo instead of a hard black fill.
 */
function sampleEdgeFill(image: HTMLImageElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "rgb(28, 28, 28)";

  const w = image.naturalWidth;
  const h = image.naturalHeight;
  const points: Array<[number, number]> = [
    [0, 0],
    [Math.max(0, w - 1), 0],
    [0, Math.max(0, h - 1)],
    [Math.max(0, w - 1), Math.max(0, h - 1)],
  ];

  let r = 0;
  let g = 0;
  let b = 0;
  for (const [px, py] of points) {
    ctx.clearRect(0, 0, 1, 1);
    ctx.drawImage(image, px, py, 1, 1, 0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    r += d[0];
    g += d[1];
    b += d[2];
  }
  const n = points.length;
  return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
}

/**
 * Why: Export a fixed square JPEG so upload size stays bounded and UI avatars
 * never stretch. Handles crop rects that extend past the source image.
 */
async function getCroppedJpeg(imageSrc: string, crop: Area): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not crop image");

  ctx.fillStyle = sampleEdgeFill(image);
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const scaleX = OUTPUT_SIZE / crop.width;
  const scaleY = OUTPUT_SIZE / crop.height;
  const srcX = Math.max(0, crop.x);
  const srcY = Math.max(0, crop.y);
  const srcX2 = Math.min(image.naturalWidth, crop.x + crop.width);
  const srcY2 = Math.min(image.naturalHeight, crop.y + crop.height);
  const srcW = srcX2 - srcX;
  const srcH = srcY2 - srcY;

  if (srcW > 0 && srcH > 0) {
    ctx.drawImage(
      image,
      srcX,
      srcY,
      srcW,
      srcH,
      (srcX - crop.x) * scaleX,
      (srcY - crop.y) * scaleY,
      srcW * scaleX,
      srcH * scaleY
    );
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode photo"))),
      "image/jpeg",
      0.9
    );
  });

  return new File([blob], `profile-${Date.now()}.jpg`, { type: "image/jpeg" });
}

export function validateProfilePhotoSource(file: File): string | null {
  const typeOk =
    ALLOWED_TYPES.includes(file.type) ||
    /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!typeOk) return "Use a JPG, PNG, or WebP photo (HEIC not supported for crop)";
  if (file.size > MAX_SOURCE_BYTES) return "Photo must be under 8MB";
  return null;
}

export function ProfilePhotoResizeModal({
  open,
  imageSrc,
  onOpenChange,
  onApply,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(MIN_ZOOM_FLOOR);
  const [cropSize, setCropSize] = useState<Size | undefined>();
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const applyingRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const mediaSizeRef = useRef<MediaSize | null>(null);
  const userAdjustedRef = useRef(false);

  const applyFitFromMedia = useCallback((media: MediaSize, size: Size) => {
    const fit = zoomToFitInCircle(media, size);
    setMinZoom(fit);
    if (!userAdjustedRef.current) {
      setZoom(fit);
      setCrop({ x: 0, y: 0 });
    } else {
      setZoom((z) => Math.max(fit, Math.min(MAX_ZOOM, z)));
    }
  }, []);

  useEffect(() => {
    if (!open) {
      applyingRef.current = false;
      setBusy(false);
      mediaSizeRef.current = null;
      setCropSize(undefined);
      return;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(MIN_ZOOM_FLOOR);
    setMinZoom(MIN_ZOOM_FLOOR);
    setCroppedArea(null);
    setBusy(false);
    applyingRef.current = false;
    userAdjustedRef.current = false;
    mediaSizeRef.current = null;
  }, [open, imageSrc]);

  useEffect(() => {
    if (!open) return;
    const el = stageRef.current;
    if (!el) return;

    const update = () => {
      const next = measureCropSize(el);
      setCropSize(next);
      const media = mediaSizeRef.current;
      if (media) applyFitFromMedia(media, next);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, imageSrc, applyFitFromMedia]);

  const onMediaLoaded = useCallback(
    (media: MediaSize) => {
      mediaSizeRef.current = media;
      if (cropSize) applyFitFromMedia(media, cropSize);
    },
    [applyFitFromMedia, cropSize]
  );

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const handleZoomChange = (next: number) => {
    userAdjustedRef.current = true;
    setZoom(next);
  };

  const handleCropChange = (next: { x: number; y: number }) => {
    userAdjustedRef.current = true;
    setCrop(next);
  };

  const handleFit = () => {
    const media = mediaSizeRef.current;
    if (!media || !cropSize) return;
    userAdjustedRef.current = false;
    applyFitFromMedia(media, cropSize);
  };

  const handleOpenChange = (next: boolean) => {
    // Why: Ignore spurious open=true from nested Dialog focus while applying.
    if (next && applyingRef.current) return;
    // Allow close while applying (Use photo), but block dismiss mid-encode otherwise.
    if (busy && !next && !applyingRef.current) return;
    onOpenChange(next);
  };

  const handleApply = async () => {
    if (!imageSrc || !croppedArea || busy || applyingRef.current) return;
    applyingRef.current = true;
    setBusy(true);
    try {
      const file = await getCroppedJpeg(imageSrc, croppedArea);
      onApply(file);
      onOpenChange(false);
    } catch {
      applyingRef.current = false;
      toast({
        title: "Could not crop photo",
        description: "Try another image (JPG, PNG, or WebP).",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const atFit = Math.abs(zoom - minZoom) < 0.02;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`sm:max-w-[560px] rounded-2xl gap-0 p-0 overflow-hidden ${NESTED_MODAL_Z}`}
        overlayClassName={NESTED_MODAL_Z}
        onCloseAutoFocus={(e) => {
          // Why: Prevent focus restore / click-through from reopening the file picker.
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (busy) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle>Resize profile photo</DialogTitle>
          <DialogDescription>
            Drag to position. Zoom out so the full photo sits in the circle, or
            zoom in for a closer crop.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={stageRef}
          className="relative h-[min(420px,52vh)] min-h-[280px] bg-muted/40"
        >
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={minZoom}
              maxZoom={MAX_ZOOM}
              aspect={1}
              cropShape="round"
              cropSize={cropSize}
              showGrid={false}
              objectFit="contain"
              restrictPosition={false}
              onCropChange={handleCropChange}
              onZoomChange={handleZoomChange}
              onCropComplete={onCropComplete}
              onMediaLoaded={onMediaLoaded}
              style={{
                containerStyle: { background: "hsl(var(--muted) / 0.4)" },
                cropAreaStyle: {
                  border: "2px solid rgba(255, 255, 255, 0.92)",
                  color: "rgba(0, 0, 0, 0.55)",
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
                },
              }}
            />
          ) : null}
        </div>

        <div className="px-6 py-4 space-y-3 border-t border-border/60">
          <div className="grid grid-cols-12 gap-4 items-center">
            <Label className="col-span-12 sm:col-span-2 text-sm text-muted-foreground">
              Zoom
            </Label>
            <div className="col-span-12 sm:col-span-8 flex flex-col gap-1.5 min-w-0">
              <Slider
                className="w-full"
                min={minZoom}
                max={MAX_ZOOM}
                step={0.02}
                value={[zoom]}
                onValueChange={(v) => handleZoomChange(v[0] ?? minZoom)}
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Full photo</span>
                <span>Close-up</span>
              </div>
            </div>
            <div className="col-span-12 sm:col-span-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={busy || atFit || !cropSize}
                onClick={handleFit}
              >
                Fit
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            disabled={busy || !croppedArea}
            onClick={() => void handleApply()}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Use photo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
