import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { getEffectiveRole, hasPermissionOrAdmin } from "@/lib/utils";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const DeveloperDashboard = lazy(() => import("@/pages/DeveloperDashboard"));
const TesterDashboard = lazy(() => import("@/pages/TesterDashboard"));
const CreatorDashboard = lazy(() => import("@/pages/CreatorDashboard"));

function DashboardFallback() {
  return (
    <div className="min-w-0 w-full space-y-6">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid grid-cols-12 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="col-span-6 sm:col-span-4 xl:col-span-2 h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}

/**
 * Why: Same /{role}/dashboard URL serves Ops for admins and personal dashboards for
 * developer/tester without granting DASHBOARD_VIEW (org-wide ops) to those roles.
 */
export default function RoleDashboard() {
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions(null);
  const role = getEffectiveRole(currentUser || {});
  const canViewOps = hasPermissionOrAdmin(role, hasPermission, "DASHBOARD_VIEW");

  return (
    <Suspense fallback={<DashboardFallback />}>
      {canViewOps ? (
        <AdminDashboard />
      ) : role === "creator" ? (
        <CreatorDashboard />
      ) : role === "developer" ? (
        <DeveloperDashboard />
      ) : (
        <TesterDashboard />
      )}
    </Suspense>
  );
}
