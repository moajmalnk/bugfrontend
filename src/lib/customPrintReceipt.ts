import {
  DEFAULT_RECEIPT_STYLE,
  fontColumns,
  ReceiptWriter,
  wrap,
  type MonoBitmap,
  type ReceiptCopy,
  type ReceiptResult,
  type ReceiptStyle,
} from "@/lib/escposReceipt";

/** Soft cap for pasted WhatsApp / PDF / HQ notes on a thermal slip. */
export const CUSTOM_PRINT_MESSAGE_MAX = 10000;

/** Why: Font B on 58mm is the default slip width — preview must match print. */
export function customPrintColumns(style?: ReceiptStyle): number {
  const resolved = style ?? DEFAULT_RECEIPT_STYLE;
  return fontColumns(resolved.font, resolved.offsetDots ?? 0);
}

/**
 * Why: PDF / Preview copy inserts hard breaks mid-word ("HQ DA\\nSHBO").
 * Join soft wraps, keep blank lines as paragraph breaks, then thermal wrap fits
 * the slip from top to bottom at the real column width.
 */
export function normalizeCustomPrintMessage(raw: string): string {
  const normalized = String(raw ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
  if (!normalized) return "";

  return normalized
    .split(/\n{2,}/)
    .map((para) => {
      const parts = para
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (parts.length === 0) return "";
      let joined = parts[0];
      for (let i = 1; i < parts.length; i++) {
        const prev = parts[i - 1];
        const next = parts[i];
        const prevEndsWord = /[A-Za-z0-9)]$/.test(prev);
        const nextStartsWord = /^[A-Za-z0-9(]/.test(next);
        // Mid-word PDF wrap: "MANA" + "GER" → "MANAGER" (no space).
        if (prevEndsWord && nextStartsWord && !/[.!?:;]$/.test(prev)) {
          const prevShort = prev.length <= 12;
          const nextShort = next.length <= 12;
          const looksBroken =
            (prevShort && nextShort) ||
            (/[a-z]$/.test(prev) && /^[a-z]/.test(next)) ||
            (/[A-Z]{2,}$/.test(prev) && /^[A-Z]{2,}/.test(next));
          joined += looksBroken ? next : ` ${next}`;
        } else {
          joined += ` ${next}`;
        }
      }
      return joined.replace(/\s+/g, " ").trim();
    })
    .filter(Boolean)
    .join("\n\n")
    .slice(0, CUSTOM_PRINT_MESSAGE_MAX);
}

/**
 * Why: Screen preview must show the same line breaks the HOP-H58 will print.
 */
export function formatCustomPrintPreview(
  message: string,
  style?: ReceiptStyle
): string {
  const cleaned = normalizeCustomPrintMessage(message);
  if (!cleaned) return "";
  const cols = customPrintColumns(style);
  const out: string[] = [];
  for (const para of cleaned.split("\n")) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    out.push(...wrap(para, cols));
  }
  return out.join("\n");
}

/**
 * Why: Custom print must accept image-only, text-only, or both — e.g. a Canva
 * PNG, a pasted WhatsApp note, or an HQ requirements list without a photo.
 * Malayalam / Unicode must arrive as messageRaster (GS v 0); ESC/POS text
 * would print as "?".
 */
export function buildCustomPrintReceipt(options: {
  image?: MonoBitmap | null;
  message?: string | null;
  /** Pre-rendered Unicode/Malayalam slip body (preferred over ESC/POS text). */
  messageRaster?: MonoBitmap | null;
  copy?: ReceiptCopy;
  style?: ReceiptStyle;
}): ReceiptResult {
  const w = new ReceiptWriter(options.style ?? DEFAULT_RECEIPT_STYLE);
  const image = options.image ?? null;
  const messageRaster = options.messageRaster ?? null;
  const message = normalizeCustomPrintMessage(options.message ?? "");

  if (image) {
    w.bitmap(image);
  }

  if (messageRaster) {
    if (image) w.line();
    w.bitmap(messageRaster);
  } else if (message) {
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
 * Why: After normalize, each paragraph is one logical line; ReceiptWriter.wrap
 * fits them to the 58mm column width top-to-bottom.
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
