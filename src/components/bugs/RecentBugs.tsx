import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { Bug } from "@/types";
import { Bug as BugIcon, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { BugCard } from "./BugCard";

interface RecentBugsProps {
  title: string;
  bugs: Bug[];
}

export function RecentBugs({ title, bugs }: RecentBugsProps) {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  return (
    <Card className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-50/30 via-transparent to-red-50/30 dark:from-orange-950/10 dark:via-transparent dark:to-red-950/10" />
      <CardHeader className="relative flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-600" />
            {title}
          </CardTitle>
          <CardDescription>
            {bugs.length === 0
              ? "No bugs found"
              : `Showing ${bugs.length} bugs`}
          </CardDescription>
        </div>
        <Button size="sm" asChild className="h-9 px-3 bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white shadow-sm">
          <Link
            to={role ? `/${role}/bugs/new` : "/bugs/new"}
            state={{ from: "/" }}
          >
            <Plus className="mr-2 h-4 w-4" /> Report Bug
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="relative">
        {bugs.length === 0 ? (
          <div className="relative overflow-hidden text-center rounded-2xl border border-dashed p-10">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <BugIcon className="h-8 w-8 text-white" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No bugs found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Start by reporting a new bug.
            </p>
            <Button className="mt-4" asChild>
              <Link
                to={role ? `/${role}/bugs/new` : "/bugs/new"}
                state={{ from: "/" }}
              >
                Report Bug
              </Link>
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
