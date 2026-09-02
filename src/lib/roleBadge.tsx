import { Bug, Code2, Palette, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Why: One badge token set so Users, details, and dashboards stay consistent
 * when a new first-class role (Creator) is added.
 */
export function getRoleIcon(role: string, className = "h-5 w-5") {
  switch (role) {
    case "admin":
      return <Shield className={cn(className, "text-blue-500")} />;
    case "developer":
      return <Code2 className={cn(className, "text-green-500")} />;
    case "tester":
      return <Bug className={cn(className, "text-yellow-500")} />;
    case "creator":
      return <Palette className={cn(className, "text-fuchsia-500")} />;
    default:
      return null;
  }
}

export function getRoleBadgeClass(role: string): string {
  switch (role) {
    case "admin":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "developer":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "tester":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "creator":
      return "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
}

export const SYSTEM_USER_ROLES = ["admin", "developer", "tester", "creator"] as const;

/**
 * Why: Attendance exceptions, leave, and office-day rollups include every
 * staffed BugRicer login — not only admin / developer / legacy user.
 */
export const WORKFORCE_ROSTER_ROLES = [
  "admin",
  "developer",
  "tester",
  "creator",
  "user",
] as const;

export type WorkforceRosterRole = (typeof WORKFORCE_ROSTER_ROLES)[number];

export function isWorkforceRosterRole(role?: string | null): boolean {
  if (!role) return false;
  return WORKFORCE_ROSTER_ROLES.includes(
    String(role).trim().toLowerCase() as WorkforceRosterRole
  );
}

export const WORKFORCE_ROLE_FILTER_OPTIONS: {
  value: WorkforceRosterRole;
  label: string;
}[] = [
  { value: "admin", label: "Admin" },
  { value: "developer", label: "Developer" },
  { value: "tester", label: "Tester" },
  { value: "creator", label: "Creator" },
  { value: "user", label: "User" },
];
