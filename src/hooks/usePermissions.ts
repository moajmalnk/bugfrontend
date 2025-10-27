import { useAuth } from "@/context/AuthContext";
import { useCallback, useEffect, useState } from "react";

interface CachedPermissions {
  permissions: string[];
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function usePermissions(projectId: string | null = null) {
  const { currentUser } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    if (!currentUser) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    try {
      const cacheKey = `permissions_${currentUser.id}`;
      // Clear cache for Developer role to force fresh fetch
      if (currentUser.role === 'developer' || currentUser.role_id === 2) {
        localStorage.removeItem(cacheKey);
      }
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        const cachedData: CachedPermissions = JSON.parse(cached);
        const now = Date.now();

        if (now - cachedData.timestamp < CACHE_TTL) {
          setPermissions(cachedData.permissions);
          setIsLoading(false);
          return;
        }
      }

      // Fetch from API
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/permissions/user_permissions.php?userId=${currentUser.id}`,
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

        // Cache the permissions
        const cacheData: CachedPermissions = {
          permissions: effectivePermissions,
          timestamp: Date.now(),
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      }
    } catch (error) {
      console.error("Failed to load permissions:", error);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // Refresh permissions periodically (every 5 minutes)
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      loadPermissions();
    }, CACHE_TTL);

    return () => clearInterval(interval);
  }, [currentUser, loadPermissions]);

  const hasPermission = useCallback(
    (permissionKey: string): boolean => {
      if (!permissions.length) return false;

      // Check for SUPER_ADMIN permission
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

  return {
    permissions,
    isLoading,
    hasPermission,
    isSuper,
    refreshPermissions: loadPermissions,
    clearCache,
  };
}

