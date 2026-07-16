import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn, getEffectiveRole } from "@/lib/utils";
import { getProjectStatusLabel } from "@/lib/utils/projectUtils";
import {
  projectService,
  type Project,
  type UserAssignedProject,
} from "@/services/projectService";
import type { User } from "@/types";
import {
  ExternalLink,
  FolderKanban,
  Loader2,
  Search,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

type TabMode = "assign" | "deassign";

const ASSIGN_PROJECTS_PARAM = "assignProjects";

function parseAssignProjectsParam(value: string | null): TabMode | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "assign" || normalized === "1" || normalized === "true") {
    return "assign";
  }
  if (
    normalized === "assigned" ||
    normalized === "deassign" ||
    normalized === "remove"
  ) {
    return "deassign";
  }
  return null;
}

function tabToAssignProjectsParam(tab: TabMode): string {
  return tab === "assign" ? "assign" : "assigned";
}

type UserProjectsDialogProps = {
  user: User;
  trigger: React.ReactNode;
  onChanged?: () => void;
};

export function UserProjectsDialog({
  user,
  trigger,
  onChanged,
}: UserProjectsDialogProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const rolePath = getEffectiveRole(currentUser || { role: "admin" });
  const [searchParams, setSearchParams] = useSearchParams();

  const urlTab = parseAssignProjectsParam(
    searchParams.get(ASSIGN_PROJECTS_PARAM)
  );
  const open = urlTab !== null;
  const tab: TabMode = urlTab ?? "assign";

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextOpen) {
            next.set(ASSIGN_PROJECTS_PARAM, "assign");
          } else {
            next.delete(ASSIGN_PROJECTS_PARAM);
          }
          return next;
        },
        { replace: !nextOpen }
      );
    },
    [setSearchParams]
  );

  const setTab = useCallback(
    (nextTab: TabMode) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(ASSIGN_PROJECTS_PARAM, tabToAssignProjectsParam(nextTab));
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<UserAssignedProject[]>(
    []
  );

  const isAssign = tab === "assign";
  const memberRole = user.role === "tester" ? "tester" : "developer";
  const displayName = user.username || user.name || "user";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assigned, projects] = await Promise.all([
        projectService.getUserAssignedProjects(user.id),
        projectService.getProjects(),
      ]);
      setAssignedProjects(assigned);
      setAllProjects(projects);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to load projects",
        variant: "destructive",
      });
      setAssignedProjects([]);
      setAllProjects([]);
    } finally {
      setLoading(false);
    }
  }, [user.id, toast]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSelectedIds([]);
    void loadData();
  }, [open, loadData]);

  useEffect(() => {
    setSearch("");
    setSelectedIds([]);
  }, [tab]);

  const assignedIds = useMemo(
    () => new Set(assignedProjects.map((p) => String(p.id))),
    [assignedProjects]
  );

  const listItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (isAssign) {
      return allProjects
        .filter((p) => !assignedIds.has(String(p.id)))
        .filter(
          (p) =>
            !q ||
            p.name.toLowerCase().includes(q) ||
            (p.description || "").toLowerCase().includes(q)
        )
        .map((p) => ({
          id: String(p.id),
          name: p.name,
          status: p.status,
          description: p.description,
        }));
    }
    return assignedProjects
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
      )
      .map((p) => ({
        id: String(p.id),
        name: p.name,
        status: p.status,
        description: p.description,
      }));
  }, [isAssign, allProjects, assignedProjects, assignedIds, search]);

  const toggleId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAllVisible = () => {
    const ids = listItems.map((p) => p.id);
    const allSelected =
      ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    setSelectedIds(
      allSelected
        ? selectedIds.filter((id) => !ids.includes(id))
        : [...new Set([...selectedIds, ...ids])]
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    const successes: string[] = [];
    const failures: string[] = [];

    try {
      await Promise.all(
        selectedIds.map(async (projectId) => {
          try {
            if (isAssign) {
              await projectService.addProjectMember(
                projectId,
                user.id,
                memberRole
              );
            } else {
              await projectService.removeProjectMember(projectId, user.id);
            }
            successes.push(projectId);
          } catch (error) {
            failures.push(
              error instanceof Error ? error.message : "Request failed"
            );
          }
        })
      );

      if (successes.length > 0) {
        toast({
          title: isAssign ? "Projects assigned" : "Projects deassigned",
          description: isAssign
            ? `${successes.length} project${successes.length > 1 ? "s" : ""} assigned to ${displayName}.`
            : `${successes.length} project${successes.length > 1 ? "s" : ""} removed from ${displayName}.`,
        });
        onChanged?.();
        await loadData();
        setSelectedIds([]);
      }

      if (failures.length > 0) {
        toast({
          title: "Some changes failed",
          description: failures[0],
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-left">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
              <UserPlus className="h-4 w-4 text-white" />
            </span>
            Assign Projects
          </DialogTitle>
          <DialogDescription className="text-left">
            Manage project access for{" "}
            <span className="font-medium text-foreground">{displayName}</span> (
            {memberRole}).
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as TabMode)}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="px-5 pt-3 shrink-0">
            <TabsList className="grid w-full grid-cols-2 h-11 rounded-xl">
              <TabsTrigger
                value="assign"
                className="rounded-lg gap-1.5 text-xs sm:text-sm"
              >
                <UserPlus className="h-3.5 w-3.5 shrink-0" />
                Assign
                {!loading ? (
                  <span className="ml-0.5 text-[10px] opacity-70">
                    (
                    {
                      allProjects.filter((p) => !assignedIds.has(String(p.id)))
                        .length
                    }
                    )
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger
                value="deassign"
                className="rounded-lg gap-1.5 text-xs sm:text-sm"
              >
                <UserMinus className="h-3.5 w-3.5 shrink-0" />
                Assigned
                {!loading ? (
                  <span className="ml-0.5 text-[10px] opacity-70">
                    ({assignedProjects.length})
                  </span>
                ) : null}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-5 py-3 border-b shrink-0 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  isAssign
                    ? "Search projects to assign…"
                    : "Search assigned projects…"
                }
                className="pl-9 h-10 rounded-xl"
              />
            </div>
            {!loading && listItems.length > 0 && (
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={toggleAllVisible}
                  className="font-medium text-primary hover:underline"
                >
                  {listItems.every((p) => selectedIds.includes(p.id))
                    ? "Clear selection"
                    : "Select all visible"}
                </button>
                <span>
                  {selectedIds.length} selected · {listItems.length} shown
                </span>
              </div>
            )}
          </div>

          <TabsContent
            value={tab}
            forceMount
            className="flex-1 min-h-0 overflow-y-auto px-5 py-3 mt-0 data-[state=inactive]:hidden"
          >
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : listItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <FolderKanban className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">
                  {isAssign
                    ? assignedProjects.length > 0
                      ? "Already assigned to every project"
                      : "No projects available"
                    : "Not assigned to any projects"}
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {isAssign
                    ? "There are no remaining projects to assign."
                    : "Switch to Assign to add this user to projects."}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {listItems.map((project) => {
                  const checked = selectedIds.includes(project.id);
                  const detailsUrl = `/${rolePath}/projects/${project.id}`;
                  return (
                    <li key={project.id}>
                      <div
                        className={cn(
                          "flex items-start gap-2 sm:gap-3 rounded-xl border p-3 transition-colors",
                          checked
                            ? isAssign
                              ? "border-primary/50 bg-primary/5"
                              : "border-amber-500/50 bg-amber-500/5"
                            : "border-border/60 hover:bg-muted/40"
                        )}
                      >
                        <label className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleId(project.id)}
                            className="mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">
                              {project.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 min-w-0">
                              {project.status ? (
                                <span className="text-[11px] text-muted-foreground shrink-0">
                                  {getProjectStatusLabel(project.status)}
                                </span>
                              ) : null}
                              {project.description ? (
                                <span className="text-[11px] text-muted-foreground truncate">
                                  {project.description}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </label>
                        <Button
                          asChild
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 shrink-0 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Link
                            to={detailsUrl}
                            title={`Open ${project.name} details`}
                            aria-label={`View details for ${project.name}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Details</span>
                          </Link>
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-5 py-4 border-t shrink-0 gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={isAssign ? "default" : "destructive"}
            onClick={() => void handleSubmit()}
            disabled={saving || selectedIds.length === 0}
            className="inline-flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isAssign ? "Assigning…" : "Removing…"}
              </>
            ) : (
              <>
                {isAssign ? (
                  <UserPlus className="h-4 w-4" />
                ) : (
                  <UserMinus className="h-4 w-4" />
                )}
                {isAssign
                  ? `Assign${selectedIds.length ? ` (${selectedIds.length})` : ""}`
                  : `Deassign${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
