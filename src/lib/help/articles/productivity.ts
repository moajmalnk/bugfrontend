import type { HelpArticle } from "../types";
import { helpImage } from "../types";

export const productivityArticles: HelpArticle[] = [
  {
    id: "bugtodo-guide",
    categoryId: "productivity",
    title: "BugToDo Tasks Guide",
    description: "Manage shared tasks, check-ins, and task assignments.",
    roles: ["admin", "developer"],
    keywords: ["tasks", "todo", "bugtodo", "check in"],
    readMinutes: 6,
    relatedIds: ["daily-work-update", "bugupdate-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "BugToDo manages team tasks with shared task lists, check-in/check-out, and work submission tracking. Requires TASKS_VIEW or TASKS_CREATE permissions.",
          },
        ],
      },
      {
        id: "who-can-use",
        heading: "Who can use this",
        blocks: [
          {
            type: "permission-table",
            rows: [
              { role: "Admin", access: "View all tasks, create, assign" },
              { role: "Developer", access: "View assigned and shared tasks" },
              { role: "Tester", access: "Not in default sidebar" },
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Use BugToDo",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open BugToDo",
                body: "Click BugToDo in the sidebar.",
                screenshot: helpImage("bugtodo-guide", 1),
              },
              {
                title: "View shared tasks",
                body: "Use the Shared Tasks tab to see team tasks.",
                screenshot: helpImage("bugtodo-guide", 2),
              },
              {
                title: "Check in and work",
                body: "Check in to start tracking time. Complete tasks and check out when done.",
                screenshot: helpImage("bugtodo-guide", 3),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "bugupdate-guide",
    categoryId: "productivity",
    title: "BugUpdate Daily Updates",
    description: "Submit daily project updates and status reports.",
    roles: ["admin", "developer"],
    keywords: ["daily update", "bugupdate", "status report"],
    readMinutes: 5,
    relatedIds: ["daily-work-update", "bugtodo-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "BugUpdate is for daily status reports — what you worked on, blockers, and plans. Separate from work hours tracking in Daily Work Update.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Submit a daily update",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open BugUpdate",
                body: "Click BugUpdate in the sidebar.",
                screenshot: helpImage("bugupdate-guide", 1),
              },
              {
                title: "Fill today's update",
                body: "Select project, describe work done, blockers, and tomorrow's plan.",
                screenshot: helpImage("bugupdate-guide", 2),
              },
              {
                title: "Submit",
                body: "Save your update. Admins and team leads can review submission history.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "daily-work-update",
    categoryId: "productivity",
    title: "Daily Work Update & Overtime",
    description: "Track work hours, breaks, project updates, and request overtime.",
    roles: ["admin", "developer"],
    keywords: ["work hours", "check in", "overtime", "ot", "daily work"],
    readMinutes: 8,
    relatedIds: ["overtime-requests", "project-compliance", "bugtodo-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Daily Work Update tracks check-in/check-out, breaks, hours per project, and optional overtime (OT) requests. Submissions feed into admin OT approval and CODo compliance.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Submit work for the day",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Daily Work Update",
                body: "Navigate to Daily Work Update from BugToDo or the direct route.",
                screenshot: helpImage("daily-work-update", 1),
              },
              {
                title: "Check in",
                body: "Start your day with check-in. Add breaks as needed throughout the day.",
                screenshot: helpImage("daily-work-update", 2),
              },
              {
                title: "Log project work",
                body: "Add hours and updates per project. Request extra hours if you worked overtime.",
                screenshot: helpImage("daily-work-update", 3),
              },
              {
                title: "Submit and check out",
                body: "Review totals and submit. OT requests go to admin for approval.",
              },
            ],
          },
        ],
      },
      {
        id: "ot",
        heading: "Overtime requests",
        blocks: [
          {
            type: "callout",
            variant: "info",
            title: "OT approval",
            text: "When you request extra hours, admins review them under Administration → OT requests. You will see approved, rejected, or changed status.",
          },
        ],
      },
    ],
  },
  {
    id: "reports-guide",
    categoryId: "productivity",
    title: "Reports & Analytics",
    description: "View project and team analytics reports.",
    roles: ["admin", "developer"],
    keywords: ["reports", "analytics", "statistics"],
    readMinutes: 4,
    relatedIds: ["projects-guide", "feedback-stats"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Reports provides analytics on bugs, fixes, project progress, and team activity. Accessible via global search; not shown in sidebar for testers.",
          },
        ],
      },
      {
        id: "steps",
        heading: "View reports",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Reports",
                body: "Search for Reports (⌘K) or navigate to /{role}/reports.",
                screenshot: helpImage("reports-guide", 1),
              },
              {
                title: "Filter by project or date",
                body: "Use filters to narrow down metrics.",
                screenshot: helpImage("reports-guide", 2),
              },
            ],
          },
        ],
      },
    ],
  },
];
