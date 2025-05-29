
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Bug } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center max-w-md px-4">
        <Bug className="h-12 w-12 mx-auto text-primary mb-4" />
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-xl text-gray-600 mb-6">
          Oops! This page is buggier than we expected.
        </p>
        <p className="text-gray-500 mb-8">
          The page you're looking for doesn't exist or has been moved to another URL.
        </p>
        <Button asChild>
          <Link to="/">Return to Projects</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
