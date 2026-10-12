import { lazy, Suspense } from "react";
import { HelpPageShell, helpGlassCard } from "@/components/help/HelpPageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const WhatsNew = lazy(() => import("@/pages/WhatsNew"));

function WhatsNewSkeleton() {
  return (
    <HelpPageShell className="flex flex-col gap-6">
      <div className={cn(helpGlassCard, "p-6 sm:p-8")}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <Skeleton className="h-8 w-48 max-w-full" />
          </div>
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-4 w-2/3 max-w-md" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex gap-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-2xl" />
            <Skeleton className="h-24 min-w-0 flex-1 rounded-2xl" />
          </div>
        ))}
      </div>
    </HelpPageShell>
  );
}

export function WhatsNewRoute() {
  return (
    <Suspense fallback={<WhatsNewSkeleton />}>
      <WhatsNew />
    </Suspense>
  );
}
