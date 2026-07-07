import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { ComplianceCheckRow } from '@/components/compliance/ComplianceCheckRow';
import { CompliancePipelineTimeline } from '@/components/compliance/CompliancePipelineTimeline';
import {
  ComplianceSegmentTabs,
  ComplianceTab,
} from '@/components/compliance/ComplianceSegmentTabs';
import { EmergencyBypassDialog } from '@/components/compliance/EmergencyBypassDialog';
import { AddComplianceRuleDialog } from '@/components/compliance/AddComplianceRuleDialog';
import {
  DEVELOPER_RULES,
  QA_STRESS_RULES,
  ComplianceCustomRule,
  isClosedProjectStatus,
  isCompliancePipelineSatisfied,
} from '@/lib/codo/complianceRules';
import { getEffectiveRole } from '@/lib/utils';
import { getProjectStatusLabel } from '@/lib/utils/projectUtils';
import { complianceService, ProjectComplianceData } from '@/services/complianceService';
import { ComplianceCheckItem } from '@/lib/codo/complianceRules';
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2, ShieldCheck, ListChecks, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';

interface CodoCompliancePanelProps {
  projectId: string;
  projectStatus?: string;
  projectsListPath?: string;
  onStatusFinalized?: (status: string) => void;
}

export function CodoCompliancePanel({
  projectId,
  projectStatus,
  projectsListPath,
  onStatusFinalized,
}: CodoCompliancePanelProps) {
  const { currentUser } = useAuth();
  const effectiveRole = getEffectiveRole(currentUser || {});

  const [activeTab, setActiveTab] = useState<ComplianceTab>('developer');
  const [data, setData] = useState<ProjectComplianceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeStatus, setFinalizeStatus] = useState<'completed' | 'release_ready'>('completed');
  const [bypassDialogOpen, setBypassDialogOpen] = useState(false);
  const [bypassChecked, setBypassChecked] = useState(false);
  const [addRuleDialogOpen, setAddRuleDialogOpen] = useState(false);
  const [addRulePhase, setAddRulePhase] = useState<'developer' | 'tester' | 'project'>('developer');

  const loadCompliance = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const result = await complianceService.getCompliance(projectId);
      setData(result);
      setBypassChecked(result.emergency_bypass);
    } catch (err) {
      toast({
        title: 'Failed to load compliance',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadCompliance();
      setActiveTab(
        effectiveRole === 'admin' ? 'admin' : effectiveRole === 'tester' ? 'tester' : 'developer'
      );
    }
  }, [projectId, loadCompliance, effectiveRole]);

  const devComplete =
    (data?.developer_progress.verified ?? 0) >= (data?.developer_progress.total ?? 0) &&
    (data?.developer_progress.total ?? 0) > 0;
  const qaComplete =
    (data?.tester_progress.verified ?? 0) >= (data?.tester_progress.total ?? 0) &&
    (data?.tester_progress.total ?? 0) > 0;
  const pipelineReady = isCompliancePipelineSatisfied(
    data
      ? { pipeline_stage: data.pipeline_stage, emergency_bypass: data.emergency_bypass }
      : null
  );
  const currentProjectStatus = data?.project?.status || projectStatus || 'active';
  const isProjectFinalized = isClosedProjectStatus(currentProjectStatus);

  const handleToggle = async (
    phase: 'developer' | 'tester' | 'project',
    ruleKey: string,
    current: boolean
  ) => {
    if (!projectId || togglingKey) return;
    setTogglingKey(ruleKey);
    const next = !current;
    setData((prev) => {
      if (!prev) return prev;
      const checksKey =
        phase === 'developer'
          ? 'developer_checks'
          : phase === 'tester'
            ? 'tester_checks'
            : 'project_checks';
      const progressKey =
        phase === 'developer'
          ? 'developer_progress'
          : phase === 'tester'
            ? 'tester_progress'
            : 'project_progress';
      return {
        ...prev,
        [checksKey]: prev[checksKey].map((c) =>
          c.rule_key === ruleKey
            ? {
                ...c,
                verified: next,
                verified_by: next ? currentUser?.id ?? null : null,
                verified_by_username: next ? currentUser?.username ?? null : null,
                verified_at: next ? new Date().toISOString() : null,
              }
            : c
        ),
        [progressKey]: {
          ...prev[progressKey],
          verified: prev[progressKey].verified + (next ? 1 : -1),
        },
      };
    });

    try {
      const result = await complianceService.toggleCheck(projectId, phase, ruleKey, next);
      setData(result);
    } catch (err) {
      await loadCompliance();
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Could not update check',
        variant: 'destructive',
      });
    } finally {
      setTogglingKey(null);
    }
  };

  const handleBypass = async (reason: string) => {
    try {
      const result = await complianceService.authorizeEmergencyBypass(projectId, reason);
      setData(result);
      setBypassChecked(true);
      toast({
        title: 'Emergency bypass authorized',
        description: 'Admin may now finalize project status.',
      });
    } catch (err) {
      toast({
        title: 'Bypass failed',
        description: err instanceof Error ? err.message : 'Could not authorize emergency bypass',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const handleAddRule = async (payload: {
    title: string;
    description: string;
    subtitle?: string;
  }) => {
    const result = await complianceService.addCustomRule(projectId, addRulePhase, payload);
    setData(result);
    toast({
      title: 'Rule added',
      description: 'Your custom compliance rule has been added to this project.',
    });
  };

  const handleFinalize = async () => {
    if (isFinalizing || isProjectFinalized) return;
    setIsFinalizing(true);
    try {
      const result = await complianceService.finalizeStatus(projectId, finalizeStatus);
      setData(result);
      const nextStatus = result.project?.status || finalizeStatus;
      onStatusFinalized?.(nextStatus);
      toast({
        title: 'Project status updated',
        description: `Project marked as ${getProjectStatusLabel(nextStatus as 'completed' | 'release_ready')}.`,
      });
    } catch (err) {
      toast({
        title: 'Finalization failed',
        description: err instanceof Error ? err.message : 'Could not finalize status',
        variant: 'destructive',
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  const devChecksMap = new Map(data?.developer_checks.map((c) => [c.rule_key, c]) ?? []);
  const qaChecksMap = new Map(data?.tester_checks.map((c) => [c.rule_key, c]) ?? []);
  const projectChecksMap = new Map(data?.project_checks.map((c) => [c.rule_key, c]) ?? []);
  const customDevRules = (data?.custom_rules ?? []).filter((r) => r.phase === 'developer');
  const customQaRules = (data?.custom_rules ?? []).filter((r) => r.phase === 'tester');
  const customProjectRules = (data?.custom_rules ?? []).filter((r) => r.phase === 'project');
  const canAddDeveloperRule =
    effectiveRole === 'developer' || effectiveRole === 'admin';
  const canAddTesterRule = effectiveRole === 'tester' || effectiveRole === 'admin';
  const canAddProjectRule = effectiveRole === 'admin';

  const getVerifiedMeta = (check?: ComplianceCheckItem) => ({
    verifiedBy: check?.verified_by_username || check?.verified_by || null,
    verifiedAt: check?.verified_at || null,
  });

  const renderCustomRules = (
    rules: ComplianceCustomRule[],
    phase: 'developer' | 'tester' | 'project',
    checksMap: Map<string, ComplianceCheckItem>,
    canToggle: boolean
  ) =>
    rules.map((rule) => {
      const check = checksMap.get(rule.rule_key);
      const verified = check?.verified ?? false;
      const { verifiedBy, verifiedAt } = getVerifiedMeta(check);
      return (
        <ComplianceCheckRow
          key={rule.rule_key}
          title={rule.title}
          subtitle={rule.subtitle || 'Custom rule'}
          description={rule.description}
          verified={verified}
          verifiedBy={verifiedBy}
          verifiedAt={verifiedAt}
          disabled={!canToggle || togglingKey === rule.rule_key}
          onToggle={
            canToggle
              ? () => handleToggle(phase, rule.rule_key, verified)
              : undefined
          }
        />
      );
    });

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-8 sm:p-12">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Loading compliance matrix...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-12 text-center">
        <p className="text-sm text-muted-foreground">No compliance data available.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 sm:space-y-8">
        <ComplianceSegmentTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          developerProgress={data.developer_progress}
          testerProgress={data.tester_progress}
          testerLocked={!devComplete}
          adminLocked={!pipelineReady}
        />

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl pointer-events-none" />
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8 space-y-6">
            {activeTab === 'developer' && (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500 rounded-lg">
                      <ListChecks className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Developer Matrix — Core Production Standards
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {data.developer_progress.verified}/{data.developer_progress.total} verified
                        {effectiveRole !== 'developer' &&
                          effectiveRole !== 'admin' &&
                          ' · View only'}
                      </p>
                    </div>
                  </div>
                  {canAddDeveloperRule && (
                    <Button
                      type="button"
                      onClick={() => {
                        setAddRulePhase('developer');
                        setAddRuleDialogOpen(true);
                      }}
                      className="h-11 self-start shrink-0 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold shadow-md"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Rule
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {DEVELOPER_RULES.map((rule) => {
                    const check = devChecksMap.get(rule.key);
                    const verified = check?.verified ?? false;
                    const { verifiedBy, verifiedAt } = getVerifiedMeta(check);
                    return (
                      <ComplianceCheckRow
                        key={rule.key}
                        title={`Rule ${rule.number} (${rule.titleEn})`}
                        description={rule.description}
                        verified={verified}
                        verifiedBy={verifiedBy}
                        verifiedAt={verifiedAt}
                        disabled={effectiveRole !== 'developer' || togglingKey === rule.key}
                        onToggle={
                          effectiveRole === 'developer'
                            ? () => handleToggle('developer', rule.key, verified)
                            : undefined
                        }
                      />
                    );
                  })}
                  {customDevRules.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                        Custom rules
                      </p>
                      {renderCustomRules(
                        customDevRules,
                        'developer',
                        devChecksMap,
                        effectiveRole === 'developer'
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tester' && (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-500 rounded-lg">
                      <ListChecks className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Tester / QA Stress Matrix
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {data.tester_progress.verified}/{data.tester_progress.total} verified
                        {!devComplete && ' · Locked until Developer matrix is 100%'}
                        {devComplete &&
                          effectiveRole !== 'tester' &&
                          effectiveRole !== 'admin' &&
                          ' · View only'}
                      </p>
                    </div>
                  </div>
                  {canAddTesterRule && (
                    <Button
                      type="button"
                      onClick={() => {
                        setAddRulePhase('tester');
                        setAddRuleDialogOpen(true);
                      }}
                      className="h-11 self-start shrink-0 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-semibold shadow-md"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Rule
                    </Button>
                  )}
                </div>
                {!devComplete && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-200">
                    Complete all {data.developer_progress.total} Developer rules before QA
                    verification can begin.
                  </div>
                )}
                <div className="space-y-3">
                  {QA_STRESS_RULES.map((rule) => {
                    const check = qaChecksMap.get(rule.key);
                    const verified = check?.verified ?? false;
                    const canToggle = effectiveRole === 'tester' && devComplete;
                    const { verifiedBy, verifiedAt } = getVerifiedMeta(check);
                    return (
                      <ComplianceCheckRow
                        key={rule.key}
                        title={rule.title}
                        description={rule.description}
                        verified={verified}
                        verifiedBy={verifiedBy}
                        verifiedAt={verifiedAt}
                        disabled={!canToggle || togglingKey === rule.key}
                        onToggle={
                          canToggle ? () => handleToggle('tester', rule.key, verified) : undefined
                        }
                      />
                    );
                  })}
                  {customQaRules.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                        Custom rules
                      </p>
                      {renderCustomRules(
                        customQaRules,
                        'tester',
                        qaChecksMap,
                        effectiveRole === 'tester' && devComplete
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'admin' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-500 rounded-lg">
                    <ShieldCheck className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Admin Overview
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Pipeline telemetry and final status authorization
                    </p>
                  </div>
                </div>

                <CompliancePipelineTimeline
                  pipelineStage={data.pipeline_stage}
                  emergencyBypass={data.emergency_bypass}
                  developerProgress={data.developer_progress}
                  testerProgress={data.tester_progress}
                  projectProgress={data.project_progress}
                />

                <div className="rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 p-5 shadow-sm space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        Project-Level Checklist
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {data.project_progress.verified}/{data.project_progress.total} verified
                        {effectiveRole !== 'admin' && ' · Admin only'}
                      </p>
                    </div>
                    {canAddProjectRule && (
                      <Button
                        type="button"
                        onClick={() => {
                          setAddRulePhase('project');
                          setAddRuleDialogOpen(true);
                        }}
                        disabled={!devComplete || !qaComplete}
                        className="self-start h-11 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 font-semibold shadow-lg"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Rule
                      </Button>
                    )}
                  </div>

                  {customProjectRules.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-muted/20 px-4 py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No project-level rules yet. Admins can add release gates after Developer and QA
                        checklists are complete.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {renderCustomRules(
                        customProjectRules,
                        'project',
                        projectChecksMap,
                        effectiveRole === 'admin' && devComplete && qaComplete
                      )}
                    </div>
                  )}
                </div>

                {effectiveRole === 'admin' && (
                  <>
                    <div className="rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 p-5 shadow-sm">
                      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
                        Final Status Authorization
                      </h3>

                      {isProjectFinalized ? (
                        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/80 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                              <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                                Project finalized as {getProjectStatusLabel(currentProjectStatus)}
                              </p>
                              <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">
                                Compliance pipeline is complete. This project status is now reflected
                                across the app.
                              </p>
                              {projectsListPath && (
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="mt-2 rounded-lg border-emerald-300 dark:border-emerald-800"
                                >
                                  <Link to={projectsListPath}>Back to Projects</Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                Target status
                              </label>
                              <div className="flex gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-muted/30 p-1">
                                {(
                                  [
                                    { value: 'completed' as const, label: 'Completed' },
                                    { value: 'release_ready' as const, label: 'Release Ready' },
                                  ] as const
                                ).map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    disabled={!pipelineReady || isFinalizing}
                                    onClick={() => setFinalizeStatus(opt.value)}
                                    className={cn(
                                      'flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                                      finalizeStatus === opt.value
                                        ? 'bg-white dark:bg-gray-800 text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                      (!pipelineReady || isFinalizing) && 'opacity-50'
                                    )}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                onClick={handleFinalize}
                                disabled={!pipelineReady || isFinalizing}
                                className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 font-semibold shadow-lg"
                              >
                                {isFinalizing ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Finalizing...
                                  </>
                                ) : (
                                  'Finalize Project Status'
                                )}
                              </Button>
                            </div>
                          </div>
                          {!pipelineReady && !data.emergency_bypass && (
                            <p className="mt-3 text-xs text-muted-foreground">
                              Complete Developer ({data.developer_progress.verified}/
                              {data.developer_progress.total}), QA ({data.tester_progress.verified}/
                              {data.tester_progress.total}), and Project ({data.project_progress.verified}/
                              {data.project_progress.total}) checklists to unlock finalization.
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-5 dark:border-amber-900/40 dark:bg-amber-950/10">
                      <button
                        type="button"
                        onClick={() => {
                          if (!data.emergency_bypass) setBypassDialogOpen(true);
                        }}
                        disabled={data.emergency_bypass}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all',
                          bypassChecked
                            ? 'border-amber-400/50 bg-amber-100/50 dark:border-amber-700/50 dark:bg-amber-950/30'
                            : 'border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 hover:border-amber-300 dark:hover:border-amber-800/50',
                          data.emergency_bypass && 'cursor-default'
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2',
                            bypassChecked
                              ? 'border-amber-500 bg-amber-500/20 text-amber-600 dark:text-amber-400'
                              : 'border-muted-foreground/40'
                          )}
                        >
                          {bypassChecked && (
                            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                            Authorize Critical Emergency Hotfix Bypass
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Bypass standard compliance checks for critical production hotfixes.
                            Requires Master Admin verification.
                          </p>
                        </div>
                      </button>
                    </div>
                  </>
                )}

                {effectiveRole !== 'admin' && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                    Admin controls are available only to administrators.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <EmergencyBypassDialog
        open={bypassDialogOpen}
        onOpenChange={setBypassDialogOpen}
        onConfirm={handleBypass}
      />

      <AddComplianceRuleDialog
        open={addRuleDialogOpen}
        onOpenChange={setAddRuleDialogOpen}
        phase={addRulePhase}
        onSubmit={handleAddRule}
      />
    </>
  );
}
