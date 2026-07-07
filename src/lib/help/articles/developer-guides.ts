import type { HelpArticle } from "../types";
import { helpImage } from "../types";

export const developerGuideArticles: HelpArticle[] = [
  {
    id: "developer-handbook",
    categoryId: "productivity",
    title: "Developer Handbook — Full Workflow",
    description:
      "Complete developer guide: bugs, fixes, tasks, work updates, docs, and collaboration tools.",
    roles: ["developer"],
    keywords: ["developer", "handbook", "workflow", "dev"],
    readMinutes: 12,
    relatedIds: ["bugs-workflow", "daily-work-update", "bugtodo-guide", "developer-fixing-bugs"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Developers on BugRicer manage assigned bugs, submit fixes, track daily work hours, collaborate via BugMessage and BugMeet, and use BugDocs/BugSheets for documentation. Your sidebar includes all core tracking tools plus productivity modules.",
          },
        ],
      },
      {
        id: "daily-flow",
        heading: "Typical daily flow",
        blocks: [
          {
            type: "list",
            items: [
              "Check in via Daily Work Update or BugToDo",
              "Review assigned bugs (Bugs → filter by assignee)",
              "Work on fixes and update bug status to In Progress",
              "Submit fixes with clear descriptions",
              "Log project hours and tasks before checkout",
              "Submit BugUpdate daily status if required by your team",
            ],
          },
        ],
      },
      {
        id: "tools",
        heading: "Developer tools map",
        blocks: [
          {
            type: "table",
            headers: ["Tool", "Purpose"],
            rows: [
              ["Bugs / Fixes", "Track and resolve issues"],
              ["BugToDo / My Tasks", "Personal and shared task lists"],
              ["Daily Work Update", "Check-in, hours, OT requests"],
              ["BugUpdate", "Daily status narrative"],
              ["BugDocs / BugSheets", "Google Docs & Sheets integration"],
              ["BugMessage / BugMeet", "Chat and video meetings"],
              ["Common Bugs", "Avoid duplicate reports"],
              ["Project Compliance", "CODo verification rules"],
              ["Reports", "Analytics and metrics"],
            ],
          },
        ],
      },
    ],
  },
  {
    id: "developer-fixing-bugs",
    categoryId: "bug-tracking",
    title: "Fixing Bugs & Submitting Fixes",
    description:
      "Assign bugs, work in progress, submit fix details, and hand off to testers for verification.",
    roles: ["developer"],
    keywords: ["fix", "assign", "in progress", "submit fix", "developer"],
    readMinutes: 8,
    relatedIds: ["bugs-workflow", "fixes-guide", "developer-handbook"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "When you pick up a bug, assign yourself, set status to In Progress, investigate, then submit a fix with enough detail for the tester to verify.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Fix workflow",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open the bug",
                body: "From Bugs, click the issue. Read reproduction steps and attachments carefully.",
                screenshot: helpImage("bugs-workflow", 1),
              },
              {
                title: "Assign and set In Progress",
                body: "Assign to yourself and update status so the team knows you are working on it.",
                screenshot: helpImage("bugs-workflow", 2),
              },
              {
                title: "Submit fix",
                body: "Click Fix. Describe what you changed, branch/commit if applicable, and mark as Fixed.",
                screenshot: helpImage("bugs-workflow", 3),
              },
            ],
          },
        ],
      },
      {
        id: "tips",
        heading: "Fix submission tips",
        blocks: [
          {
            type: "list",
            items: [
              "Mention which environment/build contains the fix",
              "List files or modules changed",
              "Note any side effects or follow-up work needed",
              "Link related bugs if this fix addresses multiple issues",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "developer-my-tasks",
    categoryId: "productivity",
    title: "My Tasks — Personal Task Management",
    description:
      "Create, prioritize, and complete personal tasks separate from shared team tasks.",
    roles: ["developer"],
    keywords: ["my tasks", "personal", "todo", "tasks"],
    readMinutes: 5,
    relatedIds: ["bugtodo-guide", "developer-handbook"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "My Tasks is your personal task board. Use it for individual work items, reminders, and planning outside of shared BugToDo team tasks.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Manage personal tasks",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open My Tasks",
                body: "Navigate to My Tasks from the sidebar or global search (⌘K).",
              },
              {
                title: "Create a task",
                body: "Add title, description, due date, and priority. Tasks are private to you unless shared.",
              },
              {
                title: "Track completion",
                body: "Mark tasks complete as you finish. Use tasks to organize bug fixes and feature work.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "developer-shared-tasks",
    categoryId: "productivity",
    title: "Shared Tasks & Team Check-In",
    description:
      "Use BugToDo shared tasks, check-in/check-out, and coordinate work with your team.",
    roles: ["developer"],
    keywords: ["shared tasks", "check in", "check out", "team", "bugtodo"],
    readMinutes: 7,
    relatedIds: ["bugtodo-guide", "daily-work-update", "developer-handbook"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "BugToDo Shared Tasks let leads assign work to the team. Combined with check-in/check-out, it tracks who is working and on what.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Use shared tasks",
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
                title: "Shared Tasks tab",
                body: "View tasks assigned to you or the whole team.",
                screenshot: helpImage("bugtodo-guide", 2),
              },
              {
                title: "Check in and complete",
                body: "Check in when starting work. Mark tasks done and check out at end of day.",
                screenshot: helpImage("bugtodo-guide", 3),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "developer-compliance-stage",
    categoryId: "bug-tracking",
    title: "Developer Compliance Stage (CODo)",
    description:
      "Complete developer verification rules in the CODo compliance pipeline before QA inspection.",
    roles: ["developer"],
    keywords: ["compliance", "codo", "developer unverified", "rules", "pipeline"],
    readMinutes: 7,
    relatedIds: ["project-compliance", "daily-work-update", "admin-compliance-pipeline"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Project Compliance tracks a verification pipeline: Developer Unverified → QA Inspection → Admin Final Lock. Developers must complete their rule checklist before the project advances to tester QA.",
          },
        ],
      },
      {
        id: "pipeline",
        heading: "Pipeline stages",
        blocks: [
          {
            type: "table",
            headers: ["Stage", "Who acts", "Goal"],
            rows: [
              ["Developer Unverified", "Developer", "Complete all developer rules (code, docs, submissions)"],
              ["QA Inspection", "Tester", "Run stress tests and verification checklist"],
              ["Admin Final Lock", "Admin", "Authorize final project status and billing gates"],
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Complete developer rules",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open project compliance",
                body: "Go to Projects → select project → Compliance tab.",
                screenshot: helpImage("project-compliance", 1),
              },
              {
                title: "Review Developer Unverified rules",
                body: "Check each rule. Mark verified when complete. Progress shows X/Y rules done.",
                screenshot: helpImage("project-compliance", 2),
              },
              {
                title: "Submit daily work on time",
                body: "Many rules tie to Daily Work Update submissions — keep hours and project notes current.",
                screenshot: helpImage("project-compliance", 3),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "developer-project-details",
    categoryId: "bug-tracking",
    title: "Project Details for Developers",
    description:
      "Use project overview, members, bugs, updates, compliance, and linked docs from one place.",
    roles: ["developer"],
    keywords: ["project details", "members", "overview", "tabs"],
    readMinutes: 6,
    relatedIds: ["projects-guide", "developer-compliance-stage"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Each project has a detail page with overview stats, team members, bug list, updates, compliance status, and links to BugDocs/BugSheets.",
          },
        ],
      },
      {
        id: "tabs",
        heading: "What you can access",
        blocks: [
          {
            type: "list",
            items: [
              "Overview — project status, description, key metrics",
              "Bugs — all bugs for this project",
              "Members — who is on the team and their roles",
              "Updates — release notes and changelogs",
              "Compliance — CODo pipeline and rule progress",
              "Documents — linked BugDocs and BugSheets",
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Open project details",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Select a project",
                body: "From Projects, click the project card.",
                screenshot: helpImage("projects-guide", 2),
              },
              {
                title: "Navigate tabs",
                body: "Use tabs to jump between bugs, compliance, and documentation.",
                screenshot: helpImage("projects-guide", 3),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "developer-context-menu",
    categoryId: "getting-started",
    title: "Context Menu & Productivity Tools",
    description:
      "Right-click actions: copy, paste, navigate, Malayalam translation, and quick create.",
    roles: ["developer"],
    keywords: ["context menu", "translate", "malayalam", "clipboard", "right click"],
    readMinutes: 5,
    relatedIds: ["search-and-shortcuts", "malayalam-translation"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Right-click anywhere in BugRicer to open the context menu. It groups actions into Create, Navigate, Clipboard, and App sections for faster workflows.",
          },
        ],
      },
      {
        id: "features",
        heading: "Available actions",
        blocks: [
          {
            type: "table",
            headers: ["Section", "Actions"],
            rows: [
              ["Create", "New Bug (Ctrl+B), New Update (Ctrl+U)"],
              ["Navigate", "Jump to Projects, Bugs, Fixes, Updates, Profile, Settings"],
              ["Clipboard", "Copy, Cut, Paste selected text"],
              ["App", "Translate selected text to Malayalam (മ), toggle dark mode"],
            ],
          },
        ],
      },
      {
        id: "translate",
        heading: "Malayalam translation",
        blocks: [
          {
            type: "callout",
            variant: "info",
            text: "Select text on the page, right-click, and choose Translate. The Malayalam translation is copied to your clipboard. Do not translate passwords or confidential data.",
          },
        ],
      },
    ],
  },
  {
    id: "developer-bugdocs-bugsheets",
    categoryId: "integrations",
    title: "BugDocs & BugSheets for Developers",
    description:
      "Link Google Docs and Sheets to projects for specs, test plans, and data tracking.",
    roles: ["developer"],
    keywords: ["bugdocs", "bugsheets", "google", "documentation"],
    readMinutes: 6,
    relatedIds: ["bugdocs-guide", "bugsheets-guide", "developer-project-details"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Developers use BugDocs for specifications and BugSheets for test data, checklists, or custom trackers. Both require one-time Google OAuth authorization.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Link documents",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Authorize Google",
                body: "First visit to BugDocs or BugSheets prompts Google sign-in.",
                screenshot: helpImage("bugdocs-guide", 2),
              },
              {
                title: "Select project",
                body: "Choose a project and link existing docs or create new ones.",
                screenshot: helpImage("bugdocs-guide", 3),
              },
              {
                title: "Access from project",
                body: "Open linked docs from the project details Documents tab.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "developer-reports-analytics",
    categoryId: "productivity",
    title: "Reports & Metrics for Developers",
    description:
      "Use Reports to analyze bug trends, fix rates, and project health.",
    roles: ["developer"],
    keywords: ["reports", "analytics", "metrics", "charts"],
    readMinutes: 5,
    relatedIds: ["reports-guide", "developer-handbook"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Reports provides charts and exports for bug volume, resolution time, and project activity. Access via ⌘K search or /{role}/reports.",
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
                body: "Search 'Reports' with ⌘K or navigate directly.",
                screenshot: helpImage("reports-guide", 1),
              },
              {
                title: "Apply filters",
                body: "Filter by project, date range, status, or assignee.",
                screenshot: helpImage("reports-guide", 2),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "developer-messaging-meetings",
    categoryId: "collaboration",
    title: "BugMessage & BugMeet for Developers",
    description:
      "Team chat, voice notes, and video meetings for standups and bug triage.",
    roles: ["developer"],
    keywords: ["bugmessage", "bugmeet", "chat", "video", "meeting"],
    readMinutes: 6,
    relatedIds: ["bugmessage-guide", "bugmeet-guide", "developer-handbook"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "BugMessage handles async team chat with text and voice notes. BugMeet provides video calls with screen sharing for live debugging sessions.",
          },
        ],
      },
      {
        id: "message-steps",
        heading: "BugMessage",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open BugMessage",
                body: "Click BugMessage in the sidebar.",
                screenshot: helpImage("bugmessage-guide", 1),
              },
              {
                title: "Chat or voice",
                body: "Send text, files, or record voice notes in DMs or group chats.",
                screenshot: helpImage("bugmessage-guide", 3),
              },
            ],
          },
        ],
      },
      {
        id: "meet-steps",
        heading: "BugMeet",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Create or join meeting",
                body: "Open BugMeet, create a room, and share the code with teammates.",
                screenshot: helpImage("bugmeet-guide", 2),
              },
            ],
          },
        ],
      },
    ],
  },
];
