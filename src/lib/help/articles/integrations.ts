import type { HelpArticle } from "../types";
import { helpImage } from "../types";

export const integrationsArticles: HelpArticle[] = [
  {
    id: "bugdocs-guide",
    categoryId: "integrations",
    title: "BugDocs (Google Docs)",
    description: "Connect and manage Google Docs within projects.",
    roles: ["admin", "developer"],
    keywords: ["bugdocs", "google docs", "documents", "oauth"],
    readMinutes: 6,
    relatedIds: ["bugsheets-guide", "projects-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "BugDocs integrates Google Docs with your projects. Link existing docs or create new ones. Requires Google OAuth setup on first use.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Set up BugDocs",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open BugDocs",
                body: "Click BugDocs in the sidebar.",
                screenshot: helpImage("bugdocs-guide", 1),
              },
              {
                title: "Connect Google account",
                body: "On first use, authorize BugRicer with your Google account. Follow the OAuth prompts.",
                screenshot: helpImage("bugdocs-guide", 2),
              },
              {
                title: "Link or create documents",
                body: "Browse project documents or create new Google Docs linked to a project.",
                screenshot: helpImage("bugdocs-guide", 3),
              },
            ],
          },
        ],
      },
      {
        id: "tips",
        heading: "Troubleshooting",
        blocks: [
          {
            type: "callout",
            variant: "warning",
            title: "OAuth errors",
            text: "If Google OAuth fails, ensure your origin URL is added to Google Cloud Console credentials. See the setup error page for instructions.",
          },
        ],
      },
    ],
  },
  {
    id: "bugsheets-guide",
    categoryId: "integrations",
    title: "BugSheets (Google Sheets)",
    description: "Connect and manage Google Sheets for project data.",
    roles: ["admin", "developer"],
    keywords: ["bugsheets", "google sheets", "spreadsheet"],
    readMinutes: 5,
    relatedIds: ["bugdocs-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "BugSheets links Google Sheets to projects for tracking test cases, data, or custom spreadsheets. Uses the same Google OAuth as BugDocs.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Use BugSheets",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open BugSheets",
                body: "Click BugSheets in the sidebar.",
                screenshot: helpImage("bugsheets-guide", 1),
              },
              {
                title: "Select a project",
                body: "Choose a project to view or add linked spreadsheets.",
                screenshot: helpImage("bugsheets-guide", 2),
              },
              {
                title: "Open in Google Sheets",
                body: "Click a sheet to open it in Google Sheets in a new tab.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "whatsapp-admin",
    categoryId: "integrations",
    title: "WhatsApp Messaging (Admin)",
    description: "Send single and bulk WhatsApp messages to team members.",
    roles: ["admin"],
    keywords: ["whatsapp", "messages", "bulk", "notify"],
    readMinutes: 5,
    permissionKey: "MESSAGING_CREATE",
    relatedIds: ["users-management", "settings-and-roles"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "The WhatsApp admin console sends outbound messages to team members via BugRicer's WhatsApp API. Supports single messages and bulk sends. Requires MESSAGING_CREATE permission.",
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
              { role: "Admin", access: "Full access (via SUPER_ADMIN or MESSAGING_CREATE)" },
              { role: "Custom roles", access: "If granted MESSAGING_CREATE permission" },
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Send a message",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open WhatsApp",
                body: "Go to Administration → WhatsApp.",
                screenshot: helpImage("whatsapp-admin", 1),
              },
              {
                title: "Single message",
                body: "Select a recipient, compose your message (templates available), and send.",
                screenshot: helpImage("whatsapp-admin", 2),
              },
              {
                title: "Bulk message",
                body: "Switch to Bulk tab, select multiple users, compose one message, and send to all.",
                screenshot: helpImage("whatsapp-admin", 3),
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
            variant: "info",
            text: "Recipients must have a valid phone number in their user profile. This page is for outbound messages only — not a chat inbox.",
          },
        ],
      },
    ],
  },
];
