import { PRINT_DOTS, type MonoBitmap } from "@/lib/escposReceipt";

const LOGO_SRC = "/icon-512.png";
const LOGO_HEIGHT = 96;
const MARK_SIZE = 84;
const WORDMARK = "BugRicer";
const INK = "#04213f";

/** Ordered 4×4 Bayer thresholds (0–15) for halftoning mid-tones. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Logo image failed to load"));
    img.src = src;
  });
}

/** Bounding box of non-white, non-transparent pixels so padding is trimmed. */
function contentBox(img: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const ink = data[i + 3] > 32 && data[i] + data[i + 1] + data[i + 2] < 690;
      if (!ink) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return maxX < 0
    ? { x: 0, y: 0, w: width, h: height }
    : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Why the three bands: navy prints solid, the green shape is halftoned so the
 * two-colour mark still reads as two tones on a one-colour thermal printer,
 * and the light background stays white.
 */
function toMono(ctx: CanvasRenderingContext2D, width: number, height: number): Uint8Array {
  const { data } = ctx.getImageData(0, 0, width, height);
  const bytesPerRow = width / 8;
  const rows = new Uint8Array(bytesPerRow * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3] / 255;
      const lum =
        ((0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255) * alpha +
        (1 - alpha);
      let black: boolean;
      if (lum < 0.3) black = true;
      else if (lum > 0.82) black = false;
      else black = (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16 < (0.82 - lum) / 0.52;
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

async function renderLogo(): Promise<MonoBitmap> {
  const img = await loadImage(LOGO_SRC);
  const box = contentBox(img);
  const markW = Math.round((MARK_SIZE * box.w) / box.h);

  const canvas = document.createElement("canvas");
  canvas.width = PRINT_DOTS;
  canvas.height = LOGO_HEIGHT;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PRINT_DOTS, LOGO_HEIGHT);

  ctx.font = "800 46px Inter, 'Helvetica Neue', Arial, sans-serif";
  ctx.textBaseline = "middle";
  const textW = Math.ceil(ctx.measureText(WORDMARK).width);
  const gap = 14;
  const startX = Math.max(0, Math.round((PRINT_DOTS - (markW + gap + textW)) / 2));
  const markY = Math.round((LOGO_HEIGHT - MARK_SIZE) / 2);

  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, box.x, box.y, box.w, box.h, startX, markY, markW, MARK_SIZE);
  ctx.fillStyle = INK;
  ctx.fillText(WORDMARK, startX + markW + gap, LOGO_HEIGHT / 2 + 2);

  const rows = toMono(ctx, PRINT_DOTS, LOGO_HEIGHT);
  return {
    width: PRINT_DOTS,
    height: LOGO_HEIGHT,
    rows,
    previewUrl: previewFromRows(rows, PRINT_DOTS, LOGO_HEIGHT),
  };
}

let logoPromise: Promise<MonoBitmap> | null = null;

/** Renders the receipt logo once per session; failures are retried on next call. */
export function loadReceiptLogo(): Promise<MonoBitmap> {
  if (!logoPromise) {
    logoPromise = renderLogo().catch((error) => {
      logoPromise = null;
      throw error;
    });
  }
  return logoPromise;
}
