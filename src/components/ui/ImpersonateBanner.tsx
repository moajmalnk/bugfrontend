import { useState } from "react";
import { Loader2, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Why: Impersonation must stay visible without a full-width banner.
 * A single icon sits beside notifications; identity and exit live in a small menu.
 */
export function ImpersonateIndicator() {
  const { currentUser, exitImpersonateMode } = useAuth();
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);

  const isImpersonating = Boolean(
    currentUser?.admin_id && currentUser.admin_id !== currentUser.id
  );

  if (!isImpersonating) {
    return null;
  }

  const displayName = currentUser?.name || currentUser?.username || "User";
  const roleLabel = (currentUser?.role || "user").replace(/_/g, " ");

  const handleExit = async () => {
    if (exiting || !exitImpersonateMode) return;
    setExiting(true);
    try {
      await exitImpersonateMode();
    } finally {
      setExiting(false);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-xl text-amber-700 hover:bg-amber-500/15 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-400/15 dark:hover:text-amber-200"
          aria-label={`Viewing as ${displayName}. Open impersonation details`}
          title={`Viewing as ${displayName}`}
        >
          <UserRound className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-background" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-64 rounded-xl p-3">
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Viewing as
            </p>
            <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
            {currentUser?.email ? (
              <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
            ) : null}
            <p className="mt-1 text-xs capitalize text-muted-foreground">{roleLabel}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full rounded-xl"
            onClick={handleExit}
            disabled={exiting}
          >
            {exiting ? <Loader2 className="animate-spin" /> : <LogOut />}
            {exiting ? "Exiting…" : "Exit to admin"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
