import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

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

// Lazy loaded pages
const Dashboard = lazy(() => import("@/pages/Dashboard"));
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

const RouteConfig = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Protected Routes with Skeleton Loading */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Suspense fallback={<SkeletonFallback />}>
              <Dashboard />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <Suspense fallback={<SkeletonFallback />}>
              <Projects />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <ProtectedRoute>
            <Suspense fallback={<SkeletonFallback />}>
              <ProjectDetails />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bugs"
        element={
          <ProtectedRoute>
            <Suspense fallback={<SkeletonFallback />}>
              <Bugs />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bugs/:bugId"
        element={
          <ProtectedRoute>
            <Suspense fallback={<SkeletonFallback />}>
              <BugDetails />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bugs/new"
        element={
          <ProtectedRoute>
            <Suspense fallback={<SkeletonFallback />}>
              <NewBug />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity"
        element={
          <ProtectedRoute>
            <Suspense fallback={<SkeletonFallback />}>
              <Activity />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Suspense fallback={<SkeletonFallback />}>
              <Users />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fixes"
        element={
          <ProtectedRoute>
            <Suspense fallback={<SkeletonFallback />}>
              <Fixes />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Suspense fallback={<SkeletonFallback />}>
              <Settings />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Suspense fallback={<SkeletonFallback />}>
              <Profile />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Suspense fallback={<SkeletonFallback />}>
              <Reports />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Suspense fallback={<SkeletonFallback />}>
              <Messages />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Redirect root to dashboard */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Suspense fallback={<SkeletonFallback />}>
              <Projects />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RouteConfig;
