import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';
import {
  CODO_IDE_KIT_FILES,
  CODO_IDE_SETUP_STEPS,
  CODO_IDE_TROUBLESHOOTING,
  type CodoIdeKitFile,
  type CodoIdeKitFileId,
} from '@/lib/codo/codoIdeSetupKit';
import { cn } from '@/lib/utils';
import {
  copyTextToClipboard,
  downloadTextFile,
  formatExportFileSize,
} from '@/lib/utils/codoRulesAgentExport';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCopy,
  Download,
  FileJson,
  GitBranch,
  LifeBuoy,
  ListChecks,
  RotateCcw,
  Settings2,
  User,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const PROGRESS_STORAGE_KEY = 'codo-ide-kit-progress-v1';
/** Browsers drop back-to-back programmatic downloads fired in the same tick. */
const MULTI_DOWNLOAD_GAP_MS = 400;

function renderInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground break-all"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function readStoredProgress(): string[] {
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function CodoIdeSetupKit() {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<CodoIdeKitFileId | null>(null);
  const [previewId, setPreviewId] = useState<CodoIdeKitFileId | null>(null);
  const [troubleOpen, setTroubleOpen] = useState(false);
  const [doneSteps, setDoneSteps] = useState<string[]>(() => readStoredProgress());

  useEffect(() => {
    try {
      window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(doneSteps));
    } catch {
      // Private mode / quota — progress just won't persist.
    }
  }, [doneSteps]);

  const fileContents = useMemo(
    () =>
      Object.fromEntries(CODO_IDE_KIT_FILES.map((f) => [f.id, f.build()])) as Record<
        CodoIdeKitFileId,
        string
      >,
    []
  );

  const totalSteps = CODO_IDE_SETUP_STEPS.length;
  const doneCount = CODO_IDE_SETUP_STEPS.filter((s) => doneSteps.includes(s.id)).length;
  const progressPct = Math.round((doneCount / totalSteps) * 100);
  const busy = busyKey !== null;

  const toggleStep = (id: string, checked: boolean) => {
    setDoneSteps((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((s) => s !== id)
    );
  };

  const runCopy = async (file: CodoIdeKitFile) => {
    if (busy) return;
    setBusyKey(`copy-${file.id}`);
    try {
      await copyTextToClipboard(fileContents[file.id]);
      setCopiedId(file.id);
      window.setTimeout(() => setCopiedId((cur) => (cur === file.id ? null : cur)), 2000);
      toast({
        title: `${file.filename} copied`,
        description:
          file.scope === 'user'
            ? 'Merge into User settings (JSON) — do not replace the whole file.'
            : `Paste into ${file.targetPath}.`,
      });
    } catch (e) {
      toast({
        title: 'Copy failed',
        description: e instanceof Error ? e.message : 'Could not access clipboard',
        variant: 'destructive',
      });
    } finally {
      setBusyKey(null);
    }
  };

  const runDownload = (file: CodoIdeKitFile) => {
    if (busy) return;
    setBusyKey(`dl-${file.id}`);
    try {
      downloadTextFile(file.filename, fileContents[file.id], file.mimeType);
      toast({
        title: `${file.filename} saved`,
        description:
          file.scope === 'user' ? 'Merge into your User settings.' : `Move it to ${file.targetPath}.`,
      });
    } catch (e) {
      toast({
        title: 'Download failed',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setBusyKey(null);
    }
  };

  const runDownloadAll = async () => {
    if (busy) return;
    setBusyKey('dl-all');
    try {
      for (const [index, file] of CODO_IDE_KIT_FILES.entries()) {
        if (index > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, MULTI_DOWNLOAD_GAP_MS));
        }
        downloadTextFile(file.filename, fileContents[file.id], file.mimeType);
      }
      toast({
        title: `${CODO_IDE_KIT_FILES.length} files saved`,
        description:
          'If only one file arrived, allow multiple downloads for this site and try again.',
      });
    } catch (e) {
      toast({
        title: 'Download failed',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section
      aria-labelledby="codo-ide-kit-heading"
      className="relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-5 sm:p-6 shadow-sm"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-transparent to-transparent dark:from-emerald-500/[0.04] pointer-events-none" />
      <div className="relative flex flex-col gap-6">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 items-start">
          <div className="col-span-12 lg:col-span-8 flex items-start gap-3 min-w-0">
            <div className="p-2.5 rounded-xl text-white shadow-md shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600">
              <Settings2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  id="codo-ide-kit-heading"
                  className="text-base sm:text-lg font-bold text-gray-900 dark:text-white"
                >
                  Developer IDE setup kit
                </h3>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide px-2 py-0">
                  Cursor · Antigravity · VS Code
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                After a window reload, show every TypeScript error in Problems and every uncommitted
                change in Source Control — without opening files one by one. Follow the flow once
                per repo; teammates repeat steps 4–7 on their own machine.
              </p>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4 flex lg:justify-end">
            <Button
              type="button"
              className="h-11 w-full lg:w-auto rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-md"
              disabled={busy}
              onClick={() => void runDownloadAll()}
            >
              <Download className="h-4 w-4 mr-2" />
              {busyKey === 'dl-all' ? 'Saving files…' : `Download all (${CODO_IDE_KIT_FILES.length} files)`}
            </Button>
          </div>
        </div>

        {/* Flow overview */}
        <nav aria-label="Setup flow overview">
          <ol className="flex flex-wrap items-center gap-2">
            {CODO_IDE_SETUP_STEPS.map((step, index) => {
              const done = doneSteps.includes(step.id);
              return (
                <li key={step.id} className="flex items-center gap-2">
                  <a
                    href={`#codo-ide-step-${step.id}`}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors',
                      done
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : 'border-gray-200 bg-gray-50/70 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-200 dark:hover:bg-gray-800/70'
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <span className="tabular-nums font-bold">{index + 1}</span>
                    )}
                    <span className="max-w-[11rem] truncate">{step.title.replace(/`/g, '')}</span>
                  </a>
                  {index < CODO_IDE_SETUP_STEPS.length - 1 ? (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Progress */}
        <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-gray-50/60 dark:bg-gray-800/30 px-4 py-3 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Your progress: {doneCount} of {totalSteps} steps
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-xl text-xs"
              disabled={doneCount === 0}
              onClick={() => setDoneSteps([])}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset
            </Button>
          </div>
          <Progress value={progressPct} className="h-2" aria-label="Setup progress" />
          <p className="text-[11px] text-muted-foreground">Saved in this browser only.</p>
        </div>

        {/* Flowchart */}
        <ol className="relative flex flex-col gap-4">
          {CODO_IDE_SETUP_STEPS.map((step, index) => {
            const done = doneSteps.includes(step.id);
            const isLast = index === CODO_IDE_SETUP_STEPS.length - 1;
            return (
              <li
                key={step.id}
                id={`codo-ide-step-${step.id}`}
                className="relative grid grid-cols-12 gap-3 scroll-mt-24"
              >
                <div className="col-span-2 sm:col-span-1 flex flex-col items-center">
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm',
                      done
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                        : 'bg-gradient-to-br from-slate-500 to-slate-700 dark:from-slate-600 dark:to-slate-800'
                    )}
                    aria-hidden
                  >
                    {done ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  {!isLast ? (
                    <span
                      className={cn(
                        'mt-2 w-0.5 flex-1 rounded-full',
                        done ? 'bg-emerald-400/70' : 'bg-gray-200 dark:bg-gray-700'
                      )}
                      aria-hidden
                    />
                  ) : null}
                </div>

                <div
                  className={cn(
                    'col-span-10 sm:col-span-11 rounded-xl border p-4 flex flex-col gap-3 transition-colors',
                    done
                      ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/50 dark:bg-emerald-500/[0.05]'
                      : 'border-gray-200/80 bg-white/60 dark:border-gray-700/70 dark:bg-gray-900/40'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                        {renderInline(step.title)}
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                        {renderInline(step.summary)}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 shrink-0 cursor-pointer text-xs font-medium text-muted-foreground">
                      <Checkbox
                        checked={done}
                        onCheckedChange={(v) => toggleStep(step.id, v === true)}
                        aria-label={`Mark step ${index + 1} done`}
                      />
                      <span className="hidden sm:inline">Done</span>
                    </label>
                  </div>

                  {step.actions.length > 0 ? (
                    <ul className="flex flex-col gap-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {step.actions.map((action, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400 dark:bg-gray-500" />
                          <span className="min-w-0">{renderInline(action)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {step.branch ? (
                    <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-500/[0.06] p-3 flex flex-col gap-2.5">
                      <p className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-start gap-2">
                        <GitBranch className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{renderInline(step.branch.question)}</span>
                      </p>
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-12 md:col-span-6 rounded-xl bg-white/70 dark:bg-gray-900/50 border border-amber-200/70 dark:border-amber-800/50 p-2.5 text-xs text-muted-foreground leading-relaxed">
                          <span className="mr-1.5 inline-flex rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                            Yes
                          </span>
                          {renderInline(step.branch.yes)}
                        </div>
                        <div className="col-span-12 md:col-span-6 rounded-xl bg-white/70 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-2.5 text-xs text-muted-foreground leading-relaxed">
                          <span className="mr-1.5 inline-flex rounded-md bg-slate-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                            No
                          </span>
                          {renderInline(step.branch.no)}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <p className="text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      <span className="font-semibold">Pass when: </span>
                      {renderInline(step.passWhen)}
                    </span>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Files */}
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileJson className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Kit files
          </h4>
          <div className="grid grid-cols-12 gap-4">
            {CODO_IDE_KIT_FILES.map((file) => {
              const content = fileContents[file.id];
              const copying = busyKey === `copy-${file.id}`;
              const downloading = busyKey === `dl-${file.id}`;
              const previewOpen = previewId === file.id;
              const isUser = file.scope === 'user';
              return (
                <div
                  key={file.id}
                  className="col-span-12 md:col-span-6 rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-gradient-to-br from-gray-50/80 to-white/40 dark:from-gray-800/50 dark:to-gray-900/40 p-4 flex flex-col gap-3 min-w-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{file.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {file.purpose}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'shrink-0 rounded-xl text-[10px] px-2 py-0.5 gap-1',
                        isUser
                          ? 'border-sky-300 text-sky-700 dark:border-sky-700 dark:text-sky-300'
                          : 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300'
                      )}
                    >
                      {isUser ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                      {isUser ? 'Per machine' : 'Commit to repo'}
                    </Badge>
                  </div>

                  <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/50 px-3 py-2.5 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold font-mono text-gray-700 dark:text-gray-200 truncate">
                        {file.filename}
                      </p>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground tabular-nums">
                        {formatExportFileSize(content)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed break-words">
                      {isUser ? 'Merge into: ' : 'Save to: '}
                      <code className="text-[11px] font-mono text-foreground/80">{file.targetPath}</code>
                    </p>
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="col-span-6 h-10 rounded-xl font-semibold text-xs sm:text-sm"
                      disabled={busy}
                      onClick={() => void runCopy(file)}
                    >
                      {copiedId === file.id ? (
                        <Check className="h-4 w-4 mr-2 text-emerald-600" />
                      ) : (
                        <ClipboardCopy className="h-4 w-4 mr-2" />
                      )}
                      {copiedId === file.id ? 'Copied' : copying ? 'Copying…' : 'Copy'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="col-span-6 h-10 rounded-xl font-semibold text-xs sm:text-sm"
                      disabled={busy}
                      onClick={() => runDownload(file)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloading ? 'Saving…' : 'Download'}
                    </Button>
                  </div>

                  <Collapsible
                    open={previewOpen}
                    onOpenChange={(open) => setPreviewId(open ? file.id : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-white/50 dark:bg-gray-900/40 px-3 py-2 text-left text-xs font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors"
                      >
                        <span>Preview file</span>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                            previewOpen && 'rotate-180'
                          )}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-none">
                      <pre className="mt-2 max-h-72 overflow-auto rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-gray-950 p-3 text-[11px] leading-relaxed text-gray-100 font-mono whitespace-pre">
                        {content}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>
        </div>

        {/* Troubleshooting */}
        <Collapsible open={troubleOpen} onOpenChange={setTroubleOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/30 px-3.5 py-2.5 text-left text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors"
            >
              <span className="flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-muted-foreground" />
                Troubleshooting — symptom, cause, fix
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                  troubleOpen && 'rotate-180'
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-none">
            <ul className="mt-3 grid grid-cols-12 gap-3">
              {CODO_IDE_TROUBLESHOOTING.map((item) => (
                <li
                  key={item.symptom}
                  className="col-span-12 md:col-span-6 rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/60 dark:bg-gray-900/40 p-3.5 flex flex-col gap-1.5"
                >
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {renderInline(item.symptom)}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground/80">Cause: </span>
                    {renderInline(item.cause)}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">Fix: </span>
                    {renderInline(item.fix)}
                  </p>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </section>
  );
}
