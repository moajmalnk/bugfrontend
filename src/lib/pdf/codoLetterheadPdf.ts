/**
 * Shared CODO letterhead helpers for jsPDF exports (attendance, HR certificates).
 *
 * Why: Official logo lockup, navy/green brand rule, and footer contact line must
 * stay identical across printable CODO documents without duplicating canvas logic.
 */

export const CODO_NAVY: [number, number, number] = [15, 35, 66];
export const CODO_GREEN: [number, number, number] = [23, 169, 90];
export const CODO_MUTED: [number, number, number] = [100, 116, 139];
export const CODO_LINE: [number, number, number] = [226, 232, 240];
export const CODO_SOFT: [number, number, number] = [248, 250, 252];

export const CODO_HR_ADDRESS =
  "2nd Floor, Paravath Arcade | Opp. Budget Hypermarket, Varangode | Private Bus Stand, Down Hill, Malappuram, Kerala – 676519";
export const CODO_HR_CONTACT = "+91 80869 95559 | hr@codoai.in";
export const CODO_INTERNAL_CONTACT =
  "CODO AI Innovations  ·  +91 8086 995 559  ·  info@codoai.in  ·  www.codoai.in";

export type CodoPdfDoc = {
  setFillColor: (...args: number[]) => unknown;
  setDrawColor: (...args: number[]) => unknown;
  setTextColor: (...args: number[]) => unknown;
  setFont: (face: string, style?: string) => unknown;
  setFontSize: (size: number) => unknown;
  setLineWidth: (w: number) => unknown;
  text: (
    text: string | string[],
    x: number,
    y: number,
    options?: { align?: "left" | "center" | "right"; maxWidth?: number }
  ) => unknown;
  rect: (
    x: number,
    y: number,
    w: number,
    h: number,
    style?: string
  ) => unknown;
  roundedRect: (
    x: number,
    y: number,
    w: number,
    h: number,
    rx: number,
    ry: number,
    style?: string
  ) => unknown;
  circle: (x: number, y: number, r: number, style?: string) => unknown;
  line: (x1: number, y1: number, x2: number, y2: number) => unknown;
  addImage: (
    data: string,
    format: string,
    x: number,
    y: number,
    w: number,
    h: number,
    alias?: string,
    compression?: string
  ) => unknown;
  getTextWidth: (text: string) => number;
  splitTextToSize: (text: string, size: number) => string[];
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
  getNumberOfPages: () => number;
  setPage: (n: number) => unknown;
  save: (name: string) => unknown;
};

const CODO_LOGO_SRC = `${typeof window !== "undefined" ? window.location.origin : ""}/posters/codo-logo-full.png`;

/**
 * Why: Official CODO lockup for PDFs. Downscales the large public asset so
 * jsPDF stays fast while keeping crisp print quality.
 */
export async function loadCodoOfficialLogoPng(
  maxWidthPx = 1200
): Promise<{ dataUrl: string; aspect: number } | null> {
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = CODO_LOGO_SRC;
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight) return null;

    const aspect = img.naturalWidth / img.naturalHeight;
    const widthPx = Math.min(maxWidthPx, img.naturalWidth);
    const heightPx = Math.max(1, Math.round(widthPx / aspect));
    const canvas = document.createElement("canvas");
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, widthPx, heightPx);
    return { dataUrl: canvas.toDataURL("image/png"), aspect };
  } catch {
    return null;
  }
}

export function drawCodoBrandRule(
  doc: CodoPdfDoc,
  x: number,
  y: number,
  width: number,
  thickness = 2.5
) {
  const navyW = width * 0.82;
  doc.setFillColor(...CODO_NAVY);
  doc.rect(x, y, navyW, thickness, "F");
  doc.setFillColor(...CODO_GREEN);
  doc.rect(x + navyW, y, width - navyW, thickness, "F");
}

export function drawCodoTopAccent(doc: CodoPdfDoc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...CODO_NAVY);
  doc.rect(0, 0, pageWidth * 0.85, 4, "F");
  doc.setFillColor(...CODO_GREEN);
  doc.rect(pageWidth * 0.85, 0, pageWidth * 0.15, 4, "F");
}

export type CodoLogoBlockResult = {
  brandBlockH: number;
  marginX: number;
  contentWidth: number;
  pageWidth: number;
  brandY: number;
};

/**
 * Draws top accent + official logo (or wordmark fallback).
 * Returns layout metrics for the rest of the page.
 */
export async function drawCodoLogoBlock(
  doc: CodoPdfDoc,
  options?: { marginX?: number; logoHeight?: number; brandY?: number }
): Promise<CodoLogoBlockResult> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = options?.marginX ?? 48;
  const contentWidth = pageWidth - marginX * 2;
  const brandY = options?.brandY ?? 22;
  const logoHeight = options?.logoHeight ?? 36;

  drawCodoTopAccent(doc);

  const logo = await loadCodoOfficialLogoPng(1400);
  let brandBlockH = logoHeight;

  if (logo) {
    const logoWidth = Math.min(150, logoHeight * logo.aspect);
    doc.addImage(
      logo.dataUrl,
      "PNG",
      marginX,
      brandY,
      logoWidth,
      logoHeight,
      undefined,
      "FAST"
    );
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...CODO_NAVY);
    doc.text("COD", marginX, brandY + 18);
    const codW = doc.getTextWidth("COD");
    doc.setTextColor(...CODO_GREEN);
    doc.text("O", marginX + codW, brandY + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...CODO_MUTED);
    doc.text("AI Innovations", marginX, brandY + 30);
    brandBlockH = 34;
  }

  return { brandBlockH, marginX, contentWidth, pageWidth, brandY };
}

export function drawCodoInternalFooter(
  doc: CodoPdfDoc,
  page: number,
  pageCount: number,
  options?: { marginX?: number; contactLine?: string }
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = options?.marginX ?? 32;
  const contentWidth = pageWidth - marginX * 2;
  const footerY = pageHeight - 30;

  drawCodoBrandRule(doc, marginX, footerY - 12, contentWidth, 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...CODO_MUTED);
  doc.text(options?.contactLine ?? CODO_INTERNAL_CONTACT, pageWidth / 2, footerY, {
    align: "center",
  });
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Page ${page} of ${pageCount}  ·  Internal`, pageWidth / 2, footerY + 11, {
    align: "center",
  });
}

export function drawCodoHrFooter(
  doc: CodoPdfDoc,
  options?: { marginX?: number }
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = options?.marginX ?? 48;
  const contentWidth = pageWidth - marginX * 2;
  const footerY = pageHeight - 42;

  drawCodoBrandRule(doc, marginX, footerY - 10, contentWidth, 2.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...CODO_MUTED);
  doc.text(`CODO AI Innovations | ${CODO_HR_ADDRESS}`, pageWidth / 2, footerY + 4, {
    align: "center",
    maxWidth: contentWidth,
  });
  doc.setFontSize(7.5);
  doc.setTextColor(...CODO_NAVY);
  doc.text(CODO_HR_CONTACT, pageWidth / 2, footerY + 16, {
    align: "center",
  });
}

function formatLeaveChip(days: number, hours: number): string {
  const d = Math.max(0, Math.round(days));
  const h = Math.max(0, Math.round(hours * 10) / 10);
  if (d <= 0 && h <= 0) return "0d";
  if (d > 0 && h > 0 && Math.abs(h - d * 8) > 0.05) {
    return `${d}d · ${Number.isInteger(h) ? h : h.toFixed(1)}h`;
  }
  if (d > 0) return `${d}d`;
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
}

/**
 * Why: Drawn CODO letterhead model for attendance PDFs — official logo lockup,
 * structured meta card, brand rule.
 */
export async function drawCodoAttendanceLetterhead(
  doc: CodoPdfDoc,
  meta: {
    periodLabel: string;
    rosterCount: number;
    trackedCount: number;
    totalHours: number;
    tasksCompleted: number;
    bugsReported: number;
    bugsFixed: number;
    retests: number;
    updates: number;
    personalLeaveDays: number;
    personalLeaveHours: number;
    officialLeaveDays: number;
    officialLeaveHours: number;
    lastUpdated: string;
  }
): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 32;
  const contentWidth = pageWidth - marginX * 2;

  drawCodoTopAccent(doc);

  const brandY = 16;
  const logoHeight = 38;
  const logo = await loadCodoOfficialLogoPng(1400);
  let brandBlockH = logoHeight;

  if (logo) {
    const logoWidth = Math.min(160, logoHeight * logo.aspect);
    doc.addImage(
      logo.dataUrl,
      "PNG",
      marginX,
      brandY,
      logoWidth,
      logoHeight,
      undefined,
      "FAST"
    );
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...CODO_NAVY);
    doc.text("COD", marginX, brandY + 18);
    const codW = doc.getTextWidth("COD");
    doc.setTextColor(...CODO_GREEN);
    doc.text("O", marginX + codW, brandY + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...CODO_MUTED);
    doc.text("AI Innovations", marginX, brandY + 30);
    brandBlockH = 34;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...CODO_NAVY);
  doc.text("INTERNAL DOCUMENT", pageWidth - marginX, brandY + 14, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...CODO_MUTED);
  doc.text("Attendance report", pageWidth - marginX, brandY + 26, {
    align: "right",
  });

  drawCodoBrandRule(doc, marginX, brandY + brandBlockH + 10, contentWidth, 2);

  const cardY = brandY + brandBlockH + 20;
  const cardH = 128;
  doc.setFillColor(...CODO_SOFT);
  doc.setDrawColor(...CODO_LINE);
  doc.setLineWidth(0.6);
  doc.roundedRect(marginX, cardY, contentWidth, cardH, 10, 10, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...CODO_NAVY);
  doc.text("Team Attendance", marginX + 14, cardY + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...CODO_MUTED);
  doc.text(meta.periodLabel, pageWidth - marginX - 14, cardY + 16, {
    align: "right",
  });

  const chipRows: Array<Array<{ label: string; value: string }>> = [
    [
      {
        label: "Checked in",
        value: `${meta.rosterCount}/${meta.trackedCount}`,
      },
      {
        label: "Credited hours",
        value: `${Math.round(meta.totalHours).toLocaleString()}h`,
      },
      {
        label: "Personal leave",
        value: formatLeaveChip(meta.personalLeaveDays, meta.personalLeaveHours),
      },
      {
        label: "Official leave",
        value: formatLeaveChip(meta.officialLeaveDays, meta.officialLeaveHours),
      },
    ],
    [
      { label: "Tasks", value: String(meta.tasksCompleted) },
      { label: "Bugs", value: String(meta.bugsReported) },
      { label: "Fixes", value: String(meta.bugsFixed) },
      { label: "Retests", value: String(meta.retests) },
      { label: "Updates", value: String(meta.updates) },
    ],
  ];

  const chipH = 22;
  const chipGap = 8;
  chipRows.forEach((chips, rowIndex) => {
    const chipY = cardY + 28 + rowIndex * (chipH + 8);
    const chipW =
      (contentWidth - 28 - chipGap * (chips.length - 1)) / chips.length;
    chips.forEach((chip, i) => {
      const x = marginX + 14 + i * (chipW + chipGap);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...CODO_LINE);
      doc.roundedRect(x, chipY, chipW, chipH, 6, 6, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...CODO_NAVY);
      doc.text(chip.value, x + 7, chipY + 14);
      const valueW = doc.getTextWidth(chip.value);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...CODO_MUTED);
      doc.text(chip.label, x + 7 + valueW + 4, chipY + 14);
    });
  });

  if (meta.lastUpdated) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...CODO_MUTED);
    doc.text(`Generated ${meta.lastUpdated}`, marginX + 14, cardY + cardH - 8);
  }

  return cardY + cardH + 10;
}

export function drawCodoAttendanceFooter(
  doc: CodoPdfDoc,
  page: number,
  pageCount: number
) {
  drawCodoInternalFooter(doc, page, pageCount, { marginX: 32 });
}
