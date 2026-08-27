import { Link, Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BrandStatusVideoScreen } from "@/components/status/BrandStatusVideoScreen";
import { useAuth } from "@/context/AuthContext";
import { HomeIcon } from "lucide-react";

const APP_ROLE_PREFIX = /^\/(admin|developer|tester|user|creator)(\/|$)/;

const NotFound = () => {
  const { currentUser, isAuthenticated, isLoading, storeIntendedDestination } = useAuth();
  const location = useLocation();

  if (
    !isLoading &&
    !isAuthenticated &&
    APP_ROLE_PREFIX.test(location.pathname)
  ) {
    storeIntendedDestination(location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }

  return (
    <BrandStatusVideoScreen variant="404">
      <p className="text-sm font-medium uppercase tracking-wide text-blue-400 mb-2">
        404 — Page not found
      </p>
      <h2 className="text-2xl font-bold text-white mb-3">This page doesn&apos;t exist</h2>
      <p className="text-sm text-slate-300 mb-6 leading-relaxed">
        The page you&apos;re looking for might have been moved, deleted, or never existed.
        If you think this is a mistake, please contact support.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Button asChild className="flex-1 rounded-xl h-11">
          <Link to="/login">
            <HomeIcon className="mr-2 h-4 w-4" />
            Return to Login
          </Link>
        </Button>
      </div>

      <div className="pt-6 border-t border-white/10">
        <p className="text-xs text-slate-400 mb-3 font-medium uppercase tracking-wide">
          Quick links
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {currentUser ? (
            <>
              <Link
                to={`/${currentUser.role}/projects`}
                className="text-sm px-4 py-2 rounded-xl bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 transition"
              >
                Projects
              </Link>
              <Link
                to={`/${currentUser.role}/bugs`}
                className="text-sm px-4 py-2 rounded-xl bg-red-500/15 text-red-300 hover:bg-red-500/25 transition"
              >
                Bugs
              </Link>
              <Link
                to={`/${currentUser.role}/fixes`}
                className="text-sm px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition"
              >
                Fixes
              </Link>
              <Link
                to={`/${currentUser.role}/updates`}
                className="text-sm px-4 py-2 rounded-xl bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 transition"
              >
                Updates
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="text-sm px-4 py-2 rounded-xl bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 transition"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </BrandStatusVideoScreen>
  );
};

export default NotFound;
