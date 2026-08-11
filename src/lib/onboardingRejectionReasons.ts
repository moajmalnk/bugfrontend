/**
 * Why: Shared rejection reason catalog for admin review UI and employee banners.
 * Keep codes in sync with backend/utils/onboarding_rejection_reasons.php.
 * Multiple codes may be stored comma-separated when HR selects several issues.
 */

export type OnboardingRejectionReasonCode =
  | "profile_photo_mismatch"
  | "aadhaar_unclear"
  | "pan_missing"
  | "banking_mismatch"
  | "address_incomplete"
  | "documents_incomplete"
  | "other";

export type OnboardingRejectionReason = {
  code: OnboardingRejectionReasonCode;
  label: string;
  /** What the employee should do next */
  action: string;
  requiresNote?: boolean;
};

export const ONBOARDING_REJECTION_REASONS: OnboardingRejectionReason[] = [
  {
    code: "profile_photo_mismatch",
    label: "Profile photo does not match the employee",
    action: "Ask employee to re-upload a clear photo of themselves only.",
  },
  {
    code: "aadhaar_unclear",
    label: "Aadhaar scan is unclear or unreadable",
    action: "Ask employee to re-upload a clear, complete Aadhaar scan.",
  },
  {
    code: "pan_missing",
    label: "PAN document missing or invalid",
    action: "Ask employee to upload a valid PAN scan.",
  },
  {
    code: "banking_mismatch",
    label: "Banking details are incorrect",
    action: "Ask employee to correct account / IFSC and resubmit.",
  },
  {
    code: "address_incomplete",
    label: "Address details incomplete or incorrect",
    action: "Ask employee to update address and resubmit.",
  },
  {
    code: "documents_incomplete",
    label: "Required documents are incomplete",
    action: "Ask employee to complete missing documents and resubmit.",
  },
  {
    code: "other",
    label: "Other (add a short note)",
    action: "Describe what the employee must fix.",
    requiresNote: true,
  },
];

/** Parse stored single/comma-separated codes into a unique ordered list. */
export function parseOnboardingRejectionCodes(
  value?: string | string[] | null
): OnboardingRejectionReasonCode[] {
  const parts = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/[\s,;|]+/)
        .map((p) => p.trim())
        .filter(Boolean);

  const allowed = new Set(ONBOARDING_REJECTION_REASONS.map((r) => r.code));
  const out: OnboardingRejectionReasonCode[] = [];
  for (const part of parts) {
    const code = part as OnboardingRejectionReasonCode;
    if (allowed.has(code) && !out.includes(code)) {
      out.push(code);
    }
  }
  return out;
}

export function getOnboardingRejectionLabel(code?: string | null): string | null {
  const codes = parseOnboardingRejectionCodes(code);
  if (codes.length === 0) return null;
  return codes
    .map((c) => ONBOARDING_REJECTION_REASONS.find((r) => r.code === c)?.label)
    .filter(Boolean)
    .join(" · ");
}
