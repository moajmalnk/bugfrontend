import React from "react";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { parseTipDescription } from "@/lib/cursorTips/parseTipDescription";

export type CursorTipPdfItem = {
  phase: string;
  tipKey: string;
  title: string;
  subtitle?: string | null;
  description: string;
  analogyEn?: string | null;
  analogyMl?: string | null;
  whenToUse?: string | null;
  whenNotToUse?: string | null;
  exampleBad?: string | null;
  exampleGood?: string | null;
  exampleLanguage?: string | null;
  sortOrder?: number;
};

type DownloadCursorTipsPdfOptions = {
  reportTitle: string;
  subtitle: string;
  generatedBy?: string;
  generatedByRole?: string;
  summary: Array<{ label: string; value: string | number }>;
  tips: CursorTipPdfItem[];
  filePrefix?: string;
};

let fontsReady: Promise<void> | null = null;

/**
 * Why: Noto Sans Malayalam crashes fontkit on virama clusters (xCoordinate null).
 * Noto Serif Malayalam shapes the same text safely for @react-pdf.
 */
const ensurePdfFonts = async () => {
  if (!fontsReady) {
    fontsReady = (async () => {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      Font.register({
        family: "NotoSans",
        fonts: [
          { src: `${origin}/fonts/NotoSans-Regular.ttf`, fontWeight: 400 },
          { src: `${origin}/fonts/NotoSans-Bold.ttf`, fontWeight: 700 },
        ],
      });
      Font.register({
        family: "NotoSerifMalayalam",
        fonts: [
          {
            src: `${origin}/fonts/NotoSerifMalayalam-Regular.ttf`,
            fontWeight: 400,
          },
          {
            src: `${origin}/fonts/NotoSerifMalayalam-Bold.ttf`,
            fontWeight: 700,
          },
        ],
      });
      Font.registerHyphenationCallback((word) => [word]);
      await Promise.all([
        Font.load({ fontFamily: "NotoSans" }),
        Font.load({ fontFamily: "NotoSerifMalayalam" }),
      ]);
    })();
  }
  await fontsReady;
};

const hasMalayalam = (value?: string | null) =>
  /[\u0D00-\u0D7F]/.test(value || "");

const compactText = (value?: string | null, max = 420) => {
  const normalized = (value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
};

/** Split mixed EN/ML so Latin stays on NotoSans and ML uses the serif face. */
const splitScriptRuns = (value: string) => {
  const runs: Array<{ ml: boolean; text: string }> = [];
  let buf = "";
  let ml = hasMalayalam(value[0] || "");
  for (const ch of value) {
    const nextMl = /[\u0D00-\u0D7F]/.test(ch)
      ? true
      : /[A-Za-z0-9]/.test(ch)
        ? false
        : ml;
    if (nextMl !== ml && buf) {
      runs.push({ ml, text: buf });
      buf = ch;
      ml = nextMl;
    } else {
      buf += ch;
      ml = nextMl;
    }
  }
  if (buf) runs.push({ ml, text: buf });
  return runs;
};

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 10,
    fontFamily: "NotoSans",
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 12,
  },
  letterHeadImage: {
    width: "100%",
    height: 92,
    marginBottom: 10,
  },
  reportMetaCard: {
    border: "1 solid #f3f4f6",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fdfdfd",
  },
  reportTitle: {
    fontSize: 12,
    fontFamily: "NotoSans",
    fontWeight: 700,
    color: "#111827",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 10,
    color: "#4b5563",
    lineHeight: 1.45,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  metaLeft: {
    flex: 1,
    color: "#4b5563",
    paddingRight: 8,
  },
  metaRight: {
    flex: 1,
    color: "#4b5563",
    textAlign: "right",
  },
  summaryWrap: {
    marginTop: 8,
    marginBottom: 12,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  summaryCard: {
    border: "1 solid #e5e7eb",
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    backgroundColor: "#f9fafb",
  },
  summaryLabel: {
    fontSize: 9,
    color: "#6b7280",
  },
  summaryValue: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "NotoSans",
    fontWeight: 700,
    color: "#111827",
  },
  tipCard: {
    border: "1 solid #e5e7eb",
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#fafafa",
  },
  tipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  tipTitle: {
    flex: 1,
    fontSize: 11,
    fontFamily: "NotoSans",
    fontWeight: 700,
    color: "#111827",
    paddingRight: 8,
  },
  tipMeta: {
    fontSize: 8,
    color: "#6b7280",
    textAlign: "right",
  },
  tipKey: {
    fontSize: 8,
    color: "#9ca3af",
    marginBottom: 6,
  },
  block: {
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: "NotoSans",
    fontWeight: 700,
    color: "#111827",
    marginBottom: 2,
  },
  bodyEn: {
    fontSize: 9,
    fontFamily: "NotoSans",
    color: "#374151",
    lineHeight: 1.5,
  },
  bodyMl: {
    fontSize: 9,
    fontFamily: "NotoSerifMalayalam",
    color: "#1f2937",
    lineHeight: 1.75,
  },
  mutedEn: {
    fontSize: 9,
    fontFamily: "NotoSans",
    color: "#6b7280",
    lineHeight: 1.45,
  },
  footer: {
    marginTop: 14,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "right",
  },
});

const phaseLabel = (phase: string) => {
  const map: Record<string, string> = {
    modes: "Modes",
    commands: "Commands",
    skills: "Skills",
    workflow: "Workflow",
    review: "Review",
  };
  return map[phase] || phase;
};

const getSummaryLayout = (count: number) => {
  if (count <= 1) return { columns: 1, width: "100%", gap: "0%" };
  if (count === 2) return { columns: 2, width: "49%", gap: "2%" };
  if (count === 3) return { columns: 3, width: "32%", gap: "2%" };
  return { columns: 4, width: "23.5%", gap: "2%" };
};

const PdfText = ({
  value,
  style,
  max = 420,
}: {
  value?: string | null;
  style?: Style | Style[];
  max?: number;
}) => {
  const text = compactText(value, max);
  if (!text) return null;

  if (hasMalayalam(text)) {
    const runs = splitScriptRuns(text);
    return (
      <Text style={style}>
        {runs.map((run, i) => (
          <Text
            key={`${i}-${run.ml ? "ml" : "en"}`}
            style={run.ml ? styles.bodyMl : styles.bodyEn}
          >
            {run.text}
          </Text>
        ))}
      </Text>
    );
  }

  return (
    <Text style={style ? [styles.bodyEn, style as Style] : styles.bodyEn}>
      {text}
    </Text>
  );
};

const LabeledBlock = ({
  label,
  en,
  ml,
  enMax = 320,
  mlMax = 320,
}: {
  label: string;
  en?: string | null;
  ml?: string | null;
  enMax?: number;
  mlMax?: number;
}) => {
  const enText = compactText(en, enMax);
  const mlText = compactText(ml, mlMax);
  if (!enText && !mlText) return null;
  return (
    <View style={styles.block} wrap={false}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {enText ? <Text style={styles.bodyEn}>{enText}</Text> : null}
      {mlText ? (
        <Text style={[styles.bodyMl, { marginTop: enText ? 3 : 0 }]}>
          {mlText}
        </Text>
      ) : null}
    </View>
  );
};

const TipCard = ({ tip, index }: { tip: CursorTipPdfItem; index: number }) => {
  const { requirement, malayalam } = parseTipDescription(tip.description || "");
  const req = compactText(requirement, 480);
  const ml = compactText(malayalam, 480);
  const whenToUse = compactText(tip.whenToUse, 220);
  const whenNotToUse = compactText(tip.whenNotToUse, 220);
  const exampleBad = compactText(tip.exampleBad, 260);
  const exampleGood = compactText(tip.exampleGood, 280);
  const subtitle = compactText(tip.subtitle, 120);

  return (
    <View style={styles.tipCard} wrap>
      <View style={styles.tipHeader} wrap={false}>
        <Text style={styles.tipTitle}>
          {tip.sortOrder != null ? `${tip.sortOrder}. ` : `${index + 1}. `}
          {compactText(tip.title, 90) || "Untitled tip"}
        </Text>
        <Text style={styles.tipMeta}>{phaseLabel(tip.phase)}</Text>
      </View>
      <Text style={styles.tipKey}>{tip.tipKey || "—"}</Text>
      {subtitle ? (
        <Text style={[styles.mutedEn, { marginBottom: 4 }]}>{subtitle}</Text>
      ) : null}

      {req ? (
        <View style={styles.block} wrap={false}>
          <Text style={styles.sectionLabel}>Requirement</Text>
          <Text style={styles.bodyEn}>{req}</Text>
        </View>
      ) : null}

      {ml ? (
        <View style={styles.block} wrap={false}>
          <Text style={styles.sectionLabel}>Malayalam</Text>
          <Text style={styles.bodyMl}>{ml}</Text>
        </View>
      ) : null}

      <LabeledBlock
        label="Analogy"
        en={tip.analogyEn}
        ml={tip.analogyMl}
        enMax={220}
        mlMax={220}
      />

      {whenToUse ? (
        <View style={styles.block} wrap={false}>
          <Text style={styles.sectionLabel}>Use when</Text>
          <PdfText value={whenToUse} max={220} />
        </View>
      ) : null}

      {whenNotToUse ? (
        <View style={styles.block} wrap={false}>
          <Text style={styles.sectionLabel}>Avoid when</Text>
          <PdfText value={whenNotToUse} max={220} />
        </View>
      ) : null}

      {exampleBad ? (
        <View style={styles.block} wrap={false}>
          <Text style={styles.sectionLabel}>Weak</Text>
          <PdfText value={exampleBad} max={260} />
        </View>
      ) : null}

      {exampleGood ? (
        <View style={styles.block} wrap={false}>
          <Text style={styles.sectionLabel}>
            Strong{tip.exampleLanguage ? ` (${tip.exampleLanguage})` : ""}
          </Text>
          <PdfText value={exampleGood} max={280} />
        </View>
      ) : null}
    </View>
  );
};

const CursorTipsDocument = ({
  reportTitle,
  subtitle,
  generatedBy,
  generatedByRole,
  summary,
  tips,
}: DownloadCursorTipsPdfOptions) => {
  const printedAt = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
  const letterHeadSrc =
    typeof window !== "undefined"
      ? `${window.location.origin}/letter%20pad%20.png`
      : "/letter%20pad%20.png";
  const summaryLayout = getSummaryLayout(summary.length);
  // Why: Keep header subtitle Latin-only — mixed ML was a common crash source.
  const safeSubtitle = compactText(subtitle.replace(/[\u0D00-\u0D7F]+/g, " "), 220);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Image src={letterHeadSrc} style={styles.letterHeadImage} />
          <View style={styles.reportMetaCard}>
            <Text style={styles.reportTitle}>{reportTitle}</Text>
            {safeSubtitle ? (
              <Text style={styles.subtitle}>{safeSubtitle}</Text>
            ) : null}
            <View style={styles.metaRow}>
              <Text style={styles.metaLeft}>Generated: {printedAt}</Text>
              <Text style={styles.metaRight}>
                By: {generatedBy || "System"}
                {generatedByRole ? ` (${generatedByRole})` : ""}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryWrap}>
          {summary.map((item, index) => (
            <View
              key={item.label}
              style={[
                styles.summaryCard,
                {
                  width: summaryLayout.width,
                  marginRight:
                    index % summaryLayout.columns === summaryLayout.columns - 1
                      ? 0
                      : summaryLayout.gap,
                },
              ]}
            >
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={styles.summaryValue}>{String(item.value)}</Text>
            </View>
          ))}
        </View>

        {tips.map((tip, index) => (
          <TipCard key={`${tip.tipKey}-${index}`} tip={tip} index={index} />
        ))}

        <Text style={styles.footer}>
          Generated from BugRicer Cursor Tips | Total tips: {tips.length}
        </Text>
      </Page>
    </Document>
  );
};

export const downloadCursorTipsPdf = async (
  options: DownloadCursorTipsPdfOptions
) => {
  await ensurePdfFonts();
  const blob = await pdf(<CursorTipsDocument {...options} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const now = new Date().toISOString().slice(0, 10);
  const base = options.filePrefix || "cursor-tips";
  link.href = url;
  link.download = `${base}-${now}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
