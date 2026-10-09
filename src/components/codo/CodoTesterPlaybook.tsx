import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Globe2,
  Smartphone,
  Ban,
  CheckCircle2,
  FlaskConical,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CodoLangToggle } from '@/components/codo/CodoLangToggle';
import { cn } from '@/lib/utils';
import type { CodoContentLang } from '@/lib/codo/codoContentLang';
import { playbookChromeLang } from '@/lib/codo/codoContentLang';
import {
  CODO_TESTER_PLAYBOOKS,
  CODO_TESTER_PLAYBOOK_UI,
  t,
  type LocalizedText,
  type TesterLang,
  type TesterPhase,
  type TesterPlatform,
} from '@/lib/codo/codoTesterPlaybook';

const PLATFORM_META: Record<
  TesterPlatform,
  { icon: typeof Globe2; accent: string; soft: string; ring: string; dot: string }
> = {
  web: {
    icon: Globe2,
    accent: 'text-sky-600 dark:text-sky-300',
    soft: 'bg-sky-500/15 text-sky-800 dark:text-sky-200',
    ring: 'ring-sky-400/40',
    dot: 'bg-sky-500',
  },
  app: {
    icon: Smartphone,
    accent: 'text-violet-600 dark:text-violet-300',
    soft: 'bg-violet-500/15 text-violet-800 dark:text-violet-200',
    ring: 'ring-violet-400/40',
    dot: 'bg-violet-500',
  },
};

function BilingualText({
  value,
  contentLang,
  className,
  secondaryClassName,
}: {
  value: LocalizedText;
  contentLang: CodoContentLang;
  className?: string;
  secondaryClassName?: string;
}) {
  if (contentLang === 'en') {
    return (
      <span className={className} lang="en">
        {value.en}
      </span>
    );
  }
  if (contentLang === 'ml') {
    return (
      <span className={className} lang="ml">
        {value.ml || value.en}
      </span>
    );
  }
  const same = value.ml.trim() === value.en.trim();
  return (
    <span className={cn('flex flex-col gap-0.5', className)}>
      <span lang="en">{value.en}</span>
      {!same ? (
        <span lang="ml" className={cn('text-muted-foreground', secondaryClassName)}>
          {value.ml}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Why: equal-height row cards + fixed section order keep the 1–8 grid aligned
 * across bilingual content lengths (CODO rounded-2xl / 12-col rules).
 */
function PhaseCard({
  phase,
  index,
  active,
  onSelect,
  accentClass,
  contentLang,
  chrome,
}: {
  phase: TesterPhase;
  index: number;
  active: boolean;
  onSelect: () => void;
  accentClass: string;
  contentLang: CodoContentLang;
  chrome: TesterLang;
}) {
  const ui = CODO_TESTER_PLAYBOOK_UI;
  const title = t(phase.title, chrome).replace(/^\d+\.\s*/, '');
  const both = contentLang === 'both';

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.22, ease: 'easeOut' }}
      className={cn(
        'flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border text-left transition-colors',
        active
          ? 'border-primary/45 bg-primary/[0.07] shadow-sm ring-1 ring-primary/30'
          : 'border-border bg-card'
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-h-12 w-full shrink-0 items-center gap-3 border-b border-border/70 px-3.5 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4"
        aria-pressed={active}
      >
        <span
          className={cn(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
            active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          {index + 1}
        </span>
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm font-semibold leading-none',
            active && accentClass
          )}
        >
          {title}
        </span>
      </button>

      <div
        className={cn(
          'grid min-h-0 flex-1 grid-cols-1',
          both ? 'auto-rows-auto' : 'auto-rows-auto'
        )}
      >
        {/* Purpose — shared min height so paired cards line up */}
        <div
          className={cn(
            'flex min-w-0 flex-col gap-1.5 border-b border-border/50 px-3.5 py-3 sm:px-4',
            both ? 'min-h-[5.5rem] sm:min-h-[6.25rem]' : 'min-h-[4.25rem] sm:min-h-[4.75rem]'
          )}
        >
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Target className={cn('h-3.5 w-3.5 shrink-0', accentClass)} aria-hidden="true" />
            {t(ui.purpose, chrome)}
          </p>
          <p className="text-xs leading-relaxed text-foreground sm:text-[13px]">
            <BilingualText
              value={phase.goal}
              contentLang={contentLang}
              secondaryClassName="text-[11px] leading-snug"
            />
          </p>
        </div>

        {/* Reject */}
        <div
          className={cn(
            'border-b border-border/50 px-3.5 py-3 sm:px-4',
            both ? 'min-h-[4.75rem] sm:min-h-[5.25rem]' : 'min-h-[3.5rem] sm:min-h-[3.75rem]'
          )}
        >
          <p className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/[0.08] px-2.5 py-2 text-[11px] leading-relaxed text-rose-700 dark:text-rose-300 sm:text-xs">
            <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              <span className="font-semibold">{t(ui.rejectIf, chrome)} </span>
              <BilingualText
                value={phase.rejectIf}
                contentLang={contentLang}
                secondaryClassName="text-[10px] leading-snug text-rose-600/85 dark:text-rose-200/80"
              />
            </span>
          </p>
        </div>

        {/* Do this — fills remaining height */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-3.5 py-3 sm:px-4">
          <p className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
            {t(ui.doThis, chrome)}
          </p>
          <ul className="flex flex-1 flex-col gap-1.5">
            {phase.checks.map((check) => (
              <li
                key={check.en}
                className="flex min-w-0 gap-2 rounded-xl border border-border/80 bg-muted/35 px-2.5 py-2 text-[11px] leading-relaxed text-foreground sm:text-xs"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <BilingualText
                  value={check}
                  contentLang={contentLang}
                  className="min-w-0 break-words"
                  secondaryClassName="text-[10px] leading-snug"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.article>
  );
}

type CodoTesterPlaybookProps = {
  defaultOpen?: boolean;
  contentLang?: CodoContentLang;
  onContentLangChange?: (lang: CodoContentLang) => void;
};

export function CodoTesterPlaybook({
  defaultOpen = false,
  contentLang: controlledLang,
  onContentLangChange,
}: CodoTesterPlaybookProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [platform, setPlatform] = useState<TesterPlatform>('web');
  const [internalLang, setInternalLang] = useState<CodoContentLang>('both');
  const [activePhaseId, setActivePhaseId] = useState<string>(
    CODO_TESTER_PLAYBOOKS.web.phases[0].id
  );

  const contentLang = controlledLang ?? internalLang;
  const setContentLang = (next: CodoContentLang) => {
    if (onContentLangChange) onContentLangChange(next);
    else setInternalLang(next);
  };
  const chrome: TesterLang = playbookChromeLang(contentLang);

  const playbook = CODO_TESTER_PLAYBOOKS[platform];
  const meta = PLATFORM_META[platform];
  const Icon = meta.icon;
  const ui = CODO_TESTER_PLAYBOOK_UI;

  const selectPlatform = (next: TesterPlatform) => {
    setPlatform(next);
    setActivePhaseId(CODO_TESTER_PLAYBOOKS[next].phases[0].id);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section
        aria-labelledby="codo-tester-playbook-heading"
        className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm"
        lang={chrome === 'ml' ? 'ml' : 'en'}
      >
        <h2 id="codo-tester-playbook-heading" className="m-0">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="shrink-0 rounded-xl bg-amber-500/15 p-2 text-amber-600 dark:text-amber-300">
                  <FlaskConical className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="block truncate text-base font-semibold text-foreground sm:text-lg">
                      {t(ui.heading, chrome)}
                    </span>
                    <span className="hidden rounded-xl bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline">
                      Web · App
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground sm:text-sm">
                    {t(ui.subtitle, chrome)}
                  </span>
                </span>
              </span>
              <ChevronDown
                className={cn(
                  'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300',
                  open && 'rotate-180'
                )}
                aria-hidden="true"
              />
            </button>
          </CollapsibleTrigger>
        </h2>

        <CollapsibleContent>
          <div className="border-t border-border p-3 sm:p-5">
            {/* Toolbar — single aligned strip */}
            <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
              <div
                className="inline-flex w-full flex-wrap items-center gap-1 rounded-2xl border border-border bg-muted/30 p-1 sm:w-auto"
                role="group"
                aria-label="Platform"
              >
                {(['web', 'app'] as const).map((key) => {
                  const p = CODO_TESTER_PLAYBOOKS[key];
                  const m = PLATFORM_META[key];
                  const PIcon = m.icon;
                  const selected = platform === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectPlatform(key)}
                      className={cn(
                        'inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all sm:flex-none',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected
                          ? cn('shadow-sm ring-2', m.soft, m.ring)
                          : 'text-muted-foreground hover:bg-background/80 hover:text-foreground'
                      )}
                      aria-pressed={selected}
                    >
                      <PIcon className={cn('h-4 w-4', selected ? m.accent : '')} />
                      {t(p.label, chrome)}
                    </button>
                  );
                })}
              </div>
              <CodoLangToggle
                lang={contentLang}
                onChange={setContentLang}
                className="w-full justify-center sm:w-auto"
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${platform}-${contentLang}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22 }}
                className="flex flex-col gap-4 sm:gap-5"
              >
                {/* Efficiency band — full width, not a cramped sidebar */}
                <div className="grid grid-cols-12 gap-4 rounded-2xl border border-border bg-muted/35 p-3.5 sm:gap-5 sm:p-4">
                  <div className="col-span-12 min-w-0 xl:col-span-5">
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Sparkles className={cn('h-3.5 w-3.5', meta.accent)} aria-hidden="true" />
                      {t(playbook.label, chrome)} {t(ui.efficiencyRule, chrome)}
                    </p>
                    <p className="text-sm leading-relaxed text-foreground">
                      <BilingualText
                        value={playbook.principle}
                        contentLang={contentLang}
                        secondaryClassName="text-xs"
                      />
                    </p>
                  </div>
                  <div className="col-span-12 min-w-0 xl:col-span-7 xl:border-s xl:border-border/70 xl:ps-5">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t(ui.environments, chrome)}
                    </p>
                    <ul className="grid grid-cols-12 gap-2">
                      {playbook.environments.map((env) => (
                        <li
                          key={env.en}
                          className="col-span-12 flex min-w-0 items-start gap-2 rounded-xl border border-border/70 bg-background/70 px-2.5 py-2 text-xs text-foreground sm:col-span-6"
                        >
                          <span
                            className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', meta.dot)}
                          />
                          <BilingualText
                            value={env}
                            contentLang={contentLang}
                            className="min-w-0 break-words"
                            secondaryClassName="text-[10px]"
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Flowchart — full-width equal-height cards */}
                <div className="min-w-0 rounded-2xl border border-border p-3 sm:p-4">
                  <div className="mb-3 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:mb-4">
                    <Icon className={cn('h-4 w-4 shrink-0', meta.accent)} aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-foreground">
                      {t(playbook.label, chrome)} {t(ui.flowchart, chrome)}
                    </h3>
                    <span className="min-w-0 text-xs text-muted-foreground">
                      {t(playbook.subtitle, chrome)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 items-stretch gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-2">
                    {playbook.phases.map((phase, i) => (
                      <PhaseCard
                        key={phase.id}
                        phase={phase}
                        index={i}
                        active={activePhaseId === phase.id}
                        onSelect={() => setActivePhaseId(phase.id)}
                        accentClass={meta.accent}
                        contentLang={contentLang}
                        chrome={chrome}
                      />
                    ))}
                  </div>
                </div>

                {/* Release gate */}
                <div className="min-w-0 rounded-2xl border border-border p-3 sm:p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ShieldCheck className={cn('h-4 w-4', meta.accent)} aria-hidden="true" />
                    {t(playbook.label, chrome)} {t(ui.releaseGate, chrome)}
                  </h3>
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {playbook.releaseGate.map((item) => (
                      <li
                        key={item.en}
                        className="flex min-w-0 items-start gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground sm:text-sm"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <BilingualText
                          value={item}
                          contentLang={contentLang}
                          className="min-w-0 break-words"
                          secondaryClassName="text-[11px]"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
