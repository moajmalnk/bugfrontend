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

type ReportBugItem = {
  id: string;
  title: string;
  projectName?: string;
  status?: string;
  priority?: string;
  reporterName?: string;
  createdAt?: string;
};

type DownloadBugReportOptions = {
  reportTitle: string;
  subtitle: string;
  generatedBy?: string;
  generatedByRole?: string;
  summary: Array<{ label: string; value: string | number }>;
  bugs: ReportBugItem[];
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
    backgroundColor: "#ffffff",
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
    width: "24%",
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
  tableHeader: {
    flexDirection: "row",
    borderTop: "1 solid #d1d5db",
    borderBottom: "1 solid #d1d5db",
    backgroundColor: "#f3f4f6",
    paddingVertical: 7,
    fontSize: 9,
    fontWeight: 700,
  },
  row: {
    flexDirection: "row",
    borderBottom: "1 solid #f3f4f6",
    alignItems: "flex-start",
    paddingVertical: 6,
    fontSize: 9,
  },
  cellBase: {
    paddingHorizontal: 4,
    lineHeight: 1.35,
    wordBreak: "break-word",
  },
  colId: { width: "14%" },
  colTitle: { width: "36%" },
  colProject: { width: "18%" },
  colStatus: { width: "11%" },
  colPriority: { width: "9%" },
  colDate: { width: "12%" },
  footer: {
    marginTop: 14,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "right",
  },
});

const safeDate = (date?: string) => {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
};

const softWrapId = (value?: string) =>
  (value || "-").replace(/-/g, "-\u200b");

const compactText = (value?: string, max = 72) => {
  const normalized = (value || "-").replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
};

const BugReportDocument = ({
  reportTitle,
  subtitle,
  generatedBy,
  generatedByRole,
  summary,
  bugs,
}: DownloadBugReportOptions) => {
  const printedAt = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
  const letterHeadSrc =
    typeof window !== "undefined"
      ? `${window.location.origin}/letter%20pad%20.png`
      : "/letter%20pad%20.png";

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
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
                { marginRight: index % 4 === 3 ? 0 : 8 },
              ]}
            >
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={styles.summaryValue}>{String(item.value)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.cellBase, styles.colId]}>Bug ID</Text>
          <Text style={[styles.cellBase, styles.colTitle]}>Title</Text>
          <Text style={[styles.cellBase, styles.colProject]}>Project</Text>
          <Text style={[styles.cellBase, styles.colStatus]}>Status</Text>
          <Text style={[styles.cellBase, styles.colPriority]}>Priority</Text>
          <Text style={[styles.cellBase, styles.colDate]}>Created</Text>
        </View>

        {bugs.slice(0, 180).map((bug) => (
          <View key={bug.id} style={styles.row}>
            <Text style={[styles.cellBase, styles.colId]}>{softWrapId(bug.id)}</Text>
            <Text style={[styles.cellBase, styles.colTitle]}>
              {compactText(bug.title, 84)}
            </Text>
            <Text style={[styles.cellBase, styles.colProject]}>
              {compactText(bug.projectName, 42)}
            </Text>
            <Text style={[styles.cellBase, styles.colStatus]}>
              {compactText(bug.status, 14)}
            </Text>
            <Text style={[styles.cellBase, styles.colPriority]}>
              {compactText(bug.priority, 14)}
            </Text>
            <Text style={[styles.cellBase, styles.colDate]}>{safeDate(bug.createdAt)}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          Generated from CODO BugRicer | Total rows: {bugs.length}
        </Text>
      </Page>
    </Document>
  );
};

export const downloadBugReportPdf = async (options: DownloadBugReportOptions) => {
  const blob = await pdf(<BugReportDocument {...options} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const now = new Date().toISOString().slice(0, 10);
  const base = options.filePrefix || "bug-report";
  link.href = url;
  link.download = `${base}-${now}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

