import type { LucideIcon } from "lucide-react";
import { Code, Palette, Shield, TestTube, User, Users } from "lucide-react";

/**
 * Why: Docs, Sheets, and announcements share one audience list.
 * Creator must stay a first-class option beside admin / developer / tester.
 */
export type AccessRoleValue =
  | "for_me"
  | "all"
  | "admins"
  | "developers"
  | "testers"
  | "creators";

export type AccessRoleOption = {
  value: AccessRoleValue;
  label: string;
  Icon: LucideIcon;
  iconClass: string;
  chipClass: string;
  badgeClass: string;
};

export const DOCUMENT_ACCESS_ROLES: AccessRoleOption[] = [
  {
    value: "for_me",
    label: "For Me",
    Icon: User,
    iconClass: "text-orange-600 dark:text-orange-400",
    chipClass:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300",
    badgeClass:
      "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  },
  {
    value: "all",
    label: "All Users",
    Icon: Users,
    iconClass: "text-green-600 dark:text-green-400",
    chipClass:
      "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300",
    badgeClass:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
  },
  {
    value: "admins",
    label: "Admins Only",
    Icon: Shield,
    iconClass: "text-purple-600 dark:text-purple-400",
    chipClass:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300",
    badgeClass:
      "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
  {
    value: "developers",
    label: "Developers Only",
    Icon: Code,
    iconClass: "text-blue-600 dark:text-blue-400",
    chipClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
    badgeClass:
      "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  {
    value: "testers",
    label: "Testers Only",
    Icon: TestTube,
    iconClass: "text-pink-600 dark:text-pink-400",
    chipClass:
      "bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300",
    badgeClass:
      "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800",
  },
  {
    value: "creators",
    label: "Creators Only",
    Icon: Palette,
    iconClass: "text-amber-600 dark:text-amber-400",
    chipClass:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
    badgeClass:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
];

export const ANNOUNCEMENT_ACCESS_ROLES = DOCUMENT_ACCESS_ROLES.filter(
  (role) => role.value !== "for_me"
);

export function accessRoleMeta(value: string): AccessRoleOption {
  return (
    DOCUMENT_ACCESS_ROLES.find((role) => role.value === value) ??
    DOCUMENT_ACCESS_ROLES.find((role) => role.value === "all")!
  );
}

export function roleBadgeClassName(role: string): string {
  const normalized = role.toLowerCase();
  if (normalized === "admin")
    return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
  if (normalized === "developer")
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  if (normalized === "tester")
    return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300";
  if (normalized === "creator")
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}
