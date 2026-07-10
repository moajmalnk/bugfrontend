import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CodoAnalyticsPanel, computeAnalyticsCompletion } from '@/components/codo/CodoAnalyticsPanel';
import { CodoRuleDialog } from '@/components/codo/CodoRuleDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { downloadCodoRulesPdf } from '@/lib/utils/codoRulesPdfReport';
import { cn, getEffectiveRole } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  acknowledgeCodoRule,
  createCodoRule,
  deleteCodoRule,
  listCodoRules,
  updateCodoRule,
  type CodoAckStatus,
  type CodoAckUser,
  type CodoCommonRule,
  type CodoRuleCounts,
  type CodoRulePhase,
} from '@/services/codoRulesService';
import {
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Code2,
  Download,
  FolderKanban,
  Loader2,
  Lock,
  MinusCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserX,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO, isValid } from 'date-fns';

type TabKey = 'all' | CodoRulePhase | 'analytics';

const VALID_TABS: TabKey[] = ['all', 'developer', 'tester', 'project', 'analytics'];

const PHASE_META: Record<
  CodoRulePhase,
  { label: string; short: string; icon: typeof Code2; accent: string; badge: string }
> = {
  developer: {
    label: 'Developer',
    short: 'Dev',
    icon: Code2,
    accent: 'from-blue-500 to-indigo-600',
    badge:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800',
  },
  tester: {
    label: 'Tester / QA',
    short: 'QA',
    icon: ShieldCheck,
    accent: 'from-amber-500 to-orange-600',
    badge:
      'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800',
  },
  project: {
    label: 'Project',
    short: 'Project',
    icon: FolderKanban,
    accent: 'from-violet-500 to-purple-600',
    badge:
      'bg-violet-100 text-violet-900 border-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:border-violet-800',
  },
};

const STATUS_META: Record<
  CodoAckStatus,
  { label: string; doneLabel: string; icon: typeof Check; activeClass: string; tone: 'done' | 'pending' | 'doubt' | 'skip' }
> = {
  acknowledged: {
    label: 'Acknowledge',
    doneLabel: 'You acknowledged this',
    icon: Check,
    activeClass: 'bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600',
    tone: 'done',
  },
  doubt: {
    label: 'Doubt',
    doneLabel: 'Marked as doubt',
    icon: CircleHelp,
    activeClass: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500',
    tone: 'doubt',
  },
  not_required: {
    label: 'Not Required',
    doneLabel: 'Marked as not required',
    icon: MinusCircle,
    activeClass: 'bg-slate-600 hover:bg-slate-700 text-white border-slate-600',
    tone: 'skip',
  },
};

function formatAckDateTime(value?: string | null): string | null {
  if (!value) return null;
  const raw = value.includes('T') ? value : value.replace(' ', 'T');
  const d = parseISO(raw);
  if (!isValid(d)) {
    const fallback = new Date(value);
    if (!isValid(fallback)) return null;
    return format(fallback, 'MMM d, yyyy · h:mm a');
  }
  return format(d, 'MMM d, yyyy · h:mm a');
}

function initialsFromUsername(username: string): string {
  const parts = username.replace(/[_-]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase() || '?';
}

function AckUserRow({
  user,
  tone,
}: {
  user: CodoAckUser;
  tone: 'done' | 'pending' | 'doubt' | 'skip';
}) {
  const when = formatAckDateTime(user.acknowledged_at);
  return (
    <li className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-background/60 transition-colors">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback
          className={cn(
            'text-[10px] font-semibold',
            tone === 'done' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
            tone === 'doubt' && 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
            tone === 'skip' && 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
            tone === 'pending' && 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
          )}
        >
          {initialsFromUsername(user.username)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{user.username}</span>
          <span className="shrink-0 rounded-md bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
            {user.role}
          </span>
        </div>
        {when ? <p className="text-[10px] text-muted-foreground mt-0.5">{when}</p> : null}
      </div>
    </li>
  );
}

export default function CommonCodoRules() {
  const { currentUser } = useAuth();
  const role = getEffectiveRole(currentUser || {});
  const canAccess = role === 'admin' || role === 'developer' || role === 'tester';
  const canDelete = role === 'admin';
  const canViewAckDetails = role === 'admin';

  const [rules, setRules] = useState<CodoCommonRule[]>([]);
  const [counts, setCounts] = useState<CodoRuleCounts>({
    all: 0,
    developer: 0,
    tester: 0,
    project: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') || 'all') as TabKey;
  const [activeTab, setActiveTab] = useState<TabKey>(
    VALID_TABS.includes(tabParam) ? tabParam : 'all'
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<CodoCommonRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CodoCommonRule | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<number | null>(null);
  const [expandedAck, setExpandedAck] = useState<Record<number, boolean>>({});
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [isMobileTabSelectorOpen, setIsMobileTabSelectorOpen] = useState(false);

  const load = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    try {
      const data = await listCodoRules();
      setRules(data.rules);
      setCounts(data.counts);
    } catch (e) {
      toast({
        title: 'Failed to load CODO rules',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, [canAccess]);

  const handleRespond = async (rule: CodoCommonRule, status: CodoAckStatus) => {
    setAcknowledgingId(rule.id);
    try {
      const result = await acknowledgeCodoRule(rule.id, status);
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id ? { ...r, acknowledgements: result.acknowledgements } : r
        )
      );
      toast({ title: STATUS_META[status].doneLabel });
    } catch (e) {
      toast({
        title: 'Could not save response',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setAcknowledgingId(null);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = (searchParams.get('tab') || 'all') as TabKey;
    if (VALID_TABS.includes(t) && t !== activeTab) {
      setActiveTab(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setTab = (tab: TabKey) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'all') next.delete('tab');
    else next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter((r) => {
      if (activeTab === 'analytics') return true;
      if (activeTab !== 'all' && r.phase !== activeTab) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        (r.subtitle || '').toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.rule_key.toLowerCase().includes(q)
      );
    });
  }, [rules, activeTab, search]);

  const listFiltered = useMemo(() => {
    if (activeTab === 'analytics') return [];
    return filtered;
  }, [filtered, activeTab]);

  const analyticsCompletion = useMemo(() => computeAnalyticsCompletion(rules), [rules]);

  const pdfRules = useMemo(() => {
    if (activeTab === 'analytics') return rules;
    return filtered;
  }, [activeTab, rules, filtered]);

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingReport(true);
      await downloadCodoRulesPdf({
        reportTitle: 'Common CODO Rules',
        subtitle: 'Shared production standards for developers, QA, and projects',
        generatedBy: currentUser?.username || currentUser?.name || 'System',
        generatedByRole: role,
        filePrefix: 'codo-common-rules',
        summary: [
          { label: 'Filtered Rules', value: pdfRules.length },
          { label: 'Developer', value: counts.developer },
          { label: 'Tester / QA', value: counts.tester },
          { label: 'Project', value: counts.project },
        ],
        rules: pdfRules.map((r) => ({
          phase: r.phase,
          ruleKey: r.rule_key,
          title: r.title,
          subtitle: r.subtitle,
          description: r.description,
          sortOrder: r.sort_order,
        })),
      });
    } catch {
      toast({
        title: 'Download failed',
        description: 'Unable to generate CODO rules PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const openCreate = () => {
    setDialogMode('create');
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (rule: CodoCommonRule) => {
    setDialogMode('edit');
    setEditing(rule);
    setDialogOpen(true);
  };

  const handleSave = async (payload: {
    phase: CodoRulePhase;
    title: string;
    subtitle?: string;
    description: string;
    project_ids?: string[];
  }) => {
    try {
      if (dialogMode === 'edit' && editing) {
        await updateCodoRule({
          id: editing.id,
          phase: payload.phase,
          title: payload.title,
          subtitle: payload.subtitle ?? null,
          description: payload.description,
          project_ids: payload.project_ids,
        });
        toast({ title: 'Rule updated' });
      } else {
        await createCodoRule(payload);
        toast({ title: 'Rule created' });
      }
      await load();
    } catch (e) {
      toast({
        title: dialogMode === 'edit' ? 'Update failed' : 'Create failed',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
      throw e;
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCodoRule(deleteTarget.id, true);
      toast({ title: 'Rule deleted' });
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };


  if (!canAccess) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 via-blue-50/30 to-indigo-50/50 dark:from-cyan-950/20 dark:via-blue-950/10 dark:to-indigo-950/20 rounded-2xl" />
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <Lock className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Access Denied
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Common CODO is available to administrators, developers, and testers.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const codoTabs = [
    {
      value: 'all' as TabKey,
      label: 'All rules',
      shortLabel: 'All',
      icon: ClipboardCheck,
      count: String(counts.all),
      countClass:
        'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
    },
    {
      value: 'developer' as TabKey,
      label: 'Developer',
      shortLabel: 'Dev',
      icon: Code2,
      count: String(counts.developer),
      countClass:
        'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    },
    {
      value: 'tester' as TabKey,
      label: 'Tester / QA',
      shortLabel: 'QA',
      icon: ShieldCheck,
      count: String(counts.tester),
      countClass:
        'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    },
    {
      value: 'project' as TabKey,
      label: 'Project',
      shortLabel: 'Project',
      icon: FolderKanban,
      count: String(counts.project),
      countClass:
        'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
    },
    {
      value: 'analytics' as TabKey,
      label: 'Analytics',
      shortLabel: 'Stats',
      icon: BarChart3,
      count: `${analyticsCompletion}%`,
      countClass:
        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    },
  ];
  const activeCodoTab = codoTabs.find((t) => t.value === activeTab) ?? codoTabs[0];

  const defaultPhase: CodoRulePhase =
    activeTab === 'tester' || activeTab === 'project' ? activeTab : 'developer';
  const isAnalytics = activeTab === 'analytics';

  const renderRuleCard = (rule: CodoCommonRule) => {
    const meta = PHASE_META[rule.phase];
    const Icon = meta.icon;
    const ack = rule.acknowledgements;
    const ackOpen = !!expandedAck[rule.id];
    const userStatus =
      (ack?.current_user_status as CodoAckStatus | null | undefined) ||
      (ack?.current_user_acknowledged ? ('acknowledged' as const) : null);
    const responded = ack?.responded_count ?? ack?.acknowledged_count ?? 0;
    const ackPct =
      ack && ack.required_total > 0
        ? Math.round((responded / ack.required_total) * 100)
        : 0;
    const allDone = ack ? ack.pending_count === 0 && ack.required_total > 0 : false;
    const canRespond = !!ack && (ack.current_user_must_acknowledge || !!userStatus);

    return (
      <div
        key={rule.id}
        className="group relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-5 hover:shadow-md hover:border-cyan-300/40 dark:hover:border-cyan-700/40 transition-all duration-300"
      >
        <div className="flex gap-3 sm:gap-4">
          <div
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.accent} text-white shadow-sm`}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white leading-snug">
                    {rule.title}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}
                  >
                    {meta.label}
                  </span>
                  {rule.subtitle ? (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {rule.subtitle}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {rule.description}
                </p>
                {rule.phase === 'project' && (rule.projects?.length || 0) > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {rule.projects!.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1 rounded-md border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 text-[11px] font-medium text-violet-800 dark:text-violet-200"
                      >
                        <FolderKanban className="h-3 w-3" />
                        {p.name}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
                  {rule.rule_key}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0 -mt-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  onClick={() => openEdit(rule)}
                  aria-label="Edit rule"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {canDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-gray-500 hover:text-destructive"
                    onClick={() => setDeleteTarget(rule)}
                    aria-label="Delete rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>

            {ack &&
            ack.required_total > 0 &&
            (canViewAckDetails || canRespond) ? (
              <Collapsible
                open={canViewAckDetails ? ackOpen : false}
                onOpenChange={(open) => {
                  if (!canViewAckDetails) return;
                  setExpandedAck((prev) => ({ ...prev, [rule.id]: open }));
                }}
                className="mt-3"
              >
                <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-gray-50/70 dark:bg-gray-800/40 p-3 sm:p-3.5 space-y-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    {canViewAckDetails ? (
                      <div className="min-w-0 flex-1 space-y-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums',
                            allDone
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-gray-900 dark:text-gray-100'
                          )}
                        >
                          <Users className="h-3.5 w-3.5 shrink-0 opacity-70" />
                          {responded}/{ack.required_total} responded
                        </span>
                        <div className="h-1.5 w-full max-w-xs rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-300',
                              allDone
                                ? 'bg-emerald-500'
                                : ackPct > 0
                                  ? 'bg-cyan-500'
                                  : 'bg-transparent'
                            )}
                            style={{ width: `${ackPct}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        {userStatus ? (
                          <div className="min-w-0 space-y-0.5">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 text-xs font-medium',
                                userStatus === 'acknowledged' &&
                                  'text-emerald-700 dark:text-emerald-300',
                                userStatus === 'doubt' &&
                                  'text-amber-700 dark:text-amber-300',
                                userStatus === 'not_required' &&
                                  'text-slate-600 dark:text-slate-300'
                              )}
                            >
                              {(() => {
                                const StatusIcon = STATUS_META[userStatus].icon;
                                return <StatusIcon className="h-4 w-4 shrink-0" />;
                              })()}
                              {STATUS_META[userStatus].doneLabel}
                            </span>
                            {(() => {
                              const when = formatAckDateTime(
                                ack.current_user_acknowledged_at
                              );
                              return when ? (
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 pl-5">
                                  {when}
                                </p>
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Please respond to this rule
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {canRespond
                        ? (
                            ['acknowledged', 'doubt', 'not_required'] as CodoAckStatus[]
                          ).map((status) => {
                            const sMeta = STATUS_META[status];
                            const SIcon = sMeta.icon;
                            const active = userStatus === status;
                            return (
                              <Button
                                key={status}
                                type="button"
                                size="sm"
                                variant={active ? 'default' : 'outline'}
                                className={cn(
                                  'rounded-lg h-8 px-2.5 sm:px-3 text-xs font-semibold',
                                  active
                                    ? sMeta.activeClass
                                    : 'bg-white/70 dark:bg-gray-900/60 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700'
                                )}
                                disabled={acknowledgingId === rule.id}
                                onClick={() => handleRespond(rule, status)}
                              >
                                {acknowledgingId === rule.id && active ? (
                                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <SIcon className="mr-1.5 h-3.5 w-3.5" />
                                )}
                                {sMeta.label}
                              </Button>
                            );
                          })
                        : null}
                      {canViewAckDetails ? (
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={cn(
                              'rounded-lg h-8 px-2.5 text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white',
                              ackOpen &&
                                'bg-white/80 dark:bg-gray-800 text-gray-900 dark:text-white'
                            )}
                          >
                            Who responded
                            <ChevronDown
                              className={cn(
                                'ml-1 h-3.5 w-3.5 transition-transform duration-200',
                                ackOpen && 'rotate-180'
                              )}
                            />
                          </Button>
                        </CollapsibleTrigger>
                      ) : null}
                    </div>
                  </div>

                  {canViewAckDetails ? (
                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-none">
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-1 border-t border-gray-200/60 dark:border-gray-700/60">
                        {(
                          [
                            {
                              key: 'acknowledged',
                              title: 'Acknowledged',
                              count: ack.acknowledged_count,
                              users: ack.acknowledged,
                              tone: 'done' as const,
                              headerClass: 'text-emerald-700 dark:text-emerald-300',
                              Icon: CheckCircle2,
                              empty: 'No acknowledgements yet',
                            },
                            {
                              key: 'doubt',
                              title: 'Doubt',
                              count: ack.doubt_count ?? ack.doubt?.length ?? 0,
                              users: ack.doubt ?? [],
                              tone: 'doubt' as const,
                              headerClass: 'text-amber-700 dark:text-amber-300',
                              Icon: CircleHelp,
                              empty: 'No doubts',
                            },
                            {
                              key: 'not_required',
                              title: 'Not required',
                              count:
                                ack.not_required_count ??
                                ack.not_required?.length ??
                                0,
                              users: ack.not_required ?? [],
                              tone: 'skip' as const,
                              headerClass: 'text-slate-600 dark:text-slate-300',
                              Icon: MinusCircle,
                              empty: 'None marked not required',
                            },
                            {
                              key: 'pending',
                              title: 'Pending',
                              count: ack.pending_count,
                              users: ack.pending,
                              tone: 'pending' as const,
                              headerClass: 'text-rose-700 dark:text-rose-300',
                              Icon: UserX,
                              empty: 'Everyone has responded',
                            },
                          ] as const
                        ).map((col) => (
                          <div key={col.key} className="min-w-0">
                            <p
                              className={cn(
                                'sticky top-0 z-[1] bg-gray-50/70 dark:bg-gray-800/40 backdrop-blur-sm py-2 text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5',
                                col.headerClass
                              )}
                            >
                              <col.Icon className="h-3.5 w-3.5" />
                              {col.title}
                              <span className="ml-auto tabular-nums font-bold normal-case tracking-normal">
                                {col.count}
                              </span>
                            </p>
                            {col.users.length === 0 ? (
                              <p className="px-2 py-3 text-xs text-gray-500 dark:text-gray-400">
                                {col.empty}
                              </p>
                            ) : (
                              <ul className="max-h-48 overflow-y-auto overscroll-contain -mx-1 pr-0.5">
                                {col.users.map((u) => (
                                  <AckUserRow key={u.id} user={u} tone={col.tone} />
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  ) : null}
                </div>
              </Collapsible>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-50/50 via-transparent to-blue-50/50 dark:from-cyan-950/20 dark:via-transparent dark:to-blue-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
                    <ClipboardCheck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Common CODO
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Shared production standards for developers, QA, and projects.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingReport || pdfRules.length === 0}
                  className="h-12 px-6 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 font-semibold"
                >
                  {isDownloadingReport ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-5 w-5" />
                      PDF
                    </>
                  )}
                </Button>
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border border-cyan-200 dark:border-cyan-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-cyan-500 rounded-lg">
                    <ClipboardCheck className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                    {counts.all}
                  </div>
                </div>
                <Button
                  type="button"
                  size="lg"
                  onClick={openCreate}
                  className="h-12 px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold shadow-lg"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add rule
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setTab(val as TabKey)}
          className="w-full"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-cyan-50/50 dark:from-gray-800/50 dark:to-cyan-900/50 rounded-2xl" />
            <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
              <div className="lg:hidden p-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-2xl justify-between border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70"
                  onClick={() => setIsMobileTabSelectorOpen(true)}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {activeCodoTab?.icon && (
                      <activeCodoTab.icon className="h-4 w-4" />
                    )}
                    {activeCodoTab?.label}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
              </div>

              <TabsList className="hidden lg:grid w-full grid-cols-5 h-14 bg-transparent p-1 gap-1">
                {codoTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="min-w-0 px-1.5 sm:px-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300 flex items-center justify-center gap-1"
                  >
                    <tab.icon className="h-4 w-4 shrink-0" />
                    <span className="hidden xl:inline truncate">{tab.label}</span>
                    <span className="xl:hidden truncate">{tab.shortLabel}</span>
                    <span
                      className={`shrink-0 min-w-[1.75rem] px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold tabular-nums text-center ${tab.countClass}`}
                    >
                      {tab.count}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <Drawer
            open={isMobileTabSelectorOpen}
            onOpenChange={setIsMobileTabSelectorOpen}
          >
            <DrawerContent className="lg:hidden rounded-t-3xl border-gray-200/70 dark:border-gray-800/70 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
              <DrawerHeader className="text-left pb-2">
                <DrawerTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  Select Section
                </DrawerTitle>
                <DrawerDescription>
                  {isAnalytics ? 'Open analytics or filter by phase' : 'Filter CODO rules by phase'}
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-6 space-y-3 max-h-[65vh] overflow-y-auto">
                {codoTabs.map((tab) => {
                  const isActive = activeTab === tab.value;
                  return (
                    <Button
                      key={tab.value}
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setTab(tab.value);
                        setIsMobileTabSelectorOpen(false);
                      }}
                      className={`w-full h-auto min-h-20 rounded-3xl px-4 py-4 flex items-center justify-between ${
                        isActive
                          ? 'bg-lime-400 text-gray-950 hover:bg-lime-400'
                          : 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 hover:bg-gray-200/80 dark:hover:bg-gray-700/80'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${
                            isActive
                              ? 'bg-lime-500/80 text-gray-950'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                          }`}
                        >
                          <tab.icon className="h-5 w-5" />
                        </span>
                        <span className="text-lg font-semibold">{tab.label}</span>
                      </span>
                      <span
                        className={`inline-flex h-10 min-w-10 px-2 items-center justify-center rounded-full ${
                          isActive
                            ? 'bg-gray-950 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100'
                        }`}
                      >
                        {isActive ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <span className="text-sm font-bold">{tab.count}</span>
                        )}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </DrawerContent>
          </Drawer>

          <TabsContent value={activeTab} className="space-y-6 sm:space-y-8 mt-6">
            {!loading && (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-cyan-50/30 dark:from-gray-800/30 dark:to-cyan-900/30 rounded-2xl" />
                <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-cyan-500 rounded-lg">
                        <Search className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Search & Filter
                      </h3>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-cyan-500 transition-colors" />
                        <input
                          type="text"
                          placeholder={
                            isAnalytics
                              ? 'Search analytics by rule title or key…'
                              : 'Search rules by title, description, or key…'
                          }
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                        />
                      </div>
                      {search ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSearch('')}
                          className="h-11 px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 font-medium"
                        >
                          Clear
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-36 w-full rounded-2xl" />
                ))}
              </div>
            ) : isAnalytics ? (
              <CodoAnalyticsPanel
                rules={rules}
                canViewDetails={canViewAckDetails}
                search={search}
              />
            ) : listFiltered.length === 0 ? (
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 via-blue-50/30 to-indigo-50/50 dark:from-cyan-950/20 dark:via-blue-950/10 dark:to-indigo-950/20 rounded-2xl" />
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-10 sm:p-12 text-center">
                  <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                    <ClipboardCheck className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    No CODO Rules Found
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    {search
                      ? 'No rules match your search. Try adjusting your filters.'
                      : 'No CODO rules have been added yet.'}
                  </p>
                  <Button
                    type="button"
                    onClick={openCreate}
                    className="rounded-xl h-11 px-5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add rule
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1" aria-label="CODO rules list">
                {listFiltered.map((rule) => renderRuleCard(rule))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      <CodoRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        initial={editing}
        defaultPhase={defaultPhase}
        onSubmit={handleSave}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete CODO rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{' '}
              <span className="font-semibold text-foreground">
                {deleteTarget?.title}
              </span>{' '}
              from the shared catalog. Project compliance checkmarks are not changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
