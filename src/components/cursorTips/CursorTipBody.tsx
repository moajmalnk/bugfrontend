import { CopyTextButton } from '@/components/ui/CopyTextButton';
import { parseTipDescription } from '@/lib/cursorTips/parseTipDescription';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  ClipboardList,
  Lightbulb,
  MessageSquareCode,
  XCircle,
} from 'lucide-react';

type CursorTipBodyProps = {
  tipKey: string;
  subtitle?: string | null;
  title: string;
  description: string;
  analogyEn?: string | null;
  analogyMl?: string | null;
  whenToUse?: string | null;
  whenNotToUse?: string | null;
  exampleBad?: string | null;
  exampleGood?: string | null;
  exampleLanguage?: string | null;
  className?: string;
  hideHeading?: boolean;
};

function isChecklistLanguage(language?: string | null): boolean {
  if (!language) return false;
  return /checklist|procedure|qa/i.test(language);
}

export function CursorTipBody({
  tipKey,
  subtitle,
  title,
  description,
  analogyEn,
  analogyMl,
  whenToUse,
  whenNotToUse,
  exampleBad,
  exampleGood,
  exampleLanguage,
  className,
  hideHeading = false,
}: CursorTipBodyProps) {
  const { requirement, malayalam } = parseTipDescription(description);
  const heading =
    subtitle && /^\s*(Mode|Command|Skill|Workflow|Review)\s+\d+/i.test(subtitle)
      ? `${subtitle}: ${title}`
      : title;
  const strongLanguage = exampleLanguage || 'Prompt';
  const strongIsChecklist = isChecklistLanguage(strongLanguage);
  const StrongIcon = strongIsChecklist ? ClipboardList : MessageSquareCode;
  const hasAnalogy = !!(analogyEn?.trim() || analogyMl?.trim());
  const hasWhen = !!(whenToUse?.trim() || whenNotToUse?.trim());

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
            {tipKey}
          </span>
        </div>
      ) : null}

      <ul className="space-y-2.5 pl-1 text-sm leading-relaxed">
        {requirement ? (
          <li className="flex gap-2.5 min-w-0">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full border border-muted-foreground/50" />
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <p className="min-w-0 flex-1 break-words text-muted-foreground">
                <span className="font-semibold text-foreground">Requirement:</span>{' '}
                {requirement}
              </p>
              <CopyTextButton
                text={requirement}
                label="requirement"
                className="mt-0.5 shrink-0"
              />
            </div>
          </li>
        ) : null}

        {malayalam ? (
          <li className="flex gap-2.5 min-w-0">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full border border-muted-foreground/50" />
            <p className="min-w-0 break-words text-muted-foreground">
              <span className="font-semibold text-foreground">Malayalam:</span>{' '}
              <span className="text-foreground/90">{malayalam}</span>
            </p>
          </li>
        ) : null}

        {hasAnalogy ? (
          <li className="flex gap-2.5 min-w-0">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full border border-muted-foreground/50" />
            <div className="min-w-0 space-y-1">
              <p className="flex items-center gap-1.5 font-semibold text-foreground">
                <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                Analogy
              </p>
              {analogyEn?.trim() ? (
                <p className="text-muted-foreground break-words">{analogyEn.trim()}</p>
              ) : null}
              {analogyMl?.trim() ? (
                <p className="text-foreground/90 break-words">{analogyMl.trim()}</p>
              ) : null}
            </div>
          </li>
        ) : null}

        {hasWhen ? (
          <li className="flex gap-2.5 min-w-0">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full border border-muted-foreground/50" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0 w-full">
              {whenToUse?.trim() ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    Use when
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground break-words">
                    {whenToUse.trim()}
                  </p>
                </div>
              ) : null}
              {whenNotToUse?.trim() ? (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                    Avoid when
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground break-words">
                    {whenNotToUse.trim()}
                  </p>
                </div>
              ) : null}
            </div>
          </li>
        ) : null}

        {exampleBad?.trim() ? (
          <li className="flex gap-2.5 min-w-0">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full border border-muted-foreground/50" />
            <div className="min-w-0 space-y-1.5">
              <p className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                Weak
              </p>
              <pre className="overflow-x-auto rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 font-mono text-[12px] leading-relaxed text-rose-700 dark:text-rose-300 whitespace-pre-wrap break-words">
                {exampleBad.trim()}
              </pre>
            </div>
          </li>
        ) : null}

        {exampleGood?.trim() ? (
          <li className="flex gap-2.5 min-w-0">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full border border-muted-foreground/50" />
            <div className="min-w-0 w-full space-y-1.5">
              <p className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                Strong
              </p>
              <div className="overflow-hidden rounded-xl border border-border/70 bg-[#0d1117] shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                    <StrongIcon className="h-3.5 w-3.5" />
                    {strongLanguage}
                  </span>
                  <CopyTextButton
                    text={exampleGood.trim()}
                    label={strongIsChecklist ? 'checklist' : 'prompt'}
                    className="h-7 w-7 rounded-lg border-0 bg-transparent text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
                  />
                </div>
                <pre
                  className={cn(
                    'overflow-x-auto px-3 py-3 font-mono text-[12px] leading-relaxed text-zinc-100',
                    strongIsChecklist
                      ? 'whitespace-pre-wrap break-words'
                      : 'whitespace-pre-wrap break-words'
                  )}
                >
                  <code>{exampleGood.trim()}</code>
                </pre>
              </div>
            </div>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
