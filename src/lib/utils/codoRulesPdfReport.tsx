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

export type CodoRulePdfItem = {
  phase: string;
  ruleKey: string;
  title: string;
  subtitle?: string | null;
  description: string;
  sortOrder?: number;
};

type DownloadCodoRulesPdfOptions = {
  reportTitle: string;
  subtitle: string;
  generatedBy?: string;
  generatedByRole?: string;
  summary: Array<{ label: string; value: string | number }>;
  rules: CodoRulePdfItem[];
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
  codoHeader: {
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
  ruleCard: {
    border: "1 solid #e5e7eb",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#fafafa",
  },
  ruleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  ruleTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: 700,
    color: "#111827",
  },
  ruleMeta: {
    fontSize: 8,
    color: "#6b7280",
    textAlign: "right",
  },
  ruleKey: {
    fontSize: 8,
    color: "#9ca3af",
    marginBottom: 4,
  },
  ruleBody: {
    fontSize: 9,
    color: "#374151",
    lineHeight: 1.4,
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
  if (phase === "tester") return "Tester / QA";
  if (phase === "project") return "Project";
  if (phase === "developer") return "Developer";
  return phase;
};

const getSummaryLayout = (count: number) => {
  if (count <= 1) return { columns: 1, width: "100%", gap: "0%" };
  if (count === 2) return { columns: 2, width: "49%", gap: "2%" };
  if (count === 3) return { columns: 3, width: "32%", gap: "2%" };
  // Four cards in one row: 4×23.5% + 3×2% = 100%
  return { columns: 4, width: "23.5%", gap: "2%" };
};

const CodoRulesDocument = ({
  reportTitle,
  subtitle,
  generatedBy,
  generatedByRole,
  summary,
  rules,
}: DownloadCodoRulesPdfOptions) => {
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
        <View style={styles.codoHeader}>
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

        {rules.map((rule, index) => (
          <View key={`${rule.ruleKey}-${index}`} style={styles.ruleCard} wrap={false}>
            <View style={styles.ruleHeader}>
              <Text style={styles.ruleTitle}>
                {rule.sortOrder != null ? `${rule.sortOrder}. ` : ""}
                {compactText(rule.title, 90)}
              </Text>
              <Text style={styles.ruleMeta}>{phaseLabel(rule.phase)}</Text>
            </View>
            <Text style={styles.ruleKey}>{rule.ruleKey}</Text>
            {rule.subtitle ? (
              <Text style={[styles.ruleBody, { marginBottom: 3, color: "#6b7280" }]}>
                {compactText(rule.subtitle, 120)}
              </Text>
            ) : null}
            <Text style={styles.ruleBody}>{compactText(rule.description, 420)}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          Generated from CODO BugRicer | Total rules: {rules.length}
        </Text>
      </Page>
    </Document>
  );
};

export const downloadCodoRulesPdf = async (options: DownloadCodoRulesPdfOptions) => {
  const blob = await pdf(<CodoRulesDocument {...options} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const now = new Date().toISOString().slice(0, 10);
  const base = options.filePrefix || "codo-common-rules";
  link.href = url;
  link.download = `${base}-${now}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
