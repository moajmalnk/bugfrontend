import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  CODO_AGENT_EXPORT_FORMATS,
  buildCodoAgentExportContent,
  copyTextToClipboard,
  downloadTextFile,
  type CodoAgentExportId,
} from '@/lib/utils/codoRulesAgentExport';
import type { CodoCommonRule, CodoRulePhase } from '@/services/codoRulesService';
import {
  Check,
  ClipboardCopy,
  Code2,
  Download,
  FileDown,
  FolderKanban,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type ScopeKey = 'all' | CodoRulePhase;

const SCOPE_OPTIONS: Array<{ value: ScopeKey; label: string; icon: typeof Code2 }> = [
  { value: 'all', label: 'All phases', icon: Sparkles },
  { value: 'developer', label: 'Developer', icon: Code2 },
  { value: 'tester', label: 'Tester / QA', icon: ShieldCheck },
  { value: 'project', label: 'Project', icon: FolderKanban },
];

type CodoExportPanelProps = {
  rules: CodoCommonRule[];
  search?: string;
};

export function CodoExportPanel({ rules, search = '' }: CodoExportPanelProps) {
  const [scope, setScope] = useState<ScopeKey>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<CodoAgentExportId | null>(null);

  const exportRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter((r) => {
      if (!r.is_active) return false;
      if (scope !== 'all' && r.phase !== scope) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        (r.subtitle || '').toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.rule_key.toLowerCase().includes(q)
      );
    });
  }, [rules, scope, search]);

  const runCopy = async (id: CodoAgentExportId) => {
    if (exportRules.length === 0) {
      toast({
        title: 'Nothing to export',
        description: 'No matching active rules for this scope.',
        variant: 'destructive',
      });
      return;
    }
    const key = `copy-${id}`;
    setBusyId(key);
    try {
      const content = buildCodoAgentExportContent(id, exportRules);
      await copyTextToClipboard(content);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000);
      toast({
        title: 'Copied to clipboard',
        description: `${exportRules.length} rule${exportRules.length === 1 ? '' : 's'} ready to paste.`,
      });
    } catch (e) {
      toast({
        title: 'Copy failed',
        description: e instanceof Error ? e.message : 'Could not access clipboard',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const runDownload = (id: CodoAgentExportId) => {
    if (exportRules.length === 0) {
      toast({
        title: 'Nothing to export',
        description: 'No matching active rules for this scope.',
        variant: 'destructive',
      });
      return;
    }
    const format = CODO_AGENT_EXPORT_FORMATS.find((f) => f.id === id);
    if (!format) return;
    const key = `dl-${id}`;
    setBusyId(key);
    try {
      const content = buildCodoAgentExportContent(id, exportRules);
      downloadTextFile(format.filename, content, format.mimeType);
      toast({
        title: 'Download started',
        description: format.filename,
      });
    } catch (e) {
      toast({
        title: 'Download failed',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/40 via-transparent to-violet-50/30 dark:from-cyan-950/15 dark:via-transparent dark:to-violet-950/10 pointer-events-none" />
        <div className="relative p-5 sm:p-6 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shrink-0">
                <FileDown className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Copy & download for AI agents
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Export Common CODO as Cursor, Antigravity, Android Studio, or generic agent rules —
                  for developers and admins.
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 self-start font-bold tabular-nums px-2.5 py-1 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300"
            >
              {exportRules.length} rule{exportRules.length === 1 ? '' : 's'}
            </Badge>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Scope
            </p>
            <div className="grid grid-cols-12 gap-2">
              {SCOPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = scope === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setScope(opt.value)}
                    className={cn(
                      'col-span-6 sm:col-span-3 flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-semibold transition-all',
                      active
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md border border-gray-200 dark:border-gray-700'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/70 dark:hover:bg-gray-800/60 border border-transparent'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-80" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 sm:gap-5">
        {CODO_AGENT_EXPORT_FORMATS.map((format) => {
          const copying = busyId === `copy-${format.id}`;
          const downloading = busyId === `dl-${format.id}`;
          const justCopied = copiedId === format.id;
          return (
            <div
              key={format.id}
              className="col-span-12 md:col-span-6 relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-5 sm:p-6 space-y-4 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent dark:from-white/[0.03] pointer-events-none" />
              <div className="relative space-y-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'p-2.5 rounded-xl text-white shadow-md shrink-0 bg-gradient-to-br',
                      format.accent
                    )}
                  >
                    <Download className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                      {format.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{format.description}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 px-3.5 py-3 space-y-1">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 font-mono truncate">
                    {format.filename}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{format.installHint}</p>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="col-span-6 h-11 rounded-xl font-semibold"
                    disabled={copying || downloading || exportRules.length === 0}
                    onClick={() => void runCopy(format.id)}
                  >
                    {justCopied ? (
                      <Check className="h-4 w-4 mr-2 text-emerald-600" />
                    ) : (
                      <ClipboardCopy className="h-4 w-4 mr-2" />
                    )}
                    {justCopied ? 'Copied' : copying ? 'Copying…' : 'Copy'}
                  </Button>
                  <Button
                    type="button"
                    className={cn(
                      'col-span-6 h-11 rounded-xl font-semibold text-white bg-gradient-to-r shadow-md',
                      format.accent
                    )}
                    disabled={copying || downloading || exportRules.length === 0}
                    onClick={() => runDownload(format.id)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {downloading ? 'Saving…' : 'Download'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {exportRules.length === 0 ? (
        <p className="text-sm text-center text-muted-foreground py-4">
          No active rules match this scope{search.trim() ? ' and search' : ''}.
        </p>
      ) : null}
    </div>
  );
}
