import { toCanvas } from 'html-to-image';
import { getPosterFontEmbedCss } from './brand/posterFonts';
import { sameAspect } from './posterSizes';
import type { PosterSize } from './types';

export type PosterExport = {
  blob: Blob;
  extension: 'webp' | 'png';
};

const MAX_HERO_EDGE = 1600;
export const MAX_HERO_UPLOAD_BYTES = 10 * 1024 * 1024;

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
}

/**
 * Halves the image until it is within 2× of the target before the final draw.
 * Why: a single 1080px → 48px drawImage aliases badly; stepping keeps icons crisp.
 */
function stepDown(source: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
  let current = source;
  while (current.width / 2 >= width && current.height / 2 >= height) {
    const { canvas, ctx } = makeCanvas(current.width / 2, current.height / 2);
    ctx.drawImage(current, 0, 0, canvas.width, canvas.height);
    current = canvas;
  }
  return current;
}

/**
 * Fits the rendered layout onto the target size. Matching ratios scale directly;
 * other ratios get a soft blurred fill of the poster itself behind a centred copy.
 * The blur is made by drawing into a tiny canvas and scaling up, which works in
 * every browser (Safari lacks CanvasRenderingContext2D.filter).
 */
function composeOnTarget(
  source: HTMLCanvasElement,
  target: { width: number; height: number }
): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(target.width, target.height);
  const sameRatio = sameAspect(source, target);

  if (!sameRatio) {
    const coverScale = Math.max(target.width / source.width, target.height / source.height);
    const tinyW = 24;
    const tinyH = Math.max(1, Math.round((tinyW * target.height) / target.width));
    const tiny = makeCanvas(tinyW, tinyH);
    const cw = (source.width * coverScale * tinyW) / target.width;
    const ch = (source.height * coverScale * tinyW) / target.width;
    tiny.ctx.drawImage(stepDown(source, cw, ch), (tinyW - cw) / 2, (tinyH - ch) / 2, cw, ch);
    ctx.drawImage(tiny.canvas, 0, 0, target.width, target.height);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0, target.width, target.height);
  }

  const containScale = Math.min(target.width / source.width, target.height / source.height);
  const dw = source.width * containScale;
  const dh = source.height * containScale;
  ctx.drawImage(stepDown(source, dw, dh), (target.width - dw) / 2, (target.height - dh) / 2, dw, dh);
  return canvas;
}

/**
 * Renders the poster layout node and fits it onto the export size.
 * Why: Safari cannot encode WebP from canvas and silently returns PNG, so the
 * caller must use the returned extension rather than assuming WebP.
 */
export async function exportPosterNode(
  node: HTMLElement,
  layout: PosterSize,
  target: { width: number; height: number } = layout
): Promise<PosterExport> {
  const fontEmbedCSS = await getPosterFontEmbedCss();
  await document.fonts.ready;
  await Promise.all(
    Array.from(node.querySelectorAll('img')).map((img) => img.decode().catch(() => undefined))
  );

  // Upscale the DOM render when the target is larger than the layout so text stays sharp.
  const containScale = Math.min(target.width / layout.width, target.height / layout.height);
  const pixelRatio = Math.min(3, Math.max(1, containScale));

  const rendered = await toCanvas(node, {
    width: layout.width,
    height: layout.height,
    pixelRatio,
    fontEmbedCSS,
    style: { transform: 'none' },
  });

  const isExact = rendered.width === target.width && rendered.height === target.height;
  const canvas = isExact ? rendered : composeOnTarget(rendered, target);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92));
  if (!blob) throw new Error('The browser could not encode the poster image');
  return { blob, extension: blob.type === 'image/webp' ? 'webp' : 'png' };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image could not be read'));
    img.src = src;
  });
}

/**
 * Converts a picked image into a downscaled same-origin data URL.
 * Why: remote/object URLs taint the export canvas, and full-size camera photos make export slow.
 * Transparency is preserved (WebP/PNG) so cut-out hero images stay clean.
 */
export async function imageBlobToPosterDataUrl(blob: Blob): Promise<string> {
  if (!blob.type.startsWith('image/')) throw new Error('Choose a PNG, JPG or WebP image');
  if (blob.size > MAX_HERO_UPLOAD_BYTES) throw new Error('Image must be 10MB or smaller');

  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, MAX_HERO_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image could not be processed');
    ctx.drawImage(img, 0, 0, w, h);
    const webp = canvas.toDataURL('image/webp', 0.9);
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function imageUrlToPosterDataUrl(url: string, signal?: AbortSignal): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, { mode: 'cors', signal });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new Error('That site blocks image downloads. Save the image and upload it instead.');
  }
  if (!res.ok) throw new Error(`Image request failed (${res.status})`);
  return imageBlobToPosterDataUrl(await res.blob());
}

export function posterFileName(
  title: string,
  dateIso: string | null,
  extension: string,
  target?: { width: number; height: number }
): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'poster';
  const dims = target ? `-${target.width}x${target.height}` : '';
  return `codo-${slug}${dateIso ? `-${dateIso}` : ''}${dims}.${extension}`;
}
