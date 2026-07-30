import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import type { CodoCommonRule, CodoRulePhase } from '@/services/codoRulesService';
import { projectService, type Project } from '@/services/projectService';
import { ExternalLink, FolderKanban, Loader2, Pencil, Plus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

/** Turn a domain or URL into an absolute http(s) href, or null if not navigable. */
function toNavigationHref(raw?: string | null): string | null {
  const value = (raw || '').trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  // Bare domain / path host (e.g. app.example.com or example.com/path)
  if (/^(?:www\.)?[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?:[/:?#].*)?$/i.test(value)) {
    return `https://${value}`;
  }
  return null;
}

function projectNavigationUrl(project: Project): string | null {
  return (
    toNavigationHref(project.vercel_domain) ||
    toNavigationHref(project.frontend_domain) ||
    toNavigationHref(project.backend_domain) ||
    toNavigationHref(project.description)
  );
}

function displayNavLabel(href: string): string {
  try {
    const u = new URL(href);
    return `${u.host}${u.pathname === '/' ? '' : u.pathname}`;
  } catch {
    return href.replace(/^https?:\/\//i, '');
  }
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initial?: CodoCommonRule | null;
  defaultPhase?: CodoRulePhase;
  onSubmit: (payload: {
    phase: CodoRulePhase;
    title: string;
    subtitle?: string;
    description: string;
    project_ids?: string[];
  }) => Promise<void>;
};

export function CodoRuleDialog({
  open,
  onOpenChange,
  mode,
  initial,
  defaultPhase = 'developer',
  onSubmit,
}: Props) {
  const [phase, setPhase] = useState<CodoRulePhase>(defaultPhase);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setPhase(initial.phase);
      setTitle(initial.title || '');
      setSubtitle(initial.subtitle || '');
      setDescription(initial.description || '');
      setProjectIds(initial.project_ids || initial.projects?.map((p) => p.id) || []);
    } else {
      setPhase(defaultPhase);
      setTitle('');
      setSubtitle('');
      setDescription('');
      setProjectIds([]);
    }
    setProjectSearch('');
  }, [open, mode, initial, defaultPhase]);

  useEffect(() => {
    if (!open || phase !== 'project') return;
    let cancelled = false;
    (async () => {
      setLoadingProjects(true);
      try {
        const list = await projectService.getProjects();
        if (!cancelled) {
          setProjects(
            [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
          );
        }
      } catch {
        if (!cancelled) {
          setProjects([]);
          toast({
            title: 'Failed to load projects',
            description: 'Could not load the project list. Please try again.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, phase]);

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => {
      const haystack = [
        p.name,
        p.description,
        p.vercel_domain,
        p.frontend_domain,
        p.backend_domain,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [projects, projectSearch]);

  const selectedProjects = useMemo(
    () => projects.filter((p) => projectIds.includes(p.id)),
    [projects, projectIds]
  );

  const toggleProject = (id: string) => {
    setProjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const canSubmit =
    title.trim().length >= 3 &&
    description.trim().length >= 10 &&
    (phase !== 'project' || projectIds.length > 0) &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        phase,
        title: title.trim(),
        description: description.trim(),
        subtitle: subtitle.trim() || undefined,
        project_ids: phase === 'project' ? projectIds : [],
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,840px)] max-w-none rounded-2xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
              {mode === 'edit' ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-left text-lg">
                {mode === 'edit' ? 'Edit CODO rule' : 'Add CODO rule'}
              </DialogTitle>
              <DialogDescription className="text-left text-sm">
                Shared catalog rule visible to the whole team
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-2">
            <Label>Phase</Label>
            <Select
              value={phase}
              onValueChange={(v) => {
                const next = v as CodoRulePhase;
                setPhase(next);
                if (next !== 'project') setProjectIds([]);
              }}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Select phase" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                <SelectItem value="developer">Developer</SelectItem>
                <SelectItem value="tester">Tester / QA</SelectItem>
                <SelectItem value="project">Project</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {phase === 'project' ? (
            <div className="space-y-2">
              <Label className="flex items-center justify-between gap-2">
                <span>Projects</span>
                <span className="text-xs font-normal text-muted-foreground tabular-nums">
                  {projectIds.length} selected
                </span>
              </Label>

              {selectedProjects.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedProjects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProject(p.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 px-2.5 py-1 text-xs font-medium text-violet-800 dark:text-violet-200"
                    >
                      {p.name}
                      <X className="h-3 w-3 opacity-70" />
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Search projects…"
                  className="h-10 rounded-xl pl-9"
                />
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-muted/20 max-h-56 overflow-y-auto">
                {loadingProjects ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading projects…
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-muted-foreground px-4 text-center">
                    <FolderKanban className="h-5 w-5 opacity-60" />
                    {projectSearch
                      ? 'No projects match your search'
                      : 'No projects available'}
                  </div>
                ) : (
                  <ul className="divide-y divide-border/50 p-1">
                    {filteredProjects.map((p) => {
                      const checked = projectIds.includes(p.id);
                      const navHref = projectNavigationUrl(p);
                      const descIsNav =
                        !!navHref &&
                        toNavigationHref(p.description) === navHref;
                      return (
                        <li key={p.id}>
                          <div className="flex items-start gap-3 rounded-lg px-2.5 py-2.5 hover:bg-background/70 transition-colors">
                            <label className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleProject(p.id)}
                                className="mt-0.5"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-foreground truncate">
                                  {p.name}
                                </span>
                                {navHref ? (
                                  <a
                                    href={navHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-0.5 inline-flex max-w-full items-center gap-1 text-xs text-cyan-700 dark:text-cyan-300 hover:underline break-all"
                                    title={`Open ${navHref}`}
                                  >
                                    <span className="truncate">{displayNavLabel(navHref)}</span>
                                    <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                                  </a>
                                ) : null}
                                {p.description && !descIsNav ? (
                                  <span className="block text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                    {p.description}
                                  </span>
                                ) : null}
                              </span>
                            </label>
                            <Link
                              to={`/projects/${p.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-0.5 shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Open project in BugRicer"
                            >
                              Open
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {projectIds.length === 0 ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Select at least one project for this rule.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="codo-rule-title">Title</Label>
            <Input
              id="codo-rule-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hard State Reset"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="codo-rule-subtitle">Subtitle (optional)</Label>
            <Input
              id="codo-rule-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. Rule 1"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="codo-rule-desc">Description</Label>
            <Textarea
              id="codo-rule-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what must be verified…"
              className="min-h-[110px] rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-gray-200/50 dark:border-gray-700/50 px-6 py-4 gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : mode === 'edit' ? (
              'Save changes'
            ) : (
              'Create rule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
