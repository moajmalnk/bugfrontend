import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/axios";
import { googleDocsService } from "@/services/googleDocsService";
import { Loader2, LogOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type GatePhase = "idle" | "locked" | "error";

function authToken(): string | null {
  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("token")
  );
}

/**
 * Why: an admin can require a Google link from Push Coverage. The dashboard
 * stays covered until that person connects; a saved token clears the lock.
 */
export default function GoogleConnectGate() {
  const { currentUser, logout, exitImpersonateMode } = useAuth();
  const impersonating = Boolean(
    currentUser?.admin_id && currentUser.admin_id !== currentUser.id
  );
  const [phase, setPhase] = useState<GatePhase>("idle");
  const [connecting, setConnecting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const check = useCallback(async () => {
    if (!currentUser?.id || impersonating) {
      setPhase("idle");
      return;
    }
    try {
      const response = await apiClient.get<{
        success: boolean;
        data?: { required?: boolean; connected?: boolean };
      }>("/notifications/google_connect_gate.php");
      const required = response.data?.data?.required === true;
      const connected = response.data?.data?.connected === true;
      setPhase(required && !connected ? "locked" : "idle");
    } catch {
      setPhase((current) => (current === "locked" ? "error" : "idle"));
    }
  }, [currentUser?.id, impersonating]);

  useEffect(() => {
    void check();
  }, [check]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => void check(), 60_000);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [check]);

  const connect = () => {
    if (connecting) return;
    setConnecting(true);
    const isLocal =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const returnUrl = isLocal
      ? `http://localhost:8080${window.location.pathname}`
      : `https://bugs.bugricer.com${window.location.pathname}`;
    window.location.href = googleDocsService.getAuthUrl(authToken() ?? undefined, returnUrl);
  };

  if (phase === "idle") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[220] overflow-y-auto bg-background custom-scrollbar"
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-connect-gate-title"
    >
      <div className="mx-auto grid min-h-full w-full max-w-xl grid-cols-12 content-center gap-4 px-4 py-8 sm:px-6">
        <div className="col-span-12 space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Google account required
          </p>
          <h2 id="google-connect-gate-title" className="text-2xl font-semibold text-foreground">
            Connect Google to continue
          </h2>
          <p className="text-sm text-muted-foreground">
            An admin asked you to link Google before the dashboard opens. Docs, Sheets, and Meet
            stay unavailable until the account is connected.
          </p>
          {phase === "error" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The connect check could not be confirmed. Try again before leaving this screen.
              </p>
              <Button type="button" className="h-11 w-full rounded-xl" onClick={() => void check()}>
                Try again
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              className="h-11 w-full rounded-xl"
              disabled={connecting}
              onClick={connect}
            >
              {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Connect Google account
            </Button>
          )}
        </div>
        <div className="col-span-12">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl text-muted-foreground"
            disabled={loggingOut || connecting}
            onClick={() => {
              setLoggingOut(true);
              if (impersonating) {
                void Promise.resolve(exitImpersonateMode()).finally(() => setLoggingOut(false));
                return;
              }
              void logout().finally(() => setLoggingOut(false));
            }}
          >
            {loggingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Log out
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
