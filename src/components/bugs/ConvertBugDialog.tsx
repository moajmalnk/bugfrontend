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
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type ConvertMode = "move" | "to_update";
type UpdateType = "feature" | "updation" | "maintenance";

/** Sentinel so Radix Select stays controlled (never switches from undefined → string). */
const SELECT_UNSET = "__unset__";

type ConvertBugDialogProps = {
  bug: Pick<Bug, "id" | "title" | "project_id" | "project_name" | "status" | "priority">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted?: (updated: Bug) => void;
  onConvertedToUpdate?: (updateId: string, projectId: string) => void;
};

export function ConvertBugDialog({
  bug,
  open,
  onOpenChange,
  onConverted,
  onConvertedToUpdate,
}: ConvertBugDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [mode, setMode] = useState<ConvertMode>("move");
  const [targetProjectId, setTargetProjectId] = useState("");
  const [updateType, setUpdateType] = useState<UpdateType | typeof SELECT_UNSET>(
    SELECT_UNSET
  );
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  const accessibleProjects = useMemo(() => {
    const all = projects as Project[];
    if (currentUser?.role === "admin") {
      return all;
    }
    const userId = String(currentUser?.id || "");
    if (!userId) {
      return all;
    }
    return all.filter((project) => {
      const members = Array.isArray(project.members) ? project.members : [];
      return members.some((memberId) => String(memberId) === userId);
    });
  }, [projects, currentUser?.id, currentUser?.role]);

  const moveProjects = useMemo(
    () =>
      sortProjectsForPicker(
        accessibleProjects.filter(
          (p) => String(p.id) !== String(bug.project_id)
        )
      ),
    [accessibleProjects, bug.project_id]
  );

  const typeProjects = useMemo(
    () => sortProjectsForPicker(accessibleProjects),
    [accessibleProjects]
  );

  const projectList = mode === "move" ? moveProjects : typeProjects;

  const selected = useMemo(
    () => projectList.find((p) => String(p.id) === String(targetProjectId)),
    [projectList, targetProjectId]
  );

  useEffect(() => {
    if (!open) {
      setMode("move");
      setTargetProjectId("");
      setUpdateType(SELECT_UNSET);
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (mode === "move") {
      setTargetProjectId("");
    } else {
      setTargetProjectId(String(bug.project_id || ""));
    }
  }, [mode, open, bug.project_id]);

  const canSubmit =
    mode === "move"
      ? !!targetProjectId && !submitting && !projectsLoading
      : updateType !== SELECT_UNSET &&
        !!targetProjectId &&
        !submitting &&
        !projectsLoading;

  const extractError = (err: unknown) => {
    if (err && typeof err === "object" && "response" in err) {
      return (
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Request failed"
      );
    }
    return err instanceof Error ? err.message : "Request failed";
  };

  const runConvert = async () => {
    setSubmitting(true);
    try {
      if (mode === "move") {
        const updated = await bugService.convertBug(bug.id, targetProjectId);
        toast({
          title: "Bug moved",
          description: `Moved to “${updated.project_name || selected?.name || "selected project"}”. Attachments and history stayed with the bug.`,
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["bugs"] }),
          queryClient.invalidateQueries({ queryKey: ["bug", bug.id] }),
          queryClient.invalidateQueries({ queryKey: ["bugLifecycle", bug.id] }),
          queryClient.invalidateQueries({ queryKey: ["projects"] }),
        ]);
        onConverted?.(updated);
        onOpenChange(false);
      } else {
        const result = await bugService.convertToUpdate(bug.id, {
          type: updateType as UpdateType,
          project_id: targetProjectId,
        });
        toast({
          title: "Converted to update",
          description: `New update created in “${result.update?.project_name || selected?.name || "project"}”. Original bug archived as declined.`,
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["bugs"] }),
          queryClient.invalidateQueries({ queryKey: ["bug", bug.id] }),
          queryClient.invalidateQueries({ queryKey: ["updates"] }),
          queryClient.invalidateQueries({ queryKey: ["projects"] }),
        ]);
        const updateId = result.update_id || result.update?.id;
        const projectId = result.update?.project_id || targetProjectId;
        onOpenChange(false);
        if (onConvertedToUpdate) {
          onConvertedToUpdate(updateId, projectId);
        } else {
          const role = currentUser?.role || "admin";
          navigate(`/${role}/updates/${updateId}`);
        }
      }
    } catch (err: unknown) {
      toast({
        title: "Convert failed",
        description: extractError(err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  const handlePrimaryClick = () => {
    if (mode === "to_update") {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      requestAnimationFrame(() => setConfirmOpen(true));
      return;
    }
    void runConvert();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[min(92vh,760px)] flex flex-col gap-4 overflow-hidden rounded-2xl">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm">
                <ArrowRightLeft className="h-4 w-4" />
              </span>
              Convert bug
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed pt-1">
              Choose whether to move this bug between projects, or turn it into
              a project Update (with attachment copy and audit trail).
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("move")}
              disabled={submitting}
              className={cn(
                "rounded-2xl border px-3 py-3 text-left transition-all",
                mode === "move"
                  ? "border-sky-500/60 bg-sky-50/80 dark:bg-sky-950/40 shadow-sm"
                  : "border-border/60 bg-muted/20 hover:bg-muted/40"
              )}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                <FolderInput className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                Move to project
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Keep the same bug record. Change project only. History stays.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("to_update")}
              disabled={submitting}
              className={cn(
                "rounded-2xl border px-3 py-3 text-left transition-all",
                mode === "to_update"
                  ? "border-violet-500/60 bg-violet-50/80 dark:bg-violet-950/40 shadow-sm"
                  : "border-border/60 bg-muted/20 hover:bg-muted/40"
              )}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Megaphone className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                Convert to Update
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Create a new update, copy attachments, archive this bug.
              </p>
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-hidden flex flex-col">
            <div className="shrink-0 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Bug
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground line-clamp-2">
                {bug.title || "Untitled Bug"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Current project:{" "}
                <span className="font-medium text-foreground">
                  {bug.project_name || "Unknown"}
                </span>
                {bug.priority ? (
                  <>
                    {" · "}
                    Priority:{" "}
                    <span className="font-medium text-foreground capitalize">
                      {bug.priority}
                    </span>
                  </>
                ) : null}
              </p>
            </div>

            {mode === "to_update" && (
              <>
                <div className="shrink-0 rounded-xl border border-amber-200/70 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2.5 flex gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 dark:text-amber-100/90 leading-relaxed">
                    Creates a <strong>pending</strong> update. Title, description
                    (plus expected/actual), and priority map across. Source bug
                    becomes <strong>declined</strong> with a conversion note.
                    You will open the new update after success.
                  </p>
                </div>
                <div className="shrink-0 space-y-2">
                  <Label className="text-sm font-semibold">Update type</Label>
                  <Select
                    value={updateType}
                    onValueChange={(v) => setUpdateType(v as UpdateType)}
                    disabled={submitting}
                  >
                    <SelectTrigger className="rounded-xl">
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
            )}

            <div className="min-h-0 flex-1 flex flex-col space-y-2 overflow-hidden">
              <label className="shrink-0 text-sm font-semibold text-foreground flex items-center gap-2">
                <FolderInput className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                {mode === "move" ? "Destination project" : "Project for new update"}
              </label>

              <div className="min-h-0 flex-1 rounded-xl border border-border/70 bg-background overflow-hidden">
                <Command
                  className="h-full max-h-[min(38vh,320px)] rounded-xl"
                  shouldFilter
                >
                  <CommandInput
                    placeholder="Search project…"
                    disabled={projectsLoading || submitting}
                  />
                  <CommandList
                    className="max-h-[min(30vh,280px)] overflow-y-auto overscroll-contain"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <CommandEmpty>No project found.</CommandEmpty>
                    {projectsLoading ? (
                      <CommandGroup>
                        <CommandItem disabled>Loading projects…</CommandItem>
                      </CommandGroup>
                    ) : projectsError ? (
                      <CommandGroup>
                        <CommandItem disabled>
                          Could not load projects
                        </CommandItem>
                      </CommandGroup>
                    ) : projectList.length === 0 ? (
                      <CommandGroup>
                        <CommandItem disabled>
                          No projects available
                        </CommandItem>
                      </CommandGroup>
                    ) : (
                      <CommandGroup>
                        {projectList.map((project) => {
                          const stats = {
                            status: project.status,
                            bug_stats: project.bug_stats,
                            update_stats: project.update_stats,
                          };
                          const isSelected =
                            String(targetProjectId) === String(project.id);
                          return (
                            <CommandItem
                              key={project.id}
                              value={projectPickerSearchValue(
                                project.name,
                                project.id,
                                stats
                              )}
                              onSelect={() => {
                                setTargetProjectId(String(project.id));
                              }}
                              className={cn(
                                "items-start gap-2 py-2.5 cursor-pointer",
                                isSelected && "bg-sky-50 dark:bg-sky-950/40"
                              )}
                            >
                              <ProjectPickerListItemContent
                                name={project.name}
                                selected={isSelected}
                                stats={stats}
                              />
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </div>

              <p className="shrink-0 text-xs text-muted-foreground">
                {selected
                  ? `Selected: ${selected.name}`
                  : mode === "move"
                    ? "Pick a different project you can access."
                    : "Defaults to the current project; pick another if needed."}
              </p>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handlePrimaryClick}
              disabled={!canSubmit}
              className={cn(
                "rounded-xl text-white",
                mode === "to_update"
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
                  : "bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Converting…
                </>
              ) : mode === "to_update" ? (
                <>
                  <Megaphone className="mr-2 h-4 w-4" />
                  Convert to Update
                </>
              ) : (
                <>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Move bug
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Convert bug to update?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                A new <strong>{updateType !== SELECT_UNSET ? updateType : "update"}</strong>{" "}
                will be created in{" "}
                <strong>{selected?.name || "the selected project"}</strong>.
              </span>
              <span className="block">
                Attachments are copied. This bug will be marked{" "}
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
                void runConvert();
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
