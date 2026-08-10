import { useAuth } from "@/context/AuthContext";
import { userHasPendingOnboarding } from "@/lib/utils";
import { useCallback, useState } from "react";
import { OnboardingCelebration } from "./OnboardingCelebration";
import { OnboardingWizard } from "./OnboardingWizard";

/**
 * Why: Lock incomplete *developers* into mandatory onboarding before the app.
 * Testers/admins are not required to complete the wizard.
 */
export default function OnboardingGuard() {
  const { currentUser, updateCurrentUser } = useAuth();
  const [celebrating, setCelebrating] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);

  const incomplete = userHasPendingOnboarding(currentUser);

  const displayName =
    currentUser?.name || currentUser?.username || "teammate";

  const handleCompleted = useCallback((result?: { avatar?: string | null }) => {
    if (!currentUser) return;
    setPendingAvatar(result?.avatar ?? null);
    setCelebrating(true);
  }, [currentUser]);

  const handleCelebrationDone = useCallback(() => {
    if (!currentUser) return;
    updateCurrentUser({
      ...currentUser,
      ...(pendingAvatar ? { avatar: pendingAvatar } : {}),
      onboarding_completed: 1,
      must_set_password: 0,
      onboarding_verification_status: "pending",
      terms_accepted_at: new Date().toISOString(),
      privacy_accepted_at: new Date().toISOString(),
    });
    setPendingAvatar(null);
    setCelebrating(false);
  }, [currentUser, pendingAvatar, updateCurrentUser]);

  if (!currentUser || (!incomplete && !celebrating)) return null;

  return (
    <>
      <OnboardingWizard
        open={incomplete && !celebrating}
        userId={currentUser.id}
        employeeName={currentUser.name || currentUser.username || ""}
        employeePhone={currentUser.phone || ""}
        employeeEmail={currentUser.email || ""}
        mustSetPassword={Number(currentUser.must_set_password ?? 0) === 1}
        onCompleted={handleCompleted}
      />
      <OnboardingCelebration
        name={displayName}
        isVisible={celebrating}
        onDone={handleCelebrationDone}
      />
    </>
  );
}
