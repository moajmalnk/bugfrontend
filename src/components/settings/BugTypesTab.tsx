import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { bugTypeBadgeClass } from "@/lib/bugMetaUtils";
import { cn } from "@/lib/utils";
import { bugTypeService } from "@/services/bugTypeService";
import type { BugPriority, BugType } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  Tags,
} from "lucide-react";
import { FormEvent, forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";

const PRIORITY_OPTIONS: {
  value: BugPriority;
  label: string;
  badgeClass: string;
}[] = [
  {
    value: "high",
    label: "High",
    badgeClass:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  },
  {
    value: "medium",
    label: "Medium",
    badgeClass:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  },
  {
    value: "low",
    label: "Low",
    badgeClass:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  },
];

function priorityMeta(priority: BugPriority | string | undefined) {
  return (
    PRIORITY_OPTIONS.find((o) => o.value === priority) || PRIORITY_OPTIONS[1]
  );
}

export type BugTypesTabHandle = {
  focusCreate: () => void;
};

export const BugTypesTab = forwardRef<BugTypesTabHandle>(function BugTypesTab(
  _props,
  ref
) {
  const queryClient = useQueryClient();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  const [newPriority, setNewPriority] = useState<BugPriority>("medium");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useImperativeHandle(ref, () => ({
    focusCreate: () => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      requestAnimationFrame(() => nameInputRef.current?.focus());
    },
  }));

  const { data: types = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["bug-types", "all"],
    queryFn: () => bugTypeService.list({ includeInactive: true }),
    staleTime: 30_000,
    retry: 1,
  });

  const orderedTypes = useMemo(
    () => [...types].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [types]
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["bug-types"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      sort_order?: number;
      default_priority?: BugPriority;
    }) => bugTypeService.create(payload),
    onSuccess: () => {
      setName("");
      setNewPriority("medium");
      invalidate();
      toast({
        title: "Bug type added",
        description: "Available on new and edit bug forms.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not add type",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      name?: string;
      is_active?: boolean;
      sort_order?: number;
      default_priority?: BugPriority;
    }) => bugTypeService.update(payload),
    onSuccess: () => {
      setEditingId(null);
      setEditName("");
      invalidate();
      toast({ title: "Bug type updated" });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not update type",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast({
        title: "Name required",
        description: "Enter a bug type name.",
        variant: "destructive",
      });
      return;
    }
    const nextOrder =
      orderedTypes.reduce((max, t) => Math.max(max, t.sort_order || 0), 0) + 10;
    createMutation.mutate({
      name: trimmed,
      sort_order: nextOrder,
      default_priority: newPriority,
    });
  };

  const startEdit = (type: BugType) => {
    setEditingId(type.id);
    setEditName(type.name);
  };

  const saveEdit = (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      toast({
        title: "Name required",
        description: "Enter a bug type name.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ id, name: trimmed });
  };

  const moveType = async (type: BugType, direction: "up" | "down") => {
    const index = orderedTypes.findIndex((t) => t.id === type.id);
    if (index < 0) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= orderedTypes.length) return;
    const other = orderedTypes[swapIndex];
    try {
      // Why: Swap sort_order so list order stays stable without renumbering everything.
      await Promise.all([
        bugTypeService.update({ id: type.id, sort_order: other.sort_order }),
        bugTypeService.update({ id: other.id, sort_order: type.sort_order }),
      ]);
      invalidate();
    } catch (err) {
      toast({
        title: "Could not reorder",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 w-full">
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 sm:p-4 min-w-0">
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Set a <strong className="text-foreground">default priority</strong> for
          each type. When a tester picks that type on New Bug, priority is
          suggested automatically (highest wins if multiple types are selected).
          Use arrows to control display order.
        </p>
      </div>

      <form
        ref={formRef}
        onSubmit={handleCreate}
        className="grid grid-cols-12 gap-3 rounded-2xl border border-border/60 bg-white/70 dark:bg-gray-900/70 p-3 sm:p-4 min-w-0"
      >
        <div className="col-span-12 md:col-span-6 space-y-1.5 min-w-0">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            New bug type
          </label>
          <Input
            ref={nameInputRef}
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 100))}
            placeholder="e.g. Performance Issue"
            className="h-11 rounded-xl"
            maxLength={100}
            disabled={createMutation.isPending}
          />
        </div>
        <div className="col-span-12 sm:col-span-6 md:col-span-3 space-y-1.5 min-w-0">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Default priority
          </label>
          <Select
            value={newPriority}
            onValueChange={(v) => setNewPriority(v as BugPriority)}
            disabled={createMutation.isPending}
          >
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-12 sm:col-span-6 md:col-span-3 flex items-end">
          <Button
            type="submit"
            className="h-11 w-full rounded-xl font-semibold"
            disabled={createMutation.isPending || !name.trim()}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add type
          </Button>
        </div>
      </form>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading bug types…
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-dashed p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Could not load bug types
            {error instanceof Error && error.message
              ? `: ${error.message}`
              : ". Run migration 032_bug_types.sql if tables are missing."}
          </p>
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : orderedTypes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center space-y-2">
          <Tags className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            No bug types yet. Add your first one above.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3 min-w-0">
          {orderedTypes.map((type, index) => {
            const isEditing = editingId === type.id;
            const pMeta = priorityMeta(type.default_priority);
            const busy = updateMutation.isPending;
            return (
              <li
                key={type.id}
                className={cn(
                  "rounded-2xl border p-3 sm:p-4 min-w-0 transition-colors",
                  type.is_active
                    ? "bg-white/60 dark:bg-gray-900/60 border-gray-200/70 dark:border-gray-700/70"
                    : "bg-muted/40 border-dashed opacity-80"
                )}
              >
                <div className="grid grid-cols-12 gap-3 items-start min-w-0">
                  <div className="col-span-12 lg:col-span-5 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-[11px] font-bold tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                      {isEditing ? (
                        <Input
                          value={editName}
                          onChange={(e) =>
                            setEditName(e.target.value.slice(0, 100))
                          }
                          className="h-10 rounded-xl min-w-0"
                          maxLength={100}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              saveEdit(type.id);
                            }
                            if (e.key === "Escape") {
                              setEditingId(null);
                              setEditName("");
                            }
                          }}
                        />
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <Badge
                            variant="outline"
                            className={cn(bugTypeBadgeClass(), "max-w-full")}
                          >
                            <span className="truncate">{type.name}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono truncate">
                            {type.slug}
                          </span>
                          {!type.is_active ? (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-span-12 sm:col-span-6 lg:col-span-3 min-w-0 space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Default priority
                    </label>
                    <Select
                      value={type.default_priority || "medium"}
                      disabled={busy}
                      onValueChange={(v) =>
                        updateMutation.mutate({
                          id: type.id,
                          default_priority: v as BugPriority,
                        })
                      }
                    >
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="inline-flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                                  opt.badgeClass
                                )}
                              >
                                {opt.label}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", pMeta.badgeClass)}
                    >
                      Suggests {pMeta.label}
                    </Badge>
                  </div>

                  <div className="col-span-12 sm:col-span-6 lg:col-span-4 flex flex-wrap items-center gap-2 sm:justify-end min-w-0">
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 rounded-xl"
                        disabled={busy || index === 0}
                        aria-label="Move up"
                        onClick={() => moveType(type, "up")}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 rounded-xl"
                        disabled={busy || index === orderedTypes.length - 1}
                        aria-label="Move down"
                        onClick={() => moveType(type, "down")}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground font-medium">
                        Active
                      </span>
                      <Switch
                        checked={Boolean(type.is_active)}
                        disabled={busy}
                        onCheckedChange={(checked) =>
                          updateMutation.mutate({
                            id: type.id,
                            is_active: checked,
                          })
                        }
                      />
                    </div>

                    {isEditing ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          className="h-9 rounded-xl font-semibold"
                          disabled={busy}
                          onClick={() => saveEdit(type.id)}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-9 rounded-xl"
                          onClick={() => {
                            setEditingId(null);
                            setEditName("");
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-xl font-semibold"
                        onClick={() => startEdit(type)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        Rename
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
