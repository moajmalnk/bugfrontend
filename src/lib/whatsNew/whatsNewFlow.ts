/**
 * Why: What's New is a role path, not a changelog. Each person sees only the
 * steps their sidebar can open, in the order they should actually work.
 */

export type BiText = { en: string; ml: string };

export type WhatsNewAudience =
  | "admin"
  | "developer"
  | "codo-tester"
  | "client-tester"
  | "creator"
  | "user";

export type WhatsNewIcon =
  | "dashboard"
  | "projects"
  | "bugs"
  | "fixes"
  | "retests"
  | "users"
  | "leave"
  | "pay"
  | "help"
  | "update"
  | "weekly"
  | "creative"
  | "dates"
  | "tasks"
  | "messages"
  | "codo";

export type WhatsNewContext = {
  role: string;
  isWorkforce: boolean;
  isCodoTester: boolean;
  can: (key: string) => boolean;
  showCodoRules: boolean;
  showMessages: boolean;
  showTasks: boolean;
  showCreative: boolean;
  showBugDates: boolean;
  showDailyUpdate: boolean;
  showWeeklyReport: boolean;
  showPayVerify: boolean;
  showMyLeave: boolean;
};

export type WhatsNewStep = {
  id: string;
  path: string;
  icon: WhatsNewIcon;
  title: BiText;
  body: BiText;
  when?: (ctx: WhatsNewContext) => boolean;
};

export const WHATS_NEW_UI = {
  title: { en: "What's New", ml: "പുതിയത് എന്താണ്" },
  lede: {
    en: "The path for your role, one step at a time.",
    ml: "നിങ്ങളുടെ റോളിനുള്ള വഴി, ഒരു ഘട്ടം വീതം.",
  },
  open: { en: "Open this step", ml: "ഈ ഘട്ടം തുറക്കുക" },
  yourRole: { en: "Your role", ml: "നിങ്ങളുടെ റോൾ" },
  pathTitle: { en: "Your path", ml: "നിങ്ങളുടെ വഴി" },
} as const;

const AUDIENCE_META: Record<
  WhatsNewAudience,
  { label: BiText; intro: BiText }
> = {
  admin: {
    label: { en: "Admin", ml: "അഡ്മിൻ" },
    intro: {
      en: "Run the day in this order.",
      ml: "ദിവസം ഈ ക്രമത്തിൽ നടത്തുക.",
    },
  },
  developer: {
    label: { en: "Developer", ml: "ഡെവലപ്പർ" },
    intro: {
      en: "Take a bug, fix it, then record the work.",
      ml: "ബഗ് ഏറ്റെടുത്ത് ഫിക്സ് ചെയ്ത് ജോലി രേഖപ്പെടുത്തുക.",
    },
  },
  "codo-tester": {
    label: { en: "CODO Tester", ml: "കോഡോ ടെസ്റ്റർ" },
    intro: {
      en: "Report, retest, then close your day.",
      ml: "റിപ്പോർട്ട് ചെയ്ത് റീടെസ്റ്റ് ചെയ്ത് ദിവസം അവസാനിപ്പിക്കുക.",
    },
  },
  "client-tester": {
    label: { en: "Client Tester", ml: "ക്ലയന്റ് ടെസ്റ്റർ" },
    intro: {
      en: "Report bugs and verify the fixes you receive.",
      ml: "ബഗുകൾ റിപ്പോർട്ട് ചെയ്ത് ലഭിക്കുന്ന ഫിക്സുകൾ വെരിഫൈ ചെയ്യുക.",
    },
  },
  creator: {
    label: { en: "Creator", ml: "ക്രിയേറ്റർ" },
    intro: {
      en: "Move creative work from the project into review.",
      ml: "ക്രിയേറ്റീവ് ജോലി പ്രോജക്റ്റിൽ നിന്ന് റിവ്യൂവിലേക്ക് നീക്കുക.",
    },
  },
  user: {
    label: { en: "User", ml: "യൂസർ" },
    intro: {
      en: "Start from the dashboard and the projects you can open.",
      ml: "ഡാഷ്‌ബോർഡിൽ നിന്നും തുറക്കാവുന്ന പ്രോജക്റ്റുകളിൽ നിന്നും തുടങ്ങുക.",
    },
  },
};

const STEPS: Record<string, WhatsNewStep> = {
  dashboard: {
    id: "dashboard",
    path: "/dashboard",
    icon: "dashboard",
    title: { en: "Open the dashboard", ml: "ഡാഷ്‌ബോർഡ് തുറക്കുക" },
    body: {
      en: "Read today’s counts before you open a record.",
      ml: "ഒരു റെക്കോർഡ് തുറക്കുന്നതിന് മുമ്പ് ഇന്നത്തെ എണ്ണങ്ങൾ നോക്കുക.",
    },
  },
  projects: {
    id: "projects",
    path: "/projects",
    icon: "projects",
    title: { en: "Choose the project", ml: "പ്രോജക്റ്റ് തിരഞ്ഞെടുക്കുക" },
    body: {
      en: "Work stays inside a project. Open the one assigned to you.",
      ml: "ജോലി ഒരു പ്രോജക്റ്റിനുള്ളിലാണ്. നിങ്ങൾക്ക് അസൈൻ ചെയ്തത് തുറക്കുക.",
    },
  },
  "bugs-triage": {
    id: "bugs-triage",
    path: "/bugs",
    icon: "bugs",
    title: { en: "Triage bugs", ml: "ബഗുകൾ പരിശോധിക്കുക" },
    body: {
      en: "Read new bugs, assign an owner, and decline duplicates.",
      ml: "പുതിയ ബഗുകൾ വായിച്ച് ഉടമയെ അസൈൻ ചെയ്യുക. ആവർത്തനങ്ങൾ നിരസിക്കുക.",
    },
  },
  "bugs-take": {
    id: "bugs-take",
    path: "/bugs",
    icon: "bugs",
    title: { en: "Take a bug", ml: "ഒരു ബഗ് ഏറ്റെടുക്കുക" },
    body: {
      en: "Open Bugs and work the items assigned to you.",
      ml: "ബഗുകൾ തുറന്ന് നിങ്ങൾക്ക് അസൈൻ ചെയ്തവ ചെയ്യുക.",
    },
  },
  "bugs-report": {
    id: "bugs-report",
    path: "/bugs/new",
    icon: "bugs",
    title: { en: "Report the bug", ml: "ബഗ് റിപ്പോർട്ട് ചെയ്യുക" },
    body: {
      en: "Write the steps, the expected result, and what actually happened.",
      ml: "ഘട്ടങ്ങൾ, പ്രതീക്ഷിച്ച ഫലം, യഥാർത്ഥത്തിൽ സംഭവിച്ചത് എഴുതുക.",
    },
  },
  fixes: {
    id: "fixes",
    path: "/fixes",
    icon: "fixes",
    title: { en: "Confirm the fix", ml: "ഫിക്സ് ഉറപ്പാക്കുക" },
    body: {
      en: "A fix is finished only after someone verifies it.",
      ml: "ആരെങ്കിലും വെരിഫൈ ചെയ്തതിനു ശേഷം മാത്രമേ ഫിക്സ് പൂർത്തിയാകൂ.",
    },
  },
  retests: {
    id: "retests",
    path: "/retests",
    icon: "retests",
    title: { en: "Retest the fix", ml: "ഫിക്സ് വീണ്ടും പരിശോധിക്കുക" },
    body: {
      en: "Follow the original steps, then pass or fail the retest.",
      ml: "ആദ്യ ഘട്ടങ്ങൾ പിന്തുടർന്ന് റീടെസ്റ്റ് പാസ് അല്ലെങ്കിൽ ഫെയിൽ ആക്കുക.",
    },
  },
  users: {
    id: "users",
    path: "/users",
    icon: "users",
    title: { en: "Review people", ml: "ആളുകളെ പരിശോധിക്കുക" },
    body: {
      en: "Open Users and confirm who can enter this workspace.",
      ml: "യൂസേഴ്‌സ് തുറന്ന് ഈ വർക്ക്‌സ്‌പേസിൽ ആർക്ക് കയറാമെന്ന് ഉറപ്പാക്കുക.",
    },
    when: (ctx) => ctx.can("USERS_VIEW"),
  },
  "leave-requests": {
    id: "leave-requests",
    path: "/leave-requests",
    icon: "leave",
    title: { en: "Clear leave requests", ml: "ലീവ് അഭ്യർത്ഥനകൾ തീർക്കുക" },
    body: {
      en: "Approve or decline pending leave so attendance stays correct.",
      ml: "അറ്റൻഡൻസ് ശരിയായി നിൽക്കാൻ കാത്തിരിക്കുന്ന ലീവ് അംഗീകരിക്കുകയോ നിരസിക്കുകയോ ചെയ്യുക.",
    },
    when: (ctx) => ctx.can("LEAVE_MANAGE"),
  },
  "pay-verify": {
    id: "pay-verify",
    path: "/pay-verify",
    icon: "pay",
    title: { en: "Verify hours", ml: "മണിക്കൂറുകൾ വെരിഫൈ ചെയ്യുക" },
    body: {
      en: "Check Pay Verify before hours become a salary estimate.",
      ml: "മണിക്കൂറുകൾ ശമ്പള കണക്കാകുന്നതിന് മുമ്പ് പേ വെരിഫൈ നോക്കുക.",
    },
    when: (ctx) => ctx.showPayVerify,
  },
  "daily-update": {
    id: "daily-update",
    path: "/daily-update",
    icon: "update",
    title: { en: "Send BugUpdate", ml: "ബഗ് അപ്ഡേറ്റ് അയയ്ക്കുക" },
    body: {
      en: "Record what you worked on today before you leave.",
      ml: "പോകുന്നതിന് മുമ്പ് ഇന്ന് ചെയ്ത ജോലി രേഖപ്പെടുത്തുക.",
    },
    when: (ctx) => ctx.showDailyUpdate,
  },
  "weekly-report": {
    id: "weekly-report",
    path: "/weekly-report",
    icon: "weekly",
    title: { en: "Submit the weekly report", ml: "വാര റിപ്പോർട്ട് സമർപ്പിക്കുക" },
    body: {
      en: "Summarise the week so Pay Verify has a source.",
      ml: "ആഴ്ചയുടെ സംഗ്രഹം നൽകുക. പേ വെരിഫൈക്ക് അതാണ് അടിസ്ഥാനം.",
    },
    when: (ctx) => ctx.showWeeklyReport,
  },
  "my-leave": {
    id: "my-leave",
    path: "/leave",
    icon: "leave",
    title: { en: "Apply for leave", ml: "ലീവിന് അപേക്ഷിക്കുക" },
    body: {
      en: "Submit leave before the day, then wait for approval.",
      ml: "ദിവസത്തിന് മുമ്പ് ലീവ് സമർപ്പിക്കുക. പിന്നെ അംഗീകാരം കാത്തിരിക്കുക.",
    },
    when: (ctx) => ctx.showMyLeave,
  },
  creative: {
    id: "creative",
    path: "/bugcreative",
    icon: "creative",
    title: { en: "Review creative work", ml: "ക്രിയേറ്റീവ് ജോലി പരിശോധിക്കുക" },
    body: {
      en: "Open BugCreative and move assets through review.",
      ml: "ബഗ്‌ക്രിയേറ്റീവ് തുറന്ന് അസറ്റുകൾ റിവ്യൂവിലൂടെ നീക്കുക.",
    },
    when: (ctx) => ctx.showCreative,
  },
  dates: {
    id: "dates",
    path: "/bugdates",
    icon: "dates",
    title: { en: "Check BugDates", ml: "ബഗ്‌ഡേറ്റ്സ് നോക്കുക" },
    body: {
      en: "See the events that need a decision in the next seven days.",
      ml: "അടുത്ത ഏഴ് ദിവസത്തിൽ തീരുമാനം വേണ്ട ഇവന്റുകൾ കാണുക.",
    },
    when: (ctx) => ctx.showBugDates,
  },
  tasks: {
    id: "tasks",
    path: "/my-tasks?tab=shared-tasks",
    icon: "tasks",
    title: { en: "Work BugToDo", ml: "ബഗ്‌ടുഡു ചെയ്യുക" },
    body: {
      en: "Finish the shared tasks assigned to you.",
      ml: "നിങ്ങൾക്ക് പങ്കിട്ട ടാസ്കുകൾ പൂർത്തിയാക്കുക.",
    },
    when: (ctx) => ctx.showTasks,
  },
  messages: {
    id: "messages",
    path: "/messages",
    icon: "messages",
    title: { en: "Reply in BugMessage", ml: "ബഗ്‌മെസേജിൽ മറുപടി നൽകുക" },
    body: {
      en: "Keep the conversation on the record.",
      ml: "സംഭാഷണം ഈ റെക്കോർഡിൽ തന്നെ നിലനിർത്തുക.",
    },
    when: (ctx) => ctx.showMessages,
  },
  codo: {
    id: "codo",
    path: "/common-codo",
    icon: "codo",
    title: { en: "Read CODO Rules", ml: "കോഡോ നിയമങ്ങൾ വായിക്കുക" },
    body: {
      en: "Acknowledge the required rules before you continue.",
      ml: "മുന്നോട്ട് പോകുന്നതിന് മുമ്പ് നിർബന്ധിത നിയമങ്ങൾ അംഗീകരിക്കുക.",
    },
    when: (ctx) => ctx.showCodoRules,
  },
  help: {
    id: "help",
    path: "/help",
    icon: "help",
    title: { en: "Use Help & Support", ml: "ഹെൽപ്പ് ആൻഡ് സപ്പോർട്ട് ഉപയോഗിക്കുക" },
    body: {
      en: "Open a guide when a step on this page is not enough.",
      ml: "ഈ പേജിലെ ഘട്ടം മതിയാകാത്തപ്പോൾ ഒരു ഗൈഡ് തുറക്കുക.",
    },
  },
};

const SEQUENCE: Record<WhatsNewAudience, string[]> = {
  admin: [
    "dashboard",
    "projects",
    "bugs-triage",
    "fixes",
    "users",
    "leave-requests",
    "pay-verify",
    "help",
  ],
  developer: [
    "dashboard",
    "projects",
    "bugs-take",
    "fixes",
    "daily-update",
    "weekly-report",
    "messages",
    "help",
  ],
  "codo-tester": [
    "dashboard",
    "projects",
    "bugs-report",
    "retests",
    "daily-update",
    "my-leave",
    "codo",
    "help",
  ],
  "client-tester": ["dashboard", "projects", "bugs-report", "retests", "fixes", "help"],
  creator: ["dashboard", "projects", "creative", "dates", "tasks", "messages", "help"],
  user: ["dashboard", "projects", "tasks", "messages", "help"],
};

export function resolveWhatsNewAudience(ctx: {
  role: string;
  isWorkforce: boolean;
}): WhatsNewAudience {
  if (ctx.role === "admin") return "admin";
  if (ctx.role === "developer") return "developer";
  if (ctx.role === "creator") return "creator";
  if (ctx.role === "tester") return ctx.isWorkforce ? "codo-tester" : "client-tester";
  return "user";
}

export function getWhatsNewAudienceMeta(audience: WhatsNewAudience) {
  return AUDIENCE_META[audience];
}

/** Steps this person can open, in working order. Hidden pages are omitted. */
export function getWhatsNewSteps(audience: WhatsNewAudience, ctx: WhatsNewContext): WhatsNewStep[] {
  return SEQUENCE[audience]
    .map((id) => STEPS[id])
    .filter((step): step is WhatsNewStep => Boolean(step && (!step.when || step.when(ctx))));
}
