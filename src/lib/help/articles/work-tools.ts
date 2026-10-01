import type { HelpArticle } from "../types";

export const workToolsArticles: HelpArticle[] = [
  {
    id: "bugdates-guide",
    categoryId: "collaboration",
    title: "BugDates — Company Calendar",
    description:
      "Holidays, programs, observances, leave, birthdays, and project milestones in one calendar.",
    roles: ["admin", "developer", "creator"],
    permissionKey: "BUGDATES_VIEW",
    keywords: ["bugdates", "calendar", "holiday", "event", "milestone", "birthday", "anniversary", "growth glimpse"],
    readMinutes: 6,
    relatedIds: ["official-leave", "my-leave", "bugcreative-guide", "bugtodo-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "BugDates is the shared company calendar. It shows programs, observances, holidays, company events, team leave and WFH, birthdays, work anniversaries, and deadlines for projects you belong to. Admins see every project's milestones.",
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
              { role: "Admin", access: "View and manage events" },
              { role: "Developer / Creator", access: "View", notes: "Needs BugDates or Leave view permission" },
              { role: "Tester", access: "View only with BUGDATES_VIEW" },
              { role: "BUGDATES_MANAGE", access: "Create, edit, and delete events" },
            ],
          },
        ],
      },
      {
        id: "use",
        heading: "Use the calendar",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Filter what you see",
                body: "Use the Filter calendar chips — Programs, Observances, Holidays, Company, Leave, WFH, Birthdays, Anniversaries, Milestones. Combine as many as you like.",
              },
              {
                title: "Open a day",
                body: "Each day shows up to 3 items, then “+N more”. Click a day to see everything scheduled.",
              },
              {
                title: "Act on an item",
                body: "From the day panel: Design Poster (holidays, observances, company events, Growth Glimpse programs), Create BugToDo (programs and milestones), or Open project (project milestones).",
              },
            ],
          },
          {
            type: "callout",
            variant: "info",
            text: "Other people's leave shows as “Away” unless you manage leave or attendance. Official Leave is always visible.",
          },
        ],
      },
      {
        id: "manage",
        heading: "Create an event (managers)",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Click New event",
                body: "Enter a title, start date, and category: Growth program, Observance, Holiday, Company event, or Milestone.",
              },
              {
                title: "Set recurrence",
                body: "Choose None, Daily, Weekly (pick weekdays), Monthly, or Yearly.",
              },
              {
                title: "Holidays",
                body: "Switch on Office closed to skip late check-in and checkout that day. Then Credit Official Leave (8h) can grant holiday hours to all users or selected users.",
              },
              {
                title: "Automations",
                body: "Auto BugCreative card drafts a poster for the day. Auto BugToDo creates a session-notes or weekly-report task.",
              },
            ],
          },
          {
            type: "paragraph",
            text: "Managers can also log a Growth Glimpse session from the day panel with Save session or Save + weekly report task.",
          },
        ],
      },
    ],
  },
  {
    id: "retests-guide",
    categoryId: "bug-tracking",
    title: "Retests — Verify Fixed Bugs",
    description: "The queue of fixed bugs waiting for a tester to confirm or reopen.",
    roles: ["admin", "developer", "tester"],
    keywords: ["retest", "retests", "verify fix", "still broken", "reopen", "verification", "bug level", "floap"],
    readMinutes: 5,
    relatedIds: ["tester-verify-fixes", "fixes-guide", "bugs-workflow"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "When a developer marks a bug as fixed, it joins Retests until a tester checks it. The sidebar badge shows how many are waiting. Each project also has its own Retests tab.",
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
              { role: "Tester", access: "Record verifications", notes: "On projects you are a member of" },
              { role: "Admin", access: "Record verifications on any project" },
              { role: "Developer", access: "View the queue and open bugs" },
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
                title: "Open Retests",
                body: "Use All Retests, or My Retests for bugs you reported. Filter by priority, project, bug type, Fixed by, or reporter.",
              },
              {
                title: "Open the bug",
                body: "Click View (Verify fix on mobile).",
              },
              {
                title: "Record the result",
                body: "On the Fix Description card, answer Tester tested again? and Issue fixed?, choose a Bug Level, and add Verification Notes. Screenshots, files, and a voice note are optional.",
              },
              {
                title: "Save",
                body: "Click Save verification.",
              },
              {
                title: "Reopen if still broken",
                body: "If you chose “No — still broken”, click Reopen & move to Bugs. The bug goes back to the developer.",
              },
            ],
          },
        ],
      },
      {
        id: "statuses",
        heading: "Retest statuses",
        blocks: [
          {
            type: "table",
            headers: ["Status", "Meaning"],
            rows: [
              ["Retest pending", "Nothing recorded yet"],
              ["Not retested", "Tester answered No to tested again"],
              ["Verified fixed", "Tested and confirmed fixed — counts in Fixes"],
              ["Still broken", "Tested and not fixed — reopened"],
              ["Retested", "Tested, outcome not recorded"],
            ],
          },
          {
            type: "table",
            title: "Bug Level",
            headers: ["Level", "Meaning"],
            rows: [
              ["Normal", "Low impact"],
              ["Floap", "Notable issue"],
              ["Utter Floap", "Critical breakdown"],
            ],
          },
          {
            type: "callout",
            variant: "info",
            text: "When an admin finalizes a project as Completed or Release Ready, its pending retests are marked Verified fixed automatically.",
          },
        ],
      },
    ],
  },
  {
    id: "move-convert-bug",
    categoryId: "bug-tracking",
    title: "Move or Convert a Bug",
    description: "Move a bug to another project, or turn it into an update.",
    roles: ["admin", "developer", "tester"],
    keywords: ["convert bug", "move bug", "convert to update", "wrong project", "request access", "feature request"],
    readMinutes: 4,
    relatedIds: ["bugs-workflow", "updates-guide", "edit-bug-and-updates"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Use Convert on a bug (in the bug header, on bug cards, or on Fixes) when it was filed in the wrong project or is really a feature request. Declined bugs cannot be converted.",
          },
        ],
      },
      {
        id: "options",
        heading: "Your options",
        blocks: [
          {
            type: "table",
            headers: ["Option", "What happens"],
            rows: [
              ["Move to project", "Same bug and full history, in a different project"],
              ["Convert to Update", "Creates a pending Feature, Updation, or Maintenance update with the attachments, and declines the bug with “Converted to update”"],
            ],
          },
        ],
      },
      {
        id: "access",
        heading: "Projects you are not in",
        blocks: [
          {
            type: "paragraph",
            text: "The project list is split into Your projects and Other projects — request access. Picking another project lets you send an access request with an optional message to admins.",
          },
          {
            type: "callout",
            variant: "warning",
            text: "Requesting access does not move the bug. Once an admin adds you to the project, open the bug and convert it again.",
          },
          {
            type: "paragraph",
            text: "Each project in the picker shows its status and its open bugs, updates, and fixes, so you can pick the right one quickly.",
          },
        ],
      },
    ],
  },
  {
    id: "bug-media-tools",
    categoryId: "bug-tracking",
    title: "Voice Notes, Screenshots & Bug Timeline",
    description: "Record voice notes, inspect screenshots, and read a bug's full lifecycle.",
    roles: ["admin", "developer", "tester"],
    keywords: ["voice note", "microphone", "screenshot", "zoom", "rotate", "timeline", "lifecycle", "history"],
    readMinutes: 4,
    relatedIds: ["bugs-reporting", "tester-reporting-quality", "bugs-workflow"],
    sections: [
      {
        id: "voice",
        heading: "Voice notes",
        blocks: [
          {
            type: "paragraph",
            text: "Click Add Voice Note on New Bug, Edit Bug, tester verification, and doubts. Recordings stop automatically at 5 minutes. Bug details list them under Voice Notes with play and download.",
          },
          {
            type: "callout",
            variant: "tip",
            text: "If you see “Microphone blocked”, allow microphone access for BugRicer in your browser settings and try again.",
          },
        ],
      },
      {
        id: "screenshots",
        heading: "Screenshot viewer",
        blocks: [
          {
            type: "paragraph",
            text: "Click any screenshot to open Screenshot Preview. Zoom from 25% to 500%, rotate, go full screen, and copy, print, download, or share the image.",
          },
          {
            type: "table",
            title: "Keyboard shortcuts",
            headers: ["Key", "Action"],
            rows: [
              ["← / →", "Previous / next screenshot"],
              ["+ / − / 0", "Zoom in / out / reset"],
              ["R / L", "Rotate right / left"],
              ["F", "Full screen"],
              ["I", "Image info"],
              ["Esc", "Close"],
            ],
          },
          {
            type: "paragraph",
            text: "On touch screens, swipe to move between images, pinch to zoom, and double-tap to reset. Only admins and the bug's reporter can delete a screenshot.",
          },
        ],
      },
      {
        id: "timeline",
        heading: "Lifecycle & timeline",
        blocks: [
          {
            type: "paragraph",
            text: "The Lifecycle & timeline card on bug details shows the full history — raised, fixed, reopened, fixed again — with time spent in each status, fix duration, age, the people involved, and any project moves or conversions. A reopen caused by a failed retest reads “Tester marked the fix as still broken”.",
          },
        ],
      },
    ],
  },
  {
    id: "project-details-updates",
    categoryId: "bug-tracking",
    title: "Project Info, Tech Stack & Deadline Reminders",
    description:
      "What the project overview shows, how to tag technologies, and how deadline reminders work.",
    roles: ["admin", "developer", "tester", "creator"],
    keywords: ["project info", "technology", "tech stack", "deadline", "reminder", "team work updates", "milestone"],
    readMinutes: 6,
    relatedIds: ["projects-guide", "admin-project-lifecycle", "checkout-hours-breakdown"],
    sections: [
      {
        id: "overview",
        heading: "Project overview",
        blocks: [
          {
            type: "paragraph",
            text: "A project's info page shows its duration, hours needed, developer hours, status, deadline, team allocation, technology stack, timeline with change history, links (reference sites, domains, app URLs, GitHub), and attachments.",
          },
          {
            type: "paragraph",
            text: "The deadline timer reads, for example, “3 days left — due soon”, “Due today — act now”, or “2 days overdue”. Overdue projects show a Deadline delayed banner.",
          },
        ],
      },
      {
        id: "tech",
        heading: "Technology stack",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open the project form",
                body: "When creating or editing a project, find Technology Stack.",
              },
              {
                title: "Select or create",
                body: "Click Select or create technology…, search, and pick one. If it does not exist, choose Create to add it for every project.",
              },
            ],
          },
          {
            type: "paragraph",
            text: "Technologies appear as chips on the project's info page.",
          },
        ],
      },
      {
        id: "team-updates",
        heading: "Team Work Updates",
        blocks: [
          {
            type: "paragraph",
            text: "This panel fills in automatically from checkout. When team members split their hours across projects, the latest entries appear here with status, progress, and hours, plus a total of hours collected.",
          },
        ],
      },
      {
        id: "reminders",
        heading: "Deadline reminders (admins)",
        blocks: [
          {
            type: "paragraph",
            text: "BugRicer sends email, WhatsApp, and push reminders to all project members and admins for each milestone date: Deadline, Expected Publish, Testing Start and End, Frontend and Backend Finish, and Tester and Developer Compliance Complete.",
          },
          {
            type: "table",
            headers: ["When", "Reminder"],
            rows: [
              ["7, 3, and 1 days before", "Upcoming milestone"],
              ["On the day", "Due today"],
              ["1 day after (Deadline only)", "Overdue"],
            ],
          },
          {
            type: "list",
            items: [
              "Reminders go out once a day from the scheduled job (recommended around 8:00 AM IST).",
              "Completed and archived projects are skipped.",
              "On the project page, Send test reminder sends a sample to you only.",
              "The admin dashboard shows the latest reminders across all projects.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "period-filter-and-badges",
    categoryId: "getting-started",
    title: "Period Filter & Sidebar Counts",
    description: "Filter dashboards by date range, and what the sidebar numbers mean.",
    roles: ["all"],
    keywords: ["period", "date range", "filter", "this month", "custom", "badge", "count", "99+", "sidebar"],
    readMinutes: 4,
    relatedIds: ["getting-started-overview", "search-and-shortcuts"],
    sections: [
      {
        id: "period",
        heading: "Period filter",
        blocks: [
          {
            type: "paragraph",
            text: "Dashboards, BugCreative, and the Recycle Bin have a Period filter. It shows the active preset and its dates, for example “This week · 22 Sep – 01 Oct”.",
          },
          {
            type: "table",
            headers: ["Preset", "Range"],
            rows: [
              ["All", "All records"],
              ["Today / Yesterday", "That single day"],
              ["This week / Last week", "Monday to today / the previous Monday to Sunday"],
              ["This month / Last month", "The calendar month"],
              ["This year / Last year", "1 January to today / the whole previous year"],
              ["Custom", "Pick a From – To range"],
            ],
          },
          {
            type: "callout",
            variant: "info",
            text: "Dashboards start on This month. BugCreative and the Recycle Bin start on All and remember your choice in the page link.",
          },
        ],
      },
      {
        id: "badges",
        heading: "Sidebar counts",
        blocks: [
          {
            type: "paragraph",
            text: "The number next to a sidebar item is a live count. Hover over it to see exactly what it counts. A badge is hidden when the count is zero, and anything above 99 shows as 99+.",
          },
          {
            type: "table",
            headers: ["Item", "Counts"],
            rows: [
              ["Bugs", "Open bugs (pending and in progress)"],
              ["Retests", "Fixed bugs waiting for a tester"],
              ["Fixes", "Bugs verified as fixed"],
              ["Compliance", "Pending compliance items (amber)"],
              ["BugCreative", "Admins: assets in review. Others: your creative assets"],
              ["BugAssets", "Renewals due within 30 days (amber)"],
              ["Leave / OT requests", "Requests waiting for an admin"],
              ["Attendance", "Pending WFH requests"],
            ],
          },
          {
            type: "paragraph",
            text: "Developers, testers, and creators only see counts for their own projects. Counts refresh every 45 seconds, when you return to the window, and right after you make a change.",
          },
        ],
      },
    ],
  },
  {
    id: "tester-types",
    categoryId: "administration",
    title: "Tester Types — CODO vs Client Testers",
    description: "Choose whether a tester is an in-house team member or an external client reviewer.",
    roles: ["admin"],
    keywords: ["tester type", "codo tester", "client tester", "external tester", "workforce"],
    readMinutes: 3,
    relatedIds: ["users-management", "employee-onboarding", "tester-handbook"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Every tester is either a CODO Tester or a Client Tester. Set it in Add User or Edit User when the role is Tester. Testers show a CODO or Client badge next to their role.",
          },
          {
            type: "table",
            headers: ["Type", "What they get"],
            rows: [
              ["CODO Tester", "In-house team. Onboarding, check-in, BugUpdate, Weekly Report, and My Leave."],
              ["Client Tester", "External reviewer. Bug reporting and fix verification only — no attendance, leave, or onboarding."],
            ],
          },
          {
            type: "callout",
            variant: "warning",
            title: "Check existing testers",
            text: "Testers who existed before tester types were added were set to Client Tester. Mark your in-house testers as CODO Tester manually. Switching someone to CODO starts onboarding if they have never completed it.",
          },
        ],
      },
    ],
  },
];
