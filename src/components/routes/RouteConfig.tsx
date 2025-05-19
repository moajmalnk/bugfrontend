import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading page...</p>
    </div>
  </div>
);

// Lazy loaded pages
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Projects = lazy(() => import('@/pages/Projects'));
const ProjectDetails = lazy(() => import('@/pages/ProjectDetails'));
const Bugs = lazy(() => import('@/pages/Bugs'));
const BugDetails = lazy(() => import('@/pages/BugDetails'));
const NewBug = lazy(() => import('@/pages/NewBug'));
const Activity = lazy(() => import('@/pages/Activity'));
const Users = lazy(() => import('@/pages/Users'));
const Settings = lazy(() => import('@/pages/Settings'));
const Profile = lazy(() => import('@/pages/Profile'));
const Reports = lazy(() => import('@/pages/Reports'));
const Fixes = lazy(() => import('@/pages/Fixes'));

const Messages = lazy(() => import('@/pages/Messages'));

const RouteConfig = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Protected Routes with Lazy Loading */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <Dashboard />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <Projects />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <ProjectDetails />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bugs"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <Bugs />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bugs/:bugId"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <BugDetails />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bugs/new"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <NewBug />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <Activity />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <Users />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fixes"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <Fixes />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <Settings />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <Profile />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <Reports />
            </Suspense>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
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
            <Suspense fallback={<LoadingFallback />}>
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
