import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { BugIcon, HomeIcon, ArrowLeftIcon } from 'lucide-react';

const NotFound = () => {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Icon */}
        <div className="mb-8">
          <div className="relative">
            <BugIcon className="h-24 w-24 mx-auto text-primary animate-bounce" />
            <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold animate-pulse">
              4
            </div>
            <div className="absolute -bottom-2 -left-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold animate-pulse">
              4
            </div>
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Page Not Found
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          Oops! The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
        </p>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link to={currentUser?.role ? `/${currentUser.role}/projects` : "/"}>
              <HomeIcon className="mr-2 h-4 w-4" />
              Return to Projects
            </Link>
          </Button>
          
          <Button variant="outline" asChild className="w-full">
            <Link to={currentUser?.role ? `/${currentUser.role}/bugs` : "/bugs"}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Go to Bugs
            </Link>
          </Button>
        </div>

        {/* Helpful Links */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Try these pages instead:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link 
              to={currentUser?.role ? `/${currentUser.role}/projects` : "/projects"}
              className="text-sm text-primary hover:underline"
            >
              Projects
            </Link>
            <span className="text-gray-400">•</span>
            <Link 
              to={currentUser?.role ? `/${currentUser.role}/bugs` : "/bugs"}
              className="text-sm text-primary hover:underline"
            >
              Bugs
            </Link>
            <span className="text-gray-400">•</span>
            <Link 
              to={currentUser?.role ? `/${currentUser.role}/fixes` : "/fixes"}
              className="text-sm text-primary hover:underline"
            >
              Fixes
            </Link>
            <span className="text-gray-400">•</span>
            <Link 
              to={currentUser?.role ? `/${currentUser.role}/updates` : "/updates"}
              className="text-sm text-primary hover:underline"
            >
              Updates
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
