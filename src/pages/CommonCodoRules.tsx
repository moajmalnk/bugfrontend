import { CodoRuleDialog } from '@/components/codo/CodoRuleDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { getEffectiveRole } from '@/lib/utils';
import {
  createCodoRule,
  deleteCodoRule,
  listCodoRules,
  updateCodoRule,
  type CodoCommonRule,
  type CodoRuleCounts,
  type CodoRulePhase,
} from '@/services/codoRulesService';
import {
  ClipboardCheck,
  Code2,
  FolderKanban,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

type TabKey = 'all' | CodoRulePhase;

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

export default function CommonCodoRules() {
  const { currentUser } = useAuth();
  const role = getEffectiveRole(currentUser || {});
  const canAccess = role === 'admin' || role === 'developer' || role === 'tester';
  const canDelete = role === 'admin';

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
    ['all', 'developer', 'tester', 'project'].includes(tabParam) ? tabParam : 'all'
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<CodoCommonRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CodoCommonRule | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = (searchParams.get('tab') || 'all') as TabKey;
    if (['all', 'developer', 'tester', 'project'].includes(t) && t !== activeTab) {
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
  }) => {
    try {
      if (dialogMode === 'edit' && editing) {
        await updateCodoRule({
          id: editing.id,
          phase: payload.phase,
          title: payload.title,
          subtitle: payload.subtitle ?? null,
          description: payload.description,
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
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="text-center space-y-2 max-w-md">
          <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Access denied</h2>
          <p className="text-sm text-muted-foreground">
            Common CODO is available to admin, developer, and tester roles.
          </p>
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: 'All rules', count: counts.all },
    { key: 'developer', label: 'Developer', count: counts.developer },
    { key: 'tester', label: 'Tester / QA', count: counts.tester },
    { key: 'project', label: 'Project', count: counts.project },
  ];

  const defaultPhase: CodoRulePhase =
    activeTab === 'tester' || activeTab === 'project' ? activeTab : 'developer';

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-6 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-50/50 via-transparent to-blue-50/50 dark:from-cyan-950/20 dark:via-transparent dark:to-blue-950/20 pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shrink-0">
                  <ClipboardCheck className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Common CODO
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Shared production standards for developers, QA, and projects.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-600/90 text-white px-4 py-2 text-sm font-semibold shadow">
                <ClipboardCheck className="h-4 w-4" />
                {counts.all} rules
              </div>
              <Button
                type="button"
                onClick={openCreate}
                className="rounded-xl h-11 px-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold shadow-lg"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add rule
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs + search */}
        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-border/40">
            <div className="flex flex-wrap gap-2">
              {tabs.map((t) => (
                <Button
                  key={t.key}
                  type="button"
                  size="sm"
                  variant={activeTab === t.key ? 'default' : 'outline'}
                  className="rounded-full"
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                  <span className="ml-1.5 tabular-nums opacity-80">({t.count})</span>
                </Button>
              ))}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rules…"
                className="pl-9 h-10 rounded-xl"
              />
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-14 rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 px-4">
                <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-lg font-semibold">No CODO rules found</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  {search
                    ? 'Try a different search or clear filters.'
                    : 'Add the first shared rule for your team.'}
                </p>
                <Button type="button" className="mt-4 rounded-xl" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add rule
                </Button>
              </div>
            ) : (
              filtered.map((rule) => {
                const meta = PHASE_META[rule.phase];
                const Icon = meta.icon;
                return (
                  <div
                    key={rule.id}
                    className="group relative rounded-2xl border border-border/60 bg-background/50 p-4 sm:p-5 hover:border-cyan-300/50 dark:hover:border-cyan-700/50 transition-all"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.accent} text-white shadow`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base sm:text-lg font-semibold text-foreground">
                            {rule.title}
                          </h3>
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badge}`}
                          >
                            {meta.label}
                          </span>
                          {rule.subtitle ? (
                            <span className="text-xs text-muted-foreground">{rule.subtitle}</span>
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {rule.description}
                        </p>
                        <p className="text-[11px] font-mono text-muted-foreground/80 truncate">
                          {rule.rule_key}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-xl"
                          onClick={() => openEdit(rule)}
                          aria-label="Edit rule"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {canDelete ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(rule)}
                            aria-label="Delete rule"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
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
