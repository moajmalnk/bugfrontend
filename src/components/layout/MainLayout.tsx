import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Menu, Bug, Search, RefreshCw } from "lucide-react";
import { lazy, memo, ReactNode, Suspense, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn, getEffectiveRole } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { MainLayoutSkeleton } from "./MainLayoutSkeleton";
import { NotificationPopover } from "@/components/notifications/NotificationPopover";
import { GlobalSearchProvider, useGlobalSearchModal } from "@/context/GlobalSearchContext";
import { GlobalSearchDialog } from "@/components/search/GlobalSearchDialog";
import { AdminActiveUsersStrip } from "@/components/users/AdminActiveUsersStrip";
import { AdminShortsStrip } from "@/components/shorts/AdminShortsStrip";
import { ImpersonateBanner } from "../ui/ImpersonateBanner";

// Non-critical widgets: loaded in separate chunks so they never block first paint.
const FirebaseListener = lazy(() => import("../messaging/FirebaseListener"));
const AnnouncementPopup = lazy(() => import("../ui/AnnouncementPopup"));
const FeedbackWidget = lazy(() => import("../feedback/FeedbackWidget"));
const BugBotFab = lazy(() =>
  import("@/components/bugbot/BugBotFab").then((m) => ({ default: m.BugBotFab }))
);

interface MainLayoutProps {
  children: ReactNode;
}

const MobileTopBar = memo(function MobileTopBar({
  onOpenSidebar,
}: {
  onOpenSidebar: () => void;
}) {
  const { setOpen: setSearchOpen } = useGlobalSearchModal();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    window.location.reload();
  };

  return (
    <div className="lg:hidden flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-40 pt-[calc(0.625rem+env(safe-area-inset-top))]">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
          className="h-9 w-9 shrink-0 hover:bg-accent/80"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Bug className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-base sm:text-lg text-foreground truncate">
            BugRicer
          </span>
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setSearchOpen(true)}
          className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent/80"
          aria-label="Search"
          title="Search"
        >
          <Search className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent/80"
          aria-label="Refresh page"
          title="Refresh"
        >
          <RefreshCw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
        </Button>
        <NotificationPopover />
      </div>
    </div>
  );
});

const LayoutFooter = memo(function LayoutFooter({ role }: { role: string }) {
  return (
    <footer className="max-w-7xl mx-auto w-full min-w-0 mt-8 mb-8 border-t pt-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3 text-xs text-muted-foreground">
        <p className="order-2 sm:order-none justify-self-center sm:justify-self-start text-center sm:text-left">
          © {new Date().getFullYear()} BugRicer. All rights reserved.
        </p>
        <div className="order-3 sm:order-none justify-self-center flex items-center gap-3 flex-wrap justify-center">
          <Link
            to={`/${role}/help`}
            className="hover:text-foreground transition-colors"
            aria-label="Help center"
          >
            Help Center
          </Link>
          <span className="hidden sm:inline text-border">|</span>
          <a
            href="mailto:support@bugricer.com"
            className="hover:text-foreground transition-colors"
            aria-label="Contact support"
          >
            support@bugricer.com
          </a>
          <span className="hidden sm:inline text-border">|</span>
          <a
            href="https://bugricer.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition-colors"
            aria-label="Visit website"
          >
            bugricer.com
          </a>
        </div>
        <p className="order-1 sm:order-none justify-self-center sm:justify-self-end text-center sm:text-right text-[11px] text-muted-foreground/80">
          Built with care for testers & developers
        </p>
      </div>
    </footer>
  );
});

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  /** BugMessage: fill viewport; scroll only inside chat panes (not the app shell). */
  const isMessagesPage = /\/messages\/?$/.test(pathname);
  const isUsersListPage = /\/users\/?$/.test(pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Mount the mobile drawer (and its Sidebar with permission fetches) only after first open.
  const [drawerMounted, setDrawerMounted] = useState(false);

  // Check if we're in impersonate mode
  const isImpersonating =
    currentUser?.admin_id && currentUser.admin_id !== currentUser.id;

  const openSidebar = () => {
    setDrawerMounted(true);
    setSidebarOpen(true);
  };

  useEffect(() => {
    if (!isLoading && !currentUser) {
      navigate("/login", { replace: true });
    }
  }, [currentUser, isLoading, navigate]);

  // Close the drawer automatically when navigating
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (isLoading) {
    return <MainLayoutSkeleton />;
  }

  if (!currentUser) {
    return null;
  }

  const role = getEffectiveRole(currentUser);

  return (
    <GlobalSearchProvider onCloseSidebar={() => setSidebarOpen(false)}>
      <div className="flex h-screen supports-[height:100dvh]:h-[100dvh] min-w-0 overflow-hidden bg-background">
        <ImpersonateBanner />
        {/* Sidebar for desktop */}
        <aside
          className={cn(
            "hidden lg:block w-64 xl:w-72 shrink-0 min-w-0",
            isImpersonating && "pt-16"
          )}
        >
          <Sidebar />
        </aside>

        {/* Sidebar drawer for mobile/tablet — mounted lazily on first open */}
        {drawerMounted && (
          <div
            className={cn(
              "fixed inset-0 z-50 transition-opacity duration-300 ease-in-out lg:hidden",
              sidebarOpen
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            )}
            onClick={() => setSidebarOpen(false)}
            aria-label="Sidebar overlay"
            aria-hidden={!sidebarOpen}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Sidebar */}
            <div
              className={cn(
                "absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-card shadow-2xl transition-transform duration-300 ease-in-out will-change-transform",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar closeSidebar={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Main content */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 min-h-0",
            isImpersonating && "pt-16"
          )}
        >
          {/* Top bar with menu button on mobile/tablet */}
          <MobileTopBar onOpenSidebar={openSidebar} />

          {role === "admin" && !isUsersListPage ? <AdminShortsStrip /> : null}
          {role === "admin" && isUsersListPage ? <AdminActiveUsersStrip /> : null}

          {/* Main content area */}
          <main
            className={cn(
              "flex-1 min-w-0 min-h-0 bg-background",
              isMessagesPage
                ? "overflow-hidden flex flex-col"
                : "overflow-y-auto overflow-x-hidden custom-scrollbar"
            )}
          >
            {isMessagesPage ? (
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col w-full max-w-full">
                {children}
              </div>
            ) : (
              <div className="min-w-0 w-full px-3 py-4 sm:p-4 md:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto w-full min-w-0">{children}</div>
                <LayoutFooter role={currentUser.role} />
              </div>
            )}
          </main>
        </div>
      </div>
      <GlobalSearchDialog />
      <Suspense fallback={null}>
        <FirebaseListener />
        <AnnouncementPopup />
        <FeedbackWidget />
        <BugBotFab />
      </Suspense>
    </GlobalSearchProvider>
  );
};
