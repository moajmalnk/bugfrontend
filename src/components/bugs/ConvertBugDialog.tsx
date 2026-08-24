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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  BellRing,
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

function isProjectAssigned(project: Project, userId: string): boolean {
  const members = Array.isArray(project.members) ? project.members : [];
  return members.some((memberId) => String(memberId) === userId);
}

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
  const [requestNote, setRequestNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [accessConfirmOpen, setAccessConfirmOpen] = useState(false);

  const userId = String(currentUser?.id || "");
  const isAdmin = currentUser?.role === "admin";

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

  const allProjects = useMemo(() => sortProjectsForPicker(projects as Project[]), [projects]);

  const assignedProjects = useMemo(() => {
    if (isAdmin) return allProjects;
    if (!userId) return allProjects;
    return allProjects.filter((project) => isProjectAssigned(project, userId));
  }, [allProjects, isAdmin, userId]);

  const unassignedProjects = useMemo(() => {
    if (isAdmin || !userId) return [];
    return allProjects.filter((project) => !isProjectAssigned(project, userId));
  }, [allProjects, isAdmin, userId]);

  const moveAssignedProjects = useMemo(
    () =>
      assignedProjects.filter((p) => String(p.id) !== String(bug.project_id)),
    [assignedProjects, bug.project_id]
  );

  const moveUnassignedProjects = useMemo(
    () =>
      unassignedProjects.filter((p) => String(p.id) !== String(bug.project_id)),
    [unassignedProjects, bug.project_id]
  );

  const typeAssignedProjects = assignedProjects;
  const typeUnassignedProjects = unassignedProjects;

  const selected = useMemo(
    () => allProjects.find((p) => String(p.id) === String(targetProjectId)),
    [allProjects, targetProjectId]
  );

  const selectedNeedsAccessRequest = useMemo(() => {
    if (!selected || isAdmin || !userId) return false;
    return !isProjectAssigned(selected, userId);
  }, [selected, isAdmin, userId]);

  useEffect(() => {
    if (!open) {
      setMode("move");
      setTargetProjectId("");
      setUpdateType(SELECT_UNSET);
      setRequestNote("");
      setSubmitting(false);
      setConfirmOpen(false);
      setAccessConfirmOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (mode === "move") {
      setTargetProjectId("");
    } else {
      setTargetProjectId(String(bug.project_id || ""));
    }
    setRequestNote("");
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

  const runAccessRequest = async () => {
    setSubmitting(true);
    try {
      const result = await bugService.requestProjectAccess(bug.id, {
        project_id: targetProjectId,
        intent: mode === "to_update" ? "to_update" : "move",
        update_type:
          mode === "to_update" && updateType !== SELECT_UNSET
            ? (updateType as UpdateType)
            : undefined,
        note: requestNote.trim() || undefined,
      });
      toast({
        title: "Access request sent",
        description: `Admins and members of “${result.project_name || selected?.name || "the project"}” were notified by email and WhatsApp.`,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      toast({
        title: "Request failed",
        description: extractError(err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setAccessConfirmOpen(false);
    }
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
    if (selectedNeedsAccessRequest) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      requestAnimationFrame(() => setAccessConfirmOpen(true));
      return;
    }
    if (mode === "to_update") {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      requestAnimationFrame(() => setConfirmOpen(true));
      return;
    }
    void runConvert();
  };

  const renderProjectItems = (list: Project[], showRequestBadge: boolean) =>
    list.map((project) => {
      const stats = {
        status: project.status,
        bug_stats: project.bug_stats,
        update_stats: project.update_stats,
      };
      const isSelected = String(targetProjectId) === String(project.id);
      return (
        <CommandItem
          key={project.id}
          value={projectPickerSearchValue(project.name, project.id, stats)}
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
          {showRequestBadge ? (
            <Badge
              variant="outline"
              className="shrink-0 rounded-full border-amber-300/80 bg-amber-50 text-[10px] font-semibold text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200"
            >
              Request access
            </Badge>
          ) : null}
        </CommandItem>
      );
    });

  const assignedList = mode === "move" ? moveAssignedProjects : typeAssignedProjects;
  const unassignedList =
    mode === "move" ? moveUnassignedProjects : typeUnassignedProjects;
  const hasAnyProjects = assignedList.length > 0 || unassignedList.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "flex flex-col gap-2 sm:gap-3 overflow-hidden rounded-2xl p-3 sm:p-6 min-h-0",
            "w-[calc(100%-1rem)] max-w-xl",
            // Why: Bound height so header/mode/footer stay visible; body is the only scroll surface.
            "h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)]",
            "sm:h-auto sm:max-h-[min(92dvh,760px)]",
            "top-[max(0.5rem,env(safe-area-inset-top))] translate-y-0",
            "sm:top-[50%] sm:translate-y-[-50%]",
            "data-[state=open]:slide-in-from-top-2 sm:data-[state=open]:slide-in-from-top-[48%]",
            "data-[state=closed]:slide-out-to-top-2 sm:data-[state=closed]:slide-out-to-top-[48%]"
          )}
        >
          <DialogHeader className="shrink-0 space-y-1 pr-8 text-left">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <span className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm">
                <ArrowRightLeft className="h-4 w-4" />
              </span>
              Convert bug
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-none">
              Choose whether to move this bug between projects, or turn it into
              a project Update (with attachment copy and audit trail).
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
                Keep the same bug record. Change project only. History stays.
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
                Create a new update, copy attachments, archive this bug.
              </p>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y space-y-2.5 sm:space-y-3 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
            <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 sm:px-4 sm:py-3">
              <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Bug
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground line-clamp-2">
                {bug.title || "Untitled Bug"}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground break-words">
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
                <div className="rounded-xl border border-amber-200/70 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 px-2.5 py-2 sm:px-3 sm:py-2.5 flex gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] sm:text-xs text-amber-900 dark:text-amber-100/90 leading-relaxed">
                    Creates a <strong>pending</strong> update. Title, description
                    (plus expected/actual), and priority map across. Source bug
                    becomes <strong>declined</strong> with a conversion note.
                    You will open the new update after success.
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
            )}

            <div className="flex flex-col gap-1.5 sm:gap-2 pb-1">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2 min-w-0">
                <FolderInput className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                <span className="truncate">
                  {mode === "move" ? "Destination project" : "Project for new update"}
                </span>
              </label>

              <div className="rounded-xl border border-border/70 bg-background overflow-hidden">
                <Command className="rounded-xl" shouldFilter>
                  <CommandInput
                    placeholder="Search project…"
                    disabled={projectsLoading || submitting}
                  />
                  <CommandList
                    className="max-h-[min(28vh,200px)] sm:max-h-[min(32vh,240px)] overflow-y-auto overscroll-contain touch-pan-y [scrollbar-width:thin]"
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
                    ) : !hasAnyProjects ? (
                      <CommandGroup>
                        <CommandItem disabled>
                          No projects available
                        </CommandItem>
                      </CommandGroup>
                    ) : (
                      <>
                        {assignedList.length > 0 ? (
                          <CommandGroup heading="Your projects">
                            {renderProjectItems(assignedList, false)}
                          </CommandGroup>
                        ) : null}
                        {unassignedList.length > 0 ? (
                          <CommandGroup heading="Other projects — request access">
                            {renderProjectItems(unassignedList, true)}
                          </CommandGroup>
                        ) : null}
                      </>
                    )}
                  </CommandList>
                </Command>
              </div>

              <p className="text-[11px] sm:text-xs text-muted-foreground break-words">
                {selected
                  ? selectedNeedsAccessRequest
                    ? `Selected: ${selected.name} — you’ll request access from admins and project members.`
                    : `Selected: ${selected.name}`
                  : mode === "move"
                    ? isAdmin
                      ? "Pick a different project."
                      : "Pick your project to move instantly, or request access to another."
                    : isAdmin
                      ? "Defaults to the current project; pick another if needed."
                      : "Pick your project to convert instantly, or request access to another."}
              </p>

              {selectedNeedsAccessRequest ? (
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="access-request-note" className="text-sm font-semibold">
                    Message for admins (optional)
                  </Label>
                  <Textarea
                    id="access-request-note"
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value.slice(0, 500))}
                    maxLength={500}
                    placeholder="Why do you need access to this project?"
                    disabled={submitting}
                    className="min-h-[72px] rounded-xl resize-none"
                  />
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-row items-center justify-stretch sm:justify-end gap-2 border-t border-border/40 pt-2.5 sm:pt-3 pb-[max(0px,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="rounded-xl flex-1 sm:flex-none h-10"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handlePrimaryClick}
              disabled={!canSubmit}
              className={cn(
                "rounded-xl flex-1 sm:flex-none h-10 text-white min-w-0",
                selectedNeedsAccessRequest
                  ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                  : mode === "to_update"
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
                    : "bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
                  <span className="truncate">
                    {selectedNeedsAccessRequest ? "Sending…" : "Converting…"}
                  </span>
                </>
              ) : selectedNeedsAccessRequest ? (
                <>
                  <BellRing className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">Request access</span>
                </>
              ) : mode === "to_update" ? (
                <>
                  <Megaphone className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">Convert to Update</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">Move bug</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={accessConfirmOpen} onOpenChange={setAccessConfirmOpen}>
        <AlertDialogContent className="w-[calc(100%-1.5rem)] max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Request project access?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                We’ll notify admins and members of{" "}
                <strong>{selected?.name || "the selected project"}</strong> by
                email and WhatsApp.
              </span>
              <span className="block">
                After they add you to the project, you can{" "}
                {mode === "to_update" ? "convert this bug to an update" : "move this bug"}.
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
                void runAccessRequest();
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send request"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="w-[calc(100%-1.5rem)] max-w-[400px] rounded-2xl">
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
