import { toast } from "@/components/ui/use-toast";
import { getNetworkErrorMessage } from "@/lib/apiError";
import { resolveAvatarUrl } from "@/lib/avatarUrl";
import { ENV } from "@/lib/env";
import { getEffectiveRole, isTesterTypePending } from "@/lib/utils";
import { syncFcmTokenForSession, clearFcmRegistrationCache, applyServerFcmEpoch, setupFcmPwaAutoSync, prepareFcmOnLogin } from "@/firebase-messaging-sw";
import { TesterType, User } from "@/types";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<boolean>;
  loginWithToken: (user: User, token: string) => Promise<void>;
  logout: (scope?: LogoutScope) => Promise<void>;
  register: (data: RegisterData) => Promise<boolean>;
  updateCurrentUser: (user: User) => void;
  storeIntendedDestination: (path: string) => void;
  exitImpersonateMode: () => void;
}

export type LogoutScope = "this_device" | "all_devices";

interface RegisterData {
  username: string;
  email: string;
  password: string;
  role: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = `${ENV.API_URL}/auth`;
const AUTH_ENDPOINTS = {
  login: `${API_URL}/login.php`,
  register: `${API_URL}/register.php`,
  me: `${API_URL}/me.php`,
};

/**
 * Why: Persist a browser-loadable avatar URL on the session user so Profile,
 * Sidebar, and nav never hit legacy `/BugRicer/backend/...` 404 paths.
 */
function withResolvedAvatar(user: User): User {
  const label = user.name || user.username || "User";
  const raw = (user.avatar || "").trim();
  if (!raw) return user;
  return { ...user, avatar: resolveAvatarUrl(raw, label) };
}

function handleAuthFcmSync(payload?: {
  fcm_token_epoch?: string | number;
  user?: { fcm_token_epoch?: string | number };
}) {
  const epoch = payload?.fcm_token_epoch ?? payload?.user?.fcm_token_epoch;
  applyServerFcmEpoch(epoch);
  // Why: Defer push-token sync so login/dashboard API burst does not hit Vercel 429.
  window.setTimeout(() => {
    void (async () => {
      await prepareFcmOnLogin();
      await syncFcmTokenForSession({ force: true, retries: 1, timeoutMs: 30_000 });
    })();
  }, 5000);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const revokeSessionForced = useCallback(() => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("intendedDestination");
    localStorage.removeItem("bugricer_feedback_submitted");
    setCurrentUser(null);
    navigate("/login", { replace: true });
    toast({
      title: "Session ended",
      description:
        "Your account is no longer active, was signed out everywhere, or was removed by an administrator.",
      variant: "destructive",
    });
  }, [navigate]);

  const updateCurrentUser = (user: User) => {
    setCurrentUser(withResolvedAvatar(user));
  };

  const storeIntendedDestination = (path: string) => {
    if (path && path !== "/login") {
      localStorage.setItem("intendedDestination", path);
    }
  };

  const checkAuthStatus = async () => {
    // 1. Check for token in URL (for admin deep links)
    const urlParams = new URLSearchParams(window.location.search);
    // /reset-password?token= carries a one-time password-reset token, not a session JWT.
    const urlToken =
      window.location.pathname === "/reset-password" ? null : urlParams.get("token");

    if (urlToken) {
      // Use the token from the URL and store it in sessionStorage for this tab only
      sessionStorage.setItem("token", urlToken);
      // Remove token from URL to keep it clean
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 2. Prioritize sessionStorage token, then fall back to localStorage
    const token =
      sessionStorage.getItem("token") || localStorage.getItem("token");

    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(AUTH_ENDPOINTS.me, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      // // console.log("Auth check response:", data);

      if (data.success && data.data) {
        // Check if this is an impersonation token by decoding the JWT
        try {
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          if (tokenPayload.purpose === 'dashboard_access' && tokenPayload.admin_id) {
            // This is an impersonation token, add admin_id to user data
            data.data.admin_id = tokenPayload.admin_id;
          }
        } catch (e) {
          // If token decoding fails, continue with normal flow
        }
        
        setCurrentUser(withResolvedAvatar(data.data));
        handleAuthFcmSync({ user: data.data, fcm_token_epoch: data.data?.fcm_token_epoch });
      } else {
        if (data?.error_code === "ACCOUNT_REVOKED") {
          revokeSessionForced();
        } else {
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
          setCurrentUser(null);
        }
      }
    } catch (error) {
      // console.error("Auth check error:", error);
      localStorage.removeItem("token");
      sessionStorage.removeItem("token"); // Also clear from session storage
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh FCM token whenever a user session is active and permission is granted
  useEffect(() => {
    if (!currentUser) return;
    handleAuthFcmSync({ user: currentUser as { fcm_token_epoch?: string | number } });
    const cleanupPwaSync = setupFcmPwaAutoSync();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void syncFcmTokenForSession({ force: true, retries: 2 });
      }
    };
    const intervalId = window.setInterval(() => {
      void syncFcmTokenForSession({ force: false, retries: 2 });
    }, 5 * 60 * 1000);

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(intervalId);
      cleanupPwaSync();
    };
  }, [currentUser?.id]);

  // Run auth check on mount and token change
  useEffect(() => {
    checkAuthStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only bootstrap
  }, []);

  useEffect(() => {
    const onRevoked = () => revokeSessionForced();
    window.addEventListener("auth:revoked", onRevoked);
    return () => window.removeEventListener("auth:revoked", onRevoked);
  }, [revokeSessionForced]);

  /**
   * Why: an admin can reclassify a CODO tester as Client mid-session. The backend
   * rejects work APIs with reason "client_tester"; mirroring that here lets
   * WorkforceRoute and the sidebar drop the work pages without a reload.
   */
  useEffect(() => {
    const onWorkforceDenied = () => {
      setCurrentUser((prev) =>
        prev && prev.role === "tester" && prev.tester_type !== "client"
          ? { ...prev, tester_type: "client" }
          : prev
      );
    };
    window.addEventListener("auth:workforce-denied", onWorkforceDenied);
    return () => window.removeEventListener("auth:workforce-denied", onWorkforceDenied);
  }, []);

  /**
   * Why: Google / OTP / magic-link logins return a user without tester_type.
   * Hydrate it once from /me; on failure fall back to "client" (least privilege)
   * so WorkforceRoute never waits indefinitely.
   */
  const testerTypePending = isTesterTypePending(currentUser);
  useEffect(() => {
    if (!testerTypePending || !currentUser) return;
    const userId = currentUser.id;
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    const controller = new AbortController();

    const apply = (value: TesterType) =>
      setCurrentUser((prev) =>
        prev && prev.id === userId && prev.tester_type === undefined
          ? { ...prev, tester_type: value }
          : prev
      );

    fetch(AUTH_ENDPOINTS.me, {
      headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => apply(data?.data?.tester_type === "codo" ? "codo" : "client"))
      .catch((error) => {
        if ((error as Error)?.name !== "AbortError") apply("client");
      });

    return () => controller.abort();
  }, [testerTypePending, currentUser?.id]);

  /**
   * Why: an admin can switch a user's CODO Rules / Cursor Tips between
   * Required, Optional and Hidden at any time. Logins other than /me return
   * no modes, so hydrate them once, then re-read them (throttled) whenever the
   * tab regains focus so the sidebar and gates follow without a hard refresh.
   */
  const standardsModesMissing = !!currentUser && currentUser.codo_rules_mode === undefined;
  useEffect(() => {
    if (!currentUser?.id) return;
    const userId = currentUser.id;
    let controller: AbortController | null = null;
    let lastFetch = 0;

    const refresh = () => {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (!token) return;
      controller?.abort();
      controller = new AbortController();
      lastFetch = Date.now();
      fetch(AUTH_ENDPOINTS.me, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          const next = data?.data;
          if (!data?.success || !next) return;
          setCurrentUser((prev) =>
            prev &&
            prev.id === userId &&
            (prev.codo_rules_mode !== next.codo_rules_mode ||
              prev.cursor_tips_mode !== next.cursor_tips_mode)
              ? {
                  ...prev,
                  codo_rules_mode: next.codo_rules_mode,
                  cursor_tips_mode: next.cursor_tips_mode,
                }
              : prev
          );
        })
        .catch(() => {
          // Keep the last known modes; the backend still enforces access.
        });
    };

    if (standardsModesMissing) refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFetch > 60_000) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      controller?.abort();
    };
  }, [currentUser?.id, standardsModesMissing]);

  // Heartbeat system - send heartbeat every 30 seconds when user is authenticated
  useEffect(() => {
    if (!currentUser) return;

    const sendHeartbeat = async () => {
      try {
        // Pause when offline or tab is in the background (Google-style)
        if (
          typeof navigator !== 'undefined' &&
          (!navigator.onLine || document.visibilityState !== 'visible')
        ) {
          return;
        }

        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(`${ENV.API_URL}/user/heartbeat.php`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.status === 403) {
          let payload: { error_code?: string } = {};
          try {
            const text = await res.text();
            if (text) payload = JSON.parse(text) as { error_code?: string };
          } catch {
            /* ignore non-JSON */
          }
          if (payload.error_code === "ACCOUNT_REVOKED") {
            revokeSessionForced();
          }
        }
      } catch {
        // Silent — offline banner covers connectivity; avoid console spam
      }
    };

    // Send heartbeat immediately on mount
    sendHeartbeat();

    // Set up interval for subsequent heartbeats
    const intervalId = setInterval(sendHeartbeat, 30000); // 30 seconds

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Cleanup interval on unmount or when user changes
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [currentUser, revokeSessionForced]);

  const login = async (
    identifier: string,
    password: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(AUTH_ENDPOINTS.login, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        localStorage.setItem("token", data.token);
        const user = data.user;
        setCurrentUser(withResolvedAvatar(user));
        handleAuthFcmSync({ user, fcm_token_epoch: data.fcm_token_epoch });

        // Start activity session tracking on login
        try {
          await fetch(`${ENV.API_URL}/users/start_session_on_login.php`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${data.token}`,
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          // Don't fail login if session tracking fails
          if (import.meta.env.DEV) {
            console.error("Failed to start session tracking:", error);
          }
        }

        // Get the intended destination or default to the user's role dashboard
        const intendedDestination =
          localStorage.getItem("intendedDestination") ||
          `/${getEffectiveRole(user)}/dashboard`;
        localStorage.removeItem("intendedDestination");
        navigate(intendedDestination, { replace: true });
        return true;
      }

      // Show error message for 401/400
      toast({
        title: "Login failed",
        description: data.message || "Invalid credentials",
        variant: "destructive",
      });

      return false;
    } catch (error) {
      toast({
        title: "Error",
        description: getNetworkErrorMessage(error),
        variant: "destructive",
      });
      return false;
    }
  };

  const register = async (data: RegisterData): Promise<boolean> => {
    try {
      const response = await fetch(AUTH_ENDPOINTS.register, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success && result.data?.token) {
        localStorage.setItem("token", result.data.token);
        const user = result.data.user;
        setCurrentUser(withResolvedAvatar(user));
        handleAuthFcmSync({ user, fcm_token_epoch: user?.fcm_token_epoch ?? result.fcm_token_epoch });
        navigate(`/${getEffectiveRole(user)}/dashboard`, { replace: true });
        return true;
      }

      // Show error message if available
      if (result.message) {
        toast({
          title: "Registration failed",
          description: result.message,
          variant: "destructive",
        });
      }

      return false;
    } catch (error) {
      // console.error("Registration error:", error);
      toast({
        title: "Error",
        description: getNetworkErrorMessage(error),
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = async (scope: LogoutScope = "this_device") => {
    // End activity session tracking / optionally revoke all JWT sessions
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (token && currentUser) {
      try {
        await fetch(`${ENV.API_URL}/users/end_session_on_logout.php`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: currentUser.id,
            scope,
          }),
        });
      } catch (error) {
        // Don't fail logout if session tracking fails
        if (import.meta.env.DEV) {
          console.error("Failed to end session tracking:", error);
        }
      }
    }

    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("intendedDestination");
    localStorage.removeItem("bugricer_feedback_submitted");
    clearFcmRegistrationCache();
    setCurrentUser(null);
    navigate("/login", { replace: true });
  };

  const loginWithToken = async (user: User, token: string) => {
    localStorage.setItem("token", token);
    setCurrentUser(withResolvedAvatar(user));
    handleAuthFcmSync({ user: user as { fcm_token_epoch?: string | number } });

    // Activity tracking runs in the background so it never delays the first screen.
    void fetch(`${ENV.API_URL}/users/start_session_on_login.php`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error("Failed to start session tracking:", error);
      }
    });

    // Get the intended destination or default to the user's role dashboard
    const intendedDestination =
      localStorage.getItem("intendedDestination") || `/${getEffectiveRole(user)}/dashboard`;
    localStorage.removeItem("intendedDestination");
    navigate(intendedDestination, { replace: true });
  };

  const exitImpersonateMode = async () => {
    try {
      // Log the impersonation exit before clearing tokens
      const token = sessionStorage.getItem("token");
      if (token) {
        await fetch(`${ENV.API_URL}/auth/log-impersonate-exit.php`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      // Don't block exit if logging fails
      console.error('Failed to log impersonation exit:', error);
    }
    
    // Clear session storage (which contains the impersonation token)
    sessionStorage.removeItem("token");
    localStorage.removeItem("bugricer_feedback_submitted");
    
    // Redirect to admin dashboard
    navigate("/admin/dashboard", { replace: true });
    
    // Reload the page to refresh authentication state
    window.location.reload();
  };

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    isLoading,
    login,
    loginWithToken,
    logout,
    register,
    updateCurrentUser,
    storeIntendedDestination,
    exitImpersonateMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
