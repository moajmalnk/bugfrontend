import type { User } from "@/types";

type SortableUser = Pick<
  User,
  "account_active" | "status" | "username" | "name"
> & { id?: string };

/** Account enabled (or unknown) → 0; deactivated → 1 */
export function accountActiveRank(
  user?: Pick<User, "account_active"> | null
): number {
  if (!user) return 1;
  if (user.account_active == null) return 0;
  return Number(user.account_active) === 0 ? 1 : 0;
}

/** Presence: active → 0, idle → 1, offline/unknown → 2 */
export function presenceRank(status?: User["status"] | null): number {
  if (status === "active") return 0;
  if (status === "idle") return 1;
  return 2;
}

function usernameLabel(user?: SortableUser | null): string {
  return String(user?.username || user?.name || "");
}

/**
 * Why: Keep enabled / online people at the top of every user picker and list.
 * Order: account active → presence (active, idle, offline) → username.
 */
export function compareUsersActiveFirst(
  a?: SortableUser | null,
  b?: SortableUser | null
): number {
  const byAccount = accountActiveRank(a) - accountActiveRank(b);
  if (byAccount !== 0) return byAccount;

  const byPresence = presenceRank(a?.status) - presenceRank(b?.status);
  if (byPresence !== 0) return byPresence;

  return usernameLabel(a).localeCompare(usernameLabel(b), undefined, {
    sensitivity: "base",
  });
}

/** Immutable sort — never mutates the source array (CODO rule 32). */
export function sortUsersActiveFirst<T extends SortableUser>(users: T[]): T[] {
  return [...users].sort(compareUsersActiveFirst);
}

/**
 * Sort display names (creators / raisers) using a users lookup for active status.
 * Names with no matching user stay after known active accounts, alphabetically.
 */
export function sortUsernamesActiveFirst(
  names: string[],
  users: SortableUser[]
): string[] {
  const byUsername = new Map<string, SortableUser>();
  for (const user of users) {
    const key = String(user.username || "").trim();
    if (key && !byUsername.has(key)) {
      byUsername.set(key, user);
    }
  }

  return [...names].sort((a, b) =>
    compareUsersActiveFirst(
      byUsername.get(a) ?? { username: a, account_active: 0 },
      byUsername.get(b) ?? { username: b, account_active: 0 }
    )
  );
}

/** Sort { id, name } picker rows using a users directory for active status. */
export function sortNamedUsersActiveFirst<T extends { id: string; name: string }>(
  items: T[],
  users: SortableUser[]
): T[] {
  const byId = new Map<string, SortableUser>();
  const byUsername = new Map<string, SortableUser>();
  for (const user of users) {
    if (user.id != null) byId.set(String(user.id), user);
    const key = String(user.username || "").trim();
    if (key && !byUsername.has(key)) byUsername.set(key, user);
  }

  return [...items].sort((a, b) =>
    compareUsersActiveFirst(
      byId.get(String(a.id)) ??
        byUsername.get(a.name) ?? { username: a.name, account_active: 0 },
      byId.get(String(b.id)) ??
        byUsername.get(b.name) ?? { username: b.name, account_active: 0 }
    )
  );
}
