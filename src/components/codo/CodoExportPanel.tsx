import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  CODO_AGENT_EXPORT_FORMATS,
  buildCodoAgentExportContent,
  copyTextToClipboard,
  downloadTextFile,
  formatExportFileSize,
  type CodoAgentExportId,
} from '@/lib/utils/codoRulesAgentExport';
import type { CodoCommonRule, CodoRulePhase } from '@/services/codoRulesService';
import {
  Check,
  ChevronDown,
  ClipboardCopy,
  Code2,
  Download,
  FileDown,
  FileText,
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

function renderUsageStep(step: string) {
  const parts = step.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function CodoExportPanel({ rules, search = '' }: CodoExportPanelProps) {
  const [scope, setScope] = useState<ScopeKey>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<CodoAgentExportId | null>(null);
  const [openGuideId, setOpenGuideId] = useState<CodoAgentExportId | null>('cursor');

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
        description: `${exportRules.length} rule${exportRules.length === 1 ? '' : 's'} ready to paste into a text file.`,
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
        title: 'Text file saved',
        description: `${format.filename} (${formatExportFileSize(content)})`,
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

      <div className="grid grid-cols-12 gap-4 sm:gap-5">
        {CODO_AGENT_EXPORT_FORMATS.map((format) => {
          const copying = busyId === `copy-${format.id}`;
          const downloading = busyId === `dl-${format.id}`;
          const justCopied = copiedId === format.id;
          const previewContent = buildCodoAgentExportContent(format.id, exportRules);
          const fileSize = formatExportFileSize(previewContent);
          const guideOpen = openGuideId === format.id;

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
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                        {format.name}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="font-mono text-[10px] uppercase tracking-wide px-2 py-0"
                      >
                        Text {format.fileExtension}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{format.description}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 px-3.5 py-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 font-mono truncate">
                      {format.filename}
                    </p>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground tabular-nums">
                      {exportRules.length > 0 ? fileSize : '—'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Save to:{' '}
                    <code className="text-[11px] font-mono text-foreground/80 bg-background/60 px-1.5 py-0.5 rounded">
                      {format.targetPath}
                    </code>
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
                    {justCopied ? 'Copied' : copying ? 'Copying…' : 'Copy text'}
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
                    {downloading
                      ? 'Saving…'
                      : `Download ${format.fileExtension}`}
                  </Button>
                </div>

                <Collapsible
                  open={guideOpen}
                  onOpenChange={(open) => setOpenGuideId(open ? format.id : null)}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/30 px-3.5 py-2.5 text-left text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors"
                    >
                      <span>How to use — step by step</span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                          guideOpen && 'rotate-180'
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-none">
                    <ol className="mt-3 space-y-2.5 rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/60 dark:bg-gray-900/40 px-3.5 py-3.5">
                      {format.usageSteps.map((step, index) => (
                        <li
                          key={index}
                          className="flex gap-3 text-xs sm:text-sm text-muted-foreground leading-relaxed"
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white bg-gradient-to-br',
                              format.accent
                            )}
                          >
                            {index + 1}
                          </span>
                          <span className="pt-0.5">{renderUsageStep(step)}</span>
                        </li>
                      ))}
                    </ol>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          );
        })}
      </div>

      {exportRules.length === 0 ? (
        <p className="text-sm text-center text-muted-foreground py-4">
          No active rules match this scope{search.trim() ? ' and search' : ''}.
        </p>
      ) : (
        <p className="text-xs text-center text-muted-foreground">
          Downloads are UTF-8 text files. Open them in any editor (Cursor, VS Code, Android Studio) —
          they are not images or PDFs.
        </p>
      )}
    </div>
  );
}
