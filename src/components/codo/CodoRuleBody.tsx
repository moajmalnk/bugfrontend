import { CopyTextButton } from '@/components/ui/CopyTextButton';
import {
  CODO_SOP_EXAMPLES,
  parseCodoRuleDescription,
} from '@/lib/codo/sopRuleExamples';
import { cn } from '@/lib/utils';
import { CheckCircle2, Code2, XCircle } from 'lucide-react';

type CodoRuleBodyProps = {
  ruleKey: string;
  subtitle?: string | null;
  title: string;
  description: string;
  className?: string;
};

export function CodoRuleBody({
  ruleKey,
  subtitle,
  title,
  description,
  className,
}: CodoRuleBodyProps) {
  const { requirement, malayalam } = parseCodoRuleDescription(description);
  const examples = CODO_SOP_EXAMPLES[ruleKey];
  const heading =
    subtitle && /^\s*Rule\s+\d+/i.test(subtitle)
      ? `${subtitle}: ${title}`
      : title;

  return (
    <div className={cn('space-y-3 min-w-0', className)}>
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

      <ul className="space-y-2.5 pl-1 text-sm leading-relaxed">
        {requirement ? (
          <li className="flex gap-2.5 min-w-0">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full border border-muted-foreground/50" />
            <p className="min-w-0 break-words text-muted-foreground">
              <span className="font-semibold text-foreground">Requirement:</span>{' '}
              {requirement}
            </p>
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
                    <Code2 className="h-3.5 w-3.5" />
                    {examples.language ?? 'JavaScript'}
                  </span>
                  <CopyTextButton
                    text={examples.good}
                    label="code"
                    className="h-7 w-7 rounded-lg border-0 bg-transparent text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
                  />
                </div>
                <pre className="overflow-x-auto px-3 py-3 font-mono text-[12px] leading-relaxed text-zinc-100 whitespace-pre">
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
