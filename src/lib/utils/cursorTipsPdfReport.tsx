import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";

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

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 10,
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 12,
  },
  letterHeadImage: {
    width: "100%",
    height: 92,
    objectFit: "cover",
    objectPosition: "top",
    borderRadius: 6,
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
    fontWeight: 700,
    color: "#111827",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 10,
    color: "#4b5563",
  },
  metaRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  metaLeft: {
    flex: 1,
    color: "#4b5563",
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
    fontWeight: 700,
    color: "#111827",
  },
  tipCard: {
    border: "1 solid #e5e7eb",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#fafafa",
  },
  tipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  tipTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: 700,
    color: "#111827",
  },
  tipMeta: {
    fontSize: 8,
    color: "#6b7280",
    textAlign: "right",
  },
  tipKey: {
    fontSize: 8,
    color: "#9ca3af",
    marginBottom: 4,
  },
  tipBody: {
    fontSize: 9,
    color: "#374151",
    lineHeight: 1.4,
    marginBottom: 3,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: "#111827",
    marginTop: 4,
    marginBottom: 1,
  },
  footer: {
    marginTop: 14,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "right",
  },
});

const compactText = (value?: string | null, max = 220) => {
  const normalized = (value || "-").replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
};

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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={letterHeadSrc} style={styles.letterHeadImage} />
          <View style={styles.reportMetaCard}>
            <Text style={styles.reportTitle}>{reportTitle}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
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
          <View key={`${tip.tipKey}-${index}`} style={styles.tipCard} wrap={false}>
            <View style={styles.tipHeader}>
              <Text style={styles.tipTitle}>
                {tip.sortOrder != null ? `${tip.sortOrder}. ` : ""}
                {compactText(tip.title, 90)}
              </Text>
              <Text style={styles.tipMeta}>{phaseLabel(tip.phase)}</Text>
            </View>
            <Text style={styles.tipKey}>{tip.tipKey}</Text>
            {tip.subtitle ? (
              <Text style={[styles.tipBody, { color: "#6b7280" }]}>
                {compactText(tip.subtitle, 120)}
              </Text>
            ) : null}
            <Text style={styles.tipBody}>{compactText(tip.description, 420)}</Text>
            {tip.analogyEn || tip.analogyMl ? (
              <>
                <Text style={styles.sectionLabel}>Analogy</Text>
                {tip.analogyEn ? (
                  <Text style={styles.tipBody}>{compactText(tip.analogyEn, 180)}</Text>
                ) : null}
                {tip.analogyMl ? (
                  <Text style={styles.tipBody}>{compactText(tip.analogyMl, 180)}</Text>
                ) : null}
              </>
            ) : null}
            {tip.whenToUse ? (
              <>
                <Text style={styles.sectionLabel}>Use when</Text>
                <Text style={styles.tipBody}>{compactText(tip.whenToUse, 160)}</Text>
              </>
            ) : null}
            {tip.whenNotToUse ? (
              <>
                <Text style={styles.sectionLabel}>Avoid when</Text>
                <Text style={styles.tipBody}>{compactText(tip.whenNotToUse, 160)}</Text>
              </>
            ) : null}
            {tip.exampleBad ? (
              <>
                <Text style={styles.sectionLabel}>Weak</Text>
                <Text style={styles.tipBody}>{compactText(tip.exampleBad, 200)}</Text>
              </>
            ) : null}
            {tip.exampleGood ? (
              <>
                <Text style={styles.sectionLabel}>
                  Strong{tip.exampleLanguage ? ` (${tip.exampleLanguage})` : ""}
                </Text>
                <Text style={styles.tipBody}>{compactText(tip.exampleGood, 220)}</Text>
              </>
            ) : null}
          </View>
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
