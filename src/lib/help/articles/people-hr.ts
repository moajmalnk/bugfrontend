import type { HelpArticle } from "../types";

const WORKFORCE = ["admin", "developer", "tester", "creator"] as const;

export const peopleHrArticles: HelpArticle[] = [
  {
    id: "my-leave",
    categoryId: "people-hr",
    title: "My Leave — Apply & Track Leave",
    description:
      "Request full or half-day leave, check your monthly balance, and follow approvals.",
    roles: [...WORKFORCE],
    keywords: [
      "leave",
      "my leave",
      "casual leave",
      "sick leave",
      "unpaid leave",
      "half day",
      "balance",
      "quota",
      "apply leave",
    ],
    readMinutes: 6,
    relatedIds: ["leave-requests-admin", "official-leave", "checkin-attendance"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "My Leave is where you apply for leave and see every request you have made. Requests go to admins for approval. Pending requests never block check-in; approved leave does block check-in, checkout, and admin-added hours for those dates.",
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
              { role: "Developer / Creator", access: "Full access to their own leave" },
              { role: "CODO Tester", access: "Full access to their own leave" },
              { role: "Client Tester", access: "Not available", notes: "External reviewers are not on attendance or leave" },
              { role: "Admin", access: "Own leave here; team approvals in Leave requests" },
            ],
          },
        ],
      },
      {
        id: "balance",
        heading: "Monthly balance",
        blocks: [
          {
            type: "paragraph",
            text: "Quotas reset every calendar month. The Monthly balance section shows each leave type with its quota, days used, and days remaining. Use Previous, This month, and Next to look at other months.",
          },
          {
            type: "table",
            title: "Leave types you can request",
            headers: ["Leave type", "Monthly quota", "Work hours credited"],
            rows: [
              ["Casual Leave", "1 day", "8h per day"],
              ["Sick Leave", "1 day", "0h"],
              ["Unpaid Leave", "5 days", "0h"],
            ],
          },
          {
            type: "callout",
            variant: "info",
            text: "Official Leave (company holidays) is granted by admins and never uses your balance. Personal Leave has been retired.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Apply for leave",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open My Leave",
                body: "Click My Leave in the sidebar. You can also reach it from your profile under the Leaves tab.",
              },
              {
                title: "Pick a leave type",
                body: "In Request leave, choose a type. Each option shows how many days you have left this month.",
              },
              {
                title: "Choose dates",
                body: "Set the Start date and End date. For half a day, switch on Half-day leave and choose First half or Second half — half-day leave covers the start date only.",
              },
              {
                title: "Add a reason and submit",
                body: "Add an optional reason, then click Submit request. All admins are notified.",
              },
              {
                title: "Track the decision",
                body: "Request history shows every request with its status and any admin note. You get a notification when it is approved or rejected.",
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
              ["Pending", "Waiting for an admin. You can still cancel it."],
              ["Approved", "Leave is confirmed. Check-in is blocked on those days."],
              ["Rejected", "Declined. Any admin note is shown on the request."],
              ["Cancelled", "You withdrew the request before a decision."],
            ],
          },
        ],
      },
      {
        id: "rules",
        heading: "Rules to know",
        blocks: [
          {
            type: "list",
            items: [
              "Sundays and office-closed holidays are not counted as leave days.",
              "You cannot request leave that overlaps another pending or approved request.",
              "Leave cannot start before your joining date.",
              "If Casual or Sick leave is more than your remaining balance, the extra days are split into a separate Unpaid Leave request automatically. The confirmation tells you exactly how it was split.",
              "Unpaid Leave is capped at 5 days a month. When both are used up, the request is refused.",
              "Requests that cross two months are checked against each month's balance.",
              "Only pending requests can be cancelled. Approved or rejected requests cannot be edited — ask an admin.",
            ],
          },
          {
            type: "callout",
            variant: "warning",
            title: "Half days",
            text: "An approved half day blocks check-in for the whole day and counts as a full day in the monthly balance. Plan half days with your admin if you also need to log work that day.",
          },
        ],
      },
    ],
  },
  {
    id: "leave-requests-admin",
    categoryId: "people-hr",
    title: "Leave Requests — Admin Review",
    description: "Review, approve, or reject employee leave with an optional note.",
    roles: ["admin"],
    permissionKey: "LEAVE_MANAGE",
    keywords: ["leave requests", "approve leave", "reject leave", "admin leave", "pending leave"],
    readMinutes: 4,
    relatedIds: ["my-leave", "official-leave", "admin-user-details"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Leave requests lists every employee who has applied for leave. The sidebar badge shows how many requests are pending. Open a person to review their requests one by one.",
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
              { role: "Users with LEAVE_MANAGE", access: "Full access" },
              { role: "Everyone else", access: "No access" },
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Review a request",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Leave requests",
                body: "Go to Administration → Leave requests. The Pending filter is selected by default.",
              },
              {
                title: "Narrow the list",
                body: "Search by username, role, or user ID, or filter by status, role, and month.",
              },
              {
                title: "Open a person",
                body: "Click Open requests → on a card. Tabs show All, Pending, Approved, Rejected, and Cancelled.",
              },
              {
                title: "Decide",
                body: "On a pending request, add an optional Admin note, then click Approve or Reject. The employee is notified with your note.",
              },
            ],
          },
        ],
      },
      {
        id: "rules",
        heading: "What approval checks",
        blocks: [
          {
            type: "list",
            items: [
              "Approval is refused if the dates overlap another approved or pending leave.",
              "Approval re-checks the monthly quota, because pending requests do not reserve balance.",
              "Request dates cannot be changed by an admin. Ask the employee to cancel and apply again.",
            ],
          },
          {
            type: "callout",
            variant: "tip",
            text: "From a person's page you can jump to their Profile or to Add / fix hours without going back to the list.",
          },
        ],
      },
    ],
  },
  {
    id: "official-leave",
    categoryId: "people-hr",
    title: "Official Leave — Company Holidays",
    description:
      "Grant holiday hours to all staff or selected people without touching personal leave balances.",
    roles: ["admin"],
    permissionKey: "LEAVE_MANAGE",
    keywords: ["official leave", "holiday", "company holiday", "celebration", "grant hours", "festival"],
    readMinutes: 5,
    relatedIds: ["my-leave", "bugdates-guide", "admin-add-fix-hours"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Official Leave credits work hours to employees for company holidays (for example Meelad Nabi). It appears on Daily Update and work stats, and it does not use anyone's personal leave balance.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Grant Official Leave",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open Official Leave",
                body: "Go to Administration → Official Leave.",
              },
              {
                title: "Set dates and title",
                body: "Choose the Start date and End date and enter a Title / reason. Set How many hours? per day (default 8).",
              },
              {
                title: "Choose options",
                body: "Remove forgot-checkout admin hours for these dates (on by default) replaces any admin-entered hours on those days. Notify all granted users (on by default) sends push, WhatsApp, and email.",
              },
              {
                title: "Choose who gets it",
                body: "Pick All users or Selected users. With Selected users you can filter by role, search, and use Select visible.",
              },
              {
                title: "Grant",
                body: "Click Grant Official Leave. The grant appears in Official Leave history.",
              },
            ],
          },
        ],
      },
      {
        id: "manage",
        heading: "Edit, add people, or cancel",
        blocks: [
          {
            type: "paragraph",
            text: "Click a row in Official Leave history to open it. From there you can Add users, edit one person's dates or hours, cancel one person, or Cancel all active.",
          },
          {
            type: "list",
            items: [
              "Client Testers are never included.",
              "People who join after the end date are skipped. People who join part-way through start from their joining date.",
              "People who already have leave on those dates are skipped.",
              "Only active grants can be edited.",
            ],
          },
          {
            type: "callout",
            variant: "tip",
            text: "You can also grant Official Leave from BugDates when you create a Holiday with Office closed switched on.",
          },
        ],
      },
    ],
  },
  {
    id: "checkin-attendance",
    categoryId: "people-hr",
    title: "Check-in, Breaks & Checkout",
    description:
      "Start your day, choose Office or WFH, take breaks, and check out with your hours.",
    roles: [...WORKFORCE],
    keywords: [
      "check in",
      "check-in",
      "checkin",
      "checkout",
      "check out",
      "attendance",
      "office",
      "wfh",
      "break",
      "bugupdate",
      "device clock",
    ],
    readMinutes: 7,
    relatedIds: ["office-location-check", "wfh-and-late-rules", "checkout-hours-breakdown", "weekly-report-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Attendance lives at the top of BugUpdate (sidebar → BugUpdate). You check in when you start, can take breaks during the day, and check out with your hours when you finish. Client Testers do not use attendance.",
          },
        ],
      },
      {
        id: "checkin",
        heading: "Check in",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Click Check-in",
                body: "The dialog shows today's date, the time, and the late cutoff (10:00 AM by default).",
              },
              {
                title: "Choose your work location",
                body: "Office is the default. WFH is only available when an admin has granted an exception or approved your WFH request for today.",
              },
              {
                title: "Allow location for Office",
                body: "Choosing Office checks that you are near the office. If it fails, use Check location again, or see “Office Location Check” for fixes.",
              },
              {
                title: "Add today's plan",
                body: "Select the projects you will work on and/or write your Planned Work for Today. At least one is required.",
              },
              {
                title: "Confirm",
                body: "Click Confirm Check-in. Admins are notified with your work mode.",
              },
            ],
          },
        ],
      },
      {
        id: "breaks",
        heading: "Breaks",
        blocks: [
          {
            type: "paragraph",
            text: "After checking in, use Break and End Break whenever you step away.",
          },
        ],
      },
      {
        id: "checkout",
        heading: "Check out",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Click Checkout",
                body: "On Saturdays you fill the Weekly Report first.",
              },
              {
                title: "Log your hours",
                body: "Enter Hours Worked (1–8, in quarter-hour steps) and update your planned work status. Daily tasks are optional.",
              },
              {
                title: "Split your hours",
                body: "In Hours & Project Progress, split the day across lunch, breaks, projects, and Other. The total must match your hours.",
              },
              {
                title: "Request extra hours if needed",
                body: "If you worked more than 8 hours, tick Worked more than 8 hours? Request Admin Approval and enter the extra hours and a reason.",
              },
              {
                title: "Preview and finish",
                body: "Review the Daily Work Preview, copy or share it, and complete checkout.",
              },
            ],
          },
        ],
      },
      {
        id: "blocked",
        heading: "When check-in is blocked",
        blocks: [
          {
            type: "table",
            headers: ["Banner or message", "What to do"],
            rows: [
              ["You are on approved leave today", "Nothing — you are on leave. Ask an admin if this is wrong."],
              ["Before joining date", "Check-in opens from your joining date."],
              ["Check-in & checkout blocked", "Your onboarding verification was rejected. Fix it on your Profile and wait for HR."],
              ["Your device shows a different date", "Turn on “Set time and date automatically” in your device settings, then try again."],
              ["WFH check-in requires an admin Attendance exception", "Check in as Office, or use Request WFH for today."],
            ],
          },
          {
            type: "callout",
            variant: "info",
            title: "Sundays",
            text: "On Sundays you can check in at any time. Hours stay at 0 until you submit your work update — nothing is added automatically.",
          },
        ],
      },
    ],
  },
  {
    id: "office-location-check",
    categoryId: "people-hr",
    title: "Office Location Check (GPS)",
    description: "Why Office check-in needs your location, and how to fix location errors.",
    roles: [...WORKFORCE],
    keywords: ["location", "gps", "geofence", "office location", "permission", "distance", "too far"],
    readMinutes: 4,
    relatedIds: ["checkin-attendance", "wfh-and-late-rules"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "When you check in as Office, BugRicer confirms you are within the office radius (500 m by default; admins can change it in Settings). The check happens in your browser and again on the server.",
          },
        ],
      },
      {
        id: "errors",
        heading: "Common messages",
        blocks: [
          {
            type: "table",
            headers: ["Message", "Fix"],
            rows: [
              ["Location permission denied", "Allow location for BugRicer in your browser or phone settings. Use “Wrong device? Pick yours” for step-by-step instructions."],
              ["Location timed out", "Move near a window or outside, then click Try again."],
              ["You are about X m away", "Move closer to the office, or request WFH for today."],
              ["Location unavailable or unsupported", "Turn on device location services. Location only works on the secure (https) site."],
            ],
          },
          {
            type: "callout",
            variant: "tip",
            text: "If location still fails, use Request WFH for today. The note is filled in for you, and admins are notified.",
          },
        ],
      },
    ],
  },
  {
    id: "wfh-and-late-rules",
    categoryId: "people-hr",
    title: "WFH Requests & Late Check-in Rules",
    description: "How to request WFH, and how late strikes lead to an Office-only week.",
    roles: [...WORKFORCE],
    keywords: ["wfh", "work from home", "late", "late check-in", "strike", "office only week", "penalty"],
    readMinutes: 5,
    relatedIds: ["checkin-attendance", "attendance-exceptions-admin"],
    sections: [
      {
        id: "wfh",
        heading: "Requesting WFH",
        blocks: [
          {
            type: "paragraph",
            text: "WFH is not a free choice. You can check in as WFH only when an admin has allowed it for the day, either by granting an exception or by approving your request.",
          },
          {
            type: "steps",
            steps: [
              {
                title: "Open Check-in",
                body: "Under Need to work from home?, click Request WFH for today.",
              },
              {
                title: "Send the request",
                body: "Add an optional note (up to 255 characters) and click Send request. Admins get push, email, and WhatsApp alerts.",
              },
              {
                title: "Wait for the decision",
                body: "You are notified when it is approved or rejected. Once approved, WFH becomes available in Check-in.",
              },
            ],
          },
          {
            type: "list",
            items: [
              "You can send one request per day.",
              "A rejected request can be sent again the same day.",
            ],
          },
        ],
      },
      {
        id: "late",
        heading: "Late check-ins",
        blocks: [
          {
            type: "paragraph",
            text: "Check in before the cutoff (10:00 AM by default, Monday to Saturday). Late check-ins are allowed but each one is a strike. The banner shows your count, for example Late strikes: 2/3.",
          },
          {
            type: "callout",
            variant: "warning",
            title: "Three strikes",
            text: "After 3 late check-ins, the next full week (Monday to Sunday) is Office only — WFH is not allowed, even with a request. The 3 strikes are then used up and the count starts again.",
          },
          {
            type: "paragraph",
            text: "An admin can forgive a late check-in. That removes the strike and can cancel an upcoming Office-only week. You are notified when this happens.",
          },
        ],
      },
    ],
  },
  {
    id: "attendance-exceptions-admin",
    categoryId: "people-hr",
    title: "Attendance Exceptions — Admin Guide",
    description: "Approve WFH requests, allow WFH on specific days, and forgive late check-ins.",
    roles: ["admin"],
    permissionKey: "ATTENDANCE_MANAGE",
    keywords: ["attendance exceptions", "allow wfh", "forgive late", "wfh request", "office days", "late check-ins"],
    readMinutes: 6,
    relatedIds: ["wfh-and-late-rules", "admin-user-details", "checkin-attendance"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Attendance exceptions is where admins handle WFH and late check-ins. The sidebar badge shows pending WFH requests. Records cover the last 120 days.",
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
              { role: "Users with ATTENDANCE_MANAGE", access: "Full access to this page" },
            ],
          },
        ],
      },
      {
        id: "wfh-requests",
        heading: "Handle WFH requests",
        blocks: [
          {
            type: "paragraph",
            text: "Pending WFH requests appear at the top of the page. Each request has Approve, Reject, Delete, and Open user. Every action asks you to confirm.",
          },
          {
            type: "table",
            headers: ["Action", "Effect"],
            rows: [
              ["Approve", "Allows WFH for that day so they can check in as WFH"],
              ["Reject", "They stay Office-only unless you grant an exception"],
              ["Delete", "Removes the request. If it was approved, WFH for that day is revoked too"],
            ],
          },
        ],
      },
      {
        id: "grant",
        heading: "Grant an exception",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Pick a person",
                body: "In Grant exception, choose the user.",
              },
              {
                title: "Pick dates",
                body: "Select one or more days, or use Select month in the calendar.",
              },
              {
                title: "Choose what to allow",
                body: "Switch on Allow WFH (works even during an Office-only week) and/or Forgive late check-in (clears the late strike for those days). Add an optional admin note.",
              },
              {
                title: "Save",
                body: "Click Save exception. The person's attendance page opens so you can confirm.",
              },
            ],
          },
          {
            type: "callout",
            variant: "info",
            text: "Client Testers are not tracked for attendance, so exceptions cannot be granted to them.",
          },
        ],
      },
      {
        id: "per-user",
        heading: "A person's attendance page",
        blocks: [
          {
            type: "list",
            items: [
              "Office & WFH days — Day, Weekly, and Monthly views of where they worked, including leave and late marks.",
              "Day exceptions — select one or more and Remove them.",
              "WFH request history — with who approved or rejected each one.",
              "Late check-ins — use Unmark late to forgive one. They are notified.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "admin-add-fix-hours",
    categoryId: "people-hr",
    title: "Add / Fix Work Hours (Admin)",
    description: "Record hours for someone who forgot to check out.",
    roles: ["admin"],
    keywords: ["add hours", "fix hours", "forgot checkout", "missing hours", "admin hours entry"],
    readMinutes: 3,
    relatedIds: ["admin-user-details", "checkin-attendance", "official-leave"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Use Add / Fix Hours when an employee forgot to check out and their day has no hours. It is admin-only and has no sidebar entry.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Record hours",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open the form",
                body: "Click Add / Fix Hours on the person's User Details page, or Add / fix hours from their Leave or OT requests page.",
              },
              {
                title: "Pick the date",
                body: "Future dates cannot be picked. The form tells you whether the date is available.",
              },
              {
                title: "Enter hours and a reason",
                body: "Set Hours worked (1–8). The Admin reason is required, for example “Forgot checkout on Monday”.",
              },
              {
                title: "Save",
                body: "Click Save hours. Use Clear form for a new date to add another day.",
              },
            ],
          },
        ],
      },
      {
        id: "rules",
        heading: "Rules",
        blocks: [
          {
            type: "list",
            items: [
              "Only one entry per day. A day that already has 1 hour or more cannot be changed here.",
              "Days on approved leave, or before the joining date, are blocked.",
              "Each entry is stamped with your name and reason, and is recorded in the admin audit log.",
              "The employee is not notified automatically.",
            ],
          },
          {
            type: "callout",
            variant: "warning",
            text: "Granting Official Leave with “Remove forgot-checkout admin hours” switched on removes these entries for those dates.",
          },
        ],
      },
    ],
  },
  {
    id: "checkout-hours-breakdown",
    categoryId: "people-hr",
    title: "Hours & Project Progress at Checkout",
    description: "Split your day across lunch, breaks, Growth Glimpse, projects, and Other.",
    roles: [...WORKFORCE],
    keywords: ["hours", "project progress", "lunch", "breaks", "growth glimpse", "allocation", "tally"],
    readMinutes: 4,
    relatedIds: ["checkin-attendance", "projects-guide"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "At checkout you split your Hours Worked across fixed slots, your projects, and Other. The Allocated box shows how much is left. It turns green when the totals match.",
          },
          {
            type: "table",
            title: "Fixed slots",
            headers: ["Slot", "Hours", "When"],
            rows: [
              ["Lunch", "0.5h", "Every day"],
              ["Breaks", "0.5h", "Every day"],
              ["Growth Glimpse", "0.5h", "Tuesday, Thursday, and Saturday"],
            ],
          },
          {
            type: "paragraph",
            text: "Mark a slot Skipped if you did not take it — that time then goes to projects or Other.",
          },
        ],
      },
      {
        id: "projects",
        heading: "Project rows",
        blocks: [
          {
            type: "list",
            items: [
              "Projects you planned at check-in appear as Planned.",
              "Use Add unplanned project to add another project assigned to you.",
              "For each project, set Current Status, Hours, Progress %, and optional Project Notes (up to 500 characters).",
              "Project hours feed the project's Team Work Updates panel automatically.",
            ],
          },
          {
            type: "callout",
            variant: "warning",
            text: "Checkout is refused unless lunch + breaks + Growth Glimpse + projects + Other add up to your Hours Worked.",
          },
        ],
      },
    ],
  },
  {
    id: "weekly-report-guide",
    categoryId: "people-hr",
    title: "Weekly Report",
    description: "File your Saturday weekly summary and review past reports.",
    roles: [...WORKFORCE],
    keywords: ["weekly report", "saturday", "weekly summary", "blockers", "plan for next week"],
    readMinutes: 4,
    relatedIds: ["checkin-attendance", "daily-work-update"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Every Saturday, the Weekly Report is part of checkout. You fill a short summary, then log your hours as usual. A week runs Monday to Saturday, with one report per person per week.",
          },
        ],
      },
      {
        id: "steps",
        heading: "File your report",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Start Saturday checkout",
                body: "Click Checkout on BugUpdate. The Weekly Report step appears first.",
              },
              {
                title: "Review the prefilled fields",
                body: "Fields are prefilled from your daily checkouts: Work Completed This Week, Work in Progress, Issues / Blockers (optional), and Plan for Next Week.",
              },
              {
                title: "Continue",
                body: "Click Continue to Checkout and finish checkout. Admins receive your report by email and WhatsApp.",
              },
            ],
          },
          {
            type: "callout",
            variant: "warning",
            text: "Reports can only be saved on Saturday, and Saturday checkout of 1 hour or more is blocked until the report is filed.",
          },
        ],
      },
      {
        id: "page",
        heading: "The Weekly Report page",
        blocks: [
          {
            type: "list",
            items: [
              "Pick a week from the last 16 weeks.",
              "Each card previews every section. Use Copy, or Open report for the full report with attendance.",
              "Admins see Team Reports and My Reports, and can edit or delete any report.",
            ],
          },
          {
            type: "callout",
            variant: "info",
            text: "A deleted report moves to the Recycle Bin. Filing again for the same week replaces it.",
          },
        ],
      },
    ],
  },
  {
    id: "employee-onboarding",
    categoryId: "people-hr",
    title: "Employee Onboarding & Verification",
    description:
      "Complete your onboarding profile, and how HR verifies or rejects it.",
    roles: [...WORKFORCE],
    keywords: [
      "onboarding",
      "verification",
      "aadhaar",
      "pan",
      "bank",
      "ifsc",
      "pin code",
      "documents",
      "rejected",
      "verified",
    ],
    readMinutes: 7,
    relatedIds: ["profile-and-account", "admin-user-details", "checkin-attendance"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "New developers and CODO testers complete onboarding the first time they sign in. The Set up your workspace wizard opens full screen and cannot be skipped. Admins, creators, and Client Testers do not onboard.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Onboarding steps",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Address",
                body: "Profile photo, emergency mobile (verified with a WhatsApp code), contact email (verified with an email code), personal details, and your address. Entering a 6-digit PIN code fills in the post office, city, district, and state.",
              },
              {
                title: "Statutory",
                body: "Aadhaar number and scan (required), PAN number and scan (optional). Files can be PDF, JPG, PNG, or HEIC up to 5 MB.",
              },
              {
                title: "Banking",
                body: "Account holder, account number (9–18 digits), and IFSC code — the bank and branch fill in automatically. UPI details are optional.",
              },
              {
                title: "Permissions",
                body: "Allow location, microphone, and notifications (you can still continue if you deny). Connect Google is required for Docs, Sheets, and Meet.",
              },
              {
                title: "Review and finish",
                body: "Check your summary, set your password if asked, accept the policies, and click Finish & enter. Your status becomes Verification pending.",
              },
            ],
          },
          {
            type: "callout",
            variant: "warning",
            title: "Keep the tab open",
            text: "Your progress is saved as you move between steps, but it is kept in this browser tab. Closing the tab or browser before finishing loses your draft.",
          },
        ],
      },
      {
        id: "statuses",
        heading: "Verification status",
        blocks: [
          {
            type: "table",
            headers: ["Status", "Meaning"],
            rows: [
              ["Verification pending", "Submitted. An admin will review your documents."],
              ["Verified", "Approved by HR."],
              ["Rejected", "Something needs fixing. The banner lists the reasons and any note."],
            ],
          },
          {
            type: "callout",
            variant: "warning",
            text: "While your verification is Rejected, check-in and checkout are blocked. Fix the issues from your Profile (Edit profile), then wait for HR to verify again. Saving profile changes always sends it back for verification.",
          },
        ],
      },
      {
        id: "admin",
        heading: "For admins: verify or reject",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Open the person",
                body: "Go to Users, open the person, and choose the Professional tab.",
              },
              {
                title: "Review & decide",
                body: "On Document verification, click Review & decide. Fill in the Employment (HR) fields such as join date, employee ID, job title, and reports to, and check the documents.",
              },
              {
                title: "Verify or reject",
                body: "Click Verify and confirm, or click Reject, pick one or more reasons, add a note, and click Confirm reject & notify. The employee is notified by email, WhatsApp, and push.",
              },
            ],
          },
          {
            type: "paragraph",
            text: "If an employee cannot finish, use Fill employee records to complete the wizard for them. Records an admin fills in are marked Verified automatically.",
          },
        ],
      },
    ],
  },
  {
    id: "performance-reviews",
    categoryId: "people-hr",
    title: "Performance Reviews & Team Challenges",
    description: "Run monthly reviews, manage the question template, and see team blockers.",
    roles: ["admin"],
    permissionKey: "PERFORMANCE_REVIEWS_MANAGE",
    keywords: ["performance review", "review", "rating", "template", "challenges", "blockers", "monthly review"],
    readMinutes: 6,
    relatedIds: ["admin-user-details", "admin-handbook"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "Performance Reviews (Administration → Performance Reviews) lets admins run a monthly growth review for each active employee, using a shared question template. The Challenges tab collects blockers from all reviews in one place.",
          },
        ],
      },
      {
        id: "template",
        heading: "Set up the template",
        blocks: [
          {
            type: "paragraph",
            text: "Click Manage Template. Each question has a section, the question text, a type, and whether it is required. You can reorder, edit, or delete questions.",
          },
          {
            type: "table",
            headers: ["Question type", "How it is answered"],
            rows: [
              ["Rating (1–5)", "A 1–5 score. Ratings make up the overall rating."],
              ["Short text", "Up to 500 characters"],
              ["Long text", "Up to 5,000 characters"],
              ["Multi-select", "Pick from up to 30 options"],
              ["Yes / No", "A single checkbox"],
            ],
          },
          {
            type: "callout",
            variant: "warning",
            text: "Deleting a question also deletes every answer already given to it.",
          },
        ],
      },
      {
        id: "steps",
        heading: "Conduct a review",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Start",
                body: "Click Conduct Review.",
              },
              {
                title: "Employee & period",
                body: "Choose the employee (active employees only), department, review month, and review date.",
              },
              {
                title: "Answer the questions",
                body: "Questions are grouped by section. Required questions are marked *.",
              },
              {
                title: "Save",
                body: "Click Save as Draft to finish later, or Mark as Completed once every required question is answered.",
              },
            ],
          },
          {
            type: "list",
            items: [
              "There is one review per employee per month.",
              "The employee and month cannot be changed after the review is created.",
              "The overall rating is the average of the rating questions, calculated on completion.",
              "Deleted reviews move to the Recycle Bin.",
            ],
          },
        ],
      },
      {
        id: "challenges",
        heading: "Challenges tab",
        blocks: [
          {
            type: "paragraph",
            text: "Challenges (Blockers on mobile) gathers answers from any section named with Blocker or Challenge — such as client delays and overtime causes — grouped by month and person. Click a card to open the full review.",
          },
        ],
      },
    ],
  },
  {
    id: "bug-recruitment",
    categoryId: "people-hr",
    title: "BugRecruitment — Hiring Pipeline",
    description: "Store CVs and move applicants from Applied to Offered.",
    roles: ["admin"],
    permissionKey: "RECRUITMENT_VIEW",
    keywords: ["recruitment", "hiring", "applicant", "candidate", "cv", "resume", "interview", "pipeline"],
    readMinutes: 5,
    relatedIds: ["employee-onboarding", "admin-handbook"],
    sections: [
      {
        id: "overview",
        heading: "Overview",
        blocks: [
          {
            type: "paragraph",
            text: "BugRecruitment is a CV vault and hiring pipeline. Add applicants with their resume and details, then move them through each stage on a board.",
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
              { role: "RECRUITMENT_VIEW", access: "View applicants" },
              { role: "RECRUITMENT_MANAGE", access: "Add, edit, move, delete, and upload" },
            ],
          },
        ],
      },
      {
        id: "steps",
        heading: "Add an applicant",
        blocks: [
          {
            type: "steps",
            steps: [
              {
                title: "Click New Applicant",
                body: "Fill in the profile, role, compensation (annual CTC in INR), and notes.",
              },
              {
                title: "Attach documents",
                body: "Add a Drive / cloud resume link, upload a resume (PDF, DOC, JPG, PNG, or HEIC up to 5 MB), and up to 5 supporting documents.",
              },
              {
                title: "Save",
                body: "Click Add Applicant. A name plus at least one of email, phone, drive link, or resume is required.",
              },
            ],
          },
        ],
      },
      {
        id: "stages",
        heading: "Stages",
        blocks: [
          {
            type: "table",
            headers: ["Stage", "Where it appears"],
            rows: [
              ["Applied", "Pipeline board"],
              ["HR Screening", "Pipeline board"],
              ["Staff Interview", "Pipeline board"],
              ["Final Round", "Pipeline board"],
              ["Offered", "Offered tab"],
              ["Rejected", "Rejected tab"],
            ],
          },
          {
            type: "paragraph",
            text: "Change Current Stage on a card to move the applicant — it saves straight away. If saving fails, the card moves back and an error toast appears.",
          },
          {
            type: "callout",
            variant: "tip",
            text: "Filter by department, role, or resume (Has resume / Missing resume), and sort by newest, oldest, or name.",
          },
        ],
      },
    ],
  },
];
