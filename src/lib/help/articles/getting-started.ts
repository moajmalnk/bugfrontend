import type { HelpArticle } from "../types";
import { helpImage } from "../types";

export const gettingStartedArticles: HelpArticle[] = [
  {
    id: "getting-started-overview",
    categoryId: "getting-started",
    title: "Getting Started with BugRicer",
    description:
      "Learn how to log in, understand your role-based dashboard, and navigate the sidebar.",
    roles: ["all"],
    keywords: ["login", "otp", "dashboard", "sidebar", "overview", "start"],
    readMinutes: 5,
    relatedIds: ["profile-and-account", "search-and-shortcuts", "projects-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "BugRicer is a bug tracking and team collaboration platform. After login, your sidebar and available features depend on your role: Admin, Developer, or Tester. Each role has tailored access to projects, bugs, and tools.",
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
              { role: "Admin", access: "Full access", notes: "All features including Administration" },
              { role: "Developer", access: "Projects, bugs, collaboration tools", notes: "No admin-only sections by default" },
              { role: "Tester", access: "Bug reporting and core tracking", notes: "Focused on testing workflows" },
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Step-by-step: First login",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open the login page",
                body: "Navigate to your BugRicer URL and enter your username or email and password.",
                screenshot: helpImage("getting-started-overview", 1),
                screenshotCaption: "Login screen with username and password fields",
              },
              {
                title: "Complete OTP verification",
                body: "If prompted, enter the one-time password sent to your registered phone or email.",
                screenshot: helpImage("getting-started-overview", 2),
                screenshotCaption: "OTP verification step",
              },
              {
                title: "Explore your dashboard",
                body: "After login you land on Projects. Use the left sidebar to access Bugs, Fixes, Updates, and role-specific tools.",
                screenshot: helpImage("getting-started-overview", 3),
                screenshotCaption: "Main sidebar navigation",
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
            title: "Quick navigation",
            text: "Press ⌘K (Mac) or Ctrl+K (Windows) to open global search and jump to any page instantly.",
          },
        ],
      },
    ],
  },
  {
    id: "profile-and-account",
    categoryId: "getting-started",
    title: "Profile & Account Settings",
    description: "Update your profile, change password, and manage your account.",
    roles: ["all"],
    keywords: ["profile", "password", "avatar", "account"],
    readMinutes: 4,
    relatedIds: ["getting-started-overview", "notifications-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Your profile stores your display name, avatar, contact details, and notification preferences. Click your name at the bottom of the sidebar to open Profile.",
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
              { role: "All users", access: "Edit own profile and password" },
              { role: "Admin", access: "Can also generate dashboard links for other users from Users page" },
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Update your profile",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Profile",
                body: "Click your avatar and name at the bottom of the sidebar.",
                screenshot: helpImage("profile-and-account", 1),
              },
              {
                title: "Edit details",
                body: "Update username, email, phone, or upload a new avatar image.",
                screenshot: helpImage("profile-and-account", 2),
              },
              {
                title: "Change password",
                body: "Use the Change Password section. Enter current password and a strong new password.",
                screenshot: helpImage("profile-and-account", 3),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "search-and-shortcuts",
    categoryId: "getting-started",
    title: "Search & Keyboard Shortcuts",
    description: "Use global search and keyboard shortcuts to work faster.",
    roles: ["all"],
    keywords: ["search", "keyboard", "shortcuts", "cmd+k"],
    readMinutes: 3,
    relatedIds: ["getting-started-overview"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "BugRicer includes global search and keyboard shortcuts for common actions like creating bugs, navigating pages, and toggling dark mode.",
          },
        ],
      },
      {
        id: "shortcuts",
        heading: "Keyboard shortcuts",
        blocks: [
          {
            type: "table",
            title: "Available shortcuts",
            headers: ["Shortcut", "Action"],
            rows: [
              ["⌘K / Ctrl+K", "Open global search"],
              ["Ctrl+B", "New bug"],
              ["Ctrl+Shift+B", "Bugs page"],
              ["Ctrl+Shift+F", "Fixes page"],
              ["Ctrl+U", "New update"],
              ["Ctrl+Shift+U", "Updates page"],
              ["Ctrl+Shift+S", "Settings"],
              ["Ctrl+Shift+P", "Profile"],
              ["Shift+Space", "Toggle dark/light mode"],
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Using global search",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open search",
                body: "Click the search icon next to your profile or press ⌘K.",
                screenshot: helpImage("search-and-shortcuts", 1),
              },
              {
                title: "Type your query",
                body: "Search pages, bugs, fixes, users, and documents. Results are filtered by your role and permissions.",
                screenshot: helpImage("search-and-shortcuts", 2),
              },
              {
                title: "Navigate to result",
                body: "Click any result or use arrow keys and Enter to navigate.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "notifications-guide",
    categoryId: "getting-started",
    title: "Notifications Guide",
    description: "Manage in-app and push notifications for bug updates and team activity.",
    roles: ["all"],
    keywords: ["notifications", "alerts", "push", "fcm"],
    readMinutes: 4,
    relatedIds: ["profile-and-account", "settings-and-roles"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "BugRicer sends notifications for bug assignments, status changes, messages, and announcements. Access the notification bell in the sidebar header or visit the Notifications page.",
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
                title: "View notifications",
                body: "Click the bell icon in the sidebar header for recent alerts, or go to Notifications for full history.",
                screenshot: helpImage("notifications-guide", 1),
              },
              {
                title: "Enable push notifications",
                body: "When prompted, allow browser notifications for real-time alerts even when the tab is in the background.",
                screenshot: helpImage("notifications-guide", 2),
              },
              {
                title: "Configure preferences",
                body: "Admins can configure notification defaults in Settings → Notifications. Users can adjust personal preferences in Profile.",
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
            text: "If push notifications stop working, check browser permissions and ensure you are not in Do Not Disturb mode.",
          },
        ],
      },
    ],
  },
];
