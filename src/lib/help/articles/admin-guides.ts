import type { HelpArticle } from "../types";
import { helpImage } from "../types";

export const adminGuideArticles: HelpArticle[] = [
  {
    id: "admin-handbook",
    categoryId: "administration",
    title: "Admin Handbook — Full Platform Control",
    description:
      "Complete admin guide: users, roles, compliance, backups, OT, WhatsApp, and governance.",
    roles: ["admin"],
    keywords: ["admin", "handbook", "governance", "platform"],
    readMinutes: 15,
    relatedIds: ["users-management", "settings-and-roles", "admin-compliance-pipeline", "bugbackup-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Admins have full access to BugRicer including the Administration section: Users, OT requests, WhatsApp, BugBackup, Activities, Feedbacks, and Settings. You manage team access, compliance pipelines, announcements, and disaster recovery.",
          },
        ],
      },
      {
        id: "admin-nav",
        heading: "Administration menu",
        blocks: [
          {
            type: "table",
            headers: ["Page", "Purpose"],
            rows: [
              ["Users", "Add, edit, deactivate users; per-user permissions"],
              ["OT requests", "Approve overtime from Daily Work Update"],
              ["WhatsApp", "Send single or bulk WhatsApp messages"],
              ["BugBackup", "Database, uploads, and config backups"],
              ["Activities", "Platform-wide audit log"],
              ["Feedbacks", "Rate Us widget submissions and metrics"],
              ["Settings", "General, notifications, announcements, custom roles"],
            ],
          },
        ],
      },
      {
        id: "daily-flow",
        heading: "Typical admin responsibilities",
        blocks: [
          {
            type: "list",
            items: [
              "Review and approve OT requests daily",
              "Monitor Activity log for unusual actions",
              "Publish announcements for team-wide updates",
              "Manage user onboarding and role assignments",
              "Oversee project compliance pipelines",
              "Schedule periodic BugBackup archives",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "admin-compliance-pipeline",
    categoryId: "administration",
    title: "CODo Compliance Pipeline (Admin)",
    description:
      "Manage the verification pipeline: Developer Unverified → QA Inspection → Admin Final Lock.",
    roles: ["admin"],
    keywords: ["compliance", "codo", "pipeline", "admin lock", "verification"],
    readMinutes: 9,
    relatedIds: ["project-compliance", "developer-compliance-stage", "admin-handbook"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "The Compliance page shows pipeline telemetry for each project: developer rules, QA stress tests, and admin final authorization. Overall progress is calculated across all stages.",
          },
        ],
      },
      {
        id: "pipeline",
        heading: "Pipeline stages",
        blocks: [
          {
            type: "table",
            headers: ["Stage", "Description", "Admin action"],
            rows: [
              ["Developer Unverified", "Developer completes coding/docs rules", "Monitor progress; unblock if stuck"],
              ["QA Inspection", "Tester runs stress tests (e.g. 7 tests)", "Ensure testers complete before lock"],
              ["Admin Final Lock", "Project gates for billing/status", "Authorize final lock when all gates pass"],
            ],
          },
        ],
      },
      {
        id: "admin-overview",
        heading: "Admin Overview panel",
        blocks: [
          {
            type: "paragraph",
            text: "Expand Admin Overview on the Compliance page to see pipeline telemetry, current stage, and project-level checklist. Use '+ Add Rule' to define custom project-level compliance rules.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Finalize project compliance",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open project compliance",
                body: "Projects → select project → Compliance.",
                screenshot: helpImage("project-compliance", 1),
              },
              {
                title: "Review all stages",
                body: "Confirm developer and QA stages show 100% or acceptable progress.",
                screenshot: helpImage("project-compliance", 2),
              },
              {
                title: "Admin Final Lock",
                body: "When gates are met, authorize final status from Admin Overview. Project status updates accordingly.",
                screenshot: helpImage("project-compliance", 3),
              },
            ],
          },
        ],
      },
      {
        id: "warning",
        heading: "Important",
        blocks: [
          {
            type: "callout",
            variant: "warning",
            text: "Final lock affects billing and project phase. Only authorize when all rules and stress tests are genuinely complete.",
          },
        ],
      },
    ],
  },
  {
    id: "admin-announcements",
    categoryId: "administration",
    title: "Publishing Announcements",
    description:
      "Create role-targeted announcements with active toggle and optional expiry dates.",
    roles: ["admin"],
    keywords: ["announcements", "broadcast", "publish", "expiry"],
    readMinutes: 6,
    relatedIds: ["settings-and-roles", "notifications-guide", "admin-handbook"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Announcements appear to selected roles (Admin, Developer, Tester, or all). Set an expiry date to auto-hide outdated notices. Active toggle controls immediate visibility.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Create an announcement",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Settings → Announcements",
                body: "Go to Administration → Settings → Announcements tab.",
                screenshot: helpImage("settings-and-roles", 1),
              },
              {
                title: "Create announcement",
                body: "Click Create. Enter title, body, target audience, and publish settings.",
                screenshot: helpImage("settings-and-roles", 3),
              },
              {
                title: "Set Active and Expiry",
                body: "Toggle Active on to publish. Set Expiry Date if the notice is time-limited. Both fields align in one row.",
              },
            ],
          },
        ],
      },
      {
        id: "tips",
        heading: "Best practices",
        blocks: [
          {
            type: "list",
            items: [
              "Use clear titles — e.g. 'Scheduled maintenance July 8'",
              "Target only affected roles to reduce noise",
              "Set expiry for temporary notices",
              "Review active announcements monthly",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "admin-custom-roles",
    categoryId: "administration",
    title: "Custom Roles & Permissions",
    description:
      "Create granular custom roles with permission checkboxes beyond Admin/Developer/Tester.",
    roles: ["admin"],
    keywords: ["custom roles", "permissions", "rbac", "access control"],
    readMinutes: 8,
    relatedIds: ["settings-and-roles", "users-management", "admin-handbook"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Custom roles let you grant specific permissions like MESSAGING_VIEW, TASKS_CREATE, ACTIVITY_VIEW, or SETTINGS_EDIT without making someone a full admin.",
          },
        ],
      },
      {
        id: "permissions",
        heading: "Common permissions",
        blocks: [
          {
            type: "table",
            headers: ["Permission", "Grants access to"],
            rows: [
              ["SETTINGS_EDIT", "Settings, BugBackup, role management"],
              ["ACTIVITY_VIEW", "Full activity log"],
              ["MESSAGING_VIEW / MESSAGING_CREATE", "BugMessage, WhatsApp admin"],
              ["TASKS_VIEW / TASKS_CREATE", "BugToDo and task management"],
              ["FEEDBACK_VIEW", "Feedbacks dashboard"],
              ["SUPER_ADMIN", "All permissions (use sparingly)"],
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Create a custom role",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Settings → Roles",
                body: "Open Administration → Settings → Roles tab.",
                screenshot: helpImage("settings-and-roles", 2),
              },
              {
                title: "Create Role",
                body: "Enter role name and description. Check permissions needed for the job function.",
              },
              {
                title: "Assign to users",
                body: "From Users → user details → assign the custom role alongside or instead of base role.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "admin-user-permissions",
    categoryId: "administration",
    title: "Per-User Permissions & Dashboard Links",
    description:
      "Override role defaults, generate dashboard access links, and manage impersonation-style access.",
    roles: ["admin"],
    keywords: ["permissions", "dashboard link", "impersonate", "user access"],
    readMinutes: 7,
    relatedIds: ["users-management", "admin-custom-roles"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Beyond role-based access, admins can grant individual permissions to users and generate time-limited dashboard links for support or auditing.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Manage user permissions",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open user details",
                body: "Administration → Users → click a user.",
                screenshot: helpImage("users-management", 3),
              },
              {
                title: "Permissions page",
                body: "Open Permissions to grant or revoke specific permission keys.",
              },
              {
                title: "Dashboard link",
                body: "Generate a dashboard access link when you need to view the app as that user for support.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "admin-user-work-stats",
    categoryId: "administration",
    title: "User Work Stats & Active Hours",
    description:
      "Review employee work submissions, hours, active time, and billing period stats.",
    roles: ["admin"],
    keywords: ["work stats", "active hours", "hours", "billing", "submissions"],
    readMinutes: 6,
    relatedIds: ["users-management", "daily-work-update", "overtime-requests"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "From a user's profile, admins can view work statistics, active hours charts, and per-period submission history. This data supports OT approval and compliance audits.",
          },
        ],
      },
      {
        id: "steps",
        heading: "View work stats",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Users",
                body: "Administration → Users.",
                screenshot: helpImage("users-management", 1),
              },
              {
                title: "Select user",
                body: "Click a user to open their detail page with work summary.",
                screenshot: helpImage("users-management", 3),
              },
              {
                title: "Work stats period",
                body: "Drill into a billing period to see daily submissions, hours, and OT requests.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "admin-project-lifecycle",
    categoryId: "administration",
    title: "Project Lifecycle & Status Management",
    description:
      "Create projects, manage phases, assign members, edit settings, and control project status.",
    roles: ["admin"],
    keywords: ["project", "create", "status", "phase", "members", "lifecycle"],
    readMinutes: 8,
    relatedIds: ["projects-guide", "admin-compliance-pipeline", "admin-handbook"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Admins control the full project lifecycle: creation, team assignment, status (Active, Ongoing, Completed), compliance phases, and archival.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Manage projects",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Create project",
                body: "Projects → New Project, or right-click → New Project from context menu.",
                screenshot: helpImage("projects-guide", 2),
              },
              {
                title: "Add members",
                body: "Assign developers, testers, and other admins with project roles.",
                screenshot: helpImage("projects-guide", 3),
              },
              {
                title: "Edit and compliance",
                body: "Edit project settings, open Compliance for CODo pipeline, and update status when phases complete.",
              },
            ],
          },
        ],
      },
      {
        id: "context-menu",
        heading: "Quick create",
        blocks: [
          {
            type: "callout",
            variant: "tip",
            text: "Admins see 'New Project' in the right-click context menu under Create for fastest project setup.",
          },
        ],
      },
    ],
  },
  {
    id: "admin-activity-audit",
    categoryId: "administration",
    title: "Activity Log — Advanced Audit",
    description:
      "Search, filter, and audit all platform actions with actor, target, and metadata.",
    roles: ["admin"],
    keywords: ["activity", "audit", "filter", "search", "log"],
    readMinutes: 7,
    relatedIds: ["activity-log", "admin-handbook"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "The Activity page records actions across bugs, tasks, projects, users, settings, backups, and compliance. Admins get server-side search, type filters, user filters, and Mine Only toggle.",
          },
        ],
      },
      {
        id: "filters",
        heading: "Filter options",
        blocks: [
          {
            type: "table",
            headers: ["Filter", "Use case"],
            rows: [
              ["Search", "Find by keyword in summary or related title"],
              ["Type", "Filter by action type (bug, task, backup, etc.)"],
              ["User", "See all actions by a specific team member"],
              ["Mine Only", "Show only your own actions"],
              ["Tabs", "All Activities vs My Activities with live counts"],
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Audit an incident",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Activities",
                body: "Administration → Activities.",
                screenshot: helpImage("activity-log", 1),
              },
              {
                title: "Apply filters",
                body: "Set type, user, or search term. Review enriched cards with actor, target, and timestamps.",
                screenshot: helpImage("activity-log", 2),
              },
              {
                title: "Follow related links",
                body: "Click related entity links to jump to the bug, project, or user involved.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "admin-bugbackup-pro",
    categoryId: "administration",
    title: "BugBackup Pro — Disaster Recovery",
    description:
      "Launch scoped backups, monitor job history, and restore from emailed ZIP archives.",
    roles: ["admin"],
    keywords: ["bugbackup", "backup", "restore", "disaster recovery", "archive"],
    readMinutes: 8,
    relatedIds: ["bugbackup-guide", "settings-and-roles"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "BugBackup Pro creates ZIP archives with database SQL dump, uploads folder, config snapshot, manifest.json, and README. Jobs run in the background; completed archives are emailed to your delivery address.",
          },
        ],
      },
      {
        id: "scope",
        heading: "Backup scope options",
        blocks: [
          {
            type: "table",
            headers: ["Component", "Contents"],
            rows: [
              ["Database", "Full SQL export of all tables"],
              ["Uploads", "Media, screenshots, voice notes, attachments"],
              ["Config", "Application configuration files"],
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Run a backup",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open BugBackup",
                body: "Administration → BugBackup. Review stats dashboard for database size and last backup.",
                screenshot: helpImage("bugbackup-guide", 1),
              },
              {
                title: "Configure scope and email",
                body: "Toggle components, enter delivery email (check spam folder). Launch backup.",
                screenshot: helpImage("bugbackup-guide", 2),
              },
              {
                title: "Monitor history",
                body: "Track job status: processing → completed or failed. Error details appear in history.",
                screenshot: helpImage("bugbackup-guide", 3),
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
            text: "Gmail limits attachments to ~25MB. Large databases may require downloading from server directly or excluding uploads from email delivery.",
          },
        ],
      },
    ],
  },
  {
    id: "admin-whatsapp-bulk",
    categoryId: "integrations",
    title: "WhatsApp Admin Console",
    description:
      "Send individual and bulk WhatsApp notifications to team members with valid phone numbers.",
    roles: ["admin"],
    keywords: ["whatsapp", "bulk", "notify", "admin"],
    readMinutes: 6,
    relatedIds: ["whatsapp-admin", "users-management"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "The WhatsApp page under Administration sends outbound messages only — not a two-way inbox. Requires MESSAGING_CREATE or admin access.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Send messages",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open WhatsApp",
                body: "Administration → WhatsApp.",
                screenshot: helpImage("whatsapp-admin", 1),
              },
              {
                title: "Single or bulk",
                body: "Single tab for one recipient; Bulk tab for multi-select team blast.",
                screenshot: helpImage("whatsapp-admin", 2),
              },
              {
                title: "Verify delivery",
                body: "Ensure users have phone numbers in their profiles before sending.",
                screenshot: helpImage("whatsapp-admin", 3),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "admin-ot-approval",
    categoryId: "administration",
    title: "Overtime Approval Workflow",
    description:
      "Deep guide to reviewing OT requests grouped by user and billing month.",
    roles: ["admin"],
    keywords: ["overtime", "ot", "approve", "reject", "billing month"],
    readMinutes: 7,
    relatedIds: ["overtime-requests", "daily-work-update", "admin-user-work-stats"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "When developers submit extra hours in Daily Work Update, requests queue under OT requests. Review by user and billing month, then Approve, Reject, or Change hours.",
          },
        ],
      },
      {
        id: "actions",
        heading: "Review actions",
        blocks: [
          {
            type: "table",
            headers: ["Action", "When to use"],
            rows: [
              ["Approve", "Requested OT hours are correct"],
              ["Reject", "OT not authorized — add a note"],
              ["Change", "Approve partial hours (0.25–16 range)"],
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Process OT queue",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "OT requests page",
                body: "Administration → OT requests.",
                screenshot: helpImage("overtime-requests", 1),
              },
              {
                title: "Select user",
                body: "Click a user to see monthly grouped submissions.",
                screenshot: helpImage("overtime-requests", 2),
              },
              {
                title: "Decide each request",
                body: "Approve, reject, or modify hours with notes for audit trail.",
                screenshot: helpImage("overtime-requests", 3),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "admin-feedback-management",
    categoryId: "administration",
    title: "Managing User Feedback",
    description:
      "Analyze satisfaction metrics, read text feedback, and moderate submissions.",
    roles: ["admin"],
    keywords: ["feedback", "rating", "satisfaction", "moderate"],
    readMinutes: 5,
    relatedIds: ["feedback-stats", "feedback-widget"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Feedbacks aggregates Rate Us widget submissions: star distribution, average rating, satisfaction percentage, and recent comments.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Review feedback",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Feedbacks",
                body: "Administration → Feedbacks.",
                screenshot: helpImage("feedback-stats", 1),
              },
              {
                title: "Analyze trends",
                body: "Check average rating and 4+ star satisfaction rate over time.",
                screenshot: helpImage("feedback-stats", 2),
              },
              {
                title: "Moderate",
                body: "Delete spam or inappropriate entries (10-second undo available).",
              },
            ],
          },
        ],
      },
    ],
  },
];
