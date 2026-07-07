import { BugLevel } from "@/types";

export function isAlreadyRaised(
  value: boolean | number | string | undefined | null
): boolean {
  return value === true || value === 1 || value === "1";
}

export const BUG_LEVEL_LABELS: Record<BugLevel, string> = {
  normal: "Normal",
  floap: "Floap",
  utter_floap: "Utter Floap",
};

export function formatBugLevelLabel(
  value: BugLevel | string | undefined | null
): string {
  if (!value) return BUG_LEVEL_LABELS.normal;
  return BUG_LEVEL_LABELS[value as BugLevel] || String(value).replace(/_/g, " ");
}

export function formatAlreadyRaisedLabel(
  value: boolean | number | string | undefined | null
): string {
  return isAlreadyRaised(value) ? "Yes" : "No";
}

export function bugLevelBadgeClass(level: BugLevel | string | undefined | null): string {
  switch (level) {
    case "floap":
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
    case "utter_floap":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
    default:
      return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
  }
}

export function alreadyRaisedBadgeClass(
  value: boolean | number | string | undefined | null
): string {
  return isAlreadyRaised(value)
    ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
    : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700";
}

/** HTML rows for email templates */
export function bugMetaEmailRows(bug: {
  bug_level?: BugLevel | string | null;
  already_raised?: boolean | number | string | null;
}): string {
  const level = formatBugLevelLabel(bug.bug_level);
  const raised = formatAlreadyRaisedLabel(bug.already_raised);
  return `
    <p style="font-size: 14px; margin-bottom: 5px;"><strong>Bug Level:</strong> <span style="font-weight: normal;">${level}</span></p>
    <p style="font-size: 14px; margin-bottom: 5px;"><strong>Already Raised:</strong> <span style="font-weight: normal;">${raised}</span></p>
  `;
}

/** Plain-text lines for WhatsApp / browser notifications */
export function bugMetaTextLines(bug: {
  bug_level?: BugLevel | string | null;
  already_raised?: boolean | number | string | null;
}): string {
  const lines: string[] = [];
  lines.push(`📊 *Bug Level:* ${formatBugLevelLabel(bug.bug_level)}`);
  if (isAlreadyRaised(bug.already_raised)) {
    lines.push(`🔁 *Already Raised:* Yes`);
  }
  return lines.join("\n");
}

export const BUG_LEVEL_FORM_OPTIONS: {
  value: BugLevel;
  label: string;
  hint: string;
  selectedClass: string;
}[] = [
  {
    value: "normal",
    label: "Normal",
    hint: "Low impact",
    selectedClass:
      "border-emerald-500 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/50",
  },
  {
    value: "floap",
    label: "Floap",
    hint: "Notable issue",
    selectedClass:
      "border-amber-500 bg-amber-600 text-white shadow-sm ring-2 ring-amber-400/50",
  },
  {
    value: "utter_floap",
    label: "Utter Floap",
    hint: "Critical breakdown",
    selectedClass:
      "border-red-500 bg-red-600 text-white shadow-sm ring-2 ring-red-400/50",
  },
];
