import { useCallback, useEffect, useMemo, useRef } from "react";
import type { DependencyList } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

export type UseUrlPaginationOptions = {
  /** Default page size when pageSize is absent from the URL */
  defaultPageSize?: number;
  /** Query param name for page (default: "page") */
  pageParam?: string;
  /** Query param name for page size (default: "pageSize") */
  pageSizeParam?: string;
};

export type UseUrlPaginationResult = {
  page: number;
  pageSize: number;
  setPage: (page: number | ((prev: number) => number)) => void;
  setPageSize: (pageSize: number) => void;
  /** Clamp page into [1, totalPages] when filtered results shrink */
  clampToTotalPages: (totalPages: number) => void;
};

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function searchWithoutQuestion(search: string): string {
  return search.startsWith("?") ? search.slice(1) : search;
}

/**
 * Sync list pagination to the URL so Back from detail views restores the same page.
 * Omits page=1 and default pageSize from the query for cleaner URLs.
 *
 * Uses navigate + location refs (not useSearchParams' setter) so callbacks stay
 * stable. React Router's setSearchParams identity changes on every query update
 * and always calls navigate() — that was cancelling Link clicks and fighting
 * filter-reset effects into a page=1 loop.
 */
export function useUrlPagination(
  options: UseUrlPaginationOptions = {}
): UseUrlPaginationResult {
  const {
    defaultPageSize = 12,
    pageParam = "page",
    pageSizeParam = "pageSize",
  } = options;

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const locationRef = useRef(location);
  locationRef.current = location;

  const page = useMemo(
    () => parsePositiveInt(searchParams.get(pageParam), 1),
    [searchParams, pageParam]
  );

  const pageSize = useMemo(
    () => parsePositiveInt(searchParams.get(pageSizeParam), defaultPageSize),
    [searchParams, pageSizeParam, defaultPageSize]
  );

  const pageRef = useRef(page);
  pageRef.current = page;

  const replaceSearch = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const { pathname, search, hash } = locationRef.current;
      const params = new URLSearchParams(searchWithoutQuestion(search));
      mutate(params);
      const next = params.toString();
      if (next === searchWithoutQuestion(search)) {
        return;
      }
      navigate(
        {
          pathname,
          search: next ? `?${next}` : "",
          hash,
        },
        { replace: true }
      );
    },
    [navigate]
  );

  const setPage = useCallback(
    (next: number | ((prev: number) => number)) => {
      replaceSearch((params) => {
        const current = parsePositiveInt(params.get(pageParam), 1);
        const resolved = typeof next === "function" ? next(current) : next;
        const safe = Math.max(1, Math.floor(Number(resolved) || 1));
        if (safe <= 1) {
          params.delete(pageParam);
        } else {
          params.set(pageParam, String(safe));
        }
      });
    },
    [replaceSearch, pageParam]
  );

  const setPageSize = useCallback(
    (nextSize: number) => {
      const safe = Math.max(1, Math.floor(Number(nextSize) || defaultPageSize));
      replaceSearch((params) => {
        if (safe === defaultPageSize) {
          params.delete(pageSizeParam);
        } else {
          params.set(pageSizeParam, String(safe));
        }
        params.delete(pageParam);
      });
    },
    [replaceSearch, pageParam, pageSizeParam, defaultPageSize]
  );

  const clampToTotalPages = useCallback(
    (totalPages: number) => {
      const max = Math.max(1, Math.floor(totalPages) || 1);
      if (pageRef.current > max) {
        setPage(max);
      }
    },
    [setPage]
  );

  return { page, pageSize, setPage, setPageSize, clampToTotalPages };
}

/**
 * Merge a single search param without wiping the rest of the query string.
 */
export function useMergeSearchParam() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location);
  locationRef.current = location;

  return useCallback(
    (key: string, value: string | null, options?: { replace?: boolean }) => {
      const { pathname, search, hash } = locationRef.current;
      const params = new URLSearchParams(searchWithoutQuestion(search));
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const next = params.toString();
      if (next === searchWithoutQuestion(search)) {
        return;
      }
      navigate(
        {
          pathname,
          search: next ? `?${next}` : "",
          hash,
        },
        { replace: options?.replace ?? false }
      );
    },
    [navigate]
  );
}

/**
 * Build a safe in-app return path from location.state.from (same-origin relative path only).
 */
export function getReturnPathFromState(
  state: unknown,
  fallback: string
): string {
  if (
    state &&
    typeof state === "object" &&
    "from" in state &&
    typeof (state as { from: unknown }).from === "string"
  ) {
    const from = (state as { from: string }).from;
    if (from.startsWith("/") && !from.startsWith("//")) {
      return from;
    }
  }
  return fallback;
}

/**
 * Current list location to pass as Link state when opening a detail page.
 */
export function listReturnState(pathname: string, search: string) {
  return { from: `${pathname}${search}` };
}

/**
 * Optional clamp effect helper for list pages.
 */
export function useClampUrlPage(
  clampToTotalPages: (totalPages: number) => void,
  totalPages: number
) {
  useEffect(() => {
    clampToTotalPages(totalPages);
  }, [clampToTotalPages, totalPages]);
}

/**
 * Reset to page 1 when filter/tab deps change — skips the initial mount so
 * deep links like ?page=5 are preserved when the list first loads.
 */
export function useResetUrlPageOnChange(
  setPage: (page: number) => void,
  deps: DependencyList
) {
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies the filter/tab deps
  }, deps);
}
