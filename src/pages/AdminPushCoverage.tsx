import { useCallback, useEffect, useMemo, useState } from "react";
import { ENV } from "@/lib/env";
import { useAuth } from "@/context/AuthContext";
import { getEffectiveRole, hasPermissionOrAdmin } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  MessageCircle,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  UserX,
} from "lucide-react";

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
  mail_ready?: number;
  mail_missing?: number;
  whatsapp_ready?: number;
  whatsapp_missing?: number;
  mail_sent_7d?: number;
  mail_failed_7d?: number;
  whatsapp_sent_7d?: number;
  whatsapp_failed_7d?: number;
};

type MissingUser = {
  id: string;
  username: string;
  email?: string;
  push_notifications_enabled?: boolean;
};

type UserWithDevices = {
  id: string;
  username: string;
  email?: string;
  device_count?: number;
  last_used?: string;
  push_notifications_enabled?: boolean;
};

type ChannelUser = {
  id: string;
  username: string;
  email?: string;
  phone?: string;
};

type DeliveryLogRow = {
  id: number | string;
  channel: string;
  status: string;
  user_id?: string | null;
  username?: string | null;
  recipient: string;
  subject?: string | null;
  error_message?: string | null;
  created_at?: string;
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
  push_notifications_enabled?: boolean;
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
  mail_ready: 0,
  mail_missing: 0,
  whatsapp_ready: 0,
  whatsapp_missing: 0,
  mail_sent_7d: 0,
  mail_failed_7d: 0,
  whatsapp_sent_7d: 0,
  whatsapp_failed_7d: 0,
};

function isPushEnabled(value: boolean | number | undefined | null): boolean {
  if (value === false || value === 0) return false;
  return true;
}

export default function AdminPushCoverage() {
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions(null);
  const role = getEffectiveRole(currentUser || {});
  const canViewPush = hasPermissionOrAdmin(role, hasPermission, "PUSH_COVERAGE_VIEW");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PushSummary>(defaultSummary);
  const [missingUsers, setMissingUsers] = useState<MissingUser[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [pwaInstalledUsers, setPwaInstalledUsers] = useState<UserWithDevices[]>([]);
  const [notificationEnabledUsers, setNotificationEnabledUsers] = useState<UserWithDevices[]>([]);
  const [notificationDisabledUsers, setNotificationDisabledUsers] = useState<MissingUser[]>([]);
  const [mailReadyUsers, setMailReadyUsers] = useState<ChannelUser[]>([]);
  const [mailMissingUsers, setMailMissingUsers] = useState<ChannelUser[]>([]);
  const [whatsappReadyUsers, setWhatsappReadyUsers] = useState<ChannelUser[]>([]);
  const [whatsappMissingUsers, setWhatsappMissingUsers] = useState<ChannelUser[]>([]);
  const [mailRecentSent, setMailRecentSent] = useState<DeliveryLogRow[]>([]);
  const [mailRecentErrors, setMailRecentErrors] = useState<DeliveryLogRow[]>([]);
  const [whatsappRecentSent, setWhatsappRecentSent] = useState<DeliveryLogRow[]>([]);
  const [whatsappRecentErrors, setWhatsappRecentErrors] = useState<DeliveryLogRow[]>([]);
  const [fcmTokenEpoch, setFcmTokenEpoch] = useState<string>("1");
  const [error, setError] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const getAuthToken = () =>
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token");

  const fetchCoverage = useCallback(async () => {
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
      setMailReadyUsers(json.data?.mail_ready_users || []);
      setMailMissingUsers(json.data?.mail_missing_users || []);
      setWhatsappReadyUsers(json.data?.whatsapp_ready_users || []);
      setWhatsappMissingUsers(json.data?.whatsapp_missing_users || []);
      setMailRecentSent(json.data?.mail_recent_sent || []);
      setMailRecentErrors(json.data?.mail_recent_errors || []);
      setWhatsappRecentSent(json.data?.whatsapp_recent_sent || []);
      setWhatsappRecentErrors(json.data?.whatsapp_recent_errors || []);
      if (json.data?.fcm_token_epoch) {
        setFcmTokenEpoch(String(json.data.fcm_token_epoch));
      }
    } catch {
      setError("Failed to fetch push coverage data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCoverage();
  }, [fetchCoverage]);

  const applyLocalPushFlag = (userId: string, enabled: boolean) => {
    const patchUser = <T extends { id?: string; user_id?: string; push_notifications_enabled?: boolean }>(
      list: T[]
    ): T[] =>
      list.map((row) => {
        const id = String(row.id || row.user_id || "");
        if (id !== userId) return row;
        return { ...row, push_notifications_enabled: enabled };
      });

    setMissingUsers((prev) => patchUser(prev));
    setDevices((prev) => patchUser(prev));
    setPwaInstalledUsers((prev) => patchUser(prev));
    setNotificationEnabledUsers((prev) => patchUser(prev));
    setNotificationDisabledUsers((prev) => patchUser(prev));
  };

  const toggleUserPush = async (userId: string, username: string, enabled: boolean) => {
    const token = getAuthToken();
    if (!token) {
      toast({
        title: "Not signed in",
        description: "Please login again.",
        variant: "destructive",
      });
      return;
    }

    setTogglingUserId(userId);
    applyLocalPushFlag(userId, enabled);

    try {
      const res = await fetch(`${ENV.API_URL}/notifications/set_user_push.php`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId, enabled }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        applyLocalPushFlag(userId, !enabled);
        toast({
          title: "Could not update push",
          description: json?.message || "Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: enabled ? "Push enabled" : "Push disabled",
        description: `${username}: ${enabled ? "will receive" : "will not receive"} push notifications.`,
      });
      void fetchCoverage();
    } catch {
      applyLocalPushFlag(userId, !enabled);
      toast({
        title: "Could not update push",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTogglingUserId(null);
    }
  };

  const coveragePct = useMemo(() => {
    if (!summary.active_users) return 0;
    return Math.round((summary.users_with_tokens / summary.active_users) * 100);
  }, [summary.active_users, summary.users_with_tokens]);

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
    { label: "Mail Ready", value: summary.mail_ready ?? 0, tone: "text-sky-600 dark:text-sky-400" },
    { label: "Mail Missing", value: summary.mail_missing ?? 0, tone: "text-rose-600 dark:text-rose-400" },
    { label: "Mail Sent (7d)", value: summary.mail_sent_7d ?? 0, tone: "text-emerald-600 dark:text-emerald-400" },
    { label: "Mail Errors (7d)", value: summary.mail_failed_7d ?? 0, tone: "text-rose-600 dark:text-rose-400" },
    { label: "WA Ready", value: summary.whatsapp_ready ?? 0, tone: "text-teal-600 dark:text-teal-400" },
    { label: "WA Missing", value: summary.whatsapp_missing ?? 0, tone: "text-rose-600 dark:text-rose-400" },
    { label: "WA Sent (7d)", value: summary.whatsapp_sent_7d ?? 0, tone: "text-emerald-600 dark:text-emerald-400" },
    { label: "WA Errors (7d)", value: summary.whatsapp_failed_7d ?? 0, tone: "text-rose-600 dark:text-rose-400" },
  ];

  const PushToggle = ({
    userId,
    username,
    enabled,
  }: {
    userId: string;
    username: string;
    enabled: boolean;
  }) => (
    <div
      className="flex items-center gap-2 shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline">
        {enabled ? "On" : "Off"}
      </span>
      <Switch
        checked={enabled}
        disabled={togglingUserId === userId || loading}
        onCheckedChange={(checked) => {
          void toggleUserPush(userId, username, checked);
        }}
        aria-label={`Push notifications for ${username}`}
      />
    </div>
  );

  if (!canViewPush) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Only admins can access Push Coverage.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full space-y-6 sm:space-y-8">
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
                  Monitor FCM adoption, email/WhatsApp recipients, and delivery errors.
                </p>
                <p className="text-xs text-muted-foreground">
                  Server token epoch: <span className="font-mono font-semibold">{fcmTokenEpoch}</span>
                  {" "}— bump <span className="font-mono">FCM_TOKEN_EPOCH</span> in backend/.env after a DB reset.
                </p>
              </div>
              <div className="shrink-0 flex flex-wrap gap-2">
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
                These were copied from old data, not live browsers. Bump
                FCM_TOKEN_EPOCH, then ask users to log out and back in to re-enable notifications.
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
              <p className="text-xs text-muted-foreground font-normal">
                No FCM token yet — toggle still controls whether push is allowed when they register.
              </p>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[30rem] overflow-auto">
              {missingUsers.length === 0 ? (
                <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  All active users have at least one FCM device token.
                </div>
              ) : (
                missingUsers.map((u) => {
                  const enabled = isPushEnabled(u.push_notifications_enabled);
                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{u.username}</p>
                        {u.email ? (
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="destructive" className="rounded-full px-3 hidden xs:inline-flex sm:inline-flex">
                          Missing
                        </Badge>
                        <PushToggle userId={u.id} username={u.username} enabled={enabled} />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Smartphone className="h-4 w-4 text-cyan-500" />
                Recent Devices ({devices.length})
              </CardTitle>
              <p className="text-xs text-muted-foreground font-normal">
                Toggle push for the device owner (applies to all of their tokens).
              </p>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[30rem] overflow-auto">
              {devices.length === 0 ? (
                <div className="rounded-xl border border-amber-200/60 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  No device tokens found yet.
                </div>
              ) : (
                devices.map((d, idx) => {
                  const enabled = isPushEnabled(d.push_notifications_enabled);
                  return (
                    <div
                      key={`${d.user_id}-${idx}`}
                      className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-3"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-semibold truncate min-w-0 flex-1">
                          {d.username || "Unknown user"}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {d.is_legacy === 1 ? (
                            <Badge variant="destructive" className="rounded-full text-xs">Legacy</Badge>
                          ) : null}
                          {d.is_stale === 1 ? (
                            <Badge
                              variant="outline"
                              className="rounded-full text-xs border-amber-500 text-amber-700 dark:text-amber-300"
                            >
                              Stale 30d+
                            </Badge>
                          ) : null}
                          <Badge variant="secondary" className="whitespace-nowrap rounded-full">
                            {d.browser_name || "Unknown"} / {d.os_name || "Unknown"}
                          </Badge>
                          <PushToggle
                            userId={d.user_id}
                            username={d.username || "user"}
                            enabled={enabled}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {d.device_label || "Unknown device"} • Last used: {d.last_used || "N/A"}
                      </p>
                    </div>
                  );
                })
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
                pwaInstalledUsers.map((u) => {
                  const enabled = isPushEnabled(u.push_notifications_enabled);
                  return (
                    <div
                      key={u.id}
                      className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{u.username}</p>
                          {u.email ? (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="rounded-full">
                            {u.device_count || 0} devices
                          </Badge>
                          <PushToggle userId={u.id} username={u.username} enabled={enabled} />
                        </div>
                      </div>
                    </div>
                  );
                })
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
                <p className="text-sm text-muted-foreground">No users with push enabled.</p>
              ) : (
                notificationEnabledUsers.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{u.username}</p>
                        {u.email ? (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                        ) : null}
                        {u.last_used ? (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            Last token: {u.last_used}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          Enabled
                        </Badge>
                        <PushToggle userId={u.id} username={u.username} enabled />
                      </div>
                    </div>
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
                <p className="text-sm text-muted-foreground">No users are admin-disabled for push.</p>
              ) : (
                notificationDisabledUsers.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{u.username}</p>
                        {u.email ? (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="destructive" className="rounded-full">
                          Disabled
                        </Badge>
                        <PushToggle userId={u.id} username={u.username} enabled={false} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5 text-sky-500" />
            Email coverage
          </h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
            <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-sky-500" />
                  Mail Receivers ({mailReadyUsers.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground font-normal">
                  Active users with a valid email on file.
                </p>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[24rem] overflow-auto">
                {mailReadyUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users with a valid email.</p>
                ) : (
                  mailReadyUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{u.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <Badge className="rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 shrink-0">
                        Ready
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <UserX className="h-4 w-4 text-rose-500" />
                  Mail Missing ({mailMissingUsers.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground font-normal">
                  Active users without a usable email address.
                </p>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[24rem] overflow-auto">
                {mailMissingUsers.length === 0 ? (
                  <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    All active users have a valid email.
                  </div>
                ) : (
                  mailMissingUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{u.username}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {u.email?.trim() || "No email"}
                        </p>
                      </div>
                      <Badge variant="destructive" className="rounded-full shrink-0">
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
                  <Mail className="h-4 w-4 text-emerald-500" />
                  Recent Mail Sent ({mailRecentSent.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground font-normal">
                  Latest successful email deliveries from the log.
                </p>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[24rem] overflow-auto">
                {mailRecentSent.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No successful mail logged yet. New sends appear here automatically.
                  </p>
                ) : (
                  mailRecentSent.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold truncate min-w-0 flex-1">
                          {row.username || row.recipient}
                        </p>
                        <Badge className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 shrink-0">
                          Sent
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {row.recipient}
                        {row.subject ? ` • ${row.subject}` : ""}
                      </p>
                      {row.created_at ? (
                        <p className="text-xs text-muted-foreground mt-0.5">{row.created_at}</p>
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
                  Mail Errors ({mailRecentErrors.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground font-normal">
                  Failed email attempts with error details.
                </p>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[24rem] overflow-auto">
                {mailRecentErrors.length === 0 ? (
                  <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    No mail delivery errors logged.
                  </div>
                ) : (
                  mailRecentErrors.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold truncate min-w-0 flex-1">
                          {row.username || row.recipient}
                        </p>
                        <Badge variant="destructive" className="rounded-full shrink-0">
                          Error
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">{row.recipient}</p>
                      {row.error_message ? (
                        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 line-clamp-2">
                          {row.error_message}
                        </p>
                      ) : null}
                      {row.created_at ? (
                        <p className="text-xs text-muted-foreground mt-0.5">{row.created_at}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-teal-500" />
            WhatsApp coverage
          </h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
            <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-teal-500" />
                  WhatsApp Receivers ({whatsappReadyUsers.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground font-normal">
                  Active users with a phone number on file.
                </p>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[24rem] overflow-auto">
                {whatsappReadyUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users with a phone number.</p>
                ) : (
                  whatsappReadyUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{u.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.phone}</p>
                      </div>
                      <Badge className="rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 shrink-0">
                        Ready
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <UserX className="h-4 w-4 text-rose-500" />
                  WhatsApp Missing ({whatsappMissingUsers.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground font-normal">
                  Active users without a usable phone number.
                </p>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[24rem] overflow-auto">
                {whatsappMissingUsers.length === 0 ? (
                  <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    All active users have a phone number.
                  </div>
                ) : (
                  whatsappMissingUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{u.username}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {u.phone?.trim() || "No phone"}
                        </p>
                      </div>
                      <Badge variant="destructive" className="rounded-full shrink-0">
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
                  <MessageCircle className="h-4 w-4 text-emerald-500" />
                  Recent WhatsApp Sent ({whatsappRecentSent.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground font-normal">
                  Latest successful WhatsApp deliveries from the log.
                </p>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[24rem] overflow-auto">
                {whatsappRecentSent.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No successful WhatsApp messages logged yet. New sends appear here automatically.
                  </p>
                ) : (
                  whatsappRecentSent.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold truncate min-w-0 flex-1">
                          {row.username || row.recipient}
                        </p>
                        <Badge className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 shrink-0">
                          Sent
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">{row.recipient}</p>
                      {row.created_at ? (
                        <p className="text-xs text-muted-foreground mt-0.5">{row.created_at}</p>
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
                  WhatsApp Errors ({whatsappRecentErrors.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground font-normal">
                  Failed WhatsApp attempts with error details.
                </p>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[24rem] overflow-auto">
                {whatsappRecentErrors.length === 0 ? (
                  <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    No WhatsApp delivery errors logged.
                  </div>
                ) : (
                  whatsappRecentErrors.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold truncate min-w-0 flex-1">
                          {row.username || row.recipient}
                        </p>
                        <Badge variant="destructive" className="rounded-full shrink-0">
                          Error
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">{row.recipient}</p>
                      {row.error_message ? (
                        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 line-clamp-2">
                          {row.error_message}
                        </p>
                      ) : null}
                      {row.created_at ? (
                        <p className="text-xs text-muted-foreground mt-0.5">{row.created_at}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </section>
    </div>
  );
}
