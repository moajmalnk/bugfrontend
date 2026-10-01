import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, BookOpen, ExternalLink, Globe, PartyPopper } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const PENDING_KEY_PREFIX = "br_codo_welcome_pending:";

/**
 * Why: Company resources are useful once the employee is in, not while they are
 * racing through mandatory onboarding. The guard flags the user on completion;
 * this dialog shows once on the first dashboard render and then clears the flag.
 */
export function markCodoWelcomePending(userId: string) {
  try {
    localStorage.setItem(PENDING_KEY_PREFIX + userId, "1");
  } catch {
    // Storage blocked (private mode) — skip the welcome kit rather than fail.
  }
}

type Gtag = (...args: unknown[]) => void;
const track = (event: string) =>
  (window as Window & { gtag?: Gtag }).gtag?.("event", event, { location: "onboarding_complete" });

function ResourceLink({
  href,
  icon,
  tone,
  title,
  description,
  meta,
  event,
}: {
  href: string;
  icon: ReactNode;
  tone: string;
  title: string;
  description: string;
  meta: string;
  event: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track(event)}
      className="col-span-12 sm:col-span-6 group rounded-2xl border border-border/60 bg-card/70 p-4 flex items-start gap-3 hover:border-primary/40 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors min-w-0"
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${tone}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-foreground tracking-tight truncate">{title}</p>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" aria-hidden="true" />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        <p className="text-xs font-medium text-primary truncate">{meta}</p>
      </div>
    </a>
  );
}

export default function CodoWelcomeDialog() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ? String(currentUser.id) : "";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    try {
      setOpen(localStorage.getItem(PENDING_KEY_PREFIX + userId) === "1");
    } catch {
      setOpen(false);
    }
  }, [userId]);

  const close = () => {
    try {
      localStorage.removeItem(PENDING_KEY_PREFIX + userId);
    } catch {
      // ignore
    }
    setOpen(false);
  };

  if (!userId) return null;

  const firstName = (currentUser?.name || currentUser?.username || "").split(" ")[0];

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="sm:max-w-[600px] w-[calc(100vw-1.5rem)] rounded-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="relative px-6 pt-6 pb-4 text-left space-y-0">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent" />
          <div className="relative flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <PartyPopper className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                {firstName ? `Welcome to CODO, ${firstName}` : "Welcome to CODO"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                Your workspace is ready. Bookmark these two — they answer most first-week questions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-2">
          <div className="grid grid-cols-12 gap-3">
            <ResourceLink
              href="/CODO-Handbook.pdf"
              icon={<BookOpen className="h-5 w-5" />}
              tone="bg-violet-500/15 text-violet-500 border-violet-500/25"
              title="CODO Handbook"
              description="Policies, leave, working hours and how we work."
              meta="CODO-Handbook.pdf"
              event="codo_handbook_click"
            />
            <ResourceLink
              href="https://codoai.in"
              icon={<Globe className="h-5 w-5" />}
              tone="bg-sky-500/15 text-sky-500 border-sky-500/25"
              title="CODO AI Innovations"
              description="Company website — products, team and news."
              meta="codoai.in"
              event="codo_website_click"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            HR will verify your onboarding details shortly — you can keep working meanwhile.
          </p>
        </div>

        <DialogFooter className="px-6 py-4 mt-2 border-t border-border/60">
          <Button type="button" className="rounded-xl w-full sm:w-auto" onClick={close}>
            Go to dashboard
            <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
