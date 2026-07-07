import { lazy, Suspense } from "react";
import { HelpSupportSkeleton, HelpArticleSkeleton } from "@/components/help/HelpSkeletons";

const HelpSupport = lazy(() => import("@/pages/HelpSupport"));
const HelpArticlePage = lazy(() => import("@/pages/help/HelpArticlePage"));

export function HelpSupportRoute() {
  return (
    <Suspense fallback={<HelpSupportSkeleton />}>
      <HelpSupport />
    </Suspense>
  );
}

export function HelpArticleRoute() {
  return (
    <Suspense fallback={<HelpArticleSkeleton />}>
      <HelpArticlePage />
    </Suspense>
  );
}
