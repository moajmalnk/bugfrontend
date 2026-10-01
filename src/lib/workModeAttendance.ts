import type { User } from "@/types";
import { Building2, HelpCircle, Home, type LucideIcon } from "lucide-react";

export type WorkModeFilter = "all" | "office" | "wfh" | "unset";

export type WorkModeGroupKey = Exclude<WorkModeFilter, "all">;

export const WORK_MODE_GROUPS: {
  key: WorkModeGroupKey;
  label: string;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
}[] = [
  {
    key: "office",
    label: "In office",
    icon: Building2,
    accent: "text-indigo-700 dark:text-indigo-300",
    iconBg: "bg-indigo-600",
  },
  {
    key: "wfh",
    label: "Work from home",
    icon: Home,
    accent: "text-cyan-700 dark:text-cyan-300",
    iconBg: "bg-cyan-600",
  },
  {
    key: "unset",
    label: "Mode not recorded",
    icon: HelpCircle,
    accent: "text-gray-700 dark:text-gray-300",
    iconBg: "bg-gray-500",
  },
];

export function workModeGroupOf(user: Pick<User, "work_mode">): WorkModeGroupKey {
  return user.work_mode === "office" || user.work_mode === "wfh" ? user.work_mode : "unset";
}

export function istTodayYmd(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

/**
 * Why: Late / checked-out counts are only meaningful per work mode once the day is
 * fixed, so the summary is derived from the same attended list the groups render.
 */
export function summarizeAttendance(attended: User[]) {
  let office = 0;
  let wfh = 0;
  let unset = 0;
  let late = 0;
  let checkedOut = 0;
  for (const u of attended) {
    const g = workModeGroupOf(u);
    if (g === "office") office++;
    else if (g === "wfh") wfh++;
    else unset++;
    if (u.is_late) late++;
    if (u.checkout_time) checkedOut++;
  }
  return { present: attended.length, office, wfh, unset, late, checkedOut };
}
