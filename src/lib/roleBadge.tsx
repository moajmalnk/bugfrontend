import { Bug, Code2, Palette, Shield } from "lucide-react";
import { cn, getStandardsModeLabel, isStandardsConfigurable } from "@/lib/utils";

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
 * Why: Testers split into CODO (in-house workforce) and Client (external);
 * the badge makes the access difference visible wherever a tester is listed.
 */
export function TesterTypeBadge({
  role,
  testerType,
  className,
}: {
  role?: string | null;
  testerType?: string | null;
  className?: string;
}) {
  if (role !== "tester") return null;
  const isCodo = testerType === "codo";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        isCodo
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        className
      )}
      title={isCodo ? "CODO Tester (in-house)" : "Client Tester (external)"}
    >
      {isCodo ? "CODO" : "Client"}
    </span>
  );
}

/**
 * Why: shows an admin, at a glance, whether CODO Rules / Cursor Tips are
 * mandatory, readable only, or hidden for this person. Rendered only for
 * roles where the setting applies (developer, creator, CODO tester).
 */
export function StandardsModeBadge({
  role,
  testerType,
  label,
  mode,
  className,
}: {
  role?: string | null;
  testerType?: string | null;
  label: string;
  mode?: string | null;
  className?: string;
}) {
  if (!role || !isStandardsConfigurable(role, testerType)) return null;
  const tone =
    mode === "required"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
      : mode === "hidden"
        ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
        : "border-border bg-muted/50 text-muted-foreground";
  const modeLabel = getStandardsModeLabel(mode);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap",
        tone,
        className
      )}
      title={`${label}: ${modeLabel}`}
    >
      {label} · {modeLabel}
    </span>
  );
}

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
