import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Search, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sortUsersActiveFirst } from "@/lib/utils/userSort";
import { userService } from "@/services/userService";
import type { User } from "@/types";

type RoleFilter = "all" | "admin" | "developer" | "tester";

type AccessUsersPickerProps = {
  selectedUserIds: string[];
  onChange: (ids: string[]) => void;
  /** When true (All Users role), picker is disabled — everyone already has access. */
  disabled?: boolean;
  excludeUserId?: string | null;
  idPrefix?: string;
};

function roleBadgeClass(role: string) {
  const normalized = role.toLowerCase();
  if (normalized === "admin")
    return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
  if (normalized === "developer")
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  if (normalized === "tester")
    return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300";
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

/**
 * Why: Sheets/Docs access is role OR specific users. This picker lets creators
 * grant named people access without changing the role audience.
 */
export function AccessUsersPicker({
  selectedUserIds,
  onChange,
  disabled = false,
  excludeUserId,
  idPrefix = "access-user",
}: AccessUsersPickerProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const all = await userService.getUsers();
        if (!mounted) return;
        setUsers(all.filter((u) => Number(u.account_active ?? 1) === 1));
      } catch {
        if (mounted) setUsers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const exclude = excludeUserId ? String(excludeUserId) : null;
    return sortUsersActiveFirst(
      users.filter((user) => {
        const id = String(user.id);
        if (exclude && id === exclude) return false;
        const userRole = String(user.role || "").toLowerCase();
        const byRole = roleFilter === "all" || userRole === roleFilter;
        const q = search.trim().toLowerCase();
        const bySearch =
          q === "" ||
          String(user.name || user.username || "")
            .toLowerCase()
            .includes(q) ||
          String(user.username || "")
            .toLowerCase()
            .includes(q) ||
          String(user.email || "")
            .toLowerCase()
            .includes(q);
        return byRole && bySearch;
      })
    );
  }, [users, search, roleFilter, excludeUserId]);

  const selectedUsers = useMemo(() => {
    const set = new Set(selectedUserIds);
    return users.filter((u) => set.has(String(u.id)));
  }, [users, selectedUserIds]);

  const toggle = (userId: string, checked: boolean) => {
    if (disabled) return;
    if (checked) {
      onChange(Array.from(new Set([...selectedUserIds, userId])));
    } else {
      onChange(selectedUserIds.filter((id) => id !== userId));
    }
  };

  return (
    <div className={cn("space-y-3", disabled && "opacity-60")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-sm font-medium truncate">Specific Users (Optional)</p>
        </div>
        {selectedUserIds.length > 0 && (
          <Badge variant="secondary" className="text-xs shrink-0 rounded-xl">
            {selectedUserIds.length} selected
          </Badge>
        )}
      </div>

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-3">
          {selectedUsers.map((user) => (
            <Badge
              key={String(user.id)}
              variant="outline"
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium"
            >
              {user.name || user.username}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggle(String(user.id), false)}
                  className="rounded-full p-0.5 hover:bg-destructive/20"
                  aria-label={`Remove ${user.name || user.username}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value.slice(0, 100))}
            placeholder="Search users..."
            disabled={disabled}
            className="rounded-xl pl-9"
            maxLength={100}
          />
        </div>
        <div className="col-span-12 flex flex-wrap gap-2">
          {(
            [
              { value: "all", label: "All Roles" },
              { value: "admin", label: "Admins" },
              { value: "developer", label: "Developers" },
              { value: "tester", label: "Testers" },
            ] as const
          ).map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={roleFilter === opt.value ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              className="h-8 rounded-xl"
              onClick={() => setRoleFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border-2 border-border bg-background p-3 scrollbar-thin">
        {disabled ? (
          <p className="text-sm text-muted-foreground">
            &quot;All Users&quot; already grants access to everyone. Uncheck it to pick specific people.
          </p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading users...</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users found.</p>
        ) : (
          filteredUsers.map((user) => {
            const userId = String(user.id);
            const isSelected = selectedUserIds.includes(userId);
            const userRole = String(user.role || "user");
            return (
              <div
                key={userId}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-2.5 transition-colors",
                  isSelected
                    ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/30"
                    : "border-transparent hover:bg-muted/60"
                )}
              >
                <Checkbox
                  id={`${idPrefix}-${userId}`}
                  checked={isSelected}
                  onCheckedChange={(checked) => toggle(userId, !!checked)}
                />
                <label
                  htmlFor={`${idPrefix}-${userId}`}
                  className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 truncate font-medium">
                    {user.name || user.username}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                    <Badge
                      variant="secondary"
                      className={cn(
                        "rounded-xl px-2 py-0.5 text-[10px] uppercase",
                        roleBadgeClass(userRole)
                      )}
                    >
                      {userRole}
                    </Badge>
                  </span>
                </label>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Selected users always get access (OR with roles). With &quot;For Me&quot;, only you and
        these users can open it.
      </p>
    </div>
  );
}

export function parseAllowedUserIds(
  raw: string | string[] | null | undefined
): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return Array.from(new Set(raw.map(String).map((s) => s.trim()).filter(Boolean)));
  }
  return Array.from(
    new Set(
      String(raw)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}
