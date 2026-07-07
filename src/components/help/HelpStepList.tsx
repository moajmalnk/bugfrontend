import type { HelpStep } from "@/lib/help/types";
import { HelpScreenshot } from "./HelpScreenshot";
import { HelpVideoEmbed } from "./HelpVideoEmbed";
import { helpInnerCard } from "./HelpPageShell";

interface HelpStepListProps {
  steps: HelpStep[];
}

export function HelpStepList({ steps }: HelpStepListProps) {
  return (
    <ol className="space-y-4">
      {steps.map((step, index) => (
        <li key={index}>
          <div
            className={`${helpInnerCard} p-4 sm:p-5 flex gap-4 transition-shadow hover:shadow-sm`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-emerald-600 text-white text-sm font-bold shadow-md">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <h4 className="font-semibold text-foreground">{step.title}</h4>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {step.body}
                </p>
              </div>
              {step.screenshot && (
                <HelpScreenshot
                  src={step.screenshot}
                  alt={step.screenshotCaption ?? step.title}
                  caption={step.screenshotCaption}
                />
              )}
              {step.videoUrl && (
                <HelpVideoEmbed title={step.title} videoUrl={step.videoUrl} />
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
