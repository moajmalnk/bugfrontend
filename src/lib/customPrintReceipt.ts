import {
  DEFAULT_RECEIPT_STYLE,
  ReceiptWriter,
  type MonoBitmap,
  type ReceiptCopy,
  type ReceiptResult,
  type ReceiptStyle,
} from "@/lib/escposReceipt";

/** Soft cap so a pasted WhatsApp / PDF note still fits a short thermal slip. */
export const CUSTOM_PRINT_MESSAGE_MAX = 4000;

/**
 * Why: Custom print must accept image-only, text-only, or both — e.g. a Canva
 * PNG, a pasted WhatsApp note, or an HQ requirements list without a photo.
 */
export function buildCustomPrintReceipt(options: {
  image?: MonoBitmap | null;
  message?: string | null;
  copy?: ReceiptCopy;
  style?: ReceiptStyle;
}): ReceiptResult {
  const w = new ReceiptWriter(options.style ?? DEFAULT_RECEIPT_STYLE);
  const image = options.image ?? null;
  const message = options.message?.trim() ?? "";

  if (image) {
    w.bitmap(image);
  }

  if (message) {
    if (image) w.line();
    emitMessageBody(w, message);
  }

  if (options.copy && options.copy.total > 1) {
    w.line();
    w.centered(`Copy ${options.copy.index} of ${options.copy.total}`);
  }

  w.cut();
  return w.result();
}

/** @deprecated Prefer buildCustomPrintReceipt — kept for older call sites. */
export function buildCustomImageReceipt(
  image: MonoBitmap,
  options: {
    caption?: string | null;
    copy?: ReceiptCopy;
    style?: ReceiptStyle;
  } = {}
): ReceiptResult {
  return buildCustomPrintReceipt({
    image,
    message: options.caption,
    copy: options.copy,
    style: options.style,
  });
}

/**
 * Why: Pasted messages keep line breaks (lists, WhatsApp lines). toAscii still
 * sanitizes each line for the ESC/POS code page.
 */
function emitMessageBody(w: ReceiptWriter, message: string): void {
  const lines = message.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  let wrote = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      if (wrote) w.line();
      continue;
    }
    w.paragraph(line);
    wrote = true;
  }
}
