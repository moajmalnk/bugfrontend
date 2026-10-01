import type { HelpArticle } from "../types";

export const adminOperationsArticles: HelpArticle[] = [
  {
    id: "bugassets-guide",
    categoryId: "administration",
    title: "BugAssets — Infrastructure & Renewals",
    description:
      "Track domains, servers, hosting, Vercel, hardware, mailboxes, and premium tools, plus their renewal dates.",
    roles: ["admin"],
    permissionKey: "ASSETS_VIEW",
    keywords: ["bugassets", "assets", "domain", "ssl", "vps", "hosting", "vercel", "hardware", "mailbox", "renewal", "vault"],
    readMinutes: 6,
    relatedIds: ["clients-guide", "recycle-bin-guide", "period-filter-and-badges"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "BugAssets is the company inventory. The sidebar badge shows renewals due within 30 days, in amber.",
          },
          {
            type: "table",
            headers: ["Tab", "What it holds"],
            rows: [
              ["Renewals", "Everything due within 30 days (Due < 30d)"],
              ["Domains", "Domain names, registrar, SSL expiry"],
              ["Infrastructure", "VPS and servers, Hosting, Vercel projects"],
              ["Hardware", "Devices and warranty dates"],
              ["Mail", "Mailboxes"],
              ["Premium Tools", "Paid software subscriptions"],
            ],
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
              { role: "ASSETS_VIEW", access: "Open BugAssets and view inventory" },
              { role: "ASSETS_CREATE / EDIT / DELETE", access: "Add, change, or remove assets" },
              { role: "ASSETS_FINANCE_VIEW", access: "See costs and billing details" },
              { role: "ASSETS_VAULT_REVEAL", access: "Reveal stored credentials in the vault" },
            ],
          },
        ],
      },
      {
        id: "renewals",
        heading: "Renewal alerts",
        blocks: [
          {
            type: "paragraph",
            text: "BugRicer sends email and WhatsApp alerts 60, 30, 14, and 3 days before an expiry date, and on the day itself. This covers domains, SSL, servers, hosting, Vercel, and hardware warranties.",
          },
          {
            type: "callout",
            variant: "tip",
            text: "Keep expiry dates accurate when you renew. The alert schedule restarts from the new date.",
          },
          {
            type: "paragraph",
            text: "Deleted assets go to the Recycle Bin and can be restored.",
          },
        ],
      },
    ],
  },
  {
    id: "clients-guide",
    categoryId: "administration",
    title: "Clients",
    description: "Keep client company details, contacts, infrastructure, and notes in one place.",
    roles: ["admin"],
    permissionKey: "CLIENTS_VIEW",
    keywords: ["clients", "customer", "company", "contact", "acquisition", "client details"],
    readMinutes: 4,
    relatedIds: ["bugassets-guide", "projects-guide", "recycle-bin-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Clients is the directory of companies you work for. Open a client to see these sections:",
          },
          {
            type: "table",
            headers: ["Section", "Contains"],
            rows: [
              ["Entity Definition", "Company name, type, and identity details"],
              ["Communication Matrix", "Contacts, phones, and emails"],
              ["Infrastructure", "Domains, hosting, and linked assets"],
              ["Lifecycle & Acquisition", "How and when the client was won, and their current stage"],
              ["Internal Notes", "Private notes for your team"],
            ],
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
              { role: "CLIENTS_VIEW", access: "View clients" },
              { role: "CLIENTS_CREATE / EDIT", access: "Add or update clients" },
              { role: "CLIENTS_DELETE", access: "Move clients to the Recycle Bin" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "recycle-bin-guide",
    categoryId: "administration",
    title: "Recycle Bin — Restore Deleted Items",
    description: "Everything deleted in BugRicer lands here first, so you can restore it or remove it for good.",
    roles: ["admin"],
    permissionKey: "RECYCLE_BIN_VIEW",
    keywords: ["recycle bin", "trash", "restore", "deleted", "undo delete", "permanent delete", "purge"],
    readMinutes: 4,
    relatedIds: ["bugbackup-guide", "admin-activity-audit", "period-filter-and-badges"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Deleting a record moves it to the Recycle Bin. Covered types include bugs, projects, updates, users, clients, weekly reports, announcements, feedback, shorts, activities, BugDocs and BugSheets, roles, performance reviews, work submissions, tasks and shared tasks, CODO rules, Cursor tips, and every BugAssets type.",
          },
          {
            type: "callout",
            variant: "info",
            text: "Some delete dialogs say the action is permanent. In fact the item stays in the Recycle Bin until an admin deletes it permanently. Items are not purged automatically.",
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
              { role: "RECYCLE_BIN_VIEW", access: "See deleted items" },
              { role: "RECYCLE_BIN_MANAGE", access: "Restore or permanently delete" },
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Restore or delete",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Find the item",
                body: "Filter by type, search, or narrow by Period (defaults to All).",
              },
              {
                title: "Restore",
                body: "Restore puts the item back where it was. Tick several items and use Restore selected to restore them in bulk.",
              },
              {
                title: "Delete permanently",
                body: "The delete action on a row, or Delete permanently for a selection, asks for confirmation and cannot be undone.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "push-coverage-guide",
    categoryId: "administration",
    title: "Push Coverage — Notification Health",
    description: "See who can receive push, email, and WhatsApp notifications, and fix the gaps.",
    roles: ["admin"],
    permissionKey: "PUSH_COVERAGE_VIEW",
    keywords: ["push", "coverage", "notification", "device token", "pwa", "whatsapp", "email", "delivery"],
    readMinutes: 4,
    relatedIds: ["notifications-guide", "whatsapp-admin", "settings-and-roles"],
    sections: [
      {
        id: "metrics",
        heading: "What the numbers mean",
        blocks: [
          {
            type: "table",
            headers: ["Metric", "Meaning"],
            rows: [
              ["Coverage", "Share of active users with at least one working device"],
              ["With / Without Tokens", "Users who have or have not registered a device for push"],
              ["Fresh (24h) / Stale (30d+)", "Devices seen recently, or not seen for a month"],
              ["Notif Enabled / Disabled", "Users who switched notifications on or off"],
              ["PWA Installed", "Users running BugRicer as an installed app"],
              ["Mail / WA Ready, Missing", "Users with or without an email address or WhatsApp number"],
              ["Mail / WA Sent and Errors (7d)", "Delivery results over the last week"],
            ],
          },
        ],
      },
      {
        id: "actions",
        heading: "Fix gaps",
        blocks: [
          {
            type: "list",
            items: [
              "Use the per-user On/Off switch to enable or disable notifications for someone.",
              "Ask users without tokens to open BugRicer, allow notifications, and install the app.",
              "Send test notifications from Settings.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "shorts-guide",
    categoryId: "collaboration",
    title: "Shorts — Short Video Library",
    description: "Share short videos from YouTube, Instagram, Facebook, or your own uploads.",
    roles: ["admin"],
    permissionKey: "SHORTS_MANAGE",
    keywords: ["shorts", "video", "reel", "youtube", "instagram", "facebook", "upload"],
    readMinutes: 3,
    relatedIds: ["admin-announcements", "recycle-bin-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Shorts is an admin-managed video feed. Add a link from YouTube, Instagram, or Facebook, or upload a video file of up to 100 MB. Filter by platform, then click a short to play it.",
          },
          {
            type: "table",
            title: "Player keys",
            headers: ["Key", "Action"],
            rows: [
              ["↓ / →", "Next short"],
              ["↑ / ←", "Previous short"],
              ["Esc", "Close the player"],
            ],
          },
          {
            type: "paragraph",
            text: "Edit or delete a short from its card. Deleted shorts go to the Recycle Bin.",
          },
        ],
      },
    ],
  },
  {
    id: "impersonation-guide",
    categoryId: "administration",
    title: "View as a User (Impersonation)",
    description: "Open BugRicer as another user to see exactly what they see.",
    roles: ["admin"],
    keywords: ["impersonate", "view as", "login as", "user dashboard", "exit to admin", "support"],
    readMinutes: 3,
    relatedIds: ["admin-user-details", "users-management", "admin-activity-audit"],
    sections: [
      {
        id: "steps",
        heading: "How it works",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open the user",
                body: "Go to Users, open the person, and click Dashboard (Open user's dashboard in a new tab).",
              },
              {
                title: "Work in the new tab",
                body: "That tab runs as the user. An amber person icon next to notifications shows who you are viewing as.",
              },
              {
                title: "Exit",
                body: "Click the amber icon, then Exit to admin.",
              },
            ],
          },
          {
            type: "callout",
            variant: "warning",
            title: "Act with care",
            text: "Anything you do in that tab is done as the user. The generated link stays valid for 7 days, so do not share it.",
          },
        ],
      },
    ],
  },
  {
    id: "codo-rules-guide",
    categoryId: "collaboration",
    title: "CODO Rules — Team Standards",
    description: "Read, acknowledge, and export the CODO coding and QA standards.",
    roles: ["all"],
    permissionKey: "CODO_VIEW",
    keywords: ["codo", "rules", "standards", "acknowledge", "doubt", "not required", "export", "cursor rules", "agents.md"],
    readMinutes: 5,
    relatedIds: ["cursor-tips-playbook", "admin-compliance-pipeline"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "CODO Rules is the shared rulebook. Tabs split the rules by phase: Developer, Tester / QA, and Project. Users with analytics access also see Analytics, and everyone sees Export.",
          },
        ],
      },
      {
        id: "acknowledge",
        heading: "Respond to rules",
        blocks: [
          {
            type: "table",
            headers: ["Response", "Use when"],
            rows: [
              ["Acknowledge", "You have read the rule and will follow it"],
              ["Doubt", "You need clarification — admins can see who has doubts"],
              ["Not Required", "The rule does not apply to your work"],
            ],
          },
          {
            type: "callout",
            variant: "info",
            text: "When new rules are published, a prompt asks you to respond to each one before you continue.",
          },
        ],
      },
      {
        id: "export",
        heading: "Export for AI tools",
        blocks: [
          {
            type: "paragraph",
            text: "The Export tab downloads the rules for a phase (or all phases) as ready-to-use agent files. You can also download a PDF.",
          },
          {
            type: "table",
            headers: ["File", "Use in"],
            rows: [
              ["bugricer-codo.mdc", "Cursor (.cursor/rules)"],
              ["ANTIGRAVITY_RULES.md", "Antigravity"],
              ["AI_GUIDELINES.md", "Android Studio / Gemini and similar"],
              ["AGENTS.md", "Any agent that reads AGENTS.md"],
            ],
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
              { role: "CODO_VIEW", access: "Read, respond, and export" },
              { role: "CODO_MANAGE", access: "Create, edit, and delete rules" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "admin-user-details",
    categoryId: "administration",
    title: "User Details — Full Employee Profile",
    description: "Everything about one user: profile, pay, attendance, leave, projects, and activity.",
    roles: ["admin"],
    keywords: ["user details", "employee profile", "payments", "attendance", "leaves", "active hours", "work statistics"],
    readMinutes: 4,
    relatedIds: ["users-management", "admin-user-work-stats", "impersonation-guide", "tester-types"],
    sections: [
      {
        id: "tabs",
        heading: "Sections",
        blocks: [
          {
            type: "paragraph",
            text: "Open Users and click a person. Use the section tabs (or Select Section on mobile):",
          },
          {
            type: "table",
            headers: ["Section", "Shows"],
            rows: [
              ["Personal", "Contact and personal details"],
              ["Professional", "Role, tester type, joining date, and designation"],
              ["Payments", "Salary and payment records"],
              ["Attendance", "Check-in history, WFH, and late days"],
              ["Leaves", "Leave requests and balances"],
              ["Projects", "Projects the user belongs to"],
              ["Work Statistics", "Bugs, fixes, and updates over time"],
              ["Active Hours", "Active, Idle, and Offline time"],
            ],
          },
          {
            type: "paragraph",
            text: "Click Dashboard at the top to view BugRicer as this user.",
          },
        ],
      },
    ],
  },
];
