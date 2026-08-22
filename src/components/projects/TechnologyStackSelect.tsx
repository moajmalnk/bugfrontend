import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  technologyService,
  type ProjectTechnology,
} from "@/services/technologyService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

const MAX_TECH_NAME = 100;

type TechnologyStackSelectProps = {
  value: string[];
  onChange: (items: string[]) => void;
  className?: string;
  disabled?: boolean;
};

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, MAX_TECH_NAME);
}

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Why: Project Technology Stack needs a shared catalog dropdown with inline create
 * so custom techs appear on every project's picker.
 */
export function TechnologyStackSelect({
  value,
  onChange,
  className,
  disabled = false,
}: TechnologyStackSelectProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: catalog = [], isLoading } = useQuery({
    queryKey: ["project-technologies"],
    queryFn: () => technologyService.list(),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => technologyService.create(name),
    onSuccess: (created) => {
      queryClient.setQueryData<ProjectTechnology[]>(
        ["project-technologies"],
        (prev) => {
          const list = prev ? [...prev] : [];
          if (!list.some((t) => namesMatch(t.name, created.name))) {
            list.push(created);
            list.sort(
              (a, b) =>
                a.sort_order - b.sort_order ||
                a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
            );
          }
          return list;
        }
      );
      void queryClient.invalidateQueries({ queryKey: ["project-technologies"] });
    },
  });

  const options = useMemo(() => {
    const map = new Map<string, string>();
    catalog.forEach((t) => {
      const n = normalizeName(t.name);
      if (n) map.set(n.toLowerCase(), n);
    });
    value.forEach((v) => {
      const n = normalizeName(v);
      if (n && !map.has(n.toLowerCase())) map.set(n.toLowerCase(), n);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [catalog, value]);

  const searchTrimmed = normalizeName(search);
  const exactExists = options.some((o) => namesMatch(o, searchTrimmed));
  const showCreate =
    searchTrimmed.length > 0 && !exactExists && !createMutation.isPending;

  const filtered = useMemo(() => {
    if (!searchTrimmed) return options;
    const q = searchTrimmed.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, searchTrimmed]);

  const addItem = (name: string) => {
    const n = normalizeName(name);
    if (!n || disabled) return;
    if (value.some((v) => namesMatch(v, n))) return;
    onChange([...value, n]);
  };

  const removeItem = (index: number) => {
    if (disabled) return;
    onChange(value.filter((_, i) => i !== index));
  };

  const toggleItem = (name: string) => {
    if (disabled) return;
    if (value.some((v) => namesMatch(v, name))) {
      onChange(value.filter((v) => !namesMatch(v, name)));
    } else {
      addItem(name);
    }
  };

  const handleCreate = async () => {
    const n = normalizeName(search);
    if (!n || disabled) return;
    try {
      const created = await createMutation.mutateAsync(n);
      addItem(created.name);
      setSearch("");
      toast({
        title: "Technology added",
        description: `"${created.name}" is now available for all projects.`,
      });
    } catch (err) {
      toast({
        title: "Could not create technology",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {value.length === 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            No technologies selected
          </span>
        )}
        {value.map((item, index) => (
          <Badge key={`${item}-${index}`} variant="outline" className="gap-1 pr-1 text-sm">
            {item}
            <button
              type="button"
              onClick={() => removeItem(index)}
              disabled={disabled}
              className="ml-1 hover:bg-muted rounded-full p-0.5"
              aria-label={`Remove ${item}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || isLoading}
            className={cn(
              "h-12 w-full justify-between rounded-xl font-medium border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            )}
          >
            <span className="truncate text-muted-foreground">
              {isLoading
                ? "Loading technologies…"
                : value.length > 0
                  ? `${value.length} selected — add more`
                  : "Select or create technology…"}
            </span>
            {createMutation.isPending ? (
              <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-70" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0 z-[70] rounded-xl"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search or type to create…"
              value={search}
              onValueChange={(v) => setSearch(v.slice(0, MAX_TECH_NAME))}
            />
            <CommandList>
              <CommandEmpty>
                {showCreate ? null : "No technologies found."}
              </CommandEmpty>
              {showCreate ? (
                <CommandGroup heading="Create">
                  <CommandItem
                    value={`create-${searchTrimmed}`}
                    onSelect={() => {
                      void handleCreate();
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
                    <span>
                      Create <span className="font-semibold">“{searchTrimmed}”</span>
                    </span>
                  </CommandItem>
                </CommandGroup>
              ) : null}
              <CommandGroup heading="Technologies">
                {filtered.map((name) => {
                  const selected = value.some((v) => namesMatch(v, name));
                  return (
                    <CommandItem
                      key={name}
                      value={name}
                      onSelect={() => toggleItem(name)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
