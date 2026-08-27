import { Bug } from "@/types";

export function triState(value: boolean | number | string | null | undefined): "yes" | "no" | "unset" {
  if (value === true || value === 1 || value === "1") return "yes";
  if (value === false || value === 0 || value === "0") return "no";
  return "unset";
}

export function formatRetestSummary(bug: Pick<Bug, "tester_retested" | "tester_issue_fixed">): {
  label: string;
  className: string;
} {
  const retested = triState(bug.tester_retested);
  const issueFixed = triState(bug.tester_issue_fixed);
  if (retested === "unset") {
    return {
      label: "Retest pending",
      className:
        "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    };
  }
  if (retested === "no") {
    return {
      label: "Not retested",
      className:
        "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
    };
  }
  if (issueFixed === "yes") {
    return {
      label: "Verified fixed",
      className:
        "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    };
  }
  if (issueFixed === "no") {
    return {
      label: "Still broken",
      className:
        "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    };
  }
  return {
    label: "Retested",
    className:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  };
}

/** Stable keys for list filters — mirrors formatRetestSummary buckets. */
export type VerificationFilterKey =
  | "retest_pending"
  | "not_retested"
  | "verified_fixed"
  | "still_broken"
  | "retested";

export const VERIFICATION_FILTER_OPTIONS: {
  value: VerificationFilterKey;
  label: string;
  hint: string;
}[] = [
  {
    value: "retest_pending",
    label: "Retest pending",
    hint: "Awaiting tester verification",
  },
  {
    value: "not_retested",
    label: "Not retested",
    hint: "Tester marked as not retested",
  },
  {
    value: "verified_fixed",
    label: "Verified fixed",
    hint: "Retest confirmed the fix",
  },
  {
    value: "still_broken",
    label: "Still broken",
    hint: "Retest found the issue still present",
  },
  {
    value: "retested",
    label: "Retested",
    hint: "Retested without a clear pass/fail outcome",
  },
];

export function getVerificationFilterKey(
  bug: Pick<Bug, "tester_retested" | "tester_issue_fixed">
): VerificationFilterKey {
  const retested = triState(bug.tester_retested);
  const issueFixed = triState(bug.tester_issue_fixed);
  if (retested === "unset") return "retest_pending";
  if (retested === "no") return "not_retested";
  if (issueFixed === "yes") return "verified_fixed";
  if (issueFixed === "no") return "still_broken";
  return "retested";
}
