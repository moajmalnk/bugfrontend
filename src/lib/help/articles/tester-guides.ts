import type { HelpArticle } from "../types";
import { helpImage } from "../types";

export const testerGuideArticles: HelpArticle[] = [
  {
    id: "tester-handbook",
    categoryId: "bug-tracking",
    title: "Tester Handbook — Full Workflow",
    description:
      "End-to-end guide for testers: projects, reporting bugs, tracking fixes, and staying notified.",
    roles: ["tester"],
    keywords: ["tester", "workflow", "handbook", "qa", "testing"],
    readMinutes: 10,
    relatedIds: ["bugs-reporting", "tester-verify-fixes", "fixes-guide", "projects-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "As a Tester on BugRicer, your primary job is to find issues, report them clearly, verify developer fixes, and keep the team informed. Your sidebar includes Projects, Bugs, Fixes, Updates, and Help & Support.",
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
              "Open Projects → select your assigned project",
              "Review open bugs and any new assignments",
              "Test features and report new bugs (Ctrl+B)",
              "Check Fixes page for bugs awaiting verification",
              "Read Updates for release notes and sprint changes",
              "Respond to notifications about assigned bugs",
            ],
          },
        ],
      },
      {
        id: "permissions",
        heading: "What testers can do",
        blocks: [
          {
            type: "permission-table",
            rows: [
              { role: "Tester", access: "Report bugs", notes: "All assigned projects" },
              { role: "Tester", access: "Verify fixes", notes: "Mark Fixed → Verified or Reopen" },
              { role: "Tester", access: "Comment on bugs", notes: "Add reproduction notes and screenshots" },
              { role: "Tester", access: "View Updates", notes: "Read-only project announcements" },
              { role: "Tester", access: "Profile & notifications", notes: "Manage your own account" },
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
            title: "Keyboard shortcut",
            text: "Press Ctrl+B from anywhere to start a new bug report quickly.",
          },
        ],
      },
    ],
  },
  {
    id: "tester-reporting-quality",
    categoryId: "bug-tracking",
    title: "Writing Quality Bug Reports",
    description:
      "How testers should structure bug titles, reproduction steps, expected vs actual results, and attachments.",
    roles: ["tester"],
    keywords: ["report", "quality", "reproduction", "screenshot", "severity", "priority"],
    readMinutes: 7,
    relatedIds: ["bugs-reporting", "tester-handbook"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "A good bug report saves developers hours of guesswork. Include environment details, clear steps, and visual proof whenever possible.",
          },
        ],
      },
      {
        id: "fields",
        heading: "Required fields explained",
        blocks: [
          {
            type: "table",
            headers: ["Field", "What to write"],
            rows: [
              ["Title", "Short, specific summary — e.g. 'Login button disabled on mobile Safari'"],
              ["Description", "Context: what you were doing when the bug appeared"],
              ["Steps to reproduce", "Numbered steps another tester can follow exactly"],
              ["Expected result", "What should happen according to requirements"],
              ["Actual result", "What actually happened, including error messages"],
              ["Priority / Severity", "Impact on users and urgency to fix"],
              ["Project", "Always select the correct project before submitting"],
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Step-by-step: Report a bug",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Select project first",
                body: "Go to Bugs → New Bug (or Ctrl+B). Choose the project under test before filling details.",
                screenshot: helpImage("bugs-reporting", 1),
              },
              {
                title: "Write reproduction steps",
                body: "Use numbered steps. Mention browser, device, OS, and test account if relevant.",
                screenshot: helpImage("bugs-reporting", 2),
              },
              {
                title: "Attach evidence",
                body: "Add screenshots or record a voice note explaining the issue. Submit when complete.",
                screenshot: helpImage("bugs-reporting", 3),
              },
            ],
          },
        ],
      },
      {
        id: "avoid",
        heading: "Common mistakes to avoid",
        blocks: [
          {
            type: "list",
            items: [
              "Vague titles like 'Button not working'",
              "Missing expected vs actual behavior",
              "No reproduction steps",
              "Reporting duplicates — search Bugs list first",
              "Wrong project selected",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "tester-verify-fixes",
    categoryId: "bug-tracking",
    title: "Verifying Developer Fixes",
    description:
      "How testers verify fixes on the Fixes page, mark bugs Verified, or Reopen with comments.",
    roles: ["tester"],
    keywords: ["verify", "fix", "reopen", "qa", "regression"],
    readMinutes: 6,
    relatedIds: ["fixes-guide", "bugs-workflow", "tester-handbook"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "When a developer marks a bug as Fixed, it appears on the Fixes page. Your job is to retest using the original reproduction steps and either verify the fix or reopen the bug.",
          },
        ],
      },
      {
        id: "status-flow",
        heading: "Status flow for testers",
        blocks: [
          {
            type: "table",
            headers: ["Action", "Result"],
            rows: [
              ["Fix works", "Mark as Verified → bug moves toward Closed"],
              ["Fix incomplete", "Reopen with comment explaining what still fails"],
              ["Cannot reproduce", "Comment and ask developer for deployment details"],
              ["Regression found", "Reopen and link to new symptoms if needed"],
            ],
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
                title: "Read the fix description",
                body: "Open the fix entry. Read what the developer changed and on which environment/build.",
                screenshot: helpImage("fixes-guide", 2),
              },
              {
                title: "Retest and decide",
                body: "Follow original steps. If fixed, mark Verified. If not, Reopen with clear notes.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "tester-projects-navigation",
    categoryId: "bug-tracking",
    title: "Projects & Bug Lists for Testers",
    description:
      "Navigate assigned projects, filter bugs, and use project details to understand scope.",
    roles: ["tester"],
    keywords: ["projects", "filter", "assigned", "bug list"],
    readMinutes: 5,
    relatedIds: ["projects-guide", "tester-handbook"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Testers see only projects they are assigned to. From a project you can view all bugs, updates, and team members relevant to your testing scope.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Navigate projects",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Projects",
                body: "Click Projects in the sidebar. Use search or filters to find your project.",
                screenshot: helpImage("projects-guide", 1),
              },
              {
                title: "Open project details",
                body: "Click a project card to see overview, bugs, members, and linked updates.",
                screenshot: helpImage("projects-guide", 2),
              },
              {
                title: "Filter bugs",
                body: "On the Bugs page, filter by status (Open, In Progress, Fixed) to prioritize your test queue.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "tester-bug-collaboration",
    categoryId: "bug-tracking",
    title: "Comments & Collaboration on Bugs",
    description:
      "Add comments, upload follow-up screenshots, and communicate with developers on bug threads.",
    roles: ["tester"],
    keywords: ["comments", "collaborate", "thread", "follow up"],
    readMinutes: 4,
    relatedIds: ["bugs-workflow", "tester-reporting-quality"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Bug detail pages support comments, status history, and attachments. Use comments to clarify reproduction, ask questions, or confirm retest results.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Collaborate on a bug",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open bug details",
                body: "Click any bug from the Bugs list to open its full detail page.",
                screenshot: helpImage("bugs-workflow", 1),
              },
              {
                title: "Add a comment",
                body: "Scroll to the comments section. Describe new findings, environment changes, or verification results.",
              },
              {
                title: "Update status when appropriate",
                body: "If you have permission on the bug, update status or request developer attention via comment @mentions if enabled.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "tester-updates-notifications",
    categoryId: "getting-started",
    title: "Updates & Notifications for Testers",
    description:
      "Stay informed with project updates, bug assignments, and push notification settings.",
    roles: ["tester"],
    keywords: ["updates", "notifications", "alerts", "tester"],
    readMinutes: 5,
    relatedIds: ["updates-guide", "notifications-guide", "tester-handbook"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Updates share release notes and sprint summaries. Notifications alert you when bugs are assigned, fixed, or commented on. Configure both to stay on top of testing work.",
          },
        ],
      },
      {
        id: "updates",
        heading: "Reading Updates",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Updates",
                body: "Click Updates in the sidebar (Ctrl+Shift+U).",
                screenshot: helpImage("updates-guide", 1),
              },
              {
                title: "Filter by project",
                body: "Read release notes before regression testing a new build.",
                screenshot: helpImage("updates-guide", 2),
              },
            ],
          },
        ],
      },
      {
        id: "notifications",
        heading: "Notifications",
        blocks: [
          {
            type: "list",
            items: [
              "Bell icon in sidebar header — recent alerts",
              "Notifications page — full history",
              "Allow browser push when prompted for real-time alerts",
              "Update Profile if email or phone changed",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "tester-qa-compliance",
    categoryId: "bug-tracking",
    title: "QA Inspection Stage (CODo)",
    description:
      "Complete QA stress tests and verification checklist in the compliance pipeline.",
    roles: ["tester"],
    keywords: ["qa", "inspection", "compliance", "stress test", "codo"],
    readMinutes: 6,
    relatedIds: ["project-compliance", "developer-compliance-stage", "admin-compliance-pipeline"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "After developers complete their rules, the project enters QA Inspection. Testers run stress tests and mark verification items before admins can final-lock the project.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Complete QA inspection",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Compliance",
                body: "Projects → your project → Compliance tab.",
                screenshot: helpImage("project-compliance", 1),
              },
              {
                title: "QA Inspection section",
                body: "Review stress tests (e.g. 0/7). Complete each test and mark verified.",
                screenshot: helpImage("project-compliance", 2),
              },
              {
                title: "Confirm progress",
                body: "Overall compliance bar updates as QA items complete. Notify admin when ready for final lock.",
                screenshot: helpImage("project-compliance", 3),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "tester-search-shortcuts",
    categoryId: "getting-started",
    title: "Search & Shortcuts for Testers",
    description:
      "Find bugs faster with global search and tester-focused keyboard shortcuts.",
    roles: ["tester"],
    keywords: ["search", "shortcuts", "keyboard", "tester"],
    readMinutes: 3,
    relatedIds: ["search-and-shortcuts", "tester-handbook"],
    sections: [
      {
        id: "shortcuts",
        heading: "Tester shortcuts",
        blocks: [
          {
            type: "table",
            headers: ["Shortcut", "Action"],
            rows: [
              ["Ctrl+B", "New bug report"],
              ["Ctrl+Shift+B", "Bugs page"],
              ["Ctrl+Shift+F", "Fixes page (verification queue)"],
              ["Ctrl+Shift+U", "Updates page"],
              ["⌘K / Ctrl+K", "Global search"],
              ["Shift+Space", "Toggle dark/light mode"],
            ],
          },
        ],
      },
      {
        id: "search",
        heading: "Global search tips",
        blocks: [
          {
            type: "paragraph",
            text: "Search by bug title, ID, project name, or page name. Results respect your tester permissions — you only see content from assigned projects.",
          },
        ],
      },
    ],
  },
];
