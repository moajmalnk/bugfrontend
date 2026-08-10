/**
 * Why: Force a square cropped profile photo so avatars stay consistent across
 * sidebar, profile, and admin lists — raw uploads vary wildly in aspect ratio.
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
import Cropper, { type Area } from "react-easy-crop";

const OUTPUT_SIZE = 512;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

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
 * Why: Export a fixed square JPEG so upload size stays bounded and UI avatars
 * never stretch.
 */
async function getCroppedJpeg(imageSrc: string, crop: Area): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not crop image");

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

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
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const applyingRef = useRef(false);

  useEffect(() => {
    if (!open) {
      applyingRef.current = false;
      setBusy(false);
      return;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setBusy(false);
    applyingRef.current = false;
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`sm:max-w-[520px] rounded-2xl gap-0 p-0 overflow-hidden ${NESTED_MODAL_Z}`}
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
            Drag to position, then zoom so your face fills the circle.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-[320px] bg-muted/40">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          ) : null}
        </div>

        <div className="px-6 py-4 space-y-3 border-t border-border/60">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm text-muted-foreground shrink-0">Zoom</Label>
            <Slider
              className="flex-1"
              min={1}
              max={3}
              step={0.05}
              value={[zoom]}
              onValueChange={(v) => setZoom(v[0] ?? 1)}
            />
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
