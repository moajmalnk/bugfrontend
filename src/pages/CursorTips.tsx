import { CursorTipBody } from '@/components/cursorTips/CursorTipBody';
import { CursorTipDialog } from '@/components/cursorTips/CursorTipDialog';
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
import { usePermissions } from '@/hooks/usePermissions';
import { getEffectiveRole, hasPermissionOrAdmin } from '@/lib/utils';
import { parseTipDescription } from '@/lib/cursorTips/parseTipDescription';
import {
  createCursorTip,
  deleteCursorTip,
  listCursorTips,
  updateCursorTip,
  type CursorTip,
  type CursorTipCounts,
  type CursorTipPhase,
} from '@/services/cursorTipsService';
import {
  BookOpen,
  Check,
  ChevronDown,
  ClipboardList,
  Command,
  Download,
  GitBranch,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Workflow,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

type TabKey = 'all' | CursorTipPhase;

const VALID_TABS: TabKey[] = [
  'all',
  'modes',
  'commands',
  'skills',
  'workflow',
  'review',
];

const PHASE_META: Record<
  CursorTipPhase,
  {
    label: string;
    icon: typeof Sparkles;
    accent: string;
    badge: string;
  }
> = {
  modes: {
    label: 'Modes',
    icon: Layers,
    accent: 'from-sky-500 to-blue-600',
    badge:
      'border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200',
  },
  commands: {
    label: 'Commands',
    icon: Command,
    accent: 'from-violet-500 to-purple-600',
    badge:
      'border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 text-violet-800 dark:text-violet-200',
  },
  skills: {
    label: 'Skills',
    icon: Sparkles,
    accent: 'from-amber-500 to-orange-600',
    badge:
      'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200',
  },
  workflow: {
    label: 'Workflow',
    icon: Workflow,
    accent: 'from-emerald-500 to-teal-600',
    badge:
      'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200',
  },
  review: {
    label: 'Review',
    icon: ClipboardList,
    accent: 'from-rose-500 to-pink-600',
    badge:
      'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200',
  },
};

export default function CursorTips() {
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions(null);
  const role = getEffectiveRole(currentUser || {});
  const canAccess = hasPermissionOrAdmin(
    role,
    hasPermission,
    'CURSOR_TIPS_VIEW'
  );
  const canManage = hasPermissionOrAdmin(
    role,
    hasPermission,
    'CURSOR_TIPS_MANAGE'
  );

  const [tips, setTips] = useState<CursorTip[]>([]);
  const [counts, setCounts] = useState<CursorTipCounts>({
    all: 0,
    modes: 0,
    commands: 0,
    skills: 0,
    workflow: 0,
    review: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') || 'all') as TabKey;
  const initialTab: TabKey = VALID_TABS.includes(tabParam) ? tabParam : 'all';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<CursorTip | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CursorTip | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [isMobileTabSelectorOpen, setIsMobileTabSelectorOpen] = useState(false);

  const load = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    try {
      const data = await listCursorTips();
      setTips(data.tips);
      setCounts(data.counts);
    } catch (e) {
      toast({
        title: 'Failed to load Cursor Tips',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
      setTips([]);
    } finally {
      setLoading(false);
    }
  }, [canAccess]);

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

  useEffect(() => {
    const dialog = searchParams.get('dialog');
    if (!canManage || !dialog) return;
    if (dialog === 'create') {
      setDialogMode('create');
      setEditing(null);
      setDialogOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('dialog');
      next.delete('tip');
      setSearchParams(next, { replace: true });
      return;
    }
    if (dialog === 'edit') {
      const tipId = Number(searchParams.get('tip') || 0);
      const found = tips.find((t) => t.id === tipId);
      if (found) {
        setDialogMode('edit');
        setEditing(found);
        setDialogOpen(true);
        const next = new URLSearchParams(searchParams);
        next.delete('dialog');
        next.delete('tip');
        setSearchParams(next, { replace: true });
      }
    }
  }, [searchParams, tips, canManage, setSearchParams]);

  const setTab = (tab: TabKey) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'all') next.delete('tab');
    else next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const filteredTips = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tips.filter((tip) => {
      if (activeTab !== 'all' && tip.phase !== activeTab) return false;
      if (!q) return true;
      const { requirement, malayalam } = parseTipDescription(tip.description);
      const haystack = [
        tip.title,
        tip.subtitle,
        tip.description,
        tip.tip_key,
        requirement,
        malayalam,
        tip.analogy_en,
        tip.analogy_ml,
        tip.when_to_use,
        tip.when_not_to_use,
        tip.example_bad,
        tip.example_good,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [tips, activeTab, search]);

  const pdfTips = useMemo(() => filteredTips, [filteredTips]);

  const tipTabs = [
    {
      value: 'all' as TabKey,
      label: 'All',
      shortLabel: 'All',
      icon: BookOpen,
      count: String(counts.all),
      countClass:
        'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
    },
    {
      value: 'modes' as TabKey,
      label: 'Modes',
      shortLabel: 'Modes',
      icon: Layers,
      count: String(counts.modes),
      countClass:
        'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
    },
    {
      value: 'commands' as TabKey,
      label: 'Commands',
      shortLabel: 'Cmds',
      icon: Command,
      count: String(counts.commands),
      countClass:
        'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
    },
    {
      value: 'skills' as TabKey,
      label: 'Skills',
      shortLabel: 'Skills',
      icon: Sparkles,
      count: String(counts.skills),
      countClass:
        'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    },
    {
      value: 'workflow' as TabKey,
      label: 'Workflow',
      shortLabel: 'Flow',
      icon: Workflow,
      count: String(counts.workflow),
      countClass:
        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    },
    {
      value: 'review' as TabKey,
      label: 'Review',
      shortLabel: 'Review',
      icon: GitBranch,
      count: String(counts.review),
      countClass:
        'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
    },
  ];
  const activeTipTab = tipTabs.find((t) => t.value === activeTab) ?? tipTabs[0];

  const defaultPhase: CursorTipPhase =
    activeTab !== 'all' ? activeTab : 'modes';

  const openCreate = () => {
    setDialogMode('create');
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (tip: CursorTip) => {
    setDialogMode('edit');
    setEditing(tip);
    setDialogOpen(true);
  };

  const handleSubmit = async (payload: Parameters<
    typeof createCursorTip
  >[0]) => {
    try {
      if (dialogMode === 'edit' && editing) {
        await updateCursorTip({ ...payload, id: editing.id });
        toast({ title: 'Tip updated' });
      } else {
        await createCursorTip(payload);
        toast({ title: 'Tip created' });
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
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteCursorTip(deleteTarget.id);
      toast({ title: 'Tip moved to recycle bin' });
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

  const handleDownloadPdf = async () => {
    if (isDownloadingReport || pdfTips.length === 0) return;
    setIsDownloadingReport(true);
    try {
      const { downloadCursorTipsPdf } = await import(
        '@/lib/utils/cursorTipsPdfReport'
      );
      await downloadCursorTipsPdf({
        reportTitle: 'Cursor Tips',
        subtitle:
          'Shared Cursor operating standards for developers, QA, and project leads.',
        generatedBy: currentUser?.username || currentUser?.name,
        generatedByRole: role,
        summary: [
          { label: 'Total', value: pdfTips.length },
          { label: 'Modes', value: counts.modes },
          { label: 'Commands', value: counts.commands },
          { label: 'Skills', value: counts.skills },
        ],
        tips: pdfTips.map((t) => ({
          phase: t.phase,
          tipKey: t.tip_key,
          title: t.title,
          subtitle: t.subtitle,
          description: t.description,
          analogyEn: t.analogy_en,
          analogyMl: t.analogy_ml,
          whenToUse: t.when_to_use,
          whenNotToUse: t.when_not_to_use,
          exampleBad: t.example_bad,
          exampleGood: t.example_good,
          exampleLanguage: t.example_language,
          sortOrder: t.sort_order,
        })),
        filePrefix: 'cursor-tips',
      });
    } catch (e) {
      toast({
        title: 'PDF export failed',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const renderTipCard = (tip: CursorTip) => {
    const meta = PHASE_META[tip.phase];
    const Icon = meta.icon;
    return (
      <div
        key={tip.id}
        className="group relative w-full min-w-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-3.5 sm:p-5 hover:shadow-md hover:border-cyan-300/40 dark:hover:border-cyan-700/40 transition-all duration-300 overflow-hidden"
      >
        <div className="flex gap-2.5 sm:gap-4 min-w-0">
          <div
            className={`mt-0.5 flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.accent} text-white shadow-sm`}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>

          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}
                  >
                    {meta.label}
                  </span>
                </div>

                <CursorTipBody
                  tipKey={tip.tip_key}
                  subtitle={tip.subtitle}
                  title={tip.title}
                  description={tip.description}
                  analogyEn={tip.analogy_en}
                  analogyMl={tip.analogy_ml}
                  whenToUse={tip.when_to_use}
                  whenNotToUse={tip.when_not_to_use}
                  exampleBad={tip.example_bad}
                  exampleGood={tip.example_good}
                  exampleLanguage={tip.example_language}
                />
              </div>

              {canManage ? (
                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 -mt-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    onClick={() => openEdit(tip)}
                    aria-label="Edit tip"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-gray-500 hover:text-destructive"
                    onClick={() => setDeleteTarget(tip)}
                    aria-label="Delete tip"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!canAccess) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-border/60 bg-card p-6 text-center space-y-2">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Access restricted</h1>
          <p className="text-sm text-muted-foreground">
            You need Cursor Tips view permission to open this playbook.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 sm:space-y-6 md:space-y-8 p-3 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden">
      <div className="relative min-w-0 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-50/50 via-transparent to-blue-50/50 dark:from-cyan-950/20 dark:via-transparent dark:to-blue-950/20" />
        <div className="relative min-w-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 md:p-8">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 sm:gap-6 min-w-0">
            <div className="space-y-2 sm:space-y-3 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                Engineering Craft
              </p>
              <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shrink-0">
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight break-words">
                    Cursor Tips
                  </h1>
                  <div className="h-1 w-16 sm:w-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full mt-2" />
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base lg:text-lg font-medium max-w-2xl break-words">
                Shared Cursor operating standards for developers, QA, and
                project leads.
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-2xl break-words">
                ഡെവലപ്പർമാർ, QA, പ്രോജക്റ്റ് ലീഡുകൾക്കുള്ള Cursor ഉപയോഗ നിലവാരം.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto min-w-0">
              <Button
                variant="outline"
                size="lg"
                onClick={handleDownloadPdf}
                disabled={isDownloadingReport || pdfTips.length === 0}
                className="h-11 sm:h-12 w-full sm:w-auto px-4 sm:px-6 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 font-semibold rounded-xl"
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
              <div className="flex items-center justify-center gap-3 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border border-cyan-200 dark:border-cyan-800 rounded-xl shadow-sm w-full sm:w-auto">
                <div className="p-1.5 bg-cyan-500 rounded-lg shrink-0">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300 tabular-nums">
                  {counts.all}
                </div>
              </div>
              {canManage ? (
                <Button
                  type="button"
                  size="lg"
                  onClick={openCreate}
                  className="h-11 sm:h-12 w-full sm:w-auto px-4 sm:px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold shadow-lg rounded-xl"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add tip
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(val) => setTab(val as TabKey)}
        className="w-full min-w-0"
      >
        <div className="relative min-w-0">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-cyan-50/50 dark:from-gray-800/50 dark:to-cyan-900/50 rounded-2xl" />
          <div className="relative min-w-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
            <div className="lg:hidden p-1 min-w-0">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-2xl justify-between border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70 min-w-0"
                onClick={() => setIsMobileTabSelectorOpen(true)}
              >
                <span className="flex items-center gap-2 text-sm font-semibold min-w-0 truncate">
                  {activeTipTab?.icon && (
                    <activeTipTab.icon className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate">{activeTipTab?.label}</span>
                </span>
                <ChevronDown className="h-4 w-4 opacity-70 shrink-0" />
              </Button>
            </div>

            <TabsList className="hidden lg:grid w-full h-14 bg-transparent p-1 gap-1 min-w-0 grid-cols-12">
              {tipTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="col-span-2 min-w-0 px-1.5 sm:px-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300 flex items-center justify-center gap-1 overflow-hidden"
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
                Filter Cursor Tips by category
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-3 max-h-[65vh] overflow-y-auto">
              {tipTabs.map((tab) => {
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
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-600'
                        : 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 hover:bg-gray-200/80 dark:hover:bg-gray-700/80'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
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

        <TabsContent
          value={activeTab}
          className="space-y-4 sm:space-y-6 md:space-y-8 mt-4 sm:mt-6 min-w-0 w-full overflow-x-hidden"
        >
          {!loading && (
            <div className="relative min-w-0">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-cyan-50/30 dark:from-gray-800/30 dark:to-cyan-900/30 rounded-2xl" />
              <div className="relative min-w-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6">
                <div className="space-y-4 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-cyan-500 rounded-lg shrink-0">
                      <Search className="h-4 w-4 text-white" />
                    </div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                      Search & Filter
                    </h2>
                  </div>
                  <div className="w-full min-w-0 relative group">
                    <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-cyan-500 transition-colors pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search tips by title, description, key, or Malayalam…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full min-w-0 max-w-full pl-10 sm:pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-36 w-full rounded-2xl" />
              <Skeleton className="h-36 w-full rounded-2xl" />
              <Skeleton className="h-36 w-full rounded-2xl" />
            </div>
          ) : filteredTips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-900/60 p-10 text-center space-y-3">
              <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">
                No tips match
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {search.trim()
                  ? 'Try a different search term or clear filters.'
                  : 'No Cursor Tips are available in this category yet.'}
              </p>
              {canManage && !search.trim() ? (
                <Button
                  type="button"
                  onClick={openCreate}
                  className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add tip
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:gap-4">
              {filteredTips.map(renderTipCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {canManage ? (
        <CursorTipDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={dialogMode}
          initial={editing}
          defaultPhase={defaultPhase}
          onSubmit={handleSubmit}
        />
      ) : null}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this tip?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.title}” will move to the recycle bin and can be
              restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
    </div>
  );
}
