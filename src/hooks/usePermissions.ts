import { useAuth } from "@/context/AuthContext";
import { ENV } from "@/lib/env";
import { useCallback, useEffect, useRef, useState } from "react";

interface CachedPermissions {
  permissions: string[];
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function usePermissions(projectId: string | null = null) {
  const { currentUser } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const permissionsRef = useRef<string[]>([]);

  useEffect(() => {
    permissionsRef.current = permissions;
  }, [permissions]);

  /**
   * @param options.force - bypass localStorage cache
   * @returns true when permissions were loaded successfully
   */
  const loadPermissions = useCallback(
    async (options?: { force?: boolean }): Promise<boolean> => {
      if (!currentUser) {
        setPermissions([]);
        setIsLoading(false);
        return false;
      }

      try {
        const cacheKey = `permissions_${currentUser.id}`;
        const cached = localStorage.getItem(cacheKey);

        if (!options?.force && cached) {
          const cachedData: CachedPermissions = JSON.parse(cached);
          const now = Date.now();

          if (now - cachedData.timestamp < CACHE_TTL) {
            setPermissions(cachedData.permissions);
            setIsLoading(false);
            return true;
          }
        }

        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          setIsLoading(false);
          return false;
        }

        // Why: Use ENV.API_URL so localhost DEV goes through /api proxy (not raw VITE_API_URL).
        const response = await fetch(
          `${ENV.API_URL}/permissions/user_permissions.php?userId=${currentUser.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const effectivePermissions = data.data?.effective_permissions || [];

          setPermissions(effectivePermissions);

          const cacheData: CachedPermissions = {
            permissions: effectivePermissions,
            timestamp: Date.now(),
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          setIsLoading(false);
          return true;
        }

        // Keep prior permissions on failure — avoid silent empty denials
        if (import.meta.env.DEV) {
          console.error("Failed to load permissions: HTTP", response.status);
        }
        setIsLoading(false);
        return false;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Failed to load permissions:", error);
        }
        setIsLoading(false);
        return false;
      }
    },
    [currentUser]
  );

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  // Refresh permissions periodically (every 5 minutes)
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      void loadPermissions({ force: true });
    }, CACHE_TTL);

    return () => clearInterval(interval);
  }, [currentUser, loadPermissions]);

  const hasPermission = useCallback(
    (permissionKey: string): boolean => {
      if (!permissions.length) return false;

      if (permissions.includes("SUPER_ADMIN")) {
        return true;
      }

      return permissions.includes(permissionKey);
    },
    [permissions]
  );

  const isSuper = useCallback((): boolean => {
    return permissions.includes("SUPER_ADMIN");
  }, [permissions]);

  const clearCache = useCallback(() => {
    if (currentUser) {
      const cacheKey = `permissions_${currentUser.id}`;
      localStorage.removeItem(cacheKey);
    }
  }, [currentUser]);

  const refreshPermissions = useCallback(async (): Promise<boolean> => {
    clearCache();
    return loadPermissions({ force: true });
  }, [clearCache, loadPermissions]);

  // projectId reserved for future project-scoped checks
  void projectId;

  return {
    permissions,
    isLoading,
    hasPermission,
    isSuper,
    refreshPermissions,
    clearCache,
  };
}
