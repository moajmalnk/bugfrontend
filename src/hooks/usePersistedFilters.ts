import { useState, useEffect, useCallback } from "react";

export interface FilterState {
  searchTerm?: string;
  priorityFilter?: string;
  statusFilter?: string;
  projectFilter?: string;
  typeFilter?: string;
  dateFilter?: string;
  createdByFilter?: string;
  [key: string]: string | undefined;
}

/**
 * Hook to persist filter and search state in localStorage
 * State persists across page navigation and component unmounts
 * 
 * @param pageKey - Unique identifier for the page (e.g., 'bugs', 'projects', 'updates', 'fixes')
 * @param defaultFilters - Default filter values
 * @returns Tuple of [filters, setFilter, clearFilters]
 */
export function usePersistedFilters(
  pageKey: string,
  defaultFilters: FilterState = {}
): [FilterState, (key: string, value: string) => void, () => void] {
  const storageKey = `filters_${pageKey}`;

  // Initialize state from localStorage or defaults
  const [filters, setFilters] = useState<FilterState>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new filter fields
        return { ...defaultFilters, ...parsed };
      }
    } catch (error) {
      console.error(`Error loading persisted filters for ${pageKey}:`, error);
    }
    return defaultFilters;
  });

  // Persist to localStorage whenever filters change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch (error) {
      console.error(`Error saving persisted filters for ${pageKey}:`, error);
    }
  }, [filters, storageKey, pageKey]);

  // Update a specific filter
  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Clear all filters back to defaults
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error(`Error clearing persisted filters for ${pageKey}:`, error);
    }
  }, [defaultFilters, storageKey, pageKey]);

  return [filters, setFilter, clearFilters];
}

