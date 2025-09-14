import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";
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
