import { useState } from "react";
import { Eye, Loader2, LogOut, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserAvatar } from "@/components/users/UserAvatar";

function roleLabelFor(role?: string | null, testerType?: string | null): string {
  const normalized = (role || "user").toLowerCase();
  if (normalized === "tester" && testerType) {
    return testerType.toLowerCase() === "codo" ? "CODO Tester" : "Client Tester";
  }
  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Why: Impersonation must stay visible without a full-width banner.
 * The impersonated user's face sits beside notifications; identity and exit live in a small menu.
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
  const roleLabel = roleLabelFor(currentUser?.role, currentUser?.tester_type);

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
          className="relative h-9 w-9 rounded-xl p-0 hover:bg-amber-500/15 dark:hover:bg-amber-400/15"
          aria-label={`Viewing as ${displayName}. Open impersonation details`}
          title={`Viewing as ${displayName}`}
        >
          <UserAvatar
            name={displayName}
            avatar={currentUser?.avatar}
            size="sm"
            className="rounded-full ring-2 ring-amber-500/80"
            alt={`${displayName} profile photo`}
          />
          <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-background" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-72 rounded-2xl p-0 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2">
          <Eye className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Viewing as
          </p>
        </div>

        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar
              name={displayName}
              avatar={currentUser?.avatar}
              size="lg"
              alt={`${displayName} profile photo`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground" title={displayName}>
                {displayName}
              </p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-xl border border-border/60 bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <ShieldCheck className="h-3 w-3" aria-hidden />
                {roleLabel}
              </span>
            </div>
          </div>

          {currentUser?.email ? (
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 min-w-0">
              <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <p className="truncate text-xs text-muted-foreground" title={currentUser.email}>
                {currentUser.email}
              </p>
            </div>
          ) : null}

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
