import { PRINT_DOTS, type MonoBitmap } from "@/lib/escposReceipt";

/** Ordered 4×4 Bayer thresholds (0–15) for photo mid-tones on 1-bit thermal. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** ~150mm of paper; taller images are scaled down to keep USB jobs reliable. */
export const MAX_PRINT_HEIGHT_DOTS = 1200;

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/**
 * Photo ink density for thermal. Default `light` — phone/Canva photos otherwise
 * print as heavy black blobs on 58mm heads.
 */
export type ThermalInkMode = "light" | "soft" | "rich";

export const DEFAULT_THERMAL_INK: ThermalInkMode = "light";

type InkProfile = {
  /** Brightness lift before dither (1 = none). */
  lift: number;
  /** Gamma < 1 opens shadows (lighter print). */
  gamma: number;
  /** Luminance below this is always black. */
  solidBlack: number;
  /** Luminance above this is always white. */
  solidWhite: number;
  /** Scales dither ink in the mid band (lower = lighter). */
  ditherGain: number;
};

const INK_PROFILES: Record<ThermalInkMode, InkProfile> = {
  light: { lift: 0.14, gamma: 0.55, solidBlack: 0.08, solidWhite: 0.62, ditherGain: 0.32 },
  soft: { lift: 0.08, gamma: 0.7, solidBlack: 0.14, solidWhite: 0.72, ditherGain: 0.48 },
  rich: { lift: 0.02, gamma: 0.9, solidBlack: 0.22, solidWhite: 0.82, ditherGain: 0.72 },
};

export class ThermalImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ThermalImageError";
  }
}

function loadImageFromUrl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ThermalImageError("Could not read that image."));
    img.src = src;
  });
}

/**
 * Why light-biased: thermal ink spreads; a “correct” dither looks flooded on
 * paper. We lift luminance and sparsely dither so faces and clothing stay open.
 */
function toMonoLight(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ink: ThermalInkMode
): Uint8Array {
  const profile = INK_PROFILES[ink];
  const { data } = ctx.getImageData(0, 0, width, height);
  const bytesPerRow = width / 8;
  const rows = new Uint8Array(bytesPerRow * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3] / 255;
      const raw =
        ((0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255) * alpha +
        (1 - alpha);
      // Lift + gamma: mid greys become much lighter before any ink decision.
      const lifted = Math.min(1, raw + profile.lift);
      const lum = Math.pow(lifted, profile.gamma);

      let black: boolean;
      if (lum <= profile.solidBlack) black = true;
      else if (lum >= profile.solidWhite) black = false;
      else {
        const t = (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16;
        const span = Math.max(0.001, profile.solidWhite - profile.solidBlack);
        const darkness = ((profile.solidWhite - lum) / span) * profile.ditherGain;
        black = darkness > t;
      }

      if (black) rows[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return rows;
}

function previewFromRows(rows: Uint8Array, width: number, height: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(width, height);
  const bytesPerRow = width / 8;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const on = rows[y * bytesPerRow + (x >> 3)] & (0x80 >> (x & 7));
      const i = (y * width + x) * 4;
      const v = on ? 0 : 255;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Scales any photo to the 58mm head width, dithered lightly to 1-bit so
 * HOP-H58-class printers can print via ESC/POS GS v 0.
 */
export async function imageSourceToMonoBitmap(
  source: string | Blob | HTMLImageElement,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    ink?: ThermalInkMode;
  } = {}
): Promise<MonoBitmap> {
  const maxWidth = Math.max(8, Math.floor((options.maxWidth ?? PRINT_DOTS) / 8) * 8);
  const maxHeight = options.maxHeight ?? MAX_PRINT_HEIGHT_DOTS;
  const ink = options.ink ?? DEFAULT_THERMAL_INK;

  let img: HTMLImageElement;
  let objectUrl: string | null = null;
  try {
    if (source instanceof HTMLImageElement) {
      img = source;
    } else if (typeof source === "string") {
      img = await loadImageFromUrl(source);
    } else {
      if (source.size > MAX_IMAGE_BYTES) {
        throw new ThermalImageError("Image is too large (max 15 MB).");
      }
      if (source.type && !source.type.startsWith("image/")) {
        throw new ThermalImageError("Only image files can be printed.");
      }
      objectUrl = URL.createObjectURL(source);
      img = await loadImageFromUrl(objectUrl);
    }

    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;
    if (!naturalW || !naturalH) {
      throw new ThermalImageError("Image has no dimensions.");
    }

    let width = maxWidth;
    let height = Math.round((naturalH * width) / naturalW);
    if (height > maxHeight) {
      height = maxHeight;
      width = Math.max(8, Math.floor((naturalW * height) / naturalH / 8) * 8);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new ThermalImageError("Could not prepare the image for printing.");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    const rows = toMonoLight(ctx, width, height, ink);
    return {
      width,
      height,
      rows,
      previewUrl: previewFromRows(rows, width, height),
    };
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

/** Pulls the first image File/Blob from a paste or drop DataTransfer. */
export function imageFromDataTransfer(data: DataTransfer | null): File | Blob | null {
  if (!data) return null;
  const files = Array.from(data.files || []);
  const file = files.find((f) => f.type.startsWith("image/"));
  if (file) return file;

  const items = Array.from(data.items || []);
  for (const item of items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      return item.getAsFile();
    }
  }
  return null;
}
