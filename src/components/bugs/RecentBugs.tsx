import { Link } from 'react-router-dom';
import { Bug } from '@/types';
import { useBugs } from '@/context/BugContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { BugCard } from './BugCard';
import { Bug as BugIcon, Plus } from 'lucide-react';

interface RecentBugsProps {
  title: string;
  bugs: Bug[];
}

export function RecentBugs({ title, bugs }: RecentBugsProps) {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {bugs.length === 0 ? 'No bugs found' : `Showing ${bugs.length} bugs`}
          </CardDescription>
        </div>
        <Button size="sm" asChild>
          <Link to={role ? `/${role}/bugs/new` : "/bugs/new"} state={{ from: '/' }}>
            <Plus className="mr-2 h-4 w-4" /> Report Bug
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {bugs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <BugIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No bugs found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Start by reporting a new bug.
            </p>
            <Button className="mt-4" asChild>
              <Link to={role ? `/${role}/bugs/new` : "/bugs/new"} state={{ from: '/' }}>Report Bug</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {bugs.map((bug) => (
              <BugCard key={bug.id} bug={bug} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
