import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

/**
 * URL-driven dialog state (`?print=…`) so popups are shareable, survive refresh,
 * and the browser Back button closes them instead of leaving the page.
 *
 * Why the ref: when the dialog was opened in-app we pushed a history entry, so
 * closing pops it (Back and the close icon behave identically). When it was
 * opened from a pasted link there is nothing to pop, so we strip the params in
 * place instead of navigating away from the page.
 */
export function useUrlDialogParam(param: string, relatedParams: readonly string[] = []) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location);
  locationRef.current = location;
  const pushedRef = useRef(false);
  const relatedRef = useRef(relatedParams);
  relatedRef.current = relatedParams;

  const value = searchParams.get(param);

  useEffect(() => {
    if (!value) pushedRef.current = false;
  }, [value]);

  const update = useCallback(
    (mutate: (params: URLSearchParams) => void, replace: boolean) => {
      const { pathname, search, hash, state } = locationRef.current;
      const current = new URLSearchParams(search);
      const params = new URLSearchParams(search);
      mutate(params);
      if (params.toString() === current.toString()) return;
      const next = params.toString();
      navigate({ pathname, search: next ? `?${next}` : "", hash }, { replace, state });
    },
    [navigate]
  );

  const open = useCallback(
    (next: string, extra: Record<string, string> = {}) => {
      pushedRef.current = true;
      update((params) => {
        params.set(param, next);
        Object.entries(extra).forEach(([k, v]) => params.set(k, v));
      }, false);
    },
    [param, update]
  );

  const close = useCallback(() => {
    if (pushedRef.current) {
      pushedRef.current = false;
      navigate(-1);
      return;
    }
    update((params) => {
      params.delete(param);
      relatedRef.current.forEach((k) => params.delete(k));
    }, true);
  }, [navigate, param, update]);

  /** Updates a companion param (e.g. `month`) without adding history entries. */
  const setRelated = useCallback(
    (key: string, next: string | null) =>
      update((params) => {
        if (next) params.set(key, next);
        else params.delete(key);
      }, true),
    [update]
  );

  return { value, searchParams, open, close, setRelated };
}
