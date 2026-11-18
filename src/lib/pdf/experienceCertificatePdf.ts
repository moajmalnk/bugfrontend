/**
 * Experience Certificate PDF — matches CODO HR letterhead samples.
 *
 * Layout: wave header · logo + Reference/Date · title · bold intro ·
 * assessment · Technologies (bold categories) · Key Responsibilities ·
 * closing with bold name · HR + seal + signature · navy/green footer.
 */

import {
  CODO_GREEN,
  CODO_MUTED,
  CODO_NAVY,
  type CodoPdfDoc,
  drawCodoBrandRule,
  loadCodoOfficialLogoPng,
} from "@/lib/pdf/codoLetterheadPdf";

export type ExperienceCertificatePayload = {
  fullName: string;
  salutation: "Mr" | "Ms" | "Mx";
  designation: string;
  employmentType: string;
  startDate: string;
  endDate: string;
  referenceNo: string;
  certificateDate: string;
  assessment: string;
  technologies: string;
  responsibilities: string;
};

const MARGIN_X = 54;
const LINE_BODY = 15;
const LINE_BULLET = 13.5;
const BODY_SIZE = 11;
const BULLET_SIZE = 10.5;
const INK: [number, number, number] = [17, 24, 39];

function plainText(value: string, max = 2000): string {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, max);
}

function linesFromMultiline(value: string): string[] {
  return plainText(value, 8000)
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function formatDisplayDate(isoOrLabel: string): string {
  const raw = plainText(isoOrLabel, 40);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      const day = d.getDate();
      const suffix =
        day % 10 === 1 && day !== 11
          ? "st"
          : day % 10 === 2 && day !== 12
            ? "nd"
            : day % 10 === 3 && day !== 13
              ? "rd"
              : "th";
      const month = d.toLocaleDateString("en-GB", { month: "long" });
      return `${day}${suffix} ${month} ${d.getFullYear()}`;
    }
  }
  return raw;
}

function formatFileStamp(isoOrLabel: string): string {
  const raw = plainText(isoOrLabel, 40);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.replace(/-/g, "");
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function safeFilenamePart(name: string): string {
  return (
    plainText(name, 80)
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 60) || "Employee"
  );
}

type RichSeg = { text: string; bold?: boolean };

function drawRichParagraph(
  doc: CodoPdfDoc,
  segments: RichSeg[],
  x: number,
  y: number,
  maxWidth: number,
  lineH: number,
  fontSize: number
): number {
  let cursorX = x;
  let cursorY = y;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  const spaceW = doc.getTextWidth(" ");

  const words: Array<{ word: string; bold: boolean }> = [];
  for (const seg of segments) {
    for (const part of seg.text.split(/(\s+)/)) {
      if (!part) continue;
      words.push({
        word: /^\s+$/.test(part) ? " " : part,
        bold: !!seg.bold,
      });
    }
  }

  for (const item of words) {
    if (item.word === " ") {
      if (cursorX + spaceW > x + maxWidth) {
        cursorX = x;
        cursorY += lineH;
      } else if (cursorX > x) {
        cursorX += spaceW;
      }
      continue;
    }
    doc.setFont("helvetica", item.bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(...INK);
    const w = doc.getTextWidth(item.word);
    if (cursorX > x && cursorX + w > x + maxWidth) {
      cursorX = x;
      cursorY += lineH;
    }
    doc.text(item.word, cursorX, cursorY);
    cursorX += w;
  }
  return cursorY + lineH;
}

/** Category: rest — bold label, regular tools (CODO sample style). */
function drawCategoryLine(
  doc: CodoPdfDoc,
  line: string,
  x: number,
  y: number,
  maxWidth: number,
  lineH: number
): number {
  const idx = line.indexOf(":");
  if (idx === -1) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(BULLET_SIZE);
    doc.setTextColor(...INK);
    const wrapped = doc.splitTextToSize(line, maxWidth);
    doc.text(wrapped, x, y);
    return y + wrapped.length * lineH;
  }

  const label = `${line.slice(0, idx + 1)} `;
  const rest = line.slice(idx + 1).trim();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(BULLET_SIZE);
  doc.setTextColor(...INK);
  const labelW = doc.getTextWidth(label);
  doc.text(label.trimEnd(), x, y);

  doc.setFont("helvetica", "normal");
  if (!rest) return y + lineH;

  const firstMax = Math.max(48, maxWidth - labelW);
  const firstLines = doc.splitTextToSize(rest, firstMax);
  doc.text(firstLines[0], x + labelW, y);
  let nextY = y + lineH;

  if (firstLines.length > 1) {
    const leftover = firstLines.slice(1).join(" ").trim();
    if (leftover) {
      const more = doc.splitTextToSize(leftover, maxWidth);
      doc.text(more, x, nextY);
      nextY += more.length * lineH;
    }
  }
  return nextY;
}

function drawTopWaves(doc: CodoPdfDoc, pageWidth: number) {
  doc.setDrawColor(...CODO_NAVY);
  doc.setLineWidth(0.55);
  const rows = 3;
  for (let r = 0; r < rows; r++) {
    const baseY = 10 + r * 5;
    let x = 8;
    while (x < pageWidth - 8) {
      const amp = 2.2;
      const w = 14;
      doc.line(x, baseY, x + w / 2, baseY + amp);
      doc.line(x + w / 2, baseY + amp, x + w, baseY);
      x += w;
    }
  }
}

function drawWordmark(doc: CodoPdfDoc, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...CODO_NAVY);
  doc.text("COD", x, y);
  const codW = doc.getTextWidth("COD");
  doc.setTextColor(...CODO_GREEN);
  doc.text("O", x + codW, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...CODO_NAVY);
  doc.text("AI Innovations", x, y + 12);
}

async function drawLetterhead(
  doc: CodoPdfDoc,
  opts: { referenceNo: string; certDateLabel: string }
): Promise<{ contentTop: number; pageWidth: number; contentWidth: number }> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN_X * 2;

  drawTopWaves(doc, pageWidth);

  const brandY = 28;
  const logoH = 34;
  const logo = await loadCodoOfficialLogoPng(1400);
  let brandH = logoH;

  if (logo) {
    const logoW = Math.min(148, logoH * logo.aspect);
    doc.addImage(
      logo.dataUrl,
      "PNG",
      MARGIN_X,
      brandY,
      logoW,
      logoH,
      undefined,
      "FAST"
    );
  } else {
    drawWordmark(doc, MARGIN_X, brandY + 16);
    brandH = 30;
  }

  const metaTop = brandY + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...CODO_NAVY);
  doc.text(`Reference No: ${opts.referenceNo}`, pageWidth - MARGIN_X, metaTop, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(`Date: ${opts.certDateLabel}`, pageWidth - MARGIN_X, metaTop + 14, {
    align: "right",
  });

  return {
    contentTop: brandY + brandH + 28,
    pageWidth,
    contentWidth,
  };
}

function drawCircularSeal(doc: CodoPdfDoc, cx: number, cy: number, radius: number) {
  doc.setDrawColor(...CODO_NAVY);
  doc.setLineWidth(1.8);
  doc.circle(cx, cy, radius, "S");
  doc.setLineWidth(0.75);
  doc.circle(cx, cy, radius - 5.5, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.setTextColor(...CODO_NAVY);
  doc.text("CODO AI INNOVATIONS", cx, cy - radius + 10, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.6);
  doc.setTextColor(...CODO_MUTED);
  doc.text("MALAPPURAM, KERALA", cx, cy + radius - 8, { align: "center" });

  const s = 4.4;
  doc.setFillColor(...CODO_NAVY);
  doc.roundedRect(cx - s - 1.2, cy - s - 1.2, s, s, 1.2, 1.2, "F");
  doc.setFillColor(...CODO_GREEN);
  doc.roundedRect(cx + 1.2, cy - s - 1.2, s, s, 1.2, 1.2, "F");
  doc.setFillColor(...CODO_GREEN);
  doc.roundedRect(cx - s - 1.2, cy + 1.2, s, s, 1.2, 1.2, "F");
  doc.setFillColor(...CODO_NAVY);
  doc.roundedRect(cx + 1.2, cy + 1.2, s, s, 1.2, 1.2, "F");
}

/** Approximate ink signature flourish (reference-style). */
function drawInkSignature(doc: CodoPdfDoc, x: number, y: number) {
  const anyDoc = doc as CodoPdfDoc & {
    setLineCap?: (c: string) => void;
    lines?: (
      lines: number[][],
      x: number,
      y: number,
      scale?: [number, number],
      style?: string,
      closed?: boolean
    ) => unknown;
  };
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(1.15);
  if (typeof anyDoc.setLineCap === "function") {
    anyDoc.setLineCap("round");
  }

  // Primary stroke
  const strokes: Array<[number, number, number, number, number, number]> = [
    [x, y + 8, x + 12, y - 18, x + 28, y + 10],
    [x + 18, y - 6, x + 36, y - 22, x + 52, y + 4],
    [x + 40, y - 2, x + 58, y + 14, x + 72, y - 8],
    [x + 8, y + 12, x + 30, y + 18, x + 55, y + 8],
  ];
  for (const [x1, y1, cx, cy, x2, y2] of strokes) {
    // Approximate cubic with two segments
    doc.line(x1, y1, cx, cy);
    doc.line(cx, cy, x2, y2);
  }
}

function drawSignatureBlock(
  doc: CodoPdfDoc,
  opts: { marginX: number; contentWidth: number; pageWidth: number; y: number }
) {
  const { marginX, contentWidth, pageWidth, y } = opts;
  const sealR = 32;
  const sealCx = pageWidth / 2;
  const sealCy = y + sealR;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...CODO_NAVY);
  doc.text("HR Manager,", marginX, sealCy - 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text("CODO AI Innovations", marginX, sealCy + 10);

  drawCircularSeal(doc, sealCx, sealCy, sealR);
  drawInkSignature(doc, pageWidth - marginX - 78, sealCy - 6);

  return sealCy + sealR + 18;
}

function drawFooter(doc: CodoPdfDoc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN_X * 2;
  const ruleY = pageHeight - 48;

  drawCodoBrandRule(doc, MARGIN_X, ruleY, contentWidth, 3);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...CODO_NAVY);
  doc.text("CODO AI Innovations", pageWidth / 2, ruleY + 12, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...CODO_MUTED);
  doc.text(
    "2nd Floor, Paravath Arcade | Opp. Budget Hypermarket, Varangode | Private Bus Stand, Down Hill, Malappuram, Kerala – 676519",
    pageWidth / 2,
    ruleY + 22,
    { align: "center", maxWidth: contentWidth }
  );
  doc.setFontSize(7);
  doc.setTextColor(...CODO_NAVY);
  doc.text("+91 80869 95559  |  hr@codoai.in", pageWidth / 2, ruleY + 33, {
    align: "center",
  });
}

/**
 * Why: One-page A4 Experience Certificate matching CODO HR reference letterheads.
 */
export async function downloadExperienceCertificatePdf(
  payload: ExperienceCertificatePayload
): Promise<void> {
  const fullName = plainText(payload.fullName, 120);
  const salutation = payload.salutation || "Mr";
  const designation = plainText(payload.designation, 120);
  const employmentType = plainText(payload.employmentType, 60) || "full-time";
  const startLabel = formatDisplayDate(payload.startDate);
  const endLabel = formatDisplayDate(payload.endDate);
  const referenceNo = plainText(payload.referenceNo, 80);
  const certDateLabel = (() => {
    const raw = plainText(payload.certificateDate, 40);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, d] = raw.split("-");
      return `${d}/${m}/${y}`;
    }
    return raw;
  })();
  const assessment = plainText(payload.assessment, 800);
  const techLines = linesFromMultiline(payload.technologies);
  const dutyLines = linesFromMultiline(payload.responsibilities);
  const honorificName = `${salutation}. ${fullName}`;
  const objectPronoun =
    salutation === "Ms" ? "her" : salutation === "Mr" ? "him" : "them";
  const possessive =
    salutation === "Ms" ? "her" : salutation === "Mr" ? "his" : "their";

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  }) as unknown as CodoPdfDoc;

  const pageHeight = doc.internal.pageSize.getHeight();
  const { contentTop, pageWidth, contentWidth } = await drawLetterhead(doc, {
    referenceNo,
    certDateLabel,
  });

  const footerReserve = 56;
  const signatureH = 78;
  const signatureFloor = pageHeight - footerReserve - signatureH;
  const maxBodyY = signatureFloor - 10;

  let y = contentTop;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...CODO_NAVY);
  doc.text("EXPERIENCE CERTIFICATE", pageWidth / 2, y, { align: "center" });
  y += 28;

  y = drawRichParagraph(
    doc,
    [
      { text: "This is to certify that " },
      { text: honorificName, bold: true },
      { text: " worked as a " },
      { text: designation, bold: true },
      { text: " with " },
      { text: "CODO AI Innovations", bold: true },
      { text: " from " },
      { text: startLabel, bold: true },
      { text: " to " },
      { text: endLabel, bold: true },
      { text: " on a " },
      { text: `${employmentType.toLowerCase()} basis.`, bold: true },
    ],
    MARGIN_X,
    y,
    contentWidth,
    LINE_BODY,
    BODY_SIZE
  );
  y += 10;

  if (assessment && y < maxBodyY) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(BODY_SIZE);
    doc.setTextColor(...INK);
    const assessLines = doc.splitTextToSize(assessment, contentWidth);
    const fit = Math.min(
      assessLines.length,
      Math.max(0, Math.floor((maxBodyY - y) / LINE_BODY))
    );
    if (fit > 0) {
      doc.text(assessLines.slice(0, fit), MARGIN_X, y);
      y += fit * LINE_BODY + 14;
    }
  }

  if (techLines.length > 0 && y + 24 < maxBodyY) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...CODO_NAVY);
    doc.text("Technologies & Tools Mastered", MARGIN_X, y);
    y += 16;

    for (const line of techLines) {
      if (y + LINE_BULLET > maxBodyY) break;
      y = drawCategoryLine(
        doc,
        line,
        MARGIN_X,
        y,
        contentWidth,
        LINE_BULLET
      );
      y += 3;
    }
    y += 10;
  }

  if (dutyLines.length > 0 && y + 24 < maxBodyY) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...CODO_NAVY);
    doc.text("Key Responsibilities", MARGIN_X, y);
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(BULLET_SIZE);
    doc.setTextColor(...INK);
    for (const line of dutyLines) {
      const wrapped = doc.splitTextToSize(`*  ${line}`, contentWidth - 2);
      if (y + wrapped.length * LINE_BULLET > maxBodyY) break;
      doc.text(wrapped, MARGIN_X, y);
      y += wrapped.length * LINE_BULLET + 3;
    }
    y += 12;
  }

  if (y + 36 < maxBodyY) {
    y = drawRichParagraph(
      doc,
      [
        { text: "During the period of employment, " },
        { text: honorificName, bold: true },
        {
          text: ` demonstrated professionalism, dedication, and good conduct. We wish ${objectPronoun} success in ${possessive} future endeavors.`,
        },
      ],
      MARGIN_X,
      y,
      contentWidth,
      LINE_BODY,
      BODY_SIZE
    );
  }

  const bandTop = Math.min(Math.max(y + 28, contentTop + 220), signatureFloor);
  drawSignatureBlock(doc, {
    marginX: MARGIN_X,
    contentWidth,
    pageWidth,
    y: bandTop,
  });

  drawFooter(doc);

  doc.save(
    `Experience_Certificate_${safeFilenamePart(fullName)}_${formatFileStamp(payload.certificateDate)}.pdf`
  );
}
