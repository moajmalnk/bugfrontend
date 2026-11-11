import { PRINT_DOTS, type MonoBitmap } from "@/lib/escposReceipt";

/** Why: ESC/POS text is code-page 437 — Malayalam/Unicode must go out as GS v 0 raster. */
const THERMAL_TEXT_FONT =
  "system-ui, -apple-system, 'Segoe UI', 'PosterMalayalam', 'Noto Sans Malayalam', 'Manjari', 'Gayathri', sans-serif";

/**
 * Why: Long HQ / WhatsApp notes (up to 10k chars) need more paper than photo
 * slips; ~600mm keeps USB jobs under ~300KB while avoiding silent clipping.
 */
export const MAX_THERMAL_TEXT_HEIGHT_DOTS = 4800;

let malayalamFontPromise: Promise<void> | null = null;

/**
 * Why: Load Noto Sans Malayalam Bold so canvas can paint ലിപി glyphs the
 * HOP-H58 cannot print as ESC/POS text.
 */
export function ensureThermalMalayalamFont(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (malayalamFontPromise) return malayalamFontPromise;
  malayalamFontPromise = (async () => {
    try {
      if (typeof FontFace === "undefined") return;
      const already = [...document.fonts].some(
        (f) => f.family.replace(/["']/g, "") === "PosterMalayalam"
      );
      if (already) return;
      const face = new FontFace(
        "PosterMalayalam",
        "url(/fonts/poster/NotoSansMalayalam-Bold.woff2) format('woff2')",
        { weight: "700", display: "swap" }
      );
      await face.load();
      document.fonts.add(face);
    } catch {
      malayalamFontPromise = null;
    }
  })();
  return malayalamFontPromise;
}

/** True when the slip needs a Unicode raster (Malayalam, emoji, etc.). */
export function needsUnicodeThermalRaster(text: string): boolean {
  return /[^\x09\x0a\x0d\x20-\x7e]/.test(text);
}

/**
 * Why: App lib is ES2020 so Intl.Segmenter is missing from typings; runtime
 * Chrome/Safari still expose it for Malayalam grapheme-safe wrapping.
 */
type IntlSegmenterCtor = new (
  locales?: string | string[],
  options?: { granularity?: "grapheme" | "word" | "sentence" }
) => { segment: (input: string) => Iterable<{ segment: string }> };

function segmentGraphemes(text: string): string[] {
  try {
    const Segmenter = (Intl as typeof Intl & { Segmenter?: IntlSegmenterCtor })
      .Segmenter;
    if (typeof Segmenter === "function") {
      const seg = new Segmenter(undefined, { granularity: "grapheme" });
      return Array.from(seg.segment(text), (s) => s.segment);
    }
  } catch {
    // fall through
  }
  return Array.from(text);
}

function wrapCanvasLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";

  const pushWord = (word: string) => {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
      return;
    }
    if (current) {
      lines.push(current);
      current = "";
    }
    if (ctx.measureText(word).width <= maxWidth) {
      current = word;
      return;
    }
    // Break overlong tokens (URLs / Malayalam without spaces) by grapheme.
    let chunk = "";
    for (const g of segmentGraphemes(word)) {
      const next = chunk + g;
      if (ctx.measureText(next).width <= maxWidth) {
        chunk = next;
      } else {
        if (chunk) lines.push(chunk);
        chunk = g;
      }
    }
    current = chunk;
  };

  for (const word of words) pushWord(word);
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function wrapThermalText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const out: string[] = [];
  for (const para of text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    out.push(...wrapCanvasLine(ctx, para.trim(), maxWidth));
  }
  return out;
}

/** Crisp black text on white — no photo dither (glyphs stay sharp on 58mm). */
function canvasToMonoCrisp(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): MonoBitmap {
  const { data } = ctx.getImageData(0, 0, width, height);
  const bytesPerRow = width / 8;
  const rows = new Uint8Array(bytesPerRow * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3] / 255;
      if (alpha < 0.08) continue;
      const lum =
        (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      // Ink when dark enough after alpha blend on white.
      const onWhite = lum * alpha + (1 - alpha);
      if (onWhite < 0.72) {
        rows[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }

  const preview = document.createElement("canvas");
  preview.width = width;
  preview.height = height;
  const pctx = preview.getContext("2d")!;
  const image = pctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const on = rows[y * bytesPerRow + (x >> 3)] & (0x80 >> (x & 7));
      const i = (y * width + x) * 4;
      const v = on ? 0 : 255;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
  }
  pctx.putImageData(image, 0, 0);

  return {
    width,
    height,
    rows,
    previewUrl: preview.toDataURL("image/png"),
  };
}

/**
 * Renders Unicode (Malayalam + Latin) message text as a 58mm mono bitmap for
 * ESC/POS GS v 0. Printer built-in fonts cannot show Malayalam.
 */
export async function textToThermalMonoBitmap(
  raw: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    fontSize?: number;
    paddingX?: number;
    lineGap?: number;
  } = {}
): Promise<MonoBitmap> {
  const text = String(raw ?? "").trim();
  if (!text) {
    throw new Error("No text to print.");
  }

  await ensureThermalMalayalamFont();
  try {
    await document.fonts.ready;
  } catch {
    // continue with fallbacks
  }

  const maxWidth = Math.max(8, Math.floor((options.maxWidth ?? PRINT_DOTS) / 8) * 8);
  const maxHeight = options.maxHeight ?? MAX_THERMAL_TEXT_HEIGHT_DOTS;
  const paddingX = options.paddingX ?? 4;
  const contentWidth = Math.max(8, maxWidth - paddingX * 2);

  // Probe wrap at the preferred size, then shrink if the slip would exceed max height.
  let fontSize = options.fontSize ?? 22;
  let lineGap = options.lineGap ?? 6;
  let lines: string[] = [];

  const measure = (size: number) => {
    const probe = document.createElement("canvas").getContext("2d");
    if (!probe) throw new Error("Could not prepare text for printing.");
    probe.font = `700 ${size}px ${THERMAL_TEXT_FONT}`;
    return wrapThermalText(probe, text, contentWidth);
  };

  for (let attempt = 0; attempt < 8; attempt++) {
    lines = measure(fontSize);
    const lineHeight = Math.ceil(fontSize * 1.25) + lineGap;
    const height = Math.max(lineHeight, lines.length * lineHeight + 8);
    if (height <= maxHeight || fontSize <= 14) break;
    fontSize -= 2;
    lineGap = Math.max(3, lineGap - 1);
  }

  const lineHeight = Math.ceil(fontSize * 1.25) + lineGap;
  let height = Math.max(lineHeight, lines.length * lineHeight + 8);
  if (height > maxHeight) {
    // Last resort: keep font, clip remaining lines so USB job stays reliable.
    const maxLines = Math.max(1, Math.floor((maxHeight - 8) / lineHeight));
    lines = lines.slice(0, maxLines);
    height = Math.max(lineHeight, lines.length * lineHeight + 8);
  }
  height = Math.min(maxHeight, height);

  const canvas = document.createElement("canvas");
  canvas.width = maxWidth;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not prepare text for printing.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, maxWidth, height);
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";
  ctx.font = `700 ${fontSize}px ${THERMAL_TEXT_FONT}`;

  let y = 4;
  for (const line of lines) {
    if (y + lineHeight > height) break;
    if (line) ctx.fillText(line, paddingX, y);
    y += lineHeight;
  }

  return canvasToMonoCrisp(ctx, maxWidth, height);
}
