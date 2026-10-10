import { encodeCode128 } from "@/lib/code128";
import qrcode from "qrcode-generator";

/** Printable width of a 58mm head: 48mm at 8 dots/mm. */
export const PRINT_DOTS = 384;

const ESC = 0x1b;
const GS = 0x1d;

const NOT_SET = "Not set";

/** Font A is 12×24 dots (32 per line); Font B is 9×17 dots (42 per line). */
export type ReceiptFont = "A" | "B";
/** `tear`: printers without a cutter (e.g. HOP-H58) get a printed tear line instead. */
export type CutMode = "tear" | "full" | "partial";

const CHAR_DOTS: Record<ReceiptFont, number> = { A: 12, B: 9 };

/** Largest shift the layout supports; keeps the logo and 2-dot barcodes printable. */
export const MAX_OFFSET_DOTS = 48;

/** Characters per line once `offsetDots` is taken by leading spaces. */
export const fontColumns = (font: ReceiptFont, offsetDots = 0) =>
  Math.floor(PRINT_DOTS / CHAR_DOTS[font]) - Math.round(offsetDots / CHAR_DOTS[font]);

/** 1-bit image, row-major, MSB = leftmost dot; width is a multiple of 8. */
export type MonoBitmap = {
  width: number;
  height: number;
  rows: Uint8Array;
  previewUrl: string;
};

export type ReceiptStyle = {
  font: ReceiptFont;
  cut: CutMode;
  /** Sent as a raster image with every slip (~4.6KB); works on any printer. */
  logo: MonoBitmap | null;
  /**
   * Dots the whole slip is shifted right. Why: budget heads (e.g. HOP-H58) sit
   * left of the paper's centre, so slips print with a wide right margin.
   */
  offsetDots: number;
};

export const DEFAULT_RECEIPT_STYLE: ReceiptStyle = {
  font: "B",
  cut: "tear",
  logo: null,
  offsetDots: 0,
};

export type PreviewBlock =
  | { type: "text"; lines: string[] }
  | { type: "image"; src: string; widthDots: number; heightDots: number }
  | { type: "qr"; value: string; sizeDots: number; modules: boolean[][] }
  | { type: "barcode"; value: string; bars: string; moduleWidth: number; heightDots: number }
  | { type: "cut"; mode: CutMode };

export type ReceiptCopy = { index: number; total: number };

export type ReceiptResult = {
  bytes: Uint8Array;
  /** Plain-text rendering (graphics shown as [markers]) for tests and logs. */
  preview: string;
  blocks: PreviewBlock[];
  columns: number;
  /** Dots of head width used by the slip (head width minus the offset). */
  areaDots: number;
};

/**
 * Why: Printers default to code page 437, so anything outside printable ASCII
 * would print as garbage. Accents are stripped and common symbols spelled out.
 */
export function toAscii(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/…/g, "...")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/•/g, "*")
    .replace(/₹/g, "Rs ")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7e]/g, "?")
    .trim();
}

export function wrap(value: string, width: number): string[] {
  const words = toAscii(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (let word of words) {
    while (word.length > width) {
      if (current) {
        lines.push(current);
        current = "";
      }
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }
    if (!word) continue;
    if (!current) current = word;
    else if (current.length + 1 + word.length <= width) current += ` ${word}`;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export const center = (text: string, width: number) => {
  const left = Math.max(0, Math.floor((width - text.length) / 2));
  return (" ".repeat(left) + text).padEnd(width);
};

export const isSet = (value?: string | number | null): boolean =>
  value !== null && value !== undefined && String(value).trim() !== "" && value !== NOT_SET;

/** Splits `total` across columns by weight so the integer widths sum exactly. */
function distribute(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const exact = weights.map((w) => (w * total) / sum);
  const widths = exact.map(Math.floor);
  let remainder = total - widths.reduce((a, b) => a + b, 0);
  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);
  for (let i = 0; remainder > 0; i = (i + 1) % order.length, remainder--) {
    widths[order[i].index]++;
  }
  return widths;
}

/** Builds ESC/POS bytes plus a block preview that mirrors what will print. */
export class ReceiptWriter {
  readonly width: number;
  private readonly labelWidth: number;
  private readonly style: ReceiptStyle;
  /** Left shift (dots) and usable width of the head after the offset. */
  private readonly offset: number;
  private readonly area: number;
  /** Spaces printed before every text line to apply the offset. */
  private readonly indent: number;
  private atLineStart = true;
  private doubleWidth = false;
  private bytes: number[] = [];
  private blocks: PreviewBlock[] = [];
  private textLines: string[] = [];

  /**
   * Why no GS L / GS W margins: the HOP-H58 mis-parses them, and the raster
   * image that follows then prints as random characters. The offset is applied
   * with leading spaces for text and by positioning content inside images.
   */
  constructor(style: ReceiptStyle = DEFAULT_RECEIPT_STYLE) {
    this.style = style;
    this.offset = Math.max(0, Math.min(MAX_OFFSET_DOTS, Math.round(style.offsetDots ?? 0)));
    this.area = PRINT_DOTS - this.offset;
    const charDots = CHAR_DOTS[style.font];
    this.indent = Math.round(this.offset / charDots);
    this.width = fontColumns(style.font, this.offset);
    this.labelWidth = style.font === "B" ? 12 : 11;
    // Reset, code page PC437, chosen font, left alignment.
    this.raw(ESC, 0x40, ESC, 0x74, 0x00, ESC, 0x4d, style.font === "B" ? 1 : 0, ESC, 0x61, 0);
  }

  private raw(...codes: number[]) {
    for (const code of codes) this.bytes.push(code);
  }

  private write(text: string) {
    if (!text) return;
    if (this.atLineStart) {
      // Double-width spaces cover two columns each.
      const pad = this.doubleWidth ? Math.round(this.indent / 2) : this.indent;
      for (let i = 0; i < pad; i++) this.bytes.push(0x20);
      this.atLineStart = false;
    }
    for (const ch of text) this.bytes.push(ch.charCodeAt(0));
  }

  private newline() {
    this.bytes.push(0x0a);
    this.atLineStart = true;
  }

  private flushText() {
    if (this.textLines.length) {
      this.blocks.push({ type: "text", lines: this.textLines });
      this.textLines = [];
    }
  }

  private block(block: PreviewBlock) {
    this.flushText();
    this.blocks.push(block);
  }

  /** Dot where content `widthDots` wide starts so it sits mid-slip. */
  private centreStart(widthDots: number) {
    return this.offset + Math.floor((this.area - widthDots) / 2);
  }

  /**
   * Prints a full-head (384-dot) GS v 0 raster whose content is already
   * positioned, so centring needs no margin or alignment command.
   */
  private fullWidthRaster(height: number, rows: Iterable<number>) {
    if (!this.atLineStart) this.newline();
    const bytesPerRow = PRINT_DOTS / 8;
    this.raw(GS, 0x76, 0x30, 0, bytesPerRow, 0, height & 0xff, height >> 8);
    for (const b of rows) this.bytes.push(b);
  }

  /** `previewText` lets double-width lines show at their on-paper position. */
  line(text = "", previewText = text) {
    this.write(text);
    this.newline();
    this.textLines.push(previewText);
  }

  bold(on: boolean) {
    this.raw(ESC, 0x45, on ? 1 : 0);
  }

  /** GS ! n — 0x00 normal, 0x01 double height, 0x11 double width + height. */
  size(n: number) {
    this.raw(GS, 0x21, n);
    this.doubleWidth = (n & 0xf0) !== 0;
  }

  boldLine(text: string) {
    this.bold(true);
    this.line(text);
    this.bold(false);
  }

  paragraph(text: string) {
    wrap(text, this.width).forEach((l) => this.line(l));
  }

  /** Centred by space padding so it lands mid-paper on any firmware. */
  centered(text: string, options: { bold?: boolean } = {}) {
    if (options.bold) this.bold(true);
    wrap(text, this.width).forEach((l) => this.line(center(l, this.width).trimEnd()));
    if (options.bold) this.bold(false);
  }

  rule(char = "-") {
    this.line(char.repeat(this.width));
  }

  /** Text wordmark used when no logo bitmap is available. */
  brand(text: string) {
    const ascii = toAscii(text).toUpperCase();
    // Double-width glyphs take two columns, so pad within half the line.
    const padded = center(ascii, Math.floor(this.width / 2)).trimEnd();
    this.size(0x11);
    this.bold(true);
    this.line(padded, center(ascii.split("").join(" "), this.width).trimEnd());
    this.bold(false);
    this.size(0x00);
  }

  /** Centred logo as a raster image (GS v 0). */
  header(fallbackText: string) {
    const logo = this.style.logo;
    if (!logo) {
      this.brand(fallbackText);
      return;
    }
    const { width, height, rows, previewUrl } = logo;
    this.fullWidthRaster(height, placeRows(rows, width, this.centreStart(width)));
    this.block({ type: "image", src: previewUrl, widthDots: width, heightDots: height });
  }

  /** Centred, bold, double-height title such as a project or employee name. */
  title(text: string) {
    this.size(0x01);
    this.bold(true);
    wrap(text, this.width).forEach((l) => this.line(center(l, this.width).trimEnd()));
    this.bold(false);
    this.size(0x00);
  }

  /** Spaced, bold heading with a thin rule, so sections read like a statement. */
  section(title: string) {
    this.line();
    this.boldLine(toAscii(title).toUpperCase());
    this.rule("-");
  }

  /**
   * Label/value row, statement style: values are right-aligned to the paper
   * edge; a value too long for one line wraps inside the value column.
   */
  kv(label: string, value?: string | number | null, options: { boldValue?: boolean } = {}) {
    if (!isSet(value)) return;
    const name = toAscii(label);
    const text = toAscii(value).trim();
    const emit = (head: string, body: string) => {
      this.write(head);
      if (options.boldValue) this.bold(true);
      this.write(body);
      if (options.boldValue) this.bold(false);
      this.newline();
      this.textLines.push(head + body);
    };

    if (name.length + 1 + text.length <= this.width) {
      emit(name.padEnd(this.width - text.length), text);
      return;
    }
    const valueWidth = this.width - this.labelWidth;
    wrap(text, valueWidth).forEach((body, index) =>
      emit(
        (index === 0 ? name : "").padEnd(this.labelWidth) + " ".repeat(valueWidth - body.length),
        body
      )
    );
  }

  /**
   * Borderless table. `weights` are relative column widths scaled to the current
   * font, so one layout fills 32 (Font A) or 42 (Font B) columns.
   * - Default: bold header row with a rule, first column left, numbers right.
   * - `centered`: stat strip (labels row, then bold values) with no rules.
   * - `footer`: rule above the last row, for totals.
   */
  grid(
    weights: number[],
    rows: string[][],
    options: {
      boldRows?: number[];
      centered?: boolean;
      header?: boolean;
      footer?: boolean;
      align?: ("left" | "right" | "center")[];
    } = {}
  ) {
    const { boldRows = [], centered = false, footer = false } = options;
    const header = options.header ?? !centered;
    const widths = distribute(weights, this.width - (weights.length - 1));
    const aligns =
      options.align ?? weights.map((_, i) => (centered ? "center" : i === 0 ? "left" : "right"));
    const fit = (text: string, width: number, align: "left" | "right" | "center") =>
      align === "right"
        ? text.padStart(width)
        : align === "center"
          ? center(text, width)
          : text.padEnd(width);

    rows.forEach((cells, rowIndex) => {
      if (footer && rows.length > 1 && rowIndex === rows.length - 1) this.rule("-");
      const wrapped = cells.map((cell, i) =>
        cell.split("\n").flatMap((part) => wrap(part, widths[i]))
      );
      const height = Math.max(...wrapped.map((c) => c.length));
      const bold = boldRows.includes(rowIndex) || (header && rowIndex === 0);
      for (let r = 0; r < height; r++) {
        const text = wrapped
          .map((cellLines, i) => fit(cellLines[r] ?? "", widths[i], aligns[i]))
          .join(" ")
          .trimEnd();
        if (bold) this.boldLine(text);
        else this.line(text);
      }
      if (header && rowIndex === 0) this.rule("-");
    });
  }

  /**
   * Centred QR code (error level M) sent as a raster image (GS v 0).
   * Why raster: budget firmware such as the HOP-H58 silently skips the native
   * GS ( k QR command, while bitmaps print on every ESC/POS printer.
   * Module size keeps the code ~25mm wide whatever the URL length; the bitmap
   * spans the full head with the code placed at the slip area's centre.
   */
  qr(value: string, caption?: string) {
    const code = qrcode(0, "M");
    code.addData(toAscii(value), "Byte");
    code.make();
    const count = code.getModuleCount();
    const moduleSize = Math.max(3, Math.min(8, Math.floor(200 / count)));
    const sizeDots = count * moduleSize;
    if (sizeDots > this.area) return;

    const modules = Array.from({ length: count }, (_, r) =>
      Array.from({ length: count }, (_, c) => code.isDark(r, c))
    );
    const bytesPerRow = PRINT_DOTS / 8;
    const start = this.centreStart(sizeDots);
    const rows = new Uint8Array(bytesPerRow * sizeDots);
    for (let y = 0; y < sizeDots; y++) {
      const cells = modules[Math.floor(y / moduleSize)];
      for (let x = 0; x < sizeDots; x++) {
        if (!cells[Math.floor(x / moduleSize)]) continue;
        const dot = start + x;
        rows[y * bytesPerRow + (dot >> 3)] |= 0x80 >> (dot & 7);
      }
    }
    this.fullWidthRaster(sizeDots, rows);
    this.block({ type: "qr", value, sizeDots, modules });
    if (caption) this.centered(caption);
  }

  /**
   * Centred CODE128 barcode drawn as a raster image, with the value as text
   * underneath. Why raster: positioning GS k 73 needs a margin command this
   * firmware mis-parses. Bars thinner than 2 dots scan poorly on 203dpi
   * thermal paper, so a value too long for 2-dot bars falls back to text.
   */
  barcode(value: string) {
    const code = encodeCode128(toAscii(value));
    const moduleWidth = code ? Math.min(3, Math.floor(this.area / code.modules)) : 0;
    if (!code || moduleWidth < 2) {
      this.centered(value);
      return;
    }
    const heightDots = 64;
    const bytesPerRow = PRINT_DOTS / 8;
    const start = this.centreStart(code.modules * moduleWidth);
    const row = new Uint8Array(bytesPerRow);
    for (let m = 0; m < code.modules; m++) {
      if (code.bars[m] !== "1") continue;
      for (let d = 0; d < moduleWidth; d++) {
        const dot = start + m * moduleWidth + d;
        row[dot >> 3] |= 0x80 >> (dot & 7);
      }
    }
    const rows = new Uint8Array(bytesPerRow * heightDots);
    for (let y = 0; y < heightDots; y++) rows.set(row, y * bytesPerRow);
    this.fullWidthRaster(heightDots, rows);
    this.block({ type: "barcode", value: toAscii(value), bars: code.bars, moduleWidth, heightDots });
    this.flushText();
    this.write(center(toAscii(value), this.width).trimEnd());
    this.newline();
  }

  /** Blank line with a ruled space for a handwritten signature. */
  signature(label: string) {
    this.line();
    this.line(toAscii(label));
    this.line();
    this.line(" ".repeat(10) + "_".repeat(this.width - 10));
  }

  feed(lines: number) {
    this.raw(ESC, 0x64, lines);
  }

  /**
   * Ends the slip so every copy separates cleanly.
   * - tear: prints a "tear here" line, then feeds it up to the tear bar.
   * - full / partial: GS V 0 / GS V 1 on printers with an auto-cutter.
   *
   * Why the feeds: the tear bar / blade sits ~12–15mm above the print head,
   * so the last printed line must travel that far before the paper separates.
   */
  cut() {
    if (this.style.cut === "tear") {
      this.feed(2);
      const label = " TEAR HERE ";
      const side = Math.max(0, this.width - label.length);
      const dashes = (n: number) => "- ".repeat(Math.ceil(n / 2)).slice(0, n);
      this.write(dashes(Math.floor(side / 2)) + label + dashes(Math.ceil(side / 2)));
      this.newline();
      this.feed(3);
    } else {
      this.feed(5);
      this.raw(GS, 0x56, this.style.cut === "partial" ? 1 : 0);
    }
    this.block({ type: "cut", mode: this.style.cut });
  }

  result(): ReceiptResult {
    this.flushText();
    const preview = this.blocks
      .map((b) => {
        switch (b.type) {
          case "text":
            return b.lines.join("\n");
          case "image":
            return center("[LOGO]", this.width).trimEnd();
          case "qr":
            return center(`[QR ${b.value}]`, this.width).trimEnd();
          case "barcode":
            return center(`[||| ${b.value} |||]`, this.width).trimEnd();
          case "cut":
            return b.mode === "tear" ? "- - - tear here - - -" : `- - - ${b.mode} cut - - -`;
        }
      })
      .join("\n");
    return {
      bytes: Uint8Array.from(this.bytes),
      preview,
      blocks: this.blocks,
      columns: this.width,
      areaDots: this.area,
    };
  }
}

/** Copies a 1-bit bitmap into full-head (384-dot) rows, starting at dot `start`. */
function placeRows(rows: Uint8Array, width: number, start: number): Uint8Array {
  const srcBytes = width / 8;
  const height = rows.length / srcBytes;
  const outBytes = PRINT_DOTS / 8;
  const out = new Uint8Array(outBytes * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!(rows[y * srcBytes + (x >> 3)] & (0x80 >> (x & 7)))) continue;
      const dot = start + x;
      if (dot < 0 || dot >= PRINT_DOTS) continue;
      out[y * outBytes + (dot >> 3)] |= 0x80 >> (dot & 7);
    }
  }
  return out;
}

/**
 * Why: Stable, human-readable reference written on every slip so a printed
 * record can be matched back to its source and print time on a desk/file.
 */
export function receiptReference(prefix: string, id: string, at: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${String(at.getFullYear()).slice(2)}${pad(at.getMonth() + 1)}${pad(
    at.getDate()
  )}-${pad(at.getHours())}${pad(at.getMinutes())}`;
  const shortId = id.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${prefix}-${shortId}-${stamp}`;
}

/** Barcode payload for a reference: dashes dropped so digit runs pack densely. */
export const referenceBarcode = (reference: string) => reference.replace(/-/g, "");

/**
 * Why: QR codes must open on a phone; a localhost/LAN origin from a dev
 * machine would be unreachable, so those fall back to the production app.
 */
export function publicAppOrigin(): string {
  const { hostname, origin } = window.location;
  const isLocal =
    hostname === "localhost" ||
    hostname === "::1" ||
    /^127\./.test(hostname) ||
    /^(10|192\.168)\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  return isLocal ? "https://bugs.bugricer.com" : origin;
}

export function formatPrintedAt(at: Date): string {
  return at.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
