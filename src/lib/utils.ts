import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a role-neutral URL for sharing resources
 * This ensures that shared links work for all users regardless of their role
 * @param resourceType - The type of resource (e.g., 'bugs', 'updates', 'projects')
 * @param resourceId - The ID of the resource
 * @returns A role-neutral URL that will redirect to the appropriate role-based URL
 */
export const generateShareableUrl = (resourceType: string, resourceId: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/${resourceType}/${resourceId}`;
};

/**
 * Extract resource ID from a URL path
 * @param path - The URL path (e.g., '/admin/bugs/123' or '/bugs/123')
 * @param resourceType - The type of resource to extract
 * @returns The resource ID or null if not found
 */
export const extractResourceId = (path: string, resourceType: string): string | null => {
  const pathParts = path.split('/');
  const resourceIndex = pathParts.findIndex(part => part === resourceType);
  if (resourceIndex !== -1 && resourceIndex + 1 < pathParts.length) {
    return pathParts[resourceIndex + 1];
  }
  return null;
};

const SYSTEM_ROLES = ['admin', 'developer', 'tester', 'creator'] as const;

/**
 * Get effective user role for routing and display.
 * Prefer a known ENUM on users.role so first-class roles (including creator)
 * keep `/creator/...` URLs even when role_id is not 1/2/3.
 */
export const getEffectiveRole = (user: { role?: string; role_id?: number | null }): string => {
  if (!user) return 'user';

  if (user.role && (SYSTEM_ROLES as readonly string[]).includes(user.role)) {
    return user.role;
  }

  if (user.role_id) {
    if (user.role_id === 1) return 'admin';
    if (user.role_id === 2) return 'developer';
    if (user.role_id === 3) return 'tester';
    return 'user';
  }

  return user.role || 'user';
};

type OnboardingModeValue = "required" | "optional" | "off";

type OnboardingUserRow = {
  role?: string;
  role_id?: number | null;
  tester_type?: string | null;
  onboarding_mode?: OnboardingModeValue | null;
};

type OnboardingUser = OnboardingUserRow | null | undefined;

/** Developers, creators and testers (CODO and client) are the roles an admin can configure. */
export const isOnboardingConfigurable = (role: string): boolean =>
  role === "developer" || role === "creator" || role === "tester";

/**
 * Why: a NULL onboarding_mode on the server means "role default"; mirror
 * br_onboarding_default_mode() so forms prefill correctly. Employees
 * (developers + CODO testers) must onboard; everyone else is off.
 */
export const onboardingModeDefault = (
  role: string,
  testerType: string | null | undefined
): OnboardingModeValue => {
  if (role === "developer") return "required";
  if (role === "tester" && testerType === "codo") return "required";
  return "off";
};

/** Effective onboarding mode; the backend value wins when present. */
export const getOnboardingMode = (user: OnboardingUser): OnboardingModeValue => {
  if (!user) return "off";
  const role = getEffectiveRole(user);
  if (!isOnboardingConfigurable(role)) return onboardingModeDefault(role, user.tester_type);
  const stored = user.onboarding_mode;
  if (stored === "required" || stored === "optional" || stored === "off") return stored;
  return onboardingModeDefault(role, user.tester_type);
};

/** Locked into the wizard until the first submit. Mirrors br_user_requires_onboarding(). */
export const userRequiresOnboarding = (user: OnboardingUser): boolean =>
  getOnboardingMode(user) === "required";

/** Onboarding records and HR verification apply (required or optional). */
export const userOnboardingEnabled = (user: OnboardingUser): boolean =>
  getOnboardingMode(user) !== "off";

/**
 * Why: Attendance / period-hours roster is CODO staff who submit work —
 * developers, creators, and CODO testers. Admins and client testers stay out.
 * Role-based on purpose: switching onboarding off does not remove someone from payroll.
 */
export const isAttendanceRosterUser = (user: {
  role?: string;
  role_id?: number | null;
  tester_type?: string | null;
} | null | undefined): boolean => {
  const role = getEffectiveRole(user || {});
  return role === "developer" || role === "creator" || (role === "tester" && user?.tester_type === "codo");
};

/**
 * Why: HR keeps personal, employment and banking records for staff, plus anyone
 * an admin has opted into onboarding (e.g. a client tester set to Optional).
 */
export const userHasEmployeeRecords = (user: OnboardingUser): boolean =>
  isAttendanceRosterUser(user) || userOnboardingEnabled(user);

/**
 * Incomplete Required onboarding — the user is locked into the wizard.
 * Mirrors the backend guards that read onboarding_completed.
 */
export const userHasPendingOnboarding = (
  user: (OnboardingUserRow & { onboarding_completed?: number | null }) | null | undefined
): boolean =>
  !!user &&
  userRequiresOnboarding(user) &&
  Number(user.onboarding_completed ?? 0) === 0;

export const ONBOARDING_MODE_OPTIONS = [
  {
    value: "required",
    label: "Required",
    description: "Locked into the onboarding wizard until documents, bank details and password are submitted.",
  },
  {
    value: "optional",
    label: "Optional",
    description: "Full dashboard access. Can fill onboarding from Profile any time; HR can verify it.",
  },
  {
    value: "off",
    label: "Off",
    description: "No onboarding wizard, reminders or verification for this user.",
  },
] as const;

export const getOnboardingModeLabel = (mode: string | null | undefined): string =>
  mode === "required" ? "Required" : mode === "optional" ? "Optional" : "Off";

/**
 * Why: Testers are either CODO in-house staff or external client reviewers.
 * Only workforce users get BugUpdate, check-in/checkout, Weekly Report and
 * My Leave. Mirrors backend br_user_is_workforce(); missing tester_type is
 * treated as client (least privilege). The backend remains the authority.
 */
export const isWorkforceUser = (user: {
  role?: string;
  role_id?: number | null;
  tester_type?: string | null;
} | null | undefined): boolean => {
  if (!user) return false;
  if (getEffectiveRole(user) !== "tester") return true;
  return user.tester_type === "codo";
};

/**
 * Why: project Compliance is internal to the CODO team (admins, developers, CODO
 * testers). CODO Rules / Cursor Tips follow the per-user mode instead (see
 * getStandardsMode), so an admin can opt a client tester in.
 * Mirrors backend br_require_codo_standards_access(); the backend remains the authority.
 */
export const canAccessCodoStandards = isWorkforceUser;

export type StandardsFeature = "codo" | "cursor_tips";
type StandardsModeValue = "required" | "optional" | "hidden";

type StandardsUser = {
  role?: string;
  role_id?: number | null;
  tester_type?: string | null;
  codo_rules_mode?: StandardsModeValue | null;
  cursor_tips_mode?: StandardsModeValue | null;
} | null | undefined;

/** Developers, creators and testers (CODO and client) are the roles an admin can configure. */
export const isStandardsConfigurable = (role: string, _testerType?: string | null): boolean =>
  role === "developer" || role === "creator" || role === "tester";

/**
 * Why: a NULL mode on the server means "role default"; mirror
 * br_standards_default_mode() so forms prefill correctly and the UI stays
 * consistent before /me returns the effective value.
 */
export const standardsModeDefault = (
  role: string,
  testerType: string | null | undefined,
  feature: StandardsFeature
): StandardsModeValue => {
  if (role === "admin") return "optional";
  if (!isStandardsConfigurable(role, testerType)) return "hidden";
  // Client testers are external: off until an admin enables them.
  if (role === "tester" && testerType !== "codo") return "hidden";
  if (feature === "codo" && role !== "creator") return "required";
  return "optional";
};

/** Effective mode for a user; the backend value wins when present. */
export const getStandardsMode = (user: StandardsUser, feature: StandardsFeature): StandardsModeValue => {
  if (!user) return "hidden";
  const role = getEffectiveRole(user);
  const stored = feature === "codo" ? user.codo_rules_mode : user.cursor_tips_mode;
  if (stored === "required" || stored === "optional" || stored === "hidden") return stored;
  return standardsModeDefault(role, user.tester_type, feature);
};

/** Page + nav visibility for CODO Rules / Cursor Tips. The backend remains the authority. */
export const canViewStandards = (user: StandardsUser, feature: StandardsFeature): boolean =>
  getStandardsMode(user, feature) !== "hidden";

export const STANDARDS_MODE_OPTIONS = [
  {
    value: "required",
    label: "Required",
    description: "Must acknowledge every item before using the dashboard.",
  },
  {
    value: "optional",
    label: "Optional",
    description: "Can read the page. No acknowledgement is asked.",
  },
  {
    value: "hidden",
    label: "Hidden",
    description: "Page and menu link are removed for this user.",
  },
] as const;

export const getStandardsModeLabel = (mode: string | null | undefined): string =>
  mode === "required" ? "Required" : mode === "hidden" ? "Hidden" : "Optional";

/**
 * Why: some login flows return a user without tester_type; until AuthContext
 * hydrates it from /me, a tester's workforce access is unknown (not denied).
 */
export const isTesterTypePending = (user: {
  role?: string;
  role_id?: number | null;
  tester_type?: string | null;
} | null | undefined): boolean =>
  !!user && getEffectiveRole(user) === "tester" && user.tester_type === undefined;

export const TESTER_TYPE_OPTIONS = [
  {
    value: "codo",
    label: "CODO Tester",
    description: "In-house team. Gets work updates, check-in, weekly report and leave.",
  },
  {
    value: "client",
    label: "Client Tester",
    description: "External client reviewer. Bug reporting and verification only.",
  },
] as const;

export const getTesterTypeLabel = (testerType: string | null | undefined): string =>
  testerType === "codo" ? "CODO Tester" : "Client Tester";

/** Show BugMessage in the main sidebar (after BugUpdate) for admins and developers. */
export const showBugMessageInMainNav = (role: string | undefined | null): boolean =>
  role === "admin" || role === "developer" || role === "creator";

/** Who may report a new bug (on projects they are assigned to). */
export const canReportBug = (role: string | undefined | null): boolean =>
  role === "admin" || role === "developer" || role === "tester";

/**
 * Who may open the Messages (BugMessage) page: admins, developers, or anyone with MESSAGING_VIEW.
 */
export const canOpenMessagesPage = (
  role: string | undefined | null,
  hasPermission: (key: string) => boolean
): boolean =>
  showBugMessageInMainNav(role) || hasPermission("MESSAGING_VIEW");

/**
 * Why: Bridge legacy ENUM admin with RBAC so custom roles work while existing
 * admins keep access even before new permission keys are seeded.
 */
export const hasPermissionOrAdmin = (
  role: string | undefined | null,
  hasPermission: (key: string) => boolean,
  key: string
): boolean => role === "admin" || hasPermission(key);