import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { getEffectiveRole, isTesterTypePending, isWorkforceUser } from "@/lib/utils";

const WORK_FEATURES_DENIED =
  "Work updates, check-in, weekly reports and leave are for CODO team members only.";

/**
 * Why: BugUpdate, check-in, Weekly Report, My Leave — and the CODO standards
 * (CODO Rules, Compliance, Cursor Tips) — are CODO team features. Client testers
 * typing the URL directly are sent back to Bugs. The backend enforces the same
 * rule with 403; this only keeps the UI honest.
 */
export function WorkforceRoute({ deniedDescription = WORK_FEATURES_DENIED }: { deniedDescription?: string }) {
  const { currentUser } = useAuth();
  const pending = isTesterTypePending(currentUser);
  const denied = !!currentUser && !pending && !isWorkforceUser(currentUser);

  useEffect(() => {
    if (denied) {
      toast({
        title: "Not available for Client Testers",
        description: deniedDescription,
      });
    }
  }, [denied, deniedDescription]);

  if (pending) {
    return (
      <div className="grid grid-cols-12 gap-4 p-4 sm:p-6" aria-busy="true" aria-live="polite">
        <Skeleton className="col-span-12 h-10 rounded-xl md:col-span-6" />
        <Skeleton className="col-span-12 h-40 rounded-2xl" />
        <Skeleton className="col-span-12 h-64 rounded-2xl" />
      </div>
    );
  }
  if (denied) {
    return <Navigate to={`/${getEffectiveRole(currentUser)}/bugs`} replace />;
  }
  return <Outlet />;
}
