import type { ProjectWhatsAppShareData } from "@/services/whatsappService";
import {
  DEFAULT_RECEIPT_STYLE,
  ReceiptWriter,
  formatPrintedAt,
  isSet,
  receiptReference,
  referenceBarcode,
  type ReceiptCopy,
  type ReceiptResult,
  type ReceiptStyle,
} from "@/lib/escposReceipt";

/**
 * Builds the project briefing as ESC/POS bytes for a 58mm printer, plus a
 * block preview of exactly what will print.
 */
export function buildProjectReceipt(
  data: ProjectWhatsAppShareData,
  options: {
    printedBy?: string | null;
    projectUrl: string;
    printedAt?: Date;
    copy?: ReceiptCopy;
    style?: ReceiptStyle;
  }
): ReceiptResult {
  const printedAt = options.printedAt ?? new Date();
  const total = Number(data.totalBugs ?? 0);
  const open = Number(data.openBugs ?? 0);
  const fixed = Number(data.fixedBugs ?? 0);
  const fixRate = total > 0 ? `${Math.round((fixed / total) * 100)}%` : "N/A";
  const reference = receiptReference("PRJ", data.projectId, printedAt);
  const w = new ReceiptWriter(options.style ?? DEFAULT_RECEIPT_STYLE);

  w.header("BugRicer");
  w.centered("Project Briefing", { bold: true });
  w.rule();
  w.title(data.projectName);
  w.rule();
  w.kv("Ref", reference);
  w.kv("Status", data.statusLabel);
  w.kv("Client", data.clientName);
  w.kv("Created", data.createdAtLabel);

  const description = data.description?.trim() ?? "";
  if (description) {
    w.section("Overview");
    w.paragraph(description.length > 280 ? `${description.slice(0, 280)}...` : description);
  }

  let deadline = isSet(data.deadlineDateLabel) ? data.deadlineDateLabel! : null;
  const reminder = data.deadlineReminderLabel?.trim();
  if (deadline && reminder && data.deadlineReminderTone === "overdue") {
    deadline += ` (NOT MET - ${reminder})`;
  } else if (
    deadline &&
    reminder &&
    (data.deadlineReminderTone === "today" || data.deadlineReminderTone === "soon")
  ) {
    deadline += ` (${reminder})`;
  }
  const hasDevHours = isSet(data.developerHoursTakenLabel);
  const hasTesterHours = isSet(data.testerHoursTakenLabel);
  const timeline: [string, string | null | undefined][] = [
    ["Start", data.startDateLabel],
    ["Deadline", deadline],
    ["Publish", data.expectedPublishDateLabel],
    ["Test start", data.testingStartDateLabel],
    ["Test end", data.testingEndDateLabel],
    ["FE finish", data.frontendFinishDateLabel],
    ["BE finish", data.backendFinishDateLabel],
    ["Test comp.", data.testerComplianceCompleteDateLabel],
    ["Dev comp.", data.developerComplianceCompleteDateLabel],
    ["Duration", data.durationDaysLabel],
    ["Hrs needed", data.hoursNeededLabel],
    ...(hasDevHours || hasTesterHours
      ? ([
          ["Dev hrs", hasDevHours ? data.developerHoursTakenLabel : "0 hrs"],
          ["Tester hrs", hasTesterHours ? data.testerHoursTakenLabel : "0 hrs"],
        ] as [string, string | null | undefined][])
      : []),
  ];
  if (timeline.some(([, v]) => isSet(v))) {
    w.section("Timeline");
    timeline.forEach(([label, value]) => w.kv(label, value));
  }

  w.section("Analytics");
  w.grid(
    [7, 7, 7, 6],
    [
      ["Total", "Open", "Fixed", "Rate"],
      [String(total), String(open), String(fixed), fixRate],
    ],
    { boldRows: [1], centered: true }
  );
  if (data.updatesCount != null) w.kv("Updates", data.updatesCount);
  w.kv("Avg raise", data.avgRiseDurationLabel);
  w.kv("Avg fix", data.avgFixDurationLabel);

  const names = (items?: string[]) => {
    const cleaned = (items || []).map((n) => n.trim()).filter(Boolean);
    return cleaned.length ? cleaned.join("\n") : "None";
  };
  w.section("Team");
  w.grid(
    [10, 19],
    [
      [`Dev (${data.developerCount ?? data.developers?.length ?? 0})`, names(data.developers)],
      [`Tester (${data.testerCount ?? data.testers?.length ?? 0})`, names(data.testers)],
    ],
    { header: false, align: ["left", "left"] }
  );

  const hasCompliance =
    !!data.complianceStage ||
    data.developerComplianceTotal != null ||
    data.testerComplianceTotal != null ||
    data.adminVerified != null;
  if (hasCompliance) {
    w.section("Compliance");
    w.kv("Stage", data.complianceStage);
    w.kv("Developer", `${data.developerComplianceVerified ?? 0}/${data.developerComplianceTotal ?? 0}`);
    w.kv("Tester", `${data.testerComplianceVerified ?? 0}/${data.testerComplianceTotal ?? 0}`);
    w.kv("Admin", data.adminVerified ? "Verified" : "Not verified");
    w.kv("Dev done", data.developerComplianceCompleteAt);
    w.kv("Test done", data.testerComplianceCompleteAt);
    if (data.complianceBypass) w.kv("Bypass", "Authorized");
  }

  const tech: [string, string | null | undefined][] = [
    ["Stack", data.technologyStack],
    ["Platforms", data.platforms],
    ["Frontend", data.frontendDomain],
    ["Backend", data.backendDomain],
    ["Vercel", data.vercelDomain],
    ["iOS", data.appUrlIos],
    ["Android", data.appUrlAndroid],
    ["TestFlight", data.testflightUrl],
    ["GitHub FE", data.githubFrontend],
    ["GitHub BE", data.githubBackend],
  ];
  if (tech.some(([, v]) => isSet(v))) {
    w.section("Technical");
    tech.forEach(([label, value]) => w.kv(label, value));
  }

  w.section("Note for developers");
  w.paragraph(
    data.developerNote?.trim() ||
      "Please review open bugs, prioritize high-severity items, and update fix notes after each resolution. Confirm retest readiness in BugRicer when done."
  );

  w.section("Tracking");
  w.kv("Printed by", options.printedBy?.trim() || "Admin");
  w.kv("Printed at", formatPrintedAt(printedAt));
  if (options.copy) w.kv("Copy", `${options.copy.index} of ${options.copy.total}`);
  w.line();
  w.barcode(referenceBarcode(reference));
  w.line();
  w.qr(options.projectUrl, "Scan to open this project");
  w.rule();
  w.centered("Sent from BugRicer");
  w.cut();

  return w.result();
}
