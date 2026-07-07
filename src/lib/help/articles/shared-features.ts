import type { HelpArticle } from "../types";
import { helpImage } from "../types";

/** Cross-role feature guides available to multiple roles */
export const sharedFeatureArticles: HelpArticle[] = [
  {
    id: "malayalam-translation",
    categoryId: "getting-started",
    title: "Malayalam Translation (മ)",
    description:
      "Translate selected text to Malayalam via the context menu — results copy to clipboard.",
    roles: ["all"],
    keywords: ["translate", "malayalam", "മ", "context menu", "language"],
    readMinutes: 3,
    relatedIds: ["developer-context-menu", "search-and-shortcuts"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Select any text on a BugRicer page, right-click, and choose Translate (മ) from the App section. The Malayalam translation is fetched and copied to your clipboard automatically.",
          },
        ],
      },
      {
        id: "steps",
        heading: "How to translate",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Select text",
                body: "Highlight the English text you want translated.",
              },
              {
                title: "Right-click → Translate",
                body: "Open the context menu and click Translate with the മ badge.",
              },
              {
                title: "Paste result",
                body: "A toast confirms success. Paste (Ctrl+V) wherever you need the Malayalam text.",
              },
            ],
          },
        ],
      },
      {
        id: "privacy",
        heading: "Privacy note",
        blocks: [
          {
            type: "callout",
            variant: "warning",
            text: "Selected text is sent to a third-party translation API. Do not translate passwords, API keys, or confidential client data.",
          },
        ],
      },
    ],
  },
  {
    id: "activity-for-team",
    categoryId: "administration",
    title: "Activity Log for Your Role",
    description:
      "View project-scoped activity as developer/tester, or full audit as admin.",
    roles: ["admin", "developer", "tester"],
    keywords: ["activity", "history", "audit", "timeline"],
    readMinutes: 5,
    relatedIds: ["activity-log", "admin-activity-audit"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Activities shows a timeline of platform events — bug changes, task updates, project edits, and more. Scope depends on your role and permissions.",
          },
        ],
      },
      {
        id: "access",
        heading: "Access by role",
        blocks: [
          {
            type: "permission-table",
            rows: [
              { role: "Admin", access: "All activities + delete", notes: "ACTIVITY_VIEW permission" },
              { role: "Developer", access: "Project-scoped + global events", notes: "From sidebar or search" },
              { role: "Tester", access: "Project-scoped activities", notes: "Bugs and projects you access" },
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Browse activity",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Activities",
                body: "Search 'Activity' with ⌘K or use Administration → Activities (admin).",
                screenshot: helpImage("activity-log", 1),
              },
              {
                title: "Use filters",
                body: "Search, filter by type or user, toggle Mine Only.",
                screenshot: helpImage("activity-log", 2),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "common-bugs-developer",
    categoryId: "bug-tracking",
    title: "Managing Common Bugs",
    description:
      "Track recurring issues, link duplicates, and reduce noise in the bug queue.",
    roles: ["admin", "developer"],
    keywords: ["common bugs", "duplicate", "recurring", "patterns"],
    readMinutes: 5,
    relatedIds: ["common-bugs", "bugs-reporting"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Common Bugs catalogs frequently reported issues. Developers and admins maintain this list so testers can check before filing duplicates.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Maintain common bugs",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Common Bugs",
                body: "Sidebar → Common Bugs.",
                screenshot: helpImage("common-bugs", 1),
              },
              {
                title: "Add or update entries",
                body: "Document known issues with workarounds and status.",
                screenshot: helpImage("common-bugs", 2),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "daily-update-vs-work-update",
    categoryId: "productivity",
    title: "BugUpdate vs Daily Work Update",
    description:
      "Understand the difference between status narratives and hours tracking.",
    roles: ["admin", "developer"],
    keywords: ["bugupdate", "daily work update", "hours", "status"],
    readMinutes: 4,
    relatedIds: ["bugupdate-guide", "daily-work-update"],
    sections: [
      {
        id: "comparison",
        heading: "What's the difference?",
        blocks: [
          {
            type: "table",
            headers: ["Feature", "BugUpdate", "Daily Work Update"],
            rows: [
              ["Purpose", "What you did / blockers / plans", "Check-in, hours, OT, compliance"],
              ["Data", "Narrative status per project", "Time tracking, breaks, billing"],
              ["Audience", "Team leads, project managers", "Admins, payroll, CODo compliance"],
              ["When", "End of day summary", "Throughout the day + checkout"],
            ],
          },
        ],
      },
      {
        id: "tip",
        heading: "Tip",
        blocks: [
          {
            type: "callout",
            variant: "info",
            text: "Many teams require both: Daily Work Update for hours/compliance and BugUpdate for qualitative progress notes.",
          },
        ],
      },
    ],
  },
  {
    id: "edit-bug-and-updates",
    categoryId: "bug-tracking",
    title: "Editing Bugs & Updates",
    description:
      "Modify bug details, attachments, and project updates after publication.",
    roles: ["admin", "developer", "tester"],
    keywords: ["edit bug", "edit update", "modify", "attachments"],
    readMinutes: 5,
    relatedIds: ["bugs-workflow", "updates-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Bug and update authors (and admins) can edit titles, descriptions, priority, and attachments. Testers typically edit only their own reports.",
          },
        ],
      },
      {
        id: "bug-edit",
        heading: "Edit a bug",
        blocks: [
          {
            type: "list",
            items: [
              "Open bug details → Edit button",
              "Update fields and save",
              "Add new screenshots or voice notes",
              "Status changes are logged in Activity",
            ],
          },
        ],
      },
      {
        id: "update-edit",
        heading: "Edit an update",
        blocks: [
          {
            type: "list",
            items: [
              "Open Updates → select an update",
              "Click Edit to modify content",
              "Save changes — subscribers may be re-notified",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "notifications-page-guide",
    categoryId: "getting-started",
    title: "Notifications Page — Full Guide",
    description:
      "Manage notification history, mark as read, and configure push alerts.",
    roles: ["all"],
    keywords: ["notifications", "bell", "push", "alerts", "history"],
    readMinutes: 5,
    relatedIds: ["notifications-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Beyond the sidebar bell, the Notifications page shows your full alert history: bug assignments, fix verifications, messages, announcements, and work update reminders.",
          },
        ],
      },
      {
        id: "types",
        heading: "Notification types",
        blocks: [
          {
            type: "list",
            items: [
              "Bug assigned or status changed",
              "Fix submitted — needs verification (testers)",
              "New announcement published",
              "BugMessage mentions",
              "Daily work / OT approval status",
              "Project member added",
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Manage notifications",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Notifications",
                body: "Click Notifications in sidebar or search with ⌘K.",
                screenshot: helpImage("notifications-guide", 1),
              },
              {
                title: "Enable push",
                body: "Allow browser notifications when prompted.",
                screenshot: helpImage("notifications-guide", 2),
              },
            ],
          },
        ],
      },
    ],
  },
];
