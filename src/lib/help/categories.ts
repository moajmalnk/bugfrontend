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
    description: "Projects, bugs, retests, fixes, updates, compliance, and role workflows",
    icon: "Bug",
    order: 2,
  },
  {
    id: "collaboration",
    title: "Collaboration",
    description: "Messaging, meetings, BugDates calendar, CODO rules, Shorts, and feedback",
    icon: "Users",
    order: 3,
  },
  {
    id: "productivity",
    title: "Productivity",
    description: "Tasks, daily updates, work hours, reports, and dev workflows",
    icon: "ListTodo",
    order: 4,
  },
  {
    id: "people-hr",
    title: "People & HR",
    description: "Leave, attendance, WFH, hours, weekly reports, onboarding, reviews, and recruitment",
    icon: "CalendarClock",
    order: 5,
  },
  {
    id: "integrations",
    title: "Integrations",
    description: "BugDocs, BugSheets, and WhatsApp",
    icon: "Plug",
    order: 6,
  },
  {
    id: "administration",
    title: "Administration",
    description: "Users, assets, clients, recycle bin, push coverage, OT, settings, backups, and audit",
    icon: "Shield",
    order: 7,
  },
];

export function getCategoryById(id: string): HelpCategory | undefined {
  return HELP_CATEGORIES.find((c) => c.id === id);
}
