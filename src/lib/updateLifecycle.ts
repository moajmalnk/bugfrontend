import type { Update } from "@/services/updateService";

export type UpdateLifecycleStep = {
  status: string;
  from_status?: string | null;
  entered_at: string;
  exited_at?: string | null;
  duration_seconds?: number | null;
  duration_label?: string | null;
  is_current?: boolean;
};

export type UpdateLifecycleSummary = {
  status: string;
  is_open: boolean;
  steps: UpdateLifecycleStep[];
  created_at: string | null;
  approved_at: string | null;
  declined_at: string | null;
  completed_at: string | null;
  age_seconds: number | null;
  age_label: string | null;
  review_seconds: number | null;
  review_label: string | null;
  delivery_seconds: number | null;
  delivery_label: string | null;
  pending_share_percent: number | null;
  approved_share_percent: number | null;
  completed_share_percent: number | null;
};

function parseTs(value?: string | null): number | null {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const ts = new Date(normalized).getTime();
  return Number.isNaN(ts) ? null : ts;
}

export function formatDurationSeconds(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined || seconds < 0) return null;
  const s = Math.floor(seconds);
  if (s < 60) return `${s}s`;
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(" ");
}

function diffSeconds(fromTs: number | null, toTs: number | null): number | null {
  if (fromTs === null || toTs === null) return null;
  return Math.max(0, Math.floor((toTs - fromTs) / 1000));
}

export function buildUpdateLifecycle(update: Update): UpdateLifecycleSummary {
  const nowTs = Date.now();
  const createdTs = parseTs(update.created_at);
  const approvedTs = parseTs(update.approved_at);
  const declinedTs = parseTs(update.declined_at);
  const completedTs = parseTs(update.completed_at);
  const status = (update.status || "pending").toLowerCase();

  const events: Array<{ status: string; at: string; atTs: number }> = [];

  if (update.created_at && createdTs !== null) {
    events.push({ status: "pending", at: update.created_at, atTs: createdTs });
  }

  if (update.declined_at && declinedTs !== null) {
    events.push({ status: "declined", at: update.declined_at, atTs: declinedTs });
  } else if (update.approved_at && approvedTs !== null) {
    events.push({ status: "approved", at: update.approved_at, atTs: approvedTs });
  }

  if (update.completed_at && completedTs !== null) {
    events.push({ status: "completed", at: update.completed_at, atTs: completedTs });
  }

  if (
    status === "approved" &&
    approvedTs !== null &&
    !events.some((event) => event.status === "approved")
  ) {
    events.push({ status: "approved", at: update.approved_at || update.updated_at || "", atTs: approvedTs });
  }

  events.sort((a, b) => a.atTs - b.atTs);

  const deduped: typeof events = [];
  for (const event of events) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.status === event.status) continue;
    deduped.push(event);
  }

  const endTs =
    completedTs ??
    declinedTs ??
    (status === "approved" || status === "pending" ? nowTs : approvedTs ?? nowTs);

  const steps: UpdateLifecycleStep[] = deduped.map((event, index) => {
    const next = deduped[index + 1];
    const exitedTs = next?.atTs ?? (index === deduped.length - 1 ? endTs : null);
    const durationSeconds =
      exitedTs !== null ? diffSeconds(event.atTs, exitedTs) : null;
    const isCurrent = index === deduped.length - 1 && status === event.status;

    return {
      status: event.status,
      from_status: index === 0 ? null : deduped[index - 1]?.status ?? null,
      entered_at: event.at,
      exited_at: next?.at ?? (isCurrent ? null : undefined),
      duration_seconds: durationSeconds,
      duration_label: formatDurationSeconds(durationSeconds),
      is_current: isCurrent,
    };
  });

  if (!steps.length && update.created_at) {
    steps.push({
      status: status || "pending",
      from_status: null,
      entered_at: update.created_at,
      duration_seconds: diffSeconds(createdTs, nowTs),
      duration_label: formatDurationSeconds(diffSeconds(createdTs, nowTs)),
      is_current: true,
    });
  }

  const ageSeconds = createdTs !== null ? diffSeconds(createdTs, endTs) : null;
  const reviewSeconds =
    createdTs !== null && (approvedTs !== null || declinedTs !== null)
      ? diffSeconds(createdTs, approvedTs ?? declinedTs)
      : createdTs !== null && status === "pending"
        ? diffSeconds(createdTs, nowTs)
        : null;
  const deliverySeconds =
    approvedTs !== null && completedTs !== null
      ? diffSeconds(approvedTs, completedTs)
      : approvedTs !== null && status === "approved"
        ? diffSeconds(approvedTs, nowTs)
        : null;

  const pendingSeconds = steps
    .filter((step) => step.status === "pending")
    .reduce((sum, step) => sum + (step.duration_seconds || 0), 0);
  const approvedSeconds = steps
    .filter((step) => step.status === "approved")
    .reduce((sum, step) => sum + (step.duration_seconds || 0), 0);
  const completedSeconds = steps
    .filter((step) => step.status === "completed")
    .reduce((sum, step) => sum + (step.duration_seconds || 0), 0);
  const totalStageSeconds = pendingSeconds + approvedSeconds + completedSeconds;

  const share = (part: number) =>
    totalStageSeconds > 0 ? (part / totalStageSeconds) * 100 : null;

  return {
    status,
    is_open: !["completed", "declined"].includes(status),
    steps,
    created_at: update.created_at ?? null,
    approved_at: update.approved_at ?? null,
    declined_at: update.declined_at ?? null,
    completed_at: update.completed_at ?? null,
    age_seconds: ageSeconds,
    age_label: formatDurationSeconds(ageSeconds),
    review_seconds: reviewSeconds,
    review_label: formatDurationSeconds(reviewSeconds),
    delivery_seconds: deliverySeconds,
    delivery_label: formatDurationSeconds(deliverySeconds),
    pending_share_percent: share(pendingSeconds),
    approved_share_percent: share(approvedSeconds),
    completed_share_percent: share(completedSeconds),
  };
}
