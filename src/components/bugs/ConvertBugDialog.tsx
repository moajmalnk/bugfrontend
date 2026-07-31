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
import { bugService } from "@/services/bugService";
import { projectService } from "@/services/projectService";
import { Bug } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, FolderInput, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ConvertBugDialogProps = {
  bug: Pick<Bug, "id" | "title" | "project_id" | "project_name">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted?: (updated: Bug) => void;
};

export function ConvertBugDialog({
  bug,
  open,
  onOpenChange,
  onConverted,
}: ConvertBugDialogProps) {
  const queryClient = useQueryClient();
  const [targetProjectId, setTargetProjectId] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const sortedProjects = useMemo(
    () =>
      sortProjectsForPicker(
        (projects as Project[]).filter(
          (p) => String(p.id) !== String(bug.project_id)
        )
      ),
    [projects, bug.project_id]
  );

  const selected = useMemo(
    () => sortedProjects.find((p) => String(p.id) === String(targetProjectId)),
    [sortedProjects, targetProjectId]
  );

  useEffect(() => {
    if (!open) {
      setTargetProjectId("");
      setSubmitting(false);
    }
  }, [open]);

  const handleConvert = async () => {
    if (!targetProjectId) {
      toast({
        title: "Select a project",
        description: "Choose the destination project for this bug.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const updated = await bugService.convertBug(bug.id, targetProjectId);
      toast({
        title: "Bug converted",
        description: `Moved to “${updated.project_name || selected?.name || "selected project"}”.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bugs"] }),
        queryClient.invalidateQueries({ queryKey: ["bug", bug.id] }),
        queryClient.invalidateQueries({ queryKey: ["bugLifecycle", bug.id] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
      ]);
      onConverted?.(updated);
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : err instanceof Error
            ? err.message
            : "Failed to convert bug";
      toast({
        title: "Convert failed",
        description: message || "Could not move this bug. Try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[min(92vh,720px)] flex flex-col gap-4 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm">
              <ArrowRightLeft className="h-4 w-4" />
            </span>
            Convert bug
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed pt-1">
            Move this bug to another project you can access. History and
            attachments stay with the bug.
          </DialogDescription>
        </DialogHeader>

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
            </p>
          </div>

          <div className="min-h-0 flex-1 flex flex-col space-y-2 overflow-hidden">
            <label className="shrink-0 text-sm font-semibold text-foreground flex items-center gap-2">
              <FolderInput className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              Destination project
            </label>

            <div className="min-h-0 flex-1 rounded-xl border border-border/70 bg-background overflow-hidden">
              <Command
                className="h-full max-h-[min(42vh,360px)] rounded-xl"
                shouldFilter
              >
                <CommandInput
                  placeholder="Search project…"
                  disabled={projectsLoading || submitting}
                />
                <CommandList
                  className="max-h-[min(34vh,300px)] overflow-y-auto overscroll-contain"
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
                  ) : sortedProjects.length === 0 ? (
                    <CommandGroup>
                      <CommandItem disabled>
                        No other projects available
                      </CommandItem>
                    </CommandGroup>
                  ) : (
                    <CommandGroup>
                      {sortedProjects.map((project) => {
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
                : "Scroll or search to pick a destination. Only projects you can access are listed."}
            </p>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConvert}
            disabled={!targetProjectId || submitting || projectsLoading}
            className="bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting…
              </>
            ) : (
              <>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Convert
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
