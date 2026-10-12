import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Banknote,
  Bug,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  ListTodo,
  MessageSquare,
  Newspaper,
  Palette,
  PlaneTakeoff,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CodoLangToggle } from "@/components/codo/CodoLangToggle";
import { HelpPageShell, helpGlassCard, helpTextWrap } from "@/components/help/HelpPageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import type { CodoContentLang } from "@/lib/codo/codoContentLang";
import {
  playbookChromeLang,
  readStoredCodoContentLang,
  writeStoredCodoContentLang,
} from "@/lib/codo/codoContentLang";
import {
  getWhatsNewAudienceMeta,
  getWhatsNewSteps,
  resolveWhatsNewAudience,
  WHATS_NEW_UI,
  type BiText,
  type WhatsNewIcon,
} from "@/lib/whatsNew/whatsNewFlow";
import {
  canViewStandards,
  cn,
  getEffectiveRole,
  isWorkforceUser,
  showBugMessageInMainNav,
} from "@/lib/utils";

const ICONS: Record<WhatsNewIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  projects: FolderKanban,
  bugs: Bug,
  fixes: CheckCircle2,
  retests: ClipboardCheck,
  users: Users,
  leave: PlaneTakeoff,
  pay: Banknote,
  help: LifeBuoy,
  update: Calendar,
  weekly: ClipboardList,
  creative: Palette,
  dates: CalendarDays,
  tasks: ListTodo,
  messages: MessageSquare,
  codo: ClipboardCheck,
};

function FlowText({
  value,
  lang,
  className,
  secondaryClassName,
}: {
  value: BiText;
  lang: CodoContentLang;
  className?: string;
  secondaryClassName?: string;
}) {
  if (lang === "ml") {
    return (
      <span className={cn(helpTextWrap, className)} lang="ml">
        {value.ml}
      </span>
    );
  }
  if (lang === "en") {
    return (
      <span className={cn(helpTextWrap, className)} lang="en">
        {value.en}
      </span>
    );
  }
  return (
    <span className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className={helpTextWrap} lang="en">
        {value.en}
      </span>
      <span className={cn(helpTextWrap, "text-muted-foreground", secondaryClassName)} lang="ml">
        {value.ml}
      </span>
    </span>
  );
}

function FlowSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex gap-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-2xl" />
          <Skeleton className="h-24 min-w-0 flex-1 rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

export default function WhatsNew() {
  const { currentUser } = useAuth();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions(null);
  const [lang, setLang] = useState<CodoContentLang>(() => readStoredCodoContentLang());

  const role = getEffectiveRole(currentUser || {});
  const workforce = isWorkforceUser(currentUser);
  const isCodoTester = role === "tester" && workforce;
  const can = (key: string) => role === "admin" || hasPermission(key);
  const audience = resolveWhatsNewAudience({ role, isWorkforce: workforce });
  const meta = getWhatsNewAudienceMeta(audience);
  const chrome = playbookChromeLang(lang);

  const steps = useMemo(
    () =>
      getWhatsNewSteps(audience, {
        role,
        isWorkforce: workforce,
        isCodoTester,
        can,
        showCodoRules: canViewStandards(currentUser, "codo") && can("CODO_VIEW"),
        showMessages: showBugMessageInMainNav(role) || can("MESSAGING_VIEW"),
        showTasks:
          can("TASKS_VIEW_ALL") || can("TASKS_VIEW_ASSIGNED") || can("TASKS_CREATE"),
        showCreative: can("CREATIVE_VIEW") || role === "creator",
        showBugDates:
          can("BUGDATES_VIEW") ||
          role === "admin" ||
          role === "developer" ||
          role === "creator" ||
          role === "user",
        showDailyUpdate:
          workforce &&
          (isCodoTester ||
            can("DAILY_UPDATE_CREATE") ||
            can("DAILY_UPDATE_VIEW") ||
            can("UPDATES_VIEW") ||
            can("UPDATES_CREATE")),
        showWeeklyReport:
          workforce &&
          (role === "admin" ||
            role === "developer" ||
            isCodoTester ||
            can("DAILY_UPDATE_CREATE") ||
            can("DAILY_UPDATE_VIEW") ||
            can("UPDATES_VIEW") ||
            can("UPDATES_CREATE")),
        showPayVerify:
          workforce &&
          (role === "admin" ||
            role === "developer" ||
            role === "creator" ||
            isCodoTester ||
            can("DAILY_UPDATE_VIEW") ||
            can("USERS_VIEW")),
        showMyLeave:
          workforce &&
          (isCodoTester ||
            can("LEAVE_VIEW") ||
            role === "developer" ||
            role === "creator" ||
            role === "user"),
      }),
    // can() is stable enough for this render: it only depends on role and permissions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [audience, role, workforce, isCodoTester, currentUser, permissionsLoading, hasPermission]
  );

  const waiting = role !== "admin" && permissionsLoading;
  const href = (path: string) => `/${role}${path}`;

  const setLanguage = (next: CodoContentLang) => {
    setLang(next);
    writeStoredCodoContentLang(next);
  };

  return (
    <HelpPageShell className="flex flex-col gap-6">
      <header className={cn(helpGlassCard, "p-6 sm:p-8")}>
        <div className="grid grid-cols-12 items-start gap-4">
          <div className="col-span-12 flex min-w-0 flex-col gap-3 lg:col-span-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Newspaper className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  <FlowText value={WHATS_NEW_UI.title} lang={lang === "both" ? "en" : lang} />
                </h1>
                {lang === "both" ? (
                  <p className="text-sm text-muted-foreground" lang="ml">
                    {WHATS_NEW_UI.title.ml}
                  </p>
                ) : null}
              </div>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              <FlowText value={WHATS_NEW_UI.lede} lang={lang} />
            </p>
            <p className="max-w-2xl text-sm font-medium text-foreground">
              <FlowText value={meta.intro} lang={lang} />
            </p>
          </div>
          <div className="col-span-12 flex flex-col items-stretch gap-3 lg:col-span-4 lg:items-end">
            <CodoLangToggle lang={lang} onChange={setLanguage} />
            <p className="text-xs text-muted-foreground lg:text-right">
              <FlowText value={WHATS_NEW_UI.yourRole} lang={chrome === "ml" ? "ml" : "en"} />
              <span aria-hidden> · </span>
              <FlowText value={meta.label} lang={chrome === "ml" ? "ml" : "en"} />
            </p>
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">
            <FlowText value={WHATS_NEW_UI.pathTitle} lang={lang === "both" ? "en" : lang} />
          </h2>
          {waiting ? (
            <FlowSkeleton />
          ) : (
            <ol className="flex flex-col">
              {steps.map((step, index) => {
                const last = index === steps.length - 1;
                const Icon = ICONS[step.icon];
                return (
                  <li key={step.id} className="flex gap-4">
                    <div className="flex w-10 shrink-0 flex-col items-center">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">
                        {index + 1}
                      </span>
                      {last ? null : <span className="mt-1 w-px min-h-4 flex-1 bg-border" />}
                    </div>
                    <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-4")}>
                      <Link
                        to={href(step.path)}
                        className="flex min-h-11 items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-foreground">
                            <FlowText value={step.title} lang={lang} />
                          </span>
                          <span className="mt-1 block text-sm text-muted-foreground">
                            <FlowText value={step.body} lang={lang} />
                          </span>
                          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-foreground">
                            <FlowText
                              value={WHATS_NEW_UI.open}
                              lang={chrome === "ml" ? "ml" : "en"}
                            />
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                          </span>
                        </span>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
      </section>
    </HelpPageShell>
  );
}
