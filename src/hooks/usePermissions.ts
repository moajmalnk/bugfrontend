import { useAuth } from "@/context/AuthContext";
import { ENV } from "@/lib/env";
import { isBrowserOnline, isNetworkSettling } from "@/lib/networkStatus";
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

        if (!isBrowserOnline()) {
          // Serve stale cache when offline; avoid noisy failed fetches
          if (cached) {
            try {
              const cachedData: CachedPermissions = JSON.parse(cached);
              setPermissions(cachedData.permissions);
            } catch {
              /* ignore */
            }
          }
          setIsLoading(false);
          return false;
        }

        // Brief post-reconnect settle — use cache, then deferred effect will refetch
        if (isNetworkSettling()) {
          if (cached) {
            try {
              const cachedData: CachedPermissions = JSON.parse(cached);
              setPermissions(cachedData.permissions);
            } catch {
              /* ignore */
            }
          }
          setIsLoading(false);
          return false;
        }

        const token = sessionStorage.getItem("token") || localStorage.getItem("token");

        // Why: Use ENV.API_URL so localhost DEV goes through /api proxy (not raw VITE_API_URL).
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12_000);
        let response: Response;
        try {
          response = await fetch(
            `${ENV.API_URL}/permissions/user_permissions.php?userId=${currentUser.id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              signal: controller.signal,
            }
          );
        } finally {
          clearTimeout(timeoutId);
        }

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
        setIsLoading(false);
        return false;
      } catch {
        // Transport flaps (ERR_NETWORK_CHANGED, etc.) — keep prior/cached permissions
        setIsLoading(false);
        return false;
      }
    },
    [currentUser]
  );

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  // If boot / Wi-Fi settle skipped the first fetch, retry once network is ready
  useEffect(() => {
    if (!currentUser) return;
    if (!isBrowserOnline()) return;
    if (!isNetworkSettling()) return;

    const timer = setTimeout(() => {
      void loadPermissions();
    }, 4_500);

    return () => clearTimeout(timer);
  }, [currentUser, loadPermissions]);

  // Refresh permissions periodically (every 5 minutes)
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      if (isBrowserOnline() && !isNetworkSettling()) {
        void loadPermissions({ force: true });
      }
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
