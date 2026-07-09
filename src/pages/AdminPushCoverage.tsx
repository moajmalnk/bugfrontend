import { useEffect, useMemo, useState } from "react";
import { ENV } from "@/lib/env";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  Trash2,
  Users,
  UserX,
} from "lucide-react";

const TEAM_ROLLOUT_MESSAGE = `Hi team — please re-enable BugRicer push notifications on each device you use:

1. Open BugRicer and log in
2. Go to Settings → Notifications
3. Tap "Enable on this device" and allow notifications
4. Keep the app open for 15 seconds
5. Install the PWA if offered (optional, improves reliability)

Thank you!`;

type PushSummary = {
  active_users: number;
  users_with_tokens: number;
  users_without_tokens: number;
  total_device_tokens: number;
  recent_tokens_24h: number;
  pwa_installed_users: number;
  notification_enabled_users: number;
  notification_disabled_users: number;
  stale_tokens_30d?: number;
  legacy_recovered_tokens?: number;
};

type MissingUser = {
  id: string;
  username: string;
  email?: string;
};

type UserWithDevices = {
  id: string;
  username: string;
  email?: string;
  device_count?: number;
  last_used?: string;
};

type DeviceRow = {
  user_id: string;
  username: string;
  browser_name?: string;
  os_name?: string;
  device_label?: string;
  platform?: string;
  last_used?: string;
  is_stale?: number;
  is_legacy?: number;
};

const defaultSummary: PushSummary = {
  active_users: 0,
  users_with_tokens: 0,
  users_without_tokens: 0,
  total_device_tokens: 0,
  recent_tokens_24h: 0,
  pwa_installed_users: 0,
  notification_enabled_users: 0,
  notification_disabled_users: 0,
  stale_tokens_30d: 0,
  legacy_recovered_tokens: 0,
};

export default function AdminPushCoverage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [summary, setSummary] = useState<PushSummary>(defaultSummary);
  const [missingUsers, setMissingUsers] = useState<MissingUser[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [pwaInstalledUsers, setPwaInstalledUsers] = useState<UserWithDevices[]>([]);
  const [notificationEnabledUsers, setNotificationEnabledUsers] = useState<UserWithDevices[]>([]);
  const [notificationDisabledUsers, setNotificationDisabledUsers] = useState<MissingUser[]>([]);
  const [fcmTokenEpoch, setFcmTokenEpoch] = useState<string>("1");
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = () =>
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token");

  const fetchCoverage = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        setError("Missing auth token. Please login again.");
        return;
      }

      const res = await fetch(`${ENV.API_URL}/notifications/push_coverage.php`, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        setError(json?.message || "Failed to load push coverage");
        return;
      }

      setSummary(json.data?.summary || defaultSummary);
      setMissingUsers(json.data?.missing_users || []);
      setDevices(json.data?.devices || []);
      setPwaInstalledUsers(json.data?.pwa_installed_users || []);
      setNotificationEnabledUsers(json.data?.notification_enabled_users || []);
      setNotificationDisabledUsers(json.data?.notification_disabled_users || []);
      if (json.data?.fcm_token_epoch) {
        setFcmTokenEpoch(String(json.data.fcm_token_epoch));
      }
    } catch {
      setError("Failed to fetch push coverage data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCoverage();
  }, []);

  const coveragePct = useMemo(() => {
    if (!summary.active_users) return 0;
    return Math.round((summary.users_with_tokens / summary.active_users) * 100);
  }, [summary.active_users, summary.users_with_tokens]);

  const copyRolloutMessage = async () => {
    try {
      await navigator.clipboard.writeText(TEAM_ROLLOUT_MESSAGE);
      toast({
        title: "Copied",
        description: "Team rollout message copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard. Select and copy manually from Team Rollout Steps.",
        variant: "destructive",
      });
    }
  };

  const runLegacyCleanup = async (fullReset: boolean) => {
    if (fullReset) {
      const confirmed = window.confirm(
        "This deletes ALL device tokens and clears users.fcm_token. Users must re-enable notifications on every device. Continue?"
      );
      if (!confirmed) return;
    }

    setCleaning(true);
    try {
      const token = getAuthToken();
      if (!token) {
        setError("Missing auth token. Please login again.");
        return;
      }

      const res = await fetch(`${ENV.API_URL}/notifications/cleanup_legacy_fcm_tokens.php`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ full_reset: fullReset }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast({
          title: "Cleanup failed",
          description: json?.message || "Could not clean legacy tokens.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: fullReset ? "Full reset complete" : "Legacy tokens removed",
        description: `Deleted ${json.data?.deleted_token_rows ?? 0} rows. Bump FCM_TOKEN_EPOCH in backend/.env after deploy.`,
      });
      await fetchCoverage();
    } catch {
      toast({
        title: "Cleanup failed",
        description: "Network error while cleaning tokens.",
        variant: "destructive",
      });
    } finally {
      setCleaning(false);
    }
  };

  const metricCards = [
    { label: "Active Users", value: summary.active_users, tone: "text-gray-900 dark:text-white" },
    { label: "With Tokens", value: summary.users_with_tokens, tone: "text-emerald-600 dark:text-emerald-400" },
    { label: "Without Tokens", value: summary.users_without_tokens, tone: "text-rose-600 dark:text-rose-400" },
    { label: "Device Tokens", value: summary.total_device_tokens, tone: "text-cyan-600 dark:text-cyan-400" },
    { label: "Coverage", value: `${coveragePct}%`, tone: "text-indigo-600 dark:text-indigo-400" },
    { label: "Fresh (24h)", value: summary.recent_tokens_24h, tone: "text-emerald-600 dark:text-emerald-400" },
    { label: "Stale (30d+)", value: summary.stale_tokens_30d ?? 0, tone: "text-amber-600 dark:text-amber-400" },
    { label: "Legacy Rows", value: summary.legacy_recovered_tokens ?? 0, tone: "text-rose-600 dark:text-rose-400" },
    { label: "PWA Installed", value: summary.pwa_installed_users, tone: "text-violet-600 dark:text-violet-400" },
    { label: "Notif Enabled", value: summary.notification_enabled_users, tone: "text-emerald-600 dark:text-emerald-400" },
    { label: "Notif Disabled", value: summary.notification_disabled_users, tone: "text-rose-600 dark:text-rose-400" },
  ];

  if (currentUser?.role !== "admin") {
    return (
      <main className="p-6">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Only admins can access Push Coverage.
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-50/50 via-transparent to-indigo-50/50 dark:from-cyan-950/20 dark:via-transparent dark:to-indigo-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3 min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-xl shadow-lg">
                    <Smartphone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Push Coverage
                    </h1>
                    <div className="h-1 w-24 bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Monitor FCM token adoption across active users and devices.
                </p>
                <p className="text-xs text-muted-foreground">
                  Server token epoch: <span className="font-mono font-semibold">{fcmTokenEpoch}</span>
                  {" "}— bump <span className="font-mono">FCM_TOKEN_EPOCH</span> in backend/.env after a DB reset.
                </p>
              </div>
              <div className="shrink-0 flex flex-wrap gap-2">
                <Button
                  onClick={() => void copyRolloutMessage()}
                  variant="outline"
                  className="h-11 px-5 rounded-xl"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Rollout Message
                </Button>
                <Button
                  onClick={() => void runLegacyCleanup(false)}
                  variant="outline"
                  disabled={cleaning || loading}
                  className="h-11 px-5 rounded-xl"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clean Legacy Tokens
                </Button>
                <Button
                  onClick={() => void fetchCoverage()}
                  variant="outline"
                  disabled={loading}
                  className="h-11 px-5 rounded-xl border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 shadow-sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-red-50/60 to-orange-50/60 dark:from-red-950/20 dark:to-orange-950/20 rounded-2xl" />
            <div className="relative rounded-2xl border border-red-200/70 dark:border-red-800/70 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-4 sm:p-5 text-red-700 dark:text-red-300 flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <p className="text-sm sm:text-base font-medium">{error}</p>
            </div>
          </div>
        )}

        {(summary.legacy_recovered_tokens ?? 0) > 0 && (
          <div className="rounded-2xl border border-amber-200/70 dark:border-amber-800/70 bg-amber-50/60 dark:bg-amber-950/20 p-4 text-sm text-amber-800 dark:text-amber-200 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Legacy recovered tokens detected ({summary.legacy_recovered_tokens})</p>
              <p className="mt-1">
                These were copied from old data, not live browsers. Use &quot;Clean Legacy Tokens&quot;, bump
                FCM_TOKEN_EPOCH, then ask users to re-enable notifications.
              </p>
            </div>
          </div>
        )}

        <section className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
          {metricCards.map((metric) => (
            <Card
              key={metric.label}
              className="border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm rounded-2xl"
            >
              <CardHeader className="pb-1 px-4 pt-4 sm:px-5 sm:pt-5">
                <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground">
                  {metric.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
                <div className={`text-2xl sm:text-3xl font-bold ${metric.tone}`}>
                  {loading ? "..." : metric.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
          <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <UserX className="h-4 w-4 text-rose-500" />
                Missing Users ({missingUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[30rem] overflow-auto">
              {missingUsers.length === 0 ? (
                <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  All active users have at least one FCM device token.
                </div>
              ) : (
                missingUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{u.username}</p>
                      {u.email ? (
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      ) : null}
                    </div>
                    <Badge variant="destructive" className="rounded-full px-3">
                      Missing
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Smartphone className="h-4 w-4 text-cyan-500" />
                Recent Devices ({devices.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[30rem] overflow-auto">
              {devices.length === 0 ? (
                <div className="rounded-xl border border-amber-200/60 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  No device tokens found yet.
                </div>
              ) : (
                devices.map((d, idx) => (
                  <div
                    key={`${d.user_id}-${idx}`}
                    className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-semibold truncate">{d.username || "Unknown user"}</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {d.is_legacy === 1 ? (
                          <Badge variant="destructive" className="rounded-full text-xs">Legacy</Badge>
                        ) : null}
                        {d.is_stale === 1 ? (
                          <Badge variant="outline" className="rounded-full text-xs border-amber-500 text-amber-700 dark:text-amber-300">
                            Stale 30d+
                          </Badge>
                        ) : null}
                        <Badge variant="secondary" className="whitespace-nowrap rounded-full">
                          {d.browser_name || "Unknown"} / {d.os_name || "Unknown"}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {d.device_label || "Unknown device"} • Last used: {d.last_used || "N/A"}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5">
          <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Smartphone className="h-4 w-4 text-violet-500" />
                PWA Installed Users ({pwaInstalledUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[24rem] overflow-auto">
              {pwaInstalledUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users have registered from installed PWA yet.</p>
              ) : (
                pwaInstalledUsers.map((u) => (
                  <div key={u.id} className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold truncate">{u.username}</p>
                      <Badge variant="secondary" className="rounded-full">{u.device_count || 0} devices</Badge>
                    </div>
                    {u.email ? <p className="text-xs text-muted-foreground truncate mt-1">{u.email}</p> : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Notification Enabled ({notificationEnabledUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[24rem] overflow-auto">
              {notificationEnabledUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users with active notification tokens found.</p>
              ) : (
                notificationEnabledUsers.map((u) => (
                  <div key={u.id} className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold truncate">{u.username}</p>
                      <Badge className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        Enabled
                      </Badge>
                    </div>
                    {u.email ? <p className="text-xs text-muted-foreground truncate mt-1">{u.email}</p> : null}
                    {u.last_used ? (
                      <p className="text-xs text-muted-foreground truncate mt-1">Last token: {u.last_used}</p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                Notification Disabled ({notificationDisabledUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[24rem] overflow-auto">
              {notificationDisabledUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">All active users are notification-enabled.</p>
              ) : (
                notificationDisabledUsers.map((u) => (
                  <div key={u.id} className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold truncate">{u.username}</p>
                      <Badge variant="destructive" className="rounded-full">Disabled</Badge>
                    </div>
                    {u.email ? <p className="text-xs text-muted-foreground truncate mt-1">{u.email}</p> : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              Team Rollout Steps
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <pre className="whitespace-pre-wrap rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-4 text-xs sm:text-sm text-foreground">
              {TEAM_ROLLOUT_MESSAGE}
            </pre>
            <p>After cleanup: set <span className="font-mono">FCM_TOKEN_EPOCH=2</span> in backend/.env (or higher), deploy backend, then send the rollout message.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => void copyRolloutMessage()}>
                <Copy className="h-4 w-4 mr-2" />
                Copy message
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={cleaning}
                onClick={() => void runLegacyCleanup(true)}
              >
                Full token reset (all devices)
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
