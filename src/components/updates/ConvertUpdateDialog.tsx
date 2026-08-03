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
import { updateService, type Update } from "@/services/updateService";
import { projectService } from "@/services/projectService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  Bug,
  FolderInput,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type ConvertMode = "move" | "to_bug";

type ConvertUpdateDialogProps = {
  update: Pick<
    Update,
    "id" | "title" | "project_id" | "project_name" | "status" | "type" | "update_priority"
  >;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted?: (updated: Update) => void;
  onConvertedToBug?: (bugId: string, projectId: string) => void;
};

export function ConvertUpdateDialog({
  update,
  open,
  onOpenChange,
  onConverted,
  onConvertedToBug,
}: ConvertUpdateDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [mode, setMode] = useState<ConvertMode>("move");
  const [targetProjectId, setTargetProjectId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    data: projects = [],
    isLoading: projectsLoading,
    isError: projectsError,
  } = useQuery({
    queryKey: ["projects", "convert-update"],
    queryFn: () => projectService.getProjects(),
    enabled: open,
    staleTime: 60_000,
  });

  const moveProjects = useMemo(
    () =>
      sortProjectsForPicker(
        (projects as Project[]).filter(
          (p) => String(p.id) !== String(update.project_id)
        )
      ),
    [projects, update.project_id]
  );

  const typeProjects = useMemo(
    () => sortProjectsForPicker(projects as Project[]),
    [projects]
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
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (mode === "move") {
      setTargetProjectId("");
    } else {
      setTargetProjectId(String(update.project_id || ""));
    }
  }, [mode, open, update.project_id]);

  const canSubmit = !!targetProjectId && !submitting && !projectsLoading;

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
        const updated = await updateService.convertProject(
          update.id,
          targetProjectId
        );
        toast({
          title: "Update moved",
          description: `Moved to “${updated.project_name || selected?.name || "selected project"}”. Attachments stayed with the update.`,
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["updates"] }),
          queryClient.invalidateQueries({ queryKey: ["update", update.id] }),
          queryClient.invalidateQueries({ queryKey: ["projects"] }),
        ]);
        onConverted?.(updated);
        onOpenChange(false);
      } else {
        const result = await updateService.convertToBug(update.id, {
          project_id: targetProjectId,
        });
        toast({
          title: "Converted to bug",
          description: `New bug created in “${result.bug?.project_name || selected?.name || "project"}”. Original update archived as declined.`,
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["updates"] }),
          queryClient.invalidateQueries({ queryKey: ["update", update.id] }),
          queryClient.invalidateQueries({ queryKey: ["bugs"] }),
          queryClient.invalidateQueries({ queryKey: ["projects"] }),
        ]);
        const bugId = result.bug_id || result.bug?.id;
        const projectId = result.bug?.project_id || targetProjectId;
        onOpenChange(false);
        if (onConvertedToBug) {
          onConvertedToBug(bugId, projectId);
        } else {
          const role = currentUser?.role || "admin";
          navigate(`/${role}/bugs/${bugId}`);
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
    if (mode === "to_bug") {
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
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm">
                <ArrowRightLeft className="h-4 w-4" />
              </span>
              Convert update
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed pt-1">
              Choose whether to move this update between projects, or turn it
              into a Bug (with attachment copy and audit trail).
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
                  ? "border-violet-500/60 bg-violet-50/80 dark:bg-violet-950/40 shadow-sm"
                  : "border-border/60 bg-muted/20 hover:bg-muted/40"
              )}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                <FolderInput className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                Move to project
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Keep the same update record. Change project only. History stays.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("to_bug")}
              disabled={submitting}
              className={cn(
                "rounded-2xl border px-3 py-3 text-left transition-all",
                mode === "to_bug"
                  ? "border-orange-500/60 bg-orange-50/80 dark:bg-orange-950/40 shadow-sm"
                  : "border-border/60 bg-muted/20 hover:bg-muted/40"
              )}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Bug className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                Convert to Bug
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Create a new bug, copy attachments, archive this update.
              </p>
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-hidden flex flex-col">
            <div className="shrink-0 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Update
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground line-clamp-2">
                {update.title || "Untitled Update"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Current project:{" "}
                <span className="font-medium text-foreground">
                  {update.project_name || "Unknown"}
                </span>
                {update.type ? (
                  <>
                    {" · "}
                    Type:{" "}
                    <span className="font-medium text-foreground capitalize">
                      {update.type}
                    </span>
                  </>
                ) : null}
              </p>
            </div>

            {mode === "to_bug" && (
              <div className="shrink-0 rounded-xl border border-amber-200/70 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2.5 flex gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 dark:text-amber-100/90 leading-relaxed">
                  Creates a <strong>pending</strong> bug. Description is prefixed
                  with conversion context. Priority maps from update priority
                  (or medium). Source update becomes <strong>declined</strong>.
                  You will open the new bug after success.
                </p>
              </div>
            )}

            <div className="min-h-0 flex-1 flex flex-col space-y-2 overflow-hidden">
              <label className="shrink-0 text-sm font-semibold text-foreground flex items-center gap-2">
                <FolderInput className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                {mode === "move" ? "Destination project" : "Project for new bug"}
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
                                isSelected && "bg-violet-50 dark:bg-violet-950/40"
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
                mode === "to_bug"
                  ? "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                  : "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Converting…
                </>
              ) : mode === "to_bug" ? (
                <>
                  <Bug className="mr-2 h-4 w-4" />
                  Convert to Bug
                </>
              ) : (
                <>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Move update
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Convert update to bug?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                A new pending bug will be created in{" "}
                <strong>{selected?.name || "the selected project"}</strong>.
              </span>
              <span className="block">
                Attachments are copied. This update will be marked{" "}
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
