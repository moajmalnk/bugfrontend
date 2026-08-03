import { useState } from "react";
import { LogOut, MonitorSmartphone, Smartphone, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth, type LogoutScope } from "@/context/AuthContext";

type LogoutConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful logout (optional; AuthContext already navigates to /login). */
  onLoggedOut?: () => void;
};

const OPTIONS: {
  value: LogoutScope;
  label: string;
  description: string;
  icon: typeof MonitorSmartphone;
}[] = [
  {
    value: "this_device",
    label: "This device",
    description:
      "End your session on this browser only. Other devices stay signed in.",
    icon: MonitorSmartphone,
  },
  {
    value: "all_devices",
    label: "All devices",
    description:
      "Sign out of every web and app session. You will need to log in again everywhere.",
    icon: Smartphone,
  },
];

export function LogoutConfirmDialog({
  open,
  onOpenChange,
  onLoggedOut,
}: LogoutConfirmDialogProps) {
  const { logout } = useAuth();
  const [scope, setScope] = useState<LogoutScope>("this_device");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (isSubmitting) return;
    if (!next) setScope("this_device");
    onOpenChange(next);
  };

  const handleLogout = async () => {
    setIsSubmitting(true);
    try {
      await logout(scope);
      onOpenChange(false);
      onLoggedOut?.();
    } catch {
      // AuthContext still clears local session; keep dialog usable
    } finally {
      setIsSubmitting(false);
      setScope("this_device");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isSubmitting}
        className="sm:max-w-[420px] gap-0 p-0 overflow-hidden rounded-2xl border-border/60"
      >
        <DialogHeader className="space-y-1.5 px-6 pt-6 pb-4 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
            Confirm Logout
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Choose whether to end only this session or sign out everywhere.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 space-y-2.5">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = scope === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={isSubmitting}
                onClick={() => setScope(option.value)}
                className={cn(
                  "w-full text-left rounded-xl border px-4 py-3.5 transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                  selected
                    ? "border-blue-500/70 bg-blue-50/80 dark:bg-blue-950/40 dark:border-blue-500/50 shadow-sm"
                    : "border-border/70 bg-background hover:bg-muted/40 hover:border-border"
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      selected
                        ? "border-blue-600 bg-blue-600"
                        : "border-muted-foreground/40 bg-transparent"
                    )}
                    aria-hidden
                  >
                    {selected ? (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    ) : null}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          selected
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-muted-foreground"
                        )}
                      />
                      <span className="font-semibold text-foreground text-[15px]">
                        {option.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug pl-6">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-6 pt-5 pb-6 space-y-2">
          <Button
            type="button"
            variant="destructive"
            disabled={isSubmitting}
            onClick={() => void handleLogout()}
            className="w-full h-11 rounded-xl text-base font-semibold shadow-md"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing out…
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => handleOpenChange(false)}
            className="w-full h-10 text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
