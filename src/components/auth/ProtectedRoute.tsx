import { MainLayout } from "@/components/layout/MainLayout";
import { MainLayoutSkeleton } from "@/components/layout/MainLayoutSkeleton";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, storeIntendedDestination } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log(
        "Saving intended destination:",
        location.pathname + location.search
      );
      storeIntendedDestination(location.pathname + location.search);
      navigate("/login");
    }
  }, [
    isLoading,
    isAuthenticated,
    navigate,
    location.pathname,
    location.search,
    storeIntendedDestination,
  ]);

  if (isLoading) {
    return <MainLayoutSkeleton />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <MainLayout>{children}</MainLayout>;
};

export default ProtectedRoute;
