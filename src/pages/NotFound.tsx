import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { BugIcon, HomeIcon, ArrowLeftIcon } from 'lucide-react';

const NotFound = () => {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
      <div className="max-w-lg w-full text-center bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-xl p-10 border border-gray-200 dark:border-gray-800">
        {/* 404 Illustration */}
        <div className="mb-8 flex flex-col items-center">
          <div className="relative mb-2">
            <span className="text-[5rem] font-extrabold text-blue-600 dark:text-blue-400 drop-shadow-lg select-none">404</span>
            <BugIcon className="h-14 w-14 text-red-500 absolute -top-6 -right-10 animate-bounce" />
          </div>
          <span className="text-lg text-gray-500 dark:text-gray-400">Oops! Page not found.</span>
        </div>

        {/* Error Message */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">This page doesn't exist</h1>
        <p className="text-base text-gray-600 dark:text-gray-300 mb-8">
          The page you're looking for might have been moved, deleted, or never existed.<br />
          If you think this is a mistake, please contact support.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Button asChild className="flex-1 text-base py-6">
            <Link to={`/login`}>
              <HomeIcon className="mr-2 h-5 w-5" />
              Return to Login
            </Link>
          </Button>
        </div>

        {/* Helpful Links */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 font-medium">
            Quick links:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {currentUser ? (
              <>
                <Link 
                  to={`/${currentUser.role}/projects`}
                  className="text-sm px-4 py-2 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 transition"
                >
                  Projects
                </Link>
                <Link 
                  to={`/${currentUser.role}/bugs`}
                  className="text-sm px-4 py-2 rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800 transition"
                >
                  Bugs
                </Link>
                <Link 
                  to={`/${currentUser.role}/fixes`}
                  className="text-sm px-4 py-2 rounded-md bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-800 transition"
                >
                  Fixes
                </Link>
                <Link 
                  to={`/${currentUser.role}/updates`}
                  className="text-sm px-4 py-2 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 transition"
                >
                  Updates
                </Link>
              </>
            ) : (
              <Link 
                to="/login"
                className="text-sm px-4 py-2 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 transition"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
