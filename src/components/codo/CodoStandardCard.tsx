import { useState } from 'react';
import { BadgeCheck, ChevronDown, ListChecks, Quote, Workflow } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CODO_STANDARD } from '@/lib/codo/codoStandard';

export function CodoStandardCard() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section
        aria-labelledby="codo-standard-heading"
        className="min-w-0 rounded-2xl border border-border bg-card text-card-foreground shadow-sm"
      >
        <h2 id="codo-standard-heading" className="m-0">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl p-4 sm:p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="shrink-0 rounded-xl bg-primary/10 p-2 text-primary">
                  <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-base sm:text-lg font-semibold text-foreground">
                    CODO Standard
                  </span>
                  <span className="block text-xs sm:text-sm font-normal text-muted-foreground">
                    Quality principle, mandatory testing flow and Definition of Done
                  </span>
                </span>
              </span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
                  open ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>
          </CollapsibleTrigger>
        </h2>

        <CollapsibleContent>
          <div className="grid grid-cols-12 gap-4 border-t border-border p-4 sm:p-6">
            <div className="col-span-12 rounded-xl bg-muted/50 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Quote className="h-4 w-4 text-primary" aria-hidden="true" />
                Quality Principle
              </h3>
              <blockquote className="text-sm leading-relaxed text-muted-foreground">
                {CODO_STANDARD.qualityPrinciple}
              </blockquote>
            </div>

            <div className="col-span-12 lg:col-span-6 min-w-0 rounded-xl border border-border p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Workflow className="h-4 w-4 text-primary" aria-hidden="true" />
                Mandatory Testing Flow
              </h3>
              <ol className="flex flex-wrap items-center gap-2">
                {CODO_STANDARD.testingFlow.map((step, i) => (
                  <li
                    key={step}
                    className="rounded-xl border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    <span className="text-muted-foreground">{i + 1}.</span> {step}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {CODO_STANDARD.realUserBehavior}
              </p>
            </div>

            <div className="col-span-12 lg:col-span-6 min-w-0 rounded-xl border border-border p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />
                Definition of Done
              </h3>
              <p className="mb-2 text-xs text-muted-foreground">
                Not Done merely because {CODO_STANDARD.notDoneWhen.join(', ')}. Done only when:
              </p>
              <ol className="flex list-decimal flex-col gap-1 ps-5 text-sm text-foreground">
                {CODO_STANDARD.definitionOfDone.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
