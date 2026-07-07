import type { HelpArticle } from "../types";
import { helpImage } from "../types";

export const bugTrackingArticles: HelpArticle[] = [
  {
    id: "projects-guide",
    categoryId: "bug-tracking",
    title: "Projects Guide",
    description: "Create and manage projects, add members, and access compliance.",
    roles: ["all"],
    keywords: ["projects", "create", "members", "team"],
    readMinutes: 6,
    relatedIds: ["bugs-reporting", "project-compliance", "getting-started-overview"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Projects are the top-level containers for bugs, updates, and team collaboration. Each project has members with roles, status tracking, and optional CODo compliance monitoring.",
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
              { role: "Admin", access: "Create, edit, delete all projects" },
              { role: "Developer", access: "Create and manage assigned projects" },
              { role: "Tester", access: "View and report bugs in assigned projects" },
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Create a project",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Go to Projects",
                body: "Click Projects in the sidebar to see all projects you have access to.",
                screenshot: helpImage("projects-guide", 1),
              },
              {
                title: "Click New Project",
                body: "Enter project name, description, and initial settings.",
                screenshot: helpImage("projects-guide", 2),
              },
              {
                title: "Add team members",
                body: "Open project details and add developers, testers, and admins as members.",
                screenshot: helpImage("projects-guide", 3),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "bugs-reporting",
    categoryId: "bug-tracking",
    title: "Reporting Bugs",
    description: "Report new bugs with screenshots, voice notes, and detailed descriptions.",
    roles: ["all"],
    keywords: ["bug", "report", "screenshot", "voice", "new bug"],
    readMinutes: 7,
    relatedIds: ["bugs-workflow", "projects-guide", "common-bugs"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Bug reporting is central to BugRicer. You can attach screenshots, record voice notes, set priority and severity, and link bugs to projects.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Report a new bug",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open New Bug",
                body: "Go to Bugs → New Bug, or press Ctrl+B. Select the project first.",
                screenshot: helpImage("bugs-reporting", 1),
              },
              {
                title: "Fill in details",
                body: "Enter title, description, steps to reproduce, expected vs actual behavior, priority, and severity.",
                screenshot: helpImage("bugs-reporting", 2),
              },
              {
                title: "Add media",
                body: "Upload screenshots or record a voice note to explain the issue clearly.",
                screenshot: helpImage("bugs-reporting", 3),
              },
              {
                title: "Submit",
                body: "Click Submit. The bug appears in the project's bug list and assigned developers are notified.",
              },
            ],
          },
        ],
      },
      {
        id: "tips",
        heading: "Tips",
        blocks: [
          {
            type: "callout",
            variant: "tip",
            title: "Better bug reports",
            text: "Include clear reproduction steps, environment details, and screenshots. Check Common Bugs before reporting to avoid duplicates.",
          },
        ],
      },
    ],
  },
  {
    id: "bugs-workflow",
    categoryId: "bug-tracking",
    title: "Bug Workflow & Lifecycle",
    description: "Assign, update status, comment, and fix bugs through the full lifecycle.",
    roles: ["all"],
    keywords: ["assign", "status", "fix", "workflow", "lifecycle"],
    readMinutes: 8,
    relatedIds: ["bugs-reporting", "fixes-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Bugs move through statuses like Open, In Progress, Fixed, Verified, and Closed. Developers assign themselves or are assigned by admins. Comments, status changes, and fix submissions are tracked in the activity log.",
          },
        ],
      },
      {
        id: "status-table",
        heading: "Bug statuses",
        blocks: [
          {
            type: "table",
            headers: ["Status", "Meaning", "Typical action"],
            rows: [
              ["Open", "Newly reported", "Assign to developer"],
              ["In Progress", "Being worked on", "Developer investigates"],
              ["Fixed", "Fix submitted", "Tester verifies"],
              ["Verified", "Fix confirmed", "Close bug"],
              ["Closed", "Resolved", "Archive"],
              ["Reopened", "Issue persists", "Re-assign"],
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Work on a bug",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open bug details",
                body: "Click a bug from the Bugs list to view full details, comments, and attachments.",
                screenshot: helpImage("bugs-workflow", 1),
              },
              {
                title: "Assign and update status",
                body: "Assign the bug to a developer and change status to In Progress.",
                screenshot: helpImage("bugs-workflow", 2),
              },
              {
                title: "Submit a fix",
                body: "Use the Fix button to describe the fix, link commits, and mark as Fixed.",
                screenshot: helpImage("bugs-workflow", 3),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "fixes-guide",
    categoryId: "bug-tracking",
    title: "Fixes Guide",
    description: "View and manage all bug fixes across projects.",
    roles: ["all"],
    keywords: ["fixes", "resolved", "fixed bugs"],
    readMinutes: 4,
    relatedIds: ["bugs-workflow", "bugs-reporting"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "The Fixes page shows all bugs marked as fixed. Testers verify fixes here before closing bugs. Developers can review their submitted fixes.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Verify a fix",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Fixes",
                body: "Click Fixes in the sidebar or press Ctrl+Shift+F.",
                screenshot: helpImage("fixes-guide", 1),
              },
              {
                title: "Review fix details",
                body: "Open a fix to read the developer's description and linked bug.",
                screenshot: helpImage("fixes-guide", 2),
              },
              {
                title: "Verify or reopen",
                body: "If the fix works, mark as Verified. If not, reopen the bug with comments.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "updates-guide",
    categoryId: "bug-tracking",
    title: "Updates Guide",
    description: "Create and manage project updates and release notes.",
    roles: ["all"],
    keywords: ["updates", "release notes", "changelog"],
    readMinutes: 5,
    relatedIds: ["projects-guide", "bugs-workflow"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Updates let teams share release notes, sprint summaries, and project announcements. Each update can be linked to a project and tagged.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Create an update",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Go to Updates",
                body: "Click Updates in the sidebar or press Ctrl+Shift+U.",
                screenshot: helpImage("updates-guide", 1),
              },
              {
                title: "New Update",
                body: "Press Ctrl+U or click New Update. Select project, title, and content.",
                screenshot: helpImage("updates-guide", 2),
              },
              {
                title: "Publish",
                body: "Save and publish. Team members receive notifications based on their preferences.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "common-bugs",
    categoryId: "bug-tracking",
    title: "Common Bugs",
    description: "Track recurring bugs and avoid duplicate reports.",
    roles: ["admin", "developer"],
    keywords: ["common bugs", "duplicate", "recurring"],
    readMinutes: 4,
    relatedIds: ["bugs-reporting"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Common Bugs helps developers and admins track frequently reported issues. Before filing a new bug, check if it already exists as a common bug.",
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
              { role: "Admin", access: "Full access" },
              { role: "Developer", access: "View and manage common bugs" },
              { role: "Tester", access: "Not available in sidebar" },
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Use Common Bugs",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Common Bugs",
                body: "Available in the sidebar for admins and developers.",
                screenshot: helpImage("common-bugs", 1),
              },
              {
                title: "Search existing",
                body: "Search before reporting new bugs to avoid duplicates.",
                screenshot: helpImage("common-bugs", 2),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "project-compliance",
    categoryId: "bug-tracking",
    title: "Project Compliance (CODo)",
    description: "Monitor CODo compliance rules and project phase requirements.",
    roles: ["admin", "developer"],
    keywords: ["compliance", "codo", "project phase", "rules"],
    readMinutes: 6,
    relatedIds: ["projects-guide", "daily-work-update"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Project Compliance tracks CODo billing rules, project phases, and work submission requirements. Access it from a project's detail page.",
          },
        ],
      },
      {
        id: "steps",
        heading: "View compliance",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open project",
                body: "Navigate to Projects and select a project.",
                screenshot: helpImage("project-compliance", 1),
              },
              {
                title: "Open Compliance tab",
                body: "Click Compliance to see phase status, rules, and submission history.",
                screenshot: helpImage("project-compliance", 2),
              },
              {
                title: "Review rules",
                body: "Check which compliance rules apply and their current status (met, pending, overdue).",
                screenshot: helpImage("project-compliance", 3),
              },
            ],
          },
        ],
      },
      {
        id: "tips",
        heading: "Tips",
        blocks: [
          {
            type: "callout",
            variant: "warning",
            text: "Compliance status affects billing periods. Ensure daily work updates are submitted on time.",
          },
        ],
      },
    ],
  },
];
