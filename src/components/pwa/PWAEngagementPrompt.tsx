import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Download, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  requestNotificationPermission,
  getNotificationPermissionState,
} from "@/firebase-messaging-sw";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "bugricer_pwa_prompt_dismissed_at";
const DISMISS_DAYS = 7;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return media || iosStandalone;
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function wasRecentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) return false;
  return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function markDismissed() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

/**
 * Custom install + notification prompt.
 * Uses beforeinstallprompt for Android/Chrome and Share guidance for iOS.
 * Never calls the browser permission API until the user taps Enable.
 */
export function PWAEngagementPrompt() {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [enablingNotifications, setEnablingNotifications] = useState(false);
  const [notificationState, setNotificationState] = useState<NotificationPermission | "unsupported">(
    () => getNotificationPermissionState()
  );
  const [installDone, setInstallDone] = useState(() => isStandaloneDisplay());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const ios = useMemo(() => isIosDevice(), []);
  const canInstall = Boolean(deferredPrompt) && !installDone;
  const needsNotifications = notificationState === "default";

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", () => {
      setInstallDone(true);
      setDeferredPrompt(null);
      setStatusMessage("App installed on this device.");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setOpen(false);
      return;
    }

    if (wasRecentlyDismissed()) return;

    const timer = window.setTimeout(() => {
      const standalone = isStandaloneDisplay();
      setInstallDone(standalone);
      const permission = getNotificationPermissionState();
      setNotificationState(permission);

      const showInstall = !standalone;
      const showNotifications = permission === "default";

      if (showInstall || showNotifications) {
        setOpen(true);
      }
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [currentUser, deferredPrompt, ios]);

  // If permission already granted, quietly refresh FCM token after login
  useEffect(() => {
    if (!currentUser) return;
    if (getNotificationPermissionState() !== "granted") return;
    void requestNotificationPermission({ interactive: false });
  }, [currentUser]);

  const closePrompt = useCallback((persistDismiss: boolean) => {
    setOpen(false);
    setStatusMessage(null);
    if (persistDismiss) {
      markDismissed();
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    setStatusMessage(null);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallDone(true);
        setStatusMessage("App installed. You can open BugRicer from your home screen.");
      } else {
        setStatusMessage("Install cancelled. You can try again anytime.");
      }
      setDeferredPrompt(null);
    } catch {
      setStatusMessage("Install is not available in this browser right now.");
    } finally {
      setInstalling(false);
    }
  };

  const handleEnableNotifications = async () => {
    setEnablingNotifications(true);
    setStatusMessage(null);
    try {
      const result = await requestNotificationPermission({ interactive: true });
      setNotificationState(getNotificationPermissionState());
      if (result === "granted") {
        setStatusMessage("Notifications enabled. You will get bug alerts on this device.");
      } else if (result === "denied") {
        setStatusMessage(
          "Notifications are blocked. Enable them in your browser or phone settings for BugRicer."
        );
      } else {
        setStatusMessage("Could not enable notifications on this device.");
      }
    } finally {
      setEnablingNotifications(false);
    }
  };

  if (!open || !currentUser) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-prompt-title"
        className={cn(
          "w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-950 shadow-2xl shadow-black/50",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}
      >
        <div className="flex items-start justify-between gap-3 p-5 pb-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600/15 border border-blue-500/30">
              <Smartphone className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 id="pwa-prompt-title" className="text-base font-semibold text-white">
                Install BugRicer & stay updated
              </h2>
              <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                Add the app to your home screen and allow notifications for new bugs, fixes, and
                messages.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => closePrompt(true)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 pb-5">
          {!installDone && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                <Download className="h-4 w-4 text-blue-400" />
                Install app
              </div>
              {canInstall ? (
                <Button
                  className="mt-3 w-full"
                  onClick={handleInstall}
                  disabled={installing}
                >
                  {installing ? "Opening install…" : "Install BugRicer"}
                </Button>
              ) : ios ? (
                <div className="mt-2 space-y-2 text-sm text-slate-400">
                  <p className="flex items-start gap-2">
                    <Share className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                    <span>
                      Tap the <strong className="text-slate-200">Share</strong> button in Safari,
                      then choose <strong className="text-slate-200">Add to Home Screen</strong>.
                      On iPhone, open the installed app before enabling notifications.
                    </span>
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-400">
                  Use your browser menu (<strong className="text-slate-200">Install app</strong> /
                  Add to Home screen). The install button appears when Chrome is ready.
                </p>
              )}
            </div>
          )}

          {needsNotifications && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                <Bell className="h-4 w-4 text-violet-400" />
                Push notifications
              </div>
              <p className="mt-1.5 text-sm text-slate-400">
                Get alerts for bugs assigned to you and important project updates.
              </p>
              <Button
                className="mt-3 w-full bg-violet-600 hover:bg-violet-500"
                onClick={handleEnableNotifications}
                disabled={enablingNotifications}
              >
                {enablingNotifications ? "Requesting…" : "Enable notifications"}
              </Button>
            </div>
          )}

          {statusMessage && (
            <p className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-300">
              {statusMessage}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost"
              className="flex-1 text-slate-300 hover:text-white"
              onClick={() => closePrompt(true)}
            >
              Not now
            </Button>
            {!needsNotifications && (installDone || !canInstall) && (
              <Button className="flex-1" onClick={() => closePrompt(true)}>
                Done
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
