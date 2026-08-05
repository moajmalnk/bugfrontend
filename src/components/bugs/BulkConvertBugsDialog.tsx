import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import {
  ProjectPickerListItemContent,
  projectPickerSearchValue,
} from "@/components/bugs/ProjectPickerMeta";
import { cn } from "@/lib/utils";
import {
  sortProjectsForPicker,
  type Project,
} from "@/lib/utils/projectUtils";
import { bugService } from "@/services/bugService";
import { projectService } from "@/services/projectService";
import { Bug } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  FolderInput,
  Loader2,
  Megaphone,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type BulkBug = Pick<Bug, "id" | "title" | "project_id" | "project_name" | "status">;

type ConvertMode = "move" | "to_update";
type UpdateType = "feature" | "updation" | "maintenance";

/** Sentinel so Radix Select stays controlled (never switches from undefined → string). */
const SELECT_UNSET = "__unset__";

type BulkConvertBugsDialogProps = {
  bugs: BulkBug[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted?: () => void;
};

/**
 * Why: Bulk mirror of ConvertBugDialog — move many bugs to one project, or
 * convert them all to Updates (shared type + destination) with sequential API calls.
 */
export function BulkConvertBugsDialog({
  bugs,
  open,
  onOpenChange,
  onConverted,
}: BulkConvertBugsDialogProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<ConvertMode>("move");
  const [targetProjectId, setTargetProjectId] = useState("");
  const [updateType, setUpdateType] = useState<UpdateType | typeof SELECT_UNSET>(
    SELECT_UNSET
  );
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const eligible = useMemo(
    () => bugs.filter((b) => b.status !== "declined"),
    [bugs]
  );

  const {
    data: projects = [],
    isLoading: projectsLoading,
    isError: projectsError,
  } = useQuery({
    queryKey: ["projects", "convert-bug"],
    queryFn: () => projectService.getProjects(),
    enabled: open,
    staleTime: 60_000,
  });

  const sourceProjectIds = useMemo(
    () => new Set(eligible.map((b) => String(b.project_id))),
    [eligible]
  );

  const defaultUpdateProjectId = useMemo(() => {
    if (sourceProjectIds.size === 1) return [...sourceProjectIds][0];
    const counts = new Map<string, number>();
    for (const b of eligible) {
      const id = String(b.project_id || "");
      if (!id) continue;
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    let best = "";
    let bestCount = 0;
    for (const [id, count] of counts) {
      if (count > bestCount) {
        best = id;
        bestCount = count;
      }
    }
    return best;
  }, [eligible, sourceProjectIds]);

  const moveProjects = useMemo(() => {
    const list = sortProjectsForPicker(projects as Project[]);
    if (sourceProjectIds.size === 1) {
      const only = [...sourceProjectIds][0];
      return list.filter((p) => String(p.id) !== only);
    }
    return list;
  }, [projects, sourceProjectIds]);

  const typeProjects = useMemo(
    () => sortProjectsForPicker(projects as Project[]),
    [projects]
  );

  const projectList = mode === "move" ? moveProjects : typeProjects;

  const selected = useMemo(
    () => projectList.find((p) => String(p.id) === String(targetProjectId)),
    [projectList, targetProjectId]
  );

  const resetForm = () => {
    setMode("move");
    setTargetProjectId("");
    setUpdateType(SELECT_UNSET);
    setSubmitting(false);
    setConfirmOpen(false);
    setProgress({ done: 0, total: 0 });
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (mode === "move") {
      setTargetProjectId("");
    } else {
      setTargetProjectId(defaultUpdateProjectId);
    }
  }, [mode, open, defaultUpdateProjectId]);

  const canSubmit =
    eligible.length > 0 &&
    !submitting &&
    !projectsLoading &&
    (mode === "move"
      ? !!targetProjectId
      : updateType !== SELECT_UNSET && !!targetProjectId);

  const extractError = (err: unknown) => {
    if (err && typeof err === "object" && "response" in err) {
      return (
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Request failed"
      );
    }
    return err instanceof Error ? err.message : "Request failed";
  };

  const runBulkConvert = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setProgress({ done: 0, total: eligible.length });

    let ok = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < eligible.length; i++) {
      const bug = eligible[i];
      try {
        if (mode === "move") {
          if (String(bug.project_id) === String(targetProjectId)) {
            failed += 1;
            errors.push(`${bug.title || bug.id}: already in target project`);
          } else {
            await bugService.convertBug(bug.id, targetProjectId);
            ok += 1;
          }
        } else {
          await bugService.convertToUpdate(bug.id, {
            type: updateType as UpdateType,
            project_id: targetProjectId,
          });
          ok += 1;
        }
      } catch (err: unknown) {
        failed += 1;
        errors.push(`${bug.title || bug.id}: ${extractError(err)}`);
      }
      setProgress({ done: i + 1, total: eligible.length });
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["bugs"] }),
      queryClient.invalidateQueries({ queryKey: ["updates"] }),
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
    ]);

    const noun = mode === "move" ? "moved" : "converted";
    const projectLabel = selected?.name || "selected project";

    if (ok > 0 && failed === 0) {
      toast({
        title: mode === "move" ? "Bugs moved" : "Converted to updates",
        description:
          mode === "move"
            ? `${ok} bug${ok === 1 ? "" : "s"} moved to “${projectLabel}”.`
            : `${ok} bug${ok === 1 ? "" : "s"} converted to updates in “${projectLabel}”.`,
      });
      onConverted?.();
      onOpenChange(false);
    } else if (ok > 0) {
      toast({
        title: "Bulk convert finished with errors",
        description: `${ok} ${noun}, ${failed} failed. ${errors.slice(0, 2).join(" · ")}`,
        variant: "destructive",
      });
      onConverted?.();
      onOpenChange(false);
    } else {
      toast({
        title: "Bulk convert failed",
        description:
          errors.slice(0, 3).join(" · ") ||
          (mode === "move" ? "No bugs were moved." : "No bugs were converted."),
        variant: "destructive",
      });
    }

    setSubmitting(false);
    setConfirmOpen(false);
  };

  const handlePrimaryClick = () => {
    if (mode === "to_update") {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      requestAnimationFrame(() => setConfirmOpen(true));
      return;
    }
    void runBulkConvert();
  };

  const handleClose = () => {
    if (submitting) return;
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
        <DialogContent
          className={cn(
            "flex flex-col gap-2 sm:gap-3 overflow-hidden rounded-2xl p-3 sm:p-6 min-h-0",
            "w-[calc(100%-1rem)] sm:max-w-xl",
            // Why: Fixed mobile height so flex-1 body scrolls; desktop keeps auto height + max-h.
            "h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)]",
            "sm:h-auto sm:max-h-[min(92dvh,760px)]",
            "top-[max(0.5rem,env(safe-area-inset-top))] translate-y-0",
            "sm:top-[50%] sm:translate-y-[-50%]",
            "data-[state=open]:slide-in-from-top-2 sm:data-[state=open]:slide-in-from-top-[48%]",
            "data-[state=closed]:slide-out-to-top-2 sm:data-[state=closed]:slide-out-to-top-[48%]"
          )}
        >
          <DialogHeader className="shrink-0 space-y-1 pr-6 text-left">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <span className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm">
                <ArrowRightLeft className="h-4 w-4" />
              </span>
              Bulk convert
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-none">
              Move {eligible.length} selected bug
              {eligible.length === 1 ? "" : "s"} to another project, or convert
              them into Updates.
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0 grid grid-cols-12 gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setMode("move")}
              disabled={submitting}
              className={cn(
                "col-span-6 rounded-xl sm:rounded-2xl border px-2.5 py-2 sm:px-3 sm:py-2.5 text-left transition-all min-w-0",
                mode === "move"
                  ? "border-sky-500/60 bg-sky-50/80 dark:bg-sky-950/40 shadow-sm"
                  : "border-border/60 bg-muted/20 hover:bg-muted/40"
              )}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 font-semibold text-xs sm:text-sm">
                <FolderInput className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                <span className="truncate">Move to project</span>
              </div>
              <p className="mt-1 hidden sm:block text-xs text-muted-foreground leading-relaxed">
                Keep the same bug records. Change project only. History stays.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("to_update")}
              disabled={submitting}
              className={cn(
                "col-span-6 rounded-xl sm:rounded-2xl border px-2.5 py-2 sm:px-3 sm:py-2.5 text-left transition-all min-w-0",
                mode === "to_update"
                  ? "border-violet-500/60 bg-violet-50/80 dark:bg-violet-950/40 shadow-sm"
                  : "border-border/60 bg-muted/20 hover:bg-muted/40"
              )}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 font-semibold text-xs sm:text-sm">
                <Megaphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-violet-600 dark:text-violet-400" />
                <span className="truncate">Convert to Update</span>
              </div>
              <p className="mt-1 hidden sm:block text-xs text-muted-foreground leading-relaxed">
                Create new updates, copy attachments, archive these bugs.
              </p>
            </button>
          </div>

          {/* Why: Header/mode/footer pinned; body is the only scroll surface (critical on short mobile viewports). */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y space-y-2.5 sm:space-y-3 -mx-0.5 px-0.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
            <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 sm:px-4 sm:py-3 space-y-1.5">
              <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Selected ({eligible.length})
              </p>
              <ul className="max-h-16 sm:max-h-20 overflow-y-auto space-y-1 text-xs sm:text-sm [scrollbar-width:thin]">
                {eligible.slice(0, 12).map((b) => (
                  <li key={b.id} className="truncate text-foreground">
                    {b.title || "Untitled Bug"}
                  </li>
                ))}
                {eligible.length > 12 ? (
                  <li className="text-xs text-muted-foreground">
                    +{eligible.length - 12} more
                  </li>
                ) : null}
              </ul>
            </div>

            {mode === "to_update" ? (
              <>
                <div className="rounded-xl border border-amber-200/70 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 px-2.5 py-2 sm:px-3 sm:py-2.5 flex gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] sm:text-xs text-amber-900 dark:text-amber-100/90 leading-relaxed">
                    Creates a <strong>pending</strong> update per bug. Source
                    bugs become <strong>declined</strong> with a conversion note.
                  </p>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-sm font-semibold">Update type</Label>
                  <Select
                    value={updateType}
                    onValueChange={(v) => setUpdateType(v as UpdateType)}
                    disabled={submitting}
                  >
                    <SelectTrigger className="rounded-xl h-10">
                      <SelectValue placeholder="Select type…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="updation">Updation</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}

            <div className="flex flex-col gap-1.5 sm:gap-2 pb-1">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FolderInput className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                {mode === "move"
                  ? "Target project"
                  : "Project for new updates"}
              </div>
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <Command className="rounded-xl">
                  <CommandInput
                    placeholder="Search projects…"
                    disabled={submitting || projectsLoading}
                  />
                  <CommandList
                    className="max-h-[min(28vh,200px)] sm:max-h-[min(32vh,240px)] overflow-y-auto overscroll-contain touch-pan-y [scrollbar-width:thin]"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <CommandEmpty>
                      {projectsLoading
                        ? "Loading…"
                        : projectsError
                          ? "Could not load projects."
                          : "No projects found."}
                    </CommandEmpty>
                    <CommandGroup>
                      {projectList.map((p) => {
                        const stats = {
                          status: p.status,
                          bug_stats: p.bug_stats,
                          update_stats: p.update_stats,
                        };
                        const isSelected =
                          String(p.id) === String(targetProjectId);
                        return (
                          <CommandItem
                            key={p.id}
                            value={projectPickerSearchValue(p.name, p.id, stats)}
                            disabled={submitting}
                            onSelect={() => setTargetProjectId(String(p.id))}
                            className={cn(
                              "items-start gap-2 py-2 sm:py-2.5 rounded-lg cursor-pointer",
                              isSelected && "bg-sky-50 dark:bg-sky-950/40"
                            )}
                          >
                            <ProjectPickerListItemContent
                              name={p.name}
                              selected={isSelected}
                              stats={stats}
                            />
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                {selected
                  ? mode === "move"
                    ? `Moving to ${selected.name}`
                    : `Updates will be created in ${selected.name}`
                  : mode === "move"
                    ? "Pick a different project you can access."
                    : "Defaults to the most common source project; pick another if needed."}
              </p>
              {submitting ? (
                <p className="text-xs text-muted-foreground tabular-nums">
                  Progress: {progress.done}/{progress.total}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-row items-center justify-stretch sm:justify-end gap-2 border-t border-border/40 pt-2.5 sm:pt-3 pb-[max(0px,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl flex-1 sm:flex-none h-10"
              disabled={submitting}
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={cn(
                "rounded-xl flex-1 sm:flex-none h-10 text-white",
                mode === "to_update"
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
                  : "bg-sky-600 hover:bg-sky-700"
              )}
              disabled={!canSubmit}
              onClick={handlePrimaryClick}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : mode === "to_update" ? (
                <Megaphone className="mr-2 h-4 w-4" />
              ) : (
                <ArrowRightLeft className="mr-2 h-4 w-4" />
              )}
              <span className="truncate">
                {submitting
                  ? `${mode === "move" ? "Moving" : "Converting"} ${progress.done}/${progress.total}…`
                  : mode === "to_update"
                    ? `Convert ${eligible.length}`
                    : `Move ${eligible.length}`}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Convert {eligible.length} bug{eligible.length === 1 ? "" : "s"} to
              update{eligible.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {eligible.length} new{" "}
                <strong>
                  {updateType !== SELECT_UNSET ? updateType : "update"}
                </strong>{" "}
                record{eligible.length === 1 ? "" : "s"} will be created in{" "}
                <strong>{selected?.name || "the selected project"}</strong>.
              </span>
              <span className="block">
                Attachments are copied. Selected bugs will be marked{" "}
                <strong>declined</strong> and kept for history.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting} className="rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              className="rounded-xl"
              onClick={(e) => {
                e.preventDefault();
                void runBulkConvert();
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Converting…
                </>
              ) : (
                "Confirm convert"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
