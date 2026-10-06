/**
 * Why: Shared nav badge counts for Sidebar. Kept in a dedicated module so
 * Pay Verify and other new keys are not lost to stale circular type resolution.
 */
export interface AdminNavCounts {
  dashboard: number;
  projects: number;
  compliance: number;
  bugs: number;
  retests: number;
  fixes: number;
  updates: number;
  docs: number;
  sheets: number;
  meetings: number;
  tasks: number;
  tasksOverdue: number;
  bugdates: number;
  bugdatesPending: number;
  bugupdate: number;
  weeklyReport: number;
  /** Workforce hour/salary verification pending (employees only; admins always 0). */
  payVerify: number;
  myleave: number;
  messages: number;
  commonBugs: number;
  codo: number;
  cursorTips: number;
  users: number;
  clients: number;
  ot: number;
  leave: number;
  attendance: number;
  whatsapp: number;
  feedbacks: number;
  reviews: number;
  activities: number;
  push: number;
  shorts: number;
  settings: number;
  backup: number;
  recycleBin: number;
  creative: number;
  assets: number;
}

export const EMPTY_ADMIN_NAV_COUNTS: AdminNavCounts = {
  dashboard: 0,
  projects: 0,
  compliance: 0,
  bugs: 0,
  retests: 0,
  fixes: 0,
  updates: 0,
  docs: 0,
  sheets: 0,
  meetings: 0,
  tasks: 0,
  tasksOverdue: 0,
  bugdates: 0,
  bugdatesPending: 0,
  bugupdate: 0,
  weeklyReport: 0,
  payVerify: 0,
  myleave: 0,
  messages: 0,
  commonBugs: 0,
  codo: 0,
  cursorTips: 0,
  users: 0,
  clients: 0,
  ot: 0,
  leave: 0,
  attendance: 0,
  whatsapp: 0,
  feedbacks: 0,
  reviews: 0,
  activities: 0,
  push: 0,
  shorts: 0,
  settings: 0,
  backup: 0,
  recycleBin: 0,
  creative: 0,
  assets: 0,
};
