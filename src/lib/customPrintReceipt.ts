import {
  DEFAULT_RECEIPT_STYLE,
  ReceiptWriter,
  type MonoBitmap,
  type ReceiptCopy,
  type ReceiptResult,
  type ReceiptStyle,
} from "@/lib/escposReceipt";

/**
 * Builds a one-off thermal slip from a dithered image (e.g. Canva PNG) plus an
 * optional caption. Uses ESC/POS raster so the HOP-H58 does not print PostScript.
 */
export function buildCustomImageReceipt(
  image: MonoBitmap,
  options: {
    caption?: string | null;
    copy?: ReceiptCopy;
    style?: ReceiptStyle;
  } = {}
): ReceiptResult {
  const w = new ReceiptWriter(options.style ?? DEFAULT_RECEIPT_STYLE);
  w.bitmap(image);

  const caption = options.caption?.trim();
  if (caption) {
    w.line();
    w.centered(caption);
  }

  if (options.copy && options.copy.total > 1) {
    w.line();
    w.centered(`Copy ${options.copy.index} of ${options.copy.total}`);
  }

  w.cut();
  return w.result();
}
