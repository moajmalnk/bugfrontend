import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export const BugNotFound = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-10 text-center">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-50/40 via-orange-50/30 to-yellow-50/40 dark:from-red-950/15 dark:via-orange-950/10 dark:to-yellow-950/15" />
      <div className="relative">
        <h1 className="text-2xl font-bold mb-3">Bug not found</h1>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          The bug you're looking for doesn't exist or may have been removed.
        </p>
        <Button asChild className="h-10 px-5 bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white">
          <Link to={role ? `/${role}/bugs` : "/bugs"}>Back to Bugs</Link>
        </Button>
      </div>
    </div>
  );
};
