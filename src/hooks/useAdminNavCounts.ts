import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ADMIN_NAV_COUNTS_QUERY_KEY,
  EMPTY_ADMIN_NAV_COUNTS,
  fetchAdminNavCounts,
  subscribeAdminNavCountsChanged,
  type AdminNavCounts,
} from '@/services/adminNavCountsService';

/**
 * Why: Keep Administration nav badges in sync without loading each list page.
 */
export function useAdminNavCounts(enabled: boolean): AdminNavCounts {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ADMIN_NAV_COUNTS_QUERY_KEY,
    queryFn: fetchAdminNavCounts,
    enabled,
    staleTime: 30_000,
    refetchInterval: enabled ? 45_000 : false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!enabled) return;
    return subscribeAdminNavCountsChanged(() => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_NAV_COUNTS_QUERY_KEY });
    });
  }, [enabled, queryClient]);

  return data ?? EMPTY_ADMIN_NAV_COUNTS;
}
