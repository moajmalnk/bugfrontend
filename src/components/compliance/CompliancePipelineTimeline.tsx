import { CompliancePipelineStage, getPipelineStageLabel } from '@/lib/codo/complianceRules';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle } from 'lucide-react';

interface CompliancePipelineTimelineProps {
  pipelineStage: CompliancePipelineStage;
  emergencyBypass: boolean;
  developerProgress: { verified: number; total: number };
  testerProgress: { verified: number; total: number };
  projectProgress?: { verified: number; total: number };
}

const STEPS: { key: CompliancePipelineStage | 'bypass'; label: string }[] = [
  { key: 'developer_unverified', label: 'Developer Unverified' },
  { key: 'qa_inspection', label: 'QA Inspection' },
  { key: 'admin_ready', label: 'Admin Final Lock' },
];

function stageIndex(stage: CompliancePipelineStage): number {
  if (stage === 'developer_unverified' || stage === 'developer_complete') return 0;
  if (stage === 'qa_inspection' || stage === 'qa_complete') return 1;
  return 2;
}

export function CompliancePipelineTimeline({
  pipelineStage,
  emergencyBypass,
  developerProgress,
  testerProgress,
  projectProgress,
}: CompliancePipelineTimelineProps) {
  const currentIdx = stageIndex(pipelineStage);

  return (
    <div className="rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Pipeline Telemetry
      </h3>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
        {STEPS.map((step, idx) => {
          const isComplete = emergencyBypass || idx < currentIdx || (idx === currentIdx && pipelineStage === 'admin_ready');
          const isCurrent = !emergencyBypass && idx === currentIdx && pipelineStage !== 'admin_ready';

          return (
            <div key={step.key} className="flex min-w-0 flex-1 items-center gap-3">
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                  isComplete && 'border-emerald-500/50 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
                  isCurrent && 'border-blue-500/50 bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
                  !isComplete && !isCurrent && 'border-border bg-muted/40 text-muted-foreground'
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{step.label}</p>
                {idx === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {developerProgress.verified}/{developerProgress.total} rules
                  </p>
                )}
                {idx === 1 && (
                  <p className="text-xs text-muted-foreground">
                    {testerProgress.verified}/{testerProgress.total} stress tests
                  </p>
                )}
                {idx === 2 && (
                  <p className="text-xs text-muted-foreground">
                    {projectProgress && projectProgress.total > 0
                      ? `${projectProgress.verified}/${projectProgress.total} project gates`
                      : pipelineStage === 'admin_ready'
                        ? 'Ready to finalize'
                        : 'Awaiting project gates'}
                  </p>
                )}
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    'hidden h-px flex-1 lg:block',
                    isComplete ? 'bg-emerald-700/50' : 'bg-slate-700'
                  )}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
      {emergencyBypass && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300">
          Emergency bypass active — standard checklist requirements waived.
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Current stage: {getPipelineStageLabel(pipelineStage)}
      </p>
    </div>
  );
}
