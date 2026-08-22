import { formatRetestSummary, triState } from "@/components/bugs/details/TesterVerificationPanel";
import { formatMetaChangeValue, formatMetaFieldLabel } from "@/lib/bugMetaUtils";
import { formatLocalDate } from "@/lib/utils/dateUtils";
import type {
  BugConversionEvent,
  BugLifecycleStep,
} from "@/services/bugService";
import type { Bug } from "@/types";

export type BugJourneyKind = "status" | "conversion" | "retest" | "meta";

export type BugJourneyStep = BugLifecycleStep & {
  kind?: BugJourneyKind;
  from_project_name?: string | null;
  to_project_name?: string | null;
  retest_label?: string | null;
};

function parseTime(value?: string | null): number {
  if (!value) return 0;
  const ts = Date.parse(value.includes("T") ? value : value.replace(" ", "T"));
  return Number.isFinite(ts) ? ts : 0;
}

/**
 * Why: Status journey should include conversions and tester retests, not only
 * pending → fixed status hops, so briefing copy and the timeline match.
 */
export function buildFullBugJourney(
  timeline: BugLifecycleStep[] | undefined,
  conversions: BugConversionEvent[] | undefined,
  bug?: Pick<
    Bug,
    | "tester_retested"
    | "tester_issue_fixed"
    | "tester_verified_at"
    | "tester_verified_by_name"
  > | null
): BugJourneyStep[] {
  const events: BugJourneyStep[] = (timeline || []).map((step) => ({
    ...step,
    kind: step.kind || "status",
  }));

  for (const conversion of conversions || []) {
    events.push({
      kind: "conversion",
      status: "converted",
      event_label: "converted",
      entered_at: conversion.created_at || null,
      actor_name: conversion.actor_name || null,
      from_project_name: conversion.from_project_name || null,
      to_project_name: conversion.to_project_name || null,
      duration_seconds: 0,
      is_current: false,
    });
  }

  if (bug) {
    const retested = triState(bug.tester_retested);
    const issueFixed = triState(bug.tester_issue_fixed);
    const hasRetest =
      retested !== "unset" ||
      issueFixed !== "unset" ||
      Boolean(bug.tester_verified_at);
    if (hasRetest) {
      events.push({
        kind: "retest",
        status: "retest",
        event_label: "retested",
        entered_at: bug.tester_verified_at || null,
        actor_name: bug.tester_verified_by_name || null,
        retest_label: formatRetestSummary(bug).label,
        duration_seconds: 0,
        is_current: false,
      });
    }
  }

  return [...events].sort((a, b) => {
    const ta = parseTime(a.entered_at);
    const tb = parseTime(b.entered_at);
    if (ta !== tb) {
      if (ta === 0) return 1;
      if (tb === 0) return -1;
      return ta - tb;
    }
    const rank: Record<BugJourneyKind, number> = {
      status: 0,
      conversion: 1,
      retest: 2,
      meta: 3,
    };
    return (rank[a.kind || "status"] || 0) - (rank[b.kind || "status"] || 0);
  });
}

export function formatJourneyHeadline(step: BugJourneyStep): string {
  const kind = step.kind || "status";
  if (kind === "conversion") {
    const fromName = step.from_project_name || "Unknown project";
    const toName = step.to_project_name || "Unknown project";
    return `Converted ${fromName} ⇄ ${toName}`;
  }
  if (kind === "retest") {
    return `Retest · ${step.retest_label || "Recorded"}`;
  }
  if (kind === "meta") {
    const fieldLabel = formatMetaFieldLabel(step.field);
    const fromValue = formatMetaChangeValue(step.field, step.from_value);
    const toValue = formatMetaChangeValue(step.field, step.to_value);
    return `${fieldLabel}: ${fromValue} → ${toValue}`;
  }
  const label = String(step.event_label || "").toLowerCase();
  if (label === "reopened") return "Bug reopened";
  if (label === "fixed") return "Marked fixed";
  if (label === "raised") return "Bug raised";
  if (step.from_status) {
    return `${formatStatusWords(step.from_status)} → ${formatStatusWords(step.status)}`;
  }
  return formatStatusWords(step.status);
}

function formatStatusWords(status?: string | null): string {
  return String(status || "unknown").replace(/_/g, " ");
}

/** Plain-text journey for WhatsApp / copy briefing. */
export function formatBugJourneyMessage(steps: BugJourneyStep[]): string {
  if (steps.length === 0) return "";
  const lines = steps.map((step, index) => {
    const parts = [`${index + 1}. ${formatJourneyHeadline(step)}`];
    if (step.kind === "status" && step.status) {
      const status = formatStatusWords(step.status);
      if (!parts[0].toLowerCase().includes(status.toLowerCase())) {
        parts[0] += ` (${status})`;
      }
    }
    const meta: string[] = [];
    if (step.entered_at) {
      meta.push(formatLocalDate(step.entered_at, "datetime"));
    }
    if (step.actor_name) meta.push(step.actor_name);
    if (step.duration_label && step.kind === "status") {
      meta.push(
        `${step.duration_label}${step.is_current ? " so far" : ""}`
      );
    }
    if (step.is_current && step.kind === "status") meta.push("current");
    if (step.reason === "tester_verification_failed") {
      meta.push("still broken — reopened");
    }
    if (meta.length > 0) parts.push(meta.join(" · "));
    return parts.join("\n   ");
  });
  return `📍 *Status journey* (${steps.length})\n${lines.join("\n")}`;
}
