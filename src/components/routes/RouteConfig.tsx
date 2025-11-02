import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfUse from "@/pages/TermsOfUse";
import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes, useParams } from "react-router-dom";
import MeetLobby from "@/pages/MeetLobby";
import MeetRoom from "@/pages/MeetRoom";

// Professional Skeleton Loading Component
const SkeletonFallback = () => (
  <div className="container mx-auto px-4 py-8 animate-in fade-in duration-300 max-w-7xl">
    {/* Header Skeleton */}
    <div className="mb-8">
      <Skeleton className="h-8 w-64 mb-2" />
      <Skeleton className="h-4 w-32" />
    </div>

    {/* Content Skeleton - Adaptive Layout */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Card Skeletons */}
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>

    {/* Navigation Skeleton */}
    <div className="mt-8 flex justify-between items-center">
      <Skeleton className="h-10 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>
  </div>
);

// New layout for role-based routes
const ProtectedRoleLayout = () => (
  <ProtectedRoute>
    <Suspense fallback={<SkeletonFallback />}>
      <Outlet />
    </Suspense>
  </ProtectedRoute>
);

// Lazy loaded pages
const Projects = lazy(() => import("@/pages/Projects"));
const ProjectDetails = lazy(() => import("@/pages/ProjectDetails"));
const Bugs = lazy(() => import("@/pages/Bugs"));
const BugDetails = lazy(() => import("@/pages/BugDetails"));
const NewBug = lazy(() => import("@/pages/NewBug"));
const Activity = lazy(() => import("@/pages/Activity"));
const Users = lazy(() => import("@/pages/Users"));
const Settings = lazy(() => import("@/pages/Settings"));
const Profile = lazy(() => import("@/pages/Profile"));
const Reports = lazy(() => import("@/pages/Reports"));
const Fixes = lazy(() => import("@/pages/Fixes"));
const Messages = lazy(() => import("@/pages/Messages"));
const FixBug = lazy(() => import("@/pages/FixBug"));
const Updates = lazy(() => import("@/pages/Updates"));
const NewUpdate = lazy(() => import("@/pages/NewUpdate"));
const UpdateDetails = lazy(() => import("@/pages/UpdateDetails"));
const EditUpdate = lazy(() => import("@/pages/EditUpdate"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const WhatsAppMessages = lazy(() => import("@/pages/WhatsAppMessages"));
const MyTasks = lazy(() => 
  import("@/pages/MyTasks").catch((error) => {
    console.error('Failed to load MyTasks component:', error);
    // Return a fallback component with better error handling
    return {
      default: () => (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full mx-4">
            <div className="bg-card border border-border rounded-lg p-6 shadow-lg text-center">
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Loading Error</h2>
                <p className="text-muted-foreground mb-4">
                  Failed to load MyTasks component. This usually happens due to network issues or cached files.
                </p>
              </div>
              <div className="space-y-3">
                <button 
                  onClick={() => window.location.reload()} 
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Retry Loading
                </button>
                <button 
                  onClick={async () => {
                    // Clear caches and reload
                    if ('caches' in window) {
                      const cacheNames = await caches.keys();
                      await Promise.all(cacheNames.map(name => caches.delete(name)));
                    }
                    window.location.reload();
                  }}
                  className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
                >
                  Clear Cache & Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    };
  })
);
const DailyUpdate = lazy(() => import("@/pages/DailyUpdate"));
const DailyWorkUpdate = lazy(() => import("@/pages/DailyWorkUpdate"));
const TimeTracking = lazy(() => import("@/pages/TimeTracking"));
const FeedbackStats = lazy(() => import("@/pages/FeedbackStats"));
const DocsSetupSuccess = lazy(() => import("@/pages/DocsSetupSuccess"));
const DocsSetupError = lazy(() => import("@/pages/DocsSetupError"));
const BugDocsPage = lazy(() => import("@/pages/BugDocsPage"));
const UserPermissions = lazy(() => import("@/pages/UserPermissions"));

// Component to handle role-neutral bug redirects
const BugRedirect = () => {
  const { bugId } = useParams();
  const { isAuthenticated, currentUser } = useAuth();
  const role = currentUser?.role;

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={`/${role}/bugs/${bugId}`} replace />;
};

// Component to handle role-neutral update redirects
const UpdateRedirect = () => {
  const { updateId } = useParams();
  const { isAuthenticated, currentUser } = useAuth();
  const role = currentUser?.role;

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={`/${role}/updates/${updateId}`} replace />;
};

// Component to handle role-neutral project redirects
const ProjectRedirect = () => {
  const { projectId } = useParams();
  const { isAuthenticated, currentUser } = useAuth();
  const role = currentUser?.role;

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={`/${role}/projects/${projectId}`} replace />;
};

const RouteConfig = () => {
  const { isLoading, isAuthenticated, currentUser } = useAuth();
  const role = currentUser?.role;

  if (isLoading) {
    return <SkeletonFallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-use" element={<TermsOfUse />} />

      {/* Google Docs OAuth callback routes */}
      <Route
        path="/docs-setup-success"
        element={
          <Suspense fallback={<SkeletonFallback />}>
            <DocsSetupSuccess />
          </Suspense>
        }
      />
      <Route
        path="/docs-setup-error"
        element={
          <Suspense fallback={<SkeletonFallback />}>
            <DocsSetupError />
          </Suspense>
        }
      />

      {/* Dashboard route - accessible via token */}
      <Route
        path="/dashboard"
        element={
          <Suspense fallback={<SkeletonFallback />}>
            <Dashboard />
          </Suspense>
        }
      />

      {/* Role-neutral bug routes - redirect to role-based URLs */}
      <Route path="/bugs/:bugId" element={<BugRedirect />} />

      {/* Role-neutral update routes - redirect to role-based URLs */}
      <Route path="/updates/:updateId" element={<UpdateRedirect />} />

      {/* Role-neutral project routes - redirect to role-based URLs */}
      <Route path="/projects/:projectId" element={<ProjectRedirect />} />

      {/* Protected Routes with role prefix */}
      {isAuthenticated && role && (
        <Route path={`/${role}`} element={<ProtectedRoleLayout />}>
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:projectId" element={<ProjectDetails />} />
          <Route path="bugs" element={<Bugs />} />
          <Route path="bugs/:bugId" element={<BugDetails />} />
          <Route path="bugs/new" element={<NewBug />} />
          <Route path="activity" element={<Activity />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:userId/permissions" element={<UserPermissions />} />
          <Route path="fixes" element={<Fixes />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="reports" element={<Reports />} />
          <Route path="messages" element={<Messages />} />
          <Route path="bugs/:bugId/fix" element={<FixBug />} />
          <Route path="new-update" element={<NewUpdate />} />
          <Route path="updates" element={<Updates />} />
          <Route path="updates/:updateId" element={<UpdateDetails />} />
          <Route path="updates/:updateId/edit" element={<EditUpdate />} />
          <Route path="whatsapp-messages" element={<WhatsAppMessages />} />
          <Route path="meet" element={<MeetLobby />} />
          <Route path="meet/:code" element={<MeetRoom />} />
          <Route path="my-tasks" element={<MyTasks />} />
          <Route path="daily-update" element={<DailyUpdate />} />
          <Route path="daily-work-update" element={<DailyWorkUpdate />} />
          <Route path="time-tracking" element={<TimeTracking />} />
          <Route path="feedback-stats" element={<FeedbackStats />} />
          <Route path="bugdocs" element={<BugDocsPage />} />
          {/* Redirect from /:role to /:role/projects */}
          <Route index element={<Navigate to="projects" replace />} />
        </Route>
      )}

      {/* Redirect root to projects or login */}
      <Route
        path="/"
        element={
          <Navigate
            to={isAuthenticated && role ? `/${role}/projects` : "/login"}
            replace
          />
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RouteConfig;
