import { Badge } from "@/components/ui/badge";
import type { HelpRole } from "@/lib/help/types";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<HelpRole, string> = {
  all: "All roles",
  admin: "Admin",
  developer: "Developer",
  tester: "Tester",
};

const ROLE_STYLES: Record<HelpRole, string> = {
  all: "bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  admin: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800",
  developer:
    "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  tester:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
};

interface HelpRoleBadgeProps {
  role: HelpRole;
  className?: string;
}

export function HelpRoleBadge({ role, className }: HelpRoleBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("font-semibold rounded-full", ROLE_STYLES[role], className)}
    >
      {ROLE_LABELS[role]}
    </Badge>
  );
}

interface HelpRoleBadgesProps {
  roles: HelpRole[];
  className?: string;
}

export function HelpRoleBadges({ roles, className }: HelpRoleBadgesProps) {
  const display = roles.includes("all") ? (["all"] as HelpRole[]) : roles;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {display.map((role) => (
        <HelpRoleBadge key={role} role={role} />
      ))}
    </div>
  );
}
