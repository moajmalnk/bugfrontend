import { useAuth } from "@/context/AuthContext";
import { getOnboardingRejectionLabel } from "@/lib/onboardingRejectionReasons";
import { userRequiresOnboarding } from "@/lib/utils";
import { Clock3, ShieldCheck, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Why: After onboarding submit, HR still needs to verify docs — surface that
 * clearly without locking the employee out of the dashboard.
 * Only developers go through mandatory onboarding.
 */
export default function OnboardingVerificationBanner() {
  const { currentUser } = useAuth();
  if (
    !currentUser ||
    !userRequiresOnboarding(currentUser) ||
    Number(currentUser.onboarding_completed ?? 0) !== 1
  ) {
    return null;
  }

  const status = (currentUser.onboarding_verification_status || "none").toLowerCase();

  if (status === "pending") {
    return (
      <div className="border-b border-amber-500/25 bg-amber-500/10">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0">
            <Clock3 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Verification pending
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-200/80">
              Your documents were submitted. An admin will review and verify them shortly.
            </p>
          </div>
          <Link
            to={`/${currentUser.role}/profile`}
            className="text-xs font-medium text-amber-900 dark:text-amber-100 underline underline-offset-2 shrink-0"
          >
            View profile
          </Link>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    const reasonLabel =
      getOnboardingRejectionLabel(currentUser.onboarding_rejection_reason) ||
      null;
    const nextStep = (currentUser.onboarding_rejection_action || "").trim();
    const note = (currentUser.onboarding_rejection_note || "").trim();

    return (
      <div className="border-b border-destructive/25 bg-destructive/10">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/15 text-destructive shrink-0">
            <XCircle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-destructive">
              Verification rejected
              {reasonLabel ? ` · ${reasonLabel}` : ""}
            </p>
            <p className="text-xs text-destructive/80">
              {nextStep ||
                "Please update your details from Profile and ask your admin to re-check."}
              {note ? ` Note: ${note}` : ""}
            </p>
          </div>
          <Link
            to={`/${currentUser.role}/profile`}
            className="text-xs font-medium text-destructive underline underline-offset-2 shrink-0"
          >
            Open profile
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

export function OnboardingVerificationBadge({
  status,
  className,
}: {
  status?: string | null;
  className?: string;
}) {
  const s = (status || "none").toLowerCase();
  if (s === "pending") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 ${className || ""}`}
      >
        <Clock3 className="h-3.5 w-3.5" />
        Verification pending
      </span>
    );
  }
  if (s === "verified") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 ${className || ""}`}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        Verified
      </span>
    );
  }
  if (s === "rejected") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive ${className || ""}`}
      >
        <XCircle className="h-3.5 w-3.5" />
        Rejected
      </span>
    );
  }
  return null;
}
