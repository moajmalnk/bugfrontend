import type { HelpArticle } from "../types";
import { helpImage } from "../types";

export const administrationArticles: HelpArticle[] = [
  {
    id: "users-management",
    categoryId: "administration",
    title: "Users Management",
    description: "Add, edit, deactivate, and manage user permissions.",
    roles: ["admin"],
    keywords: ["users", "team", "permissions", "add user"],
    readMinutes: 8,
    relatedIds: ["settings-and-roles", "overtime-requests"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "The Users page is the admin hub for team management. View active users, add new accounts, edit profiles, deactivate users, and manage per-user permissions.",
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
              { role: "Admin", access: "Full user management" },
              { role: "Developer / Tester", access: "No access" },
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Manage users",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Users",
                body: "Go to Administration → Users.",
                screenshot: helpImage("users-management", 1),
              },
              {
                title: "Add a user",
                body: "Click Add User. Enter username, email, password, role, and phone.",
                screenshot: helpImage("users-management", 2),
              },
              {
                title: "View user details",
                body: "Click a user to see profile, work stats, active hours, and actions.",
                screenshot: helpImage("users-management", 3),
              },
              {
                title: "Manage permissions",
                body: "From user details, open Permissions to grant or revoke specific permissions beyond their role.",
              },
            ],
          },
        ],
      },
      {
        id: "actions",
        heading: "Available actions",
        blocks: [
          {
            type: "table",
            headers: ["Action", "Description"],
            rows: [
              ["Edit", "Update username, email, role, phone"],
              ["Change password", "Set a new password for the user"],
              ["Deactivate", "Disable login without deleting data"],
              ["Delete", "Remove user (10s undo; force delete if dependencies exist)"],
              ["Dashboard link", "Generate impersonation-style access link"],
            ],
          },
        ],
      },
    ],
  },
  {
    id: "overtime-requests",
    categoryId: "administration",
    title: "OT Requests (Overtime Approval)",
    description: "Review and approve employee overtime hour requests.",
    roles: ["admin"],
    keywords: ["overtime", "ot", "approval", "extra hours"],
    readMinutes: 7,
    relatedIds: ["daily-work-update", "users-management"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "When employees request extra hours during daily work submission, those requests appear here grouped by user. Admins approve, reject, or change the approved hours.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Review OT requests",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open OT requests",
                body: "Go to Administration → OT requests.",
                screenshot: helpImage("overtime-requests", 1),
              },
              {
                title: "Select a user",
                body: "Click a user to see their submissions grouped by billing month.",
                screenshot: helpImage("overtime-requests", 2),
              },
              {
                title: "Approve, reject, or change",
                body: "For each pending submission: Approve (use requested hours), Reject (with note), or Change (set different hours 0.25–16).",
                screenshot: helpImage("overtime-requests", 3),
              },
            ],
          },
        ],
      },
      {
        id: "statuses",
        heading: "Request statuses",
        blocks: [
          {
            type: "table",
            headers: ["Status", "Meaning"],
            rows: [
              ["Pending", "Awaiting admin review"],
              ["Approved", "OT hours accepted"],
              ["Rejected", "Request denied"],
              ["Changed", "Approved with modified hours"],
            ],
          },
        ],
      },
    ],
  },
  {
    id: "feedback-stats",
    categoryId: "administration",
    title: "Feedbacks Dashboard",
    description: "View and manage user feedback and satisfaction metrics.",
    roles: ["admin"],
    keywords: ["feedback", "stats", "rating", "satisfaction"],
    readMinutes: 4,
    permissionKey: "FEEDBACK_VIEW",
    relatedIds: ["feedback-widget", "settings-and-roles"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "The Feedbacks page shows aggregate ratings, distribution charts, and recent feedback submissions from the Rate Us widget.",
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
                body: "Go to Administration → Feedbacks.",
                screenshot: helpImage("feedback-stats", 1),
              },
              {
                title: "View metrics",
                body: "See total submissions, average rating, text feedback %, and satisfaction (4+ stars).",
                screenshot: helpImage("feedback-stats", 2),
              },
              {
                title: "Delete entries",
                body: "Remove inappropriate feedback with 10-second undo.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "activity-log",
    categoryId: "administration",
    title: "Activity Log",
    description: "Browse system activity and audit trail.",
    roles: ["admin"],
    keywords: ["activity", "audit", "log", "history"],
    readMinutes: 5,
    permissionKey: "ACTIVITY_VIEW",
    relatedIds: ["users-management", "bugs-workflow"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Activities logs bugs, tasks, projects, users, feedback, meetings, and more. Admins see all activity; others see project-scoped and global events.",
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
              { role: "Admin", access: "All activities, can delete" },
              { role: "Developer / Tester", access: "Project-scoped activities" },
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Browse activities",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Activities",
                body: "Go to Administration → Activities.",
                screenshot: helpImage("activity-log", 1),
              },
              {
                title: "Filter and search",
                body: "Use tabs (All / My Activities), search, type filter, and user filter.",
                screenshot: helpImage("activity-log", 2),
              },
              {
                title: "View details",
                body: "Click an activity for full details and related links.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "settings-and-roles",
    categoryId: "administration",
    title: "Settings & Roles",
    description: "Configure app settings, announcements, notifications, and custom roles.",
    roles: ["admin"],
    keywords: ["settings", "roles", "announcements", "permissions"],
    readMinutes: 8,
    permissionKey: "SETTINGS_EDIT",
    relatedIds: ["users-management", "bugbackup-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Settings controls general preferences, notification defaults, system announcements, and custom role permissions.",
          },
        ],
      },
      {
        id: "tabs",
        heading: "Settings tabs",
        blocks: [
          {
            type: "table",
            headers: ["Tab", "Purpose"],
            rows: [
              ["General", "Dark mode, auto-assign bugs, refresh permissions cache"],
              ["Notifications", "Default notification toggles for the team"],
              ["Announcements", "Create, edit, publish system-wide announcements"],
              ["Roles", "Create custom roles and assign permission checkboxes"],
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Manage roles",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Settings",
                body: "Go to Administration → Settings.",
                screenshot: helpImage("settings-and-roles", 1),
              },
              {
                title: "Roles tab",
                body: "Create custom roles and check permissions for each.",
                screenshot: helpImage("settings-and-roles", 2),
              },
              {
                title: "Announcements tab",
                body: "Publish announcements to all users or specific roles.",
                screenshot: helpImage("settings-and-roles", 3),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "bugbackup-guide",
    categoryId: "administration",
    title: "BugBackup Guide",
    description: "Create backup jobs and restore data from archives.",
    roles: ["admin"],
    keywords: ["backup", "restore", "database", "bugbackup"],
    readMinutes: 7,
    permissionKey: "SETTINGS_EDIT",
    relatedIds: ["settings-and-roles"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "BugBackup creates async backup jobs for database, uploads, and config. Completed archives are emailed to you. Restore is manual following the documented steps.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Create a backup",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open BugBackup",
                body: "Go to Administration → BugBackup.",
                screenshot: helpImage("bugbackup-guide", 1),
              },
              {
                title: "Choose components",
                body: "Select Database, Uploads, and/or Config. Enter delivery email.",
                screenshot: helpImage("bugbackup-guide", 2),
              },
              {
                title: "Monitor progress",
                body: "Job status updates automatically (queued → processing → completed). History shows last 15 jobs.",
                screenshot: helpImage("bugbackup-guide", 3),
              },
            ],
          },
        ],
      },
      {
        id: "restore",
        heading: "Restore steps",
        blocks: [
          {
            type: "list",
            items: [
              "Download the backup archive from your email",
              "Import the database SQL file via phpMyAdmin or mysql CLI",
              "Restore uploads folder to the server uploads directory",
              "Review and apply config files as needed",
              "Verify the application loads correctly",
            ],
          },
          {
            type: "callout",
            variant: "warning",
            title: "Important",
            text: "Restore is not automated in-app. Always test restores in a staging environment first.",
          },
        ],
      },
    ],
  },
];
