import type { HelpCategory } from "./types";

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Login, navigation, profile, search, and notifications",
    icon: "Rocket",
    order: 1,
  },
  {
    id: "bug-tracking",
    title: "Bug Tracking",
    description: "Projects, bugs, fixes, updates, and compliance",
    icon: "Bug",
    order: 2,
  },
  {
    id: "collaboration",
    title: "Collaboration",
    description: "Messaging, meetings, and feedback",
    icon: "Users",
    order: 3,
  },
  {
    id: "productivity",
    title: "Productivity",
    description: "Tasks, daily updates, work hours, and reports",
    icon: "ListTodo",
    order: 4,
  },
  {
    id: "integrations",
    title: "Integrations",
    description: "BugDocs, BugSheets, and WhatsApp",
    icon: "Plug",
    order: 5,
  },
  {
    id: "administration",
    title: "Administration",
    description: "Users, OT, settings, backups, and audit logs",
    icon: "Shield",
    order: 6,
  },
];

export function getCategoryById(id: string): HelpCategory | undefined {
  return HELP_CATEGORIES.find((c) => c.id === id);
}
