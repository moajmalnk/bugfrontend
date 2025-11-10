import { useCallback, useEffect, useRef } from "react";
import { NavigateOptions, To, useLocation, useNavigate } from "react-router-dom";

/**
 * Wraps React Router's navigate with a fallback that forces a full page load
 * when client-side navigation fails (e.g. stale caches, chunk errors).
 */
export function useSafeNavigate(fallbackDelay = 300) {
  const navigate = useNavigate();
  const location = useLocation();
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
    };
  }, []);

  const safeNavigate = useCallback(
    (to: To, options?: NavigateOptions) => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }

      const target = typeof to === "string" ? to : to.pathname || "";
      if (!target) {
        navigate(to, options);
        return;
      }

      // Normalize to path (ignore query/hash for comparison)
      const targetPathname = target.split("?")[0].split("#")[0];

      navigate(to, options);

      fallbackTimeoutRef.current = setTimeout(() => {
        fallbackTimeoutRef.current = null;
        const currentPathname = window.location.pathname;
        if (!targetPathname) {
          return;
        }

        const normalizedTarget =
          target.startsWith("http://") || target.startsWith("https://")
            ? target
            : target;

        if (!currentPathname.startsWith(targetPathname)) {
          console.warn("[useSafeNavigate] SPA navigation failed, forcing reload", {
            from: location.pathname,
            attempted: target,
            current: currentPathname,
          });
          window.location.assign(normalizedTarget);
        }
      }, fallbackDelay);
    },
    [navigate, fallbackDelay, location.pathname]
  );

  return safeNavigate;
}


