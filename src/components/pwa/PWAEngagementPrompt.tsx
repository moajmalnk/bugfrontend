import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Download, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  requestNotificationPermission,
  getNotificationPermissionState,
} from "@/firebase-messaging-sw";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const INSTALL_DISMISS_KEY = "bugricer_pwa_install_dismissed_at";
const NOTIF_DISMISS_KEY = "bugricer_pwa_notif_dismissed_at";
/** Legacy key from the first prompt version — clear so users are not stuck for 7 days */
const LEGACY_DISMISS_KEY = "bugricer_pwa_prompt_dismissed_at";
const INSTALL_DISMISS_DAYS = 7;
/** Short cooldown only — notifications should be asked again soon if still default */
const NOTIF_DISMISS_HOURS = 12;

function clearLegacyDismiss() {
  try {
    localStorage.removeItem(LEGACY_DISMISS_KEY);
  } catch {
    // ignore
  }
}

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

function wasDismissed(key: string, maxMs: number): boolean {
  const raw = localStorage.getItem(key);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) return false;
  return Date.now() - dismissedAt < maxMs;
}

function markDismissed(key: string) {
  localStorage.setItem(key, String(Date.now()));
}

function clearDismissed(key: string) {
  localStorage.removeItem(key);
}

/**
 * Custom install + notification prompt.
 * Install and notifications are tracked separately so installing the app
 * never blocks the notification permission ask.
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
  const [forceNotifPrompt, setForceNotifPrompt] = useState(false);

  const ios = useMemo(() => isIosDevice(), []);
  const canInstall = Boolean(deferredPrompt) && !installDone;
  const needsNotifications = notificationState === "default";
  const notificationsBlocked = notificationState === "denied";

  const refreshPermission = useCallback(() => {
    const permission = getNotificationPermissionState();
    setNotificationState(permission);
    return permission;
  }, []);

  const openNotificationPrompt = useCallback(() => {
    clearDismissed(NOTIF_DISMISS_KEY);
    setForceNotifPrompt(true);
    refreshPermission();
    setOpen(true);
  }, [refreshPermission]);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstallDone(true);
      setDeferredPrompt(null);
      setStatusMessage("App installed. Enable notifications to get bug alerts.");
      // Always ask for notifications right after install
      clearDismissed(NOTIF_DISMISS_KEY);
      setForceNotifPrompt(true);
      if (getNotificationPermissionState() === "default") {
        setOpen(true);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Decide when to show the modal
  useEffect(() => {
    if (!currentUser) {
      setOpen(false);
      return;
    }

    clearLegacyDismiss();

    const timer = window.setTimeout(() => {
      const standalone = isStandaloneDisplay();
      setInstallDone(standalone);
      const permission = refreshPermission();

      const showInstall =
        !standalone &&
        !wasDismissed(INSTALL_DISMISS_KEY, INSTALL_DISMISS_DAYS * 24 * 60 * 60 * 1000);

      const showNotifications =
        permission === "default" &&
        (forceNotifPrompt ||
          standalone ||
          !wasDismissed(NOTIF_DISMISS_KEY, NOTIF_DISMISS_HOURS * 60 * 60 * 1000));

      // Installed PWA with no permission yet → always prioritize notifications
      if (standalone && permission === "default") {
        setOpen(true);
        return;
      }

      if (showInstall || showNotifications) {
        setOpen(true);
      }
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [currentUser, deferredPrompt, forceNotifPrompt, refreshPermission]);

  // Quietly refresh FCM token when already granted
  useEffect(() => {
    if (!currentUser) return;
    if (getNotificationPermissionState() !== "granted") return;
    void requestNotificationPermission({ interactive: false });
  }, [currentUser]);

  const closePrompt = useCallback(
    (persistDismiss: boolean) => {
      setOpen(false);
      setStatusMessage(null);
      setForceNotifPrompt(false);
      if (!persistDismiss) return;

      if (!installDone) {
        markDismissed(INSTALL_DISMISS_KEY);
      }
      // Only snooze notifications if still default (user chose "Not now")
      if (getNotificationPermissionState() === "default") {
        markDismissed(NOTIF_DISMISS_KEY);
      }
    },
    [installDone]
  );

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    setStatusMessage(null);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallDone(true);
        setStatusMessage("App installed. Next: enable notifications.");
        clearDismissed(NOTIF_DISMISS_KEY);
        setForceNotifPrompt(true);
        // Keep dialog open for notifications
        setOpen(true);
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
      const permission = refreshPermission();
      if (result === "granted" || permission === "granted") {
        clearDismissed(NOTIF_DISMISS_KEY);
        setStatusMessage("Notifications enabled. You will get bug alerts on this device.");
        // Close shortly after success
        window.setTimeout(() => {
          setOpen(false);
          setForceNotifPrompt(false);
        }, 1800);
      } else if (result === "denied" || permission === "denied") {
        setStatusMessage(
          "Notifications are blocked. Open site settings and allow notifications for BugRicer, then tap Enable again."
        );
      } else {
        setStatusMessage("Could not enable notifications on this device. Try again from the bell button.");
      }
    } finally {
      setEnablingNotifications(false);
    }
  };

  const showFloatingBell =
    Boolean(currentUser) &&
    !open &&
    (needsNotifications || notificationsBlocked);

  return (
    <>
      {showFloatingBell && (
        <button
          type="button"
          onClick={openNotificationPrompt}
          className={cn(
            "fixed z-[70] bottom-20 right-4 sm:bottom-6 sm:right-6",
            "flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg shadow-black/40",
            "bg-violet-600 text-white text-sm font-medium",
            "hover:bg-violet-500 active:scale-[0.98] transition"
          )}
        >
          <Bell className="h-4 w-4" />
          Enable notifications
        </button>
      )}

      {open && currentUser && (
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
                  {installDone ? (
                    <Bell className="h-5 w-5 text-violet-400" />
                  ) : (
                    <Smartphone className="h-5 w-5 text-blue-400" />
                  )}
                </div>
                <div>
                  <h2 id="pwa-prompt-title" className="text-base font-semibold text-white">
                    {installDone ? "Enable push notifications" : "Install BugRicer & stay updated"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                    {installDone
                      ? "Allow notifications so you get alerts for new bugs, fixes, and messages on this device."
                      : "Add the app to your home screen and allow notifications for new bugs, fixes, and messages."}
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
                          Open the installed app, then enable notifications.
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400">
                      Use your browser menu (<strong className="text-slate-200">Install app</strong> /
                      Add to Home screen).
                    </p>
                  )}
                </div>
              )}

              {(needsNotifications || notificationsBlocked) && (
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                    <Bell className="h-4 w-4 text-violet-400" />
                    Push notifications
                  </div>
                  <p className="mt-1.5 text-sm text-slate-400">
                    {notificationsBlocked
                      ? "Notifications are blocked for this site. Allow them in browser/app settings, then tap the button below."
                      : "Get alerts for bugs and important project updates. Tap the button to allow."}
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
                {notificationState === "granted" && (
                  <Button className="flex-1" onClick={() => closePrompt(false)}>
                    Done
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
