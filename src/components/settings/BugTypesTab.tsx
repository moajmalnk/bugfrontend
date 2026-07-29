import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { bugTypeBadgeClass } from "@/lib/bugMetaUtils";
import { cn } from "@/lib/utils";
import { bugTypeService } from "@/services/bugTypeService";
import type { BugType } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Tags } from "lucide-react";
import { FormEvent, useState } from "react";

export function BugTypesTab() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data: types = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["bug-types", "all"],
    queryFn: () => bugTypeService.list({ includeInactive: true }),
    staleTime: 30_000,
    retry: 1,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["bug-types"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; sort_order?: number }) =>
      bugTypeService.create(payload),
    onSuccess: () => {
      setName("");
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
      types.reduce((max, t) => Math.max(max, t.sort_order || 0), 0) + 10;
    createMutation.mutate({ name: trimmed, sort_order: nextOrder });
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

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCreate}
        className="flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <div className="flex-1 space-y-1.5 min-w-0">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            New bug type
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Performance Issue"
            className="h-11 rounded-xl"
            maxLength={100}
            disabled={createMutation.isPending}
          />
        </div>
        <Button
          type="submit"
          className="h-11 px-5 rounded-xl font-semibold shrink-0"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Add type
        </Button>
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
      ) : types.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center space-y-2">
          <Tags className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            No bug types yet. Add your first one above.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {types.map((type) => {
            const isEditing = editingId === type.id;
            return (
              <li
                key={type.id}
                className={cn(
                  "rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors",
                  type.is_active
                    ? "bg-white/60 dark:bg-gray-900/60 border-gray-200/70 dark:border-gray-700/70"
                    : "bg-muted/40 border-dashed opacity-80"
                )}
              >
                <div className="flex-1 min-w-0 space-y-2">
                  {isEditing ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-10 rounded-lg"
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
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={bugTypeBadgeClass()}>
                        {type.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
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

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      Active
                    </span>
                    <Switch
                      checked={Boolean(type.is_active)}
                      disabled={updateMutation.isPending}
                      onCheckedChange={(checked) =>
                        updateMutation.mutate({ id: type.id, is_active: checked })
                      }
                    />
                  </div>

                  {isEditing ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 rounded-lg font-semibold"
                        disabled={updateMutation.isPending}
                        onClick={() => saveEdit(type.id)}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-9 rounded-lg"
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
                      className="h-9 rounded-lg font-semibold"
                      onClick={() => startEdit(type)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Rename
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
