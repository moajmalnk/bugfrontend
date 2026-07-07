import { Skeleton } from "@/components/ui/skeleton";
import { HelpPageShell, helpGlassCard, helpInnerCard } from "./HelpPageShell";
import { cn } from "@/lib/utils";

export function HelpSupportSkeleton() {
  return (
    <HelpPageShell className="animate-in fade-in duration-300">
      {/* Header */}
      <div className={cn(helpGlassCard, "p-6 sm:p-8")}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="space-y-3 min-w-0 flex-1">
              <Skeleton className="h-10 w-56 sm:w-72 max-w-full" />
              <Skeleton className="h-1 w-20 rounded-full" />
              <Skeleton className="h-5 w-full max-w-xl" />
              <Skeleton className="h-5 w-4/5 max-w-lg" />
            </div>
          </div>
          <Skeleton className="h-12 w-36 rounded-xl shrink-0" />
        </div>
      </div>

      {/* Search + filters */}
      <div className={cn(helpGlassCard, "p-5 sm:p-6 space-y-5")}>
        <Skeleton className="h-12 w-full max-w-2xl mx-auto rounded-2xl" />
        <div className="flex flex-wrap justify-center gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-full" />
          ))}
        </div>
      </div>

      {/* Browse by topic */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-36" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cn(helpGlassCard, "p-5 space-y-3")}>
              <div className="flex items-start gap-3">
                <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-3 w-16 mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Popular articles */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cn(helpInnerCard, "p-4 space-y-3")}>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <div className="flex justify-between pt-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact support */}
      <div className={cn(helpGlassCard, "p-6 sm:p-8")}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <div className="flex gap-3 shrink-0">
            <Skeleton className="h-10 w-44 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>
      </div>
    </HelpPageShell>
  );
}

export function HelpArticleSkeleton() {
  return (
    <HelpPageShell className="animate-in fade-in duration-300">
      {/* Breadcrumb */}
      <div className={cn(helpGlassCard, "px-4 py-3 flex items-center gap-2")}>
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left sidebar */}
        <aside className="hidden lg:block w-60 xl:w-64 shrink-0">
          <div className={cn(helpInnerCard, "p-3 space-y-3")}>
            <Skeleton className="h-3 w-12 mx-2" />
            <Skeleton className="h-9 w-full rounded-xl" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5 pl-2">
                <Skeleton className="h-9 w-full rounded-xl" />
                <div className="ml-3 space-y-1 border-l border-gray-200/80 dark:border-gray-700/80 pl-2">
                  <Skeleton className="h-7 w-full rounded-lg" />
                  <Skeleton className="h-7 w-5/6 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <div className={cn(helpGlassCard, "p-5 sm:p-6 md:p-8 space-y-8")}>
            <header className="pb-6 border-b border-gray-200/60 dark:border-gray-700/60 space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="flex items-start gap-3">
                <Skeleton className="hidden sm:block h-10 w-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-8 w-3/4 max-w-md" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-5/6" />
                </div>
              </div>
            </header>

            {Array.from({ length: 3 }).map((_, i) => (
              <section key={i} className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                {i === 1 && (
                  <div className={cn(helpInnerCard, "p-4 space-y-3")}>
                    <div className="flex gap-4">
                      <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  </div>
                )}
                {i === 2 && (
                  <div className={cn(helpInnerCard, "overflow-hidden")}>
                    <Skeleton className="h-32 w-full rounded-2xl" />
                  </div>
                )}
              </section>
            ))}
          </div>
        </main>

        {/* Right TOC */}
        <aside className="hidden xl:block w-52 shrink-0">
          <div className={cn(helpInnerCard, "p-4 space-y-3")}>
            <Skeleton className="h-3 w-24" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </aside>
      </div>

      {/* Full-width related + feedback */}
      <div className={cn(helpGlassCard, "w-full p-6 sm:p-8 space-y-5")}>
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                helpInnerCard,
                "p-4 sm:p-5 space-y-3 h-36"
              )}
            >
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <div className="flex justify-between pt-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={cn(helpGlassCard, "w-full p-6 sm:p-8")}>
        <Skeleton className="h-5 w-64 mx-auto" />
      </div>
    </HelpPageShell>
  );
}
