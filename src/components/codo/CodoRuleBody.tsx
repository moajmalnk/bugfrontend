import { CopyTextButton } from '@/components/ui/CopyTextButton';
import { getCodoRealWorldExample } from '@/lib/codo/codoRealWorldExamples';
import type { CodoContentLang } from '@/lib/codo/codoContentLang';
import {
  CODO_SOP_EXAMPLES,
  parseCodoRuleDescription,
} from '@/lib/codo/sopRuleExamples';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  ClipboardList,
  Code2,
  Lightbulb,
  XCircle,
} from 'lucide-react';

type CodoRuleBodyProps = {
  ruleKey: string;
  subtitle?: string | null;
  title: string;
  description: string;
  className?: string;
  /** Hide the title row (useful inside compliance verify cards). */
  hideHeading?: boolean;
  /**
   * English / Malayalam / Both for requirement + real-world copy.
   * Defaults to Both so juniors always see both languages.
   */
  contentLang?: CodoContentLang;
};

function isChecklistLanguage(language?: string): boolean {
  if (!language) return false;
  return /checklist|procedure|qa/i.test(language);
}

function showEnglish(lang: CodoContentLang): boolean {
  return lang === 'en' || lang === 'both';
}

function showMalayalam(lang: CodoContentLang): boolean {
  return lang === 'ml' || lang === 'both';
}

export function CodoRuleBody({
  ruleKey,
  subtitle,
  title,
  description,
  className,
  hideHeading = false,
  contentLang = 'both',
}: CodoRuleBodyProps) {
  const { requirement, malayalam } = parseCodoRuleDescription(description);
  const examples = CODO_SOP_EXAMPLES[ruleKey];
  const realWorld = getCodoRealWorldExample(ruleKey);
  const heading =
    subtitle && /^\s*(Rule|QA Stress)\s+\d+/i.test(subtitle)
      ? `${subtitle}: ${title}`
      : title;
  const goodLanguage = examples?.language ?? 'JavaScript';
  const goodIsChecklist = isChecklistLanguage(goodLanguage);
  const GoodIcon = goodIsChecklist ? ClipboardList : Code2;

  const showReqEn = Boolean(requirement) && showEnglish(contentLang);
  const showReqMl = Boolean(malayalam) && showMalayalam(contentLang);
  const showRwEn = Boolean(realWorld) && showEnglish(contentLang);
  const showRwMl = Boolean(realWorld) && showMalayalam(contentLang);
  const realWorldCopy = realWorld
    ? [showRwEn ? realWorld.en : '', showRwMl ? `Malayalam: ${realWorld.ml}` : '']
        .filter(Boolean)
        .join('\n\n')
    : '';

  return (
    <div className={cn('space-y-3 min-w-0', className)}>
      {!hideHeading ? (
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-sky-500">
            <span className="text-[10px] leading-none">◆</span>
          </span>
          <h3 className="text-base sm:text-lg font-semibold text-foreground leading-snug break-words">
            {heading}
          </h3>
          <span className="inline-flex items-center rounded-md border border-border/70 bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            {ruleKey}
          </span>
        </div>
      ) : null}

      <ul className="space-y-2.5 pl-1 text-sm leading-relaxed">
        {showReqEn ? (
          <li className="flex gap-2.5 min-w-0">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full border border-muted-foreground/50" />
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <p className="min-w-0 flex-1 break-words text-muted-foreground" lang="en">
                <span className="font-semibold text-foreground">Requirement:</span>{' '}
                {requirement}
              </p>
              <CopyTextButton
                text={requirement!}
                label="requirement"
                className="mt-0.5 shrink-0"
              />
            </div>
          </li>
        ) : null}

        {showReqMl ? (
          <li className="flex gap-2.5 min-w-0">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full border border-muted-foreground/50" />
            <p className="min-w-0 break-words text-muted-foreground" lang="ml">
              <span className="font-semibold text-foreground">Malayalam:</span>{' '}
              <span className="text-foreground/90">{malayalam}</span>
            </p>
          </li>
        ) : null}

        {realWorld && (showRwEn || showRwMl) ? (
          <li className="flex gap-2.5 min-w-0">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full border border-muted-foreground/50" />
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  Real-world example
                </p>
                <div
                  className={cn(
                    'grid gap-2',
                    showRwEn && showRwMl ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
                  )}
                >
                  {showRwEn ? (
                    <div
                      className="rounded-xl border border-border bg-muted/30 px-3 py-2.5"
                      lang="en"
                    >
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        English
                      </p>
                      <p className="break-words text-muted-foreground leading-relaxed">
                        {realWorld.en}
                      </p>
                    </div>
                  ) : null}
                  {showRwMl ? (
                    <div
                      className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5"
                      lang="ml"
                    >
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        Malayalam
                      </p>
                      <p className="break-words text-foreground/90 leading-relaxed">
                        {realWorld.ml}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
              <CopyTextButton
                text={realWorldCopy}
                label="real-world example"
                className="mt-0.5 shrink-0"
              />
            </div>
          </li>
        ) : null}

        {examples?.bad ? (
          <li className="flex gap-2.5 min-w-0">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full border border-muted-foreground/50" />
            <div className="min-w-0 space-y-1.5">
              <p className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                Bad
              </p>
              <pre className="overflow-x-auto rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 font-mono text-[12px] leading-relaxed text-rose-700 dark:text-rose-300 whitespace-pre-wrap break-words">
                {examples.bad}
              </pre>
            </div>
          </li>
        ) : null}

        {examples?.good ? (
          <li className="flex gap-2.5 min-w-0">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full border border-muted-foreground/50" />
            <div className="min-w-0 w-full space-y-1.5">
              <p className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                Good
              </p>
              <div className="overflow-hidden rounded-xl border border-border/70 bg-[#0d1117] shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                    <GoodIcon className="h-3.5 w-3.5" />
                    {goodLanguage}
                  </span>
                  <CopyTextButton
                    text={examples.good}
                    label={goodIsChecklist ? 'checklist' : 'code'}
                    className="h-7 w-7 rounded-lg border-0 bg-transparent text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
                  />
                </div>
                <pre
                  className={cn(
                    'overflow-x-auto px-3 py-3 font-mono text-[12px] leading-relaxed text-zinc-100',
                    goodIsChecklist ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                  )}
                >
                  <code>{examples.good}</code>
                </pre>
              </div>
            </div>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
