import { useAuth } from "@/context/AuthContext";
import { cn, getEffectiveRole } from "@/lib/utils";
import { Bug } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

function projectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/projects\/([^/]+)\/?$/);
  if (!match) return null;
  const id = match[1];
  if (!id || id === "new") return null;
  return id;
}

/**
 * Why: Testers need one-tap report from any page without hunting the full New Bug form.
 * Mounted once in MainLayout so it is not duplicated per page.
 */
export function ReportBugFab() {
  const { currentUser } = useAuth();
  const { pathname } = useLocation();
  const role = getEffectiveRole(currentUser || {});

  if (role !== "tester") return null;
  if (/\/bugs\/report\/?$/.test(pathname)) return null;
  if (/\/meet\/[^/]+\/?$/.test(pathname)) return null;

  const projectId = projectIdFromPath(pathname);
  const to = projectId
    ? `/${role}/bugs/report?projectId=${encodeURIComponent(projectId)}`
    : `/${role}/bugs/report`;

  return (
    <Link
      to={to}
      aria-label="Report Bug"
      className={cn(
        "fixed z-50 flex items-center gap-2 rounded-2xl px-4 py-3",
        "right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))]",
        "bg-gradient-to-r from-orange-600 to-red-700 text-white",
        "font-semibold shadow-lg shadow-black/25 ring-1 ring-white/10",
        "transition hover:from-orange-700 hover:to-red-800 hover:shadow-xl hover:scale-105",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
    >
      <Bug className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="text-sm">Report Bug</span>
    </Link>
  );
}
