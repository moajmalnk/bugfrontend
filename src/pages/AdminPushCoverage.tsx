import { useCallback, useEffect, useMemo, useState } from "react";
import { ENV } from "@/lib/env";
import { useAuth } from "@/context/AuthContext";
import { getEffectiveRole, hasPermissionOrAdmin } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList } from "@/components/ui/tabs";
import { ListPageTabTrigger } from "@/components/layout/list-page/ListPageTabsShell";
import { toast } from "@/components/ui/use-toast";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  ShieldAlert,
  Unlink,
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
  google_connected?: number;
  google_not_connected?: number;
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

type GoogleAccountUser = ChannelUser & {
  google_email?: string | null;
  google_connected_at?: string | null;
  role?: string | null;
  tester_type?: string | null;
  google_connect_required?: number | boolean | null;
};

type GoogleRoleKey = "admin" | "developer" | "codo_tester" | "client_tester" | "creator";

type GoogleRoleCounts = Record<GoogleRoleKey, { connected: number; not_connected: number }>;

const GOOGLE_ROLE_TABS: { id: GoogleRoleKey; label: string; singular: string; span: string }[] = [
  { id: "admin", label: "Admins", singular: "admin", span: "col-span-6 sm:col-span-4 lg:col-span-2" },
  { id: "developer", label: "Developers", singular: "developer", span: "col-span-6 sm:col-span-4 lg:col-span-2" },
  { id: "codo_tester", label: "CODO Testers", singular: "CODO tester", span: "col-span-6 sm:col-span-4 lg:col-span-3" },
  { id: "client_tester", label: "Client Testers", singular: "client tester", span: "col-span-6 sm:col-span-6 lg:col-span-3" },
  { id: "creator", label: "Creators", singular: "creator", span: "col-span-12 sm:col-span-6 lg:col-span-2" },
];

type CoverageTopicId = "push" | "notify" | "mail" | "whatsapp" | "google";

type CoveragePerson = {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
};

type CoverageSlice = {
  id: string;
  label: string;
  value: number;
  fill: string;
  people: CoveragePerson[];
  hint?: string;
};

const COVERAGE_TOPICS: { id: CoverageTopicId; label: string }[] = [
  { id: "push", label: "Push" },
  { id: "notify", label: "Notifications" },
  { id: "mail", label: "Mail" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "google", label: "Google" },
];

const COVERAGE_FILLS = {
  emerald: "#34d399",
  rose: "#fb7185",
  cyan: "#22d3ee",
  amber: "#fbbf24",
  violet: "#a78bfa",
  sky: "#38bdf8",
  indigo: "#818cf8",
  teal: "#2dd4bf",
};

function coveragePerson(
  id: string,
  title: string,
  subtitle?: string | null,
  badge?: string
): CoveragePerson {
  const clean = subtitle?.trim();
  return {
    id,
    title: title.trim() || "Unknown",
    subtitle: clean || undefined,
    badge,
  };
}

function deviceUsedWithin24h(lastUsed?: string): boolean {
  if (!lastUsed) return false;
  const parsed = Date.parse(lastUsed.includes("T") ? lastUsed : lastUsed.replace(" ", "T"));
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed <= 24 * 60 * 60 * 1000;
}

function sliceChipStyle(fill: string, active: boolean): { backgroundColor?: string; borderColor: string; color?: string } {
  if (!active) return { borderColor: fill };
  return {
    backgroundColor: fill,
    borderColor: fill,
    color: fill === COVERAGE_FILLS.amber ? "#111827" : "#ffffff",
  };
}

function sliceHint(slice: CoverageSlice, partialHint: string): CoverageSlice {
  if (slice.value > slice.people.length && slice.people.length > 0) {
    return { ...slice, hint: partialHint };
  }
  return slice;
}

const emptyGoogleByRole = (): GoogleRoleCounts => ({
  admin: { connected: 0, not_connected: 0 },
  developer: { connected: 0, not_connected: 0 },
  codo_tester: { connected: 0, not_connected: 0 },
  client_tester: { connected: 0, not_connected: 0 },
  creator: { connected: 0, not_connected: 0 },
});

function googleRoleOf(user: GoogleAccountUser): GoogleRoleKey | null {
  const role = String(user.role || "").toLowerCase();
  const testerType = String(user.tester_type || "").toLowerCase();
  if (role === "admin") return "admin";
  if (role === "developer") return "developer";
  if (role === "creator") return "creator";
  if (role === "tester") return testerType === "codo" ? "codo_tester" : "client_tester";
  return null;
}

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
  can_resend?: boolean;
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
  google_connected: 0,
  google_not_connected: 0,
};

function isGoogleAsked(user: GoogleAccountUser): boolean {
  return user.google_connect_required === true || Number(user.google_connect_required) === 1;
}

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
  const [googleConnectedUsers, setGoogleConnectedUsers] = useState<GoogleAccountUser[]>([]);
  const [googleMissingUsers, setGoogleMissingUsers] = useState<GoogleAccountUser[]>([]);
  const [googleByRole, setGoogleByRole] = useState<GoogleRoleCounts>(emptyGoogleByRole);
  const [googleRoleTab, setGoogleRoleTab] = useState<GoogleRoleKey>("admin");
  const [fcmTokenEpoch, setFcmTokenEpoch] = useState<string>("1");
  const [error, setError] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [googlePrompt, setGooglePrompt] = useState<null | {
    kind: "disconnect" | "notify";
    user: GoogleAccountUser;
  }>(null);
  const [googlePromptBusy, setGooglePromptBusy] = useState(false);
  const [whatsappResendRows, setWhatsappResendRows] = useState<DeliveryLogRow[] | null>(null);
  const [whatsappResendBusy, setWhatsappResendBusy] = useState(false);
  const [whatsappResendActiveId, setWhatsappResendActiveId] = useState<string | null>(null);
  const [coverageTopic, setCoverageTopic] = useState<CoverageTopicId>("push");
  const [coverageSlice, setCoverageSlice] = useState("with_tokens");

  const getAuthToken = () =>
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token");

  const fetchCoverage = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!silent) {
      setLoading(true);
      setError(null);
    }
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
        if (!silent) setError(json?.message || "Failed to load push coverage");
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
      setGoogleConnectedUsers(json.data?.google_connected_users || []);
      setGoogleMissingUsers(json.data?.google_missing_users || []);
      setGoogleByRole({ ...emptyGoogleByRole(), ...(json.data?.google_by_role || {}) });
      if (json.data?.fcm_token_epoch) {
        setFcmTokenEpoch(String(json.data.fcm_token_epoch));
      }
    } catch {
      if (!silent) setError("Failed to fetch push coverage data");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCoverage();
  }, [fetchCoverage]);

  const confirmGooglePrompt = async () => {
    if (!googlePrompt || googlePromptBusy) return;
    setGooglePromptBusy(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast({
          title: "Sign in required",
          description: "Your session expired. Sign in again, then retry.",
          variant: "destructive",
        });
        return;
      }
      const res = await fetch(`${ENV.API_URL}/notifications/google_account_admin.php`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: googlePrompt.user.id,
          action: googlePrompt.kind,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        toast({
          title: googlePrompt.kind === "disconnect" ? "Could not disconnect" : "Could not notify",
          description: json?.message || "Please try again.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: googlePrompt.kind === "disconnect" ? "Google disconnected" : "Connect request sent",
        description: json.message,
      });
      setGooglePrompt(null);
      await fetchCoverage();
    } catch {
      toast({
        title: "Network error",
        description: "The Google account action did not finish. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGooglePromptBusy(false);
    }
  };

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

  const moveWhatsappRowToSent = (row: DeliveryLogRow) => {
    const id = String(row.id);
    setWhatsappRecentErrors((prev) => prev.filter((item) => String(item.id) !== id));
    setWhatsappRecentSent((prev) => {
      const next = [
        { ...row, status: "sent", error_message: null, can_resend: false },
        ...prev.filter((item) => String(item.id) !== id),
      ];
      return next.slice(0, 80);
    });
  };

  const confirmWhatsappResend = async () => {
    if (!whatsappResendRows?.length || whatsappResendBusy) return;
    const token = getAuthToken();
    if (!token) {
      toast({
        title: "Sign in required",
        description: "Your session expired. Sign in again, then retry.",
        variant: "destructive",
      });
      return;
    }

    const queue = whatsappResendRows;
    setWhatsappResendBusy(true);
    let sent = 0;
    let stoppedBusy = false;
    try {
      for (const row of queue) {
        setWhatsappResendActiveId(String(row.id));
        const res = await fetch(`${ENV.API_URL}/notifications/resend_whatsapp.php`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ log_id: row.id }),
        });
        const json = await res.json().catch(() => null);
        if (res.status === 401) {
          toast({
            title: "Sign in required",
            description: "Your session expired. Sign in again, then retry.",
            variant: "destructive",
          });
          break;
        }
        if (json?.code === "campaign_busy") {
          stoppedBusy = true;
          if (sent === 0) {
            toast({
              title: "WhatsApp is still sending",
              description: json?.message || "Wait until the current campaign finishes, then resend.",
              variant: "destructive",
            });
          }
          break;
        }
        if (json?.code === "missing_body") {
          setWhatsappRecentErrors((prev) =>
            prev.map((item) => (String(item.id) === String(row.id) ? { ...item, can_resend: false } : item))
          );
          toast({
            title: "Cannot resend",
            description: json?.message || "The original message text was not saved.",
            variant: "destructive",
          });
          continue;
        }
        if (!res.ok || !json?.success) {
          toast({
            title: "Resend failed",
            description: json?.message || "WhatsApp did not accept this message.",
            variant: "destructive",
          });
          continue;
        }
        sent += 1;
        moveWhatsappRowToSent(row);
      }
    } catch {
      toast({
        title: "Resend failed",
        description: "Network error. The message was not marked as sent.",
        variant: "destructive",
      });
    } finally {
      setWhatsappResendBusy(false);
      setWhatsappResendActiveId(null);
      setWhatsappResendRows(null);
      void fetchCoverage({ silent: true });
    }

    if (sent > 0 && !stoppedBusy) {
      toast({
        title: sent === 1 ? "WhatsApp resent" : `${sent} WhatsApp messages resent`,
        description:
          sent === 1
            ? "The failed message was sent again and moved to Recent WhatsApp Sent."
            : "Failed messages that WhatsApp accepted were moved to Recent WhatsApp Sent.",
      });
    } else if (sent > 0 && stoppedBusy) {
      toast({
        title: `${sent} resent, then WhatsApp was busy`,
        description: "The rest stay in WhatsApp Errors until the current campaign finishes.",
      });
    }
  };

  const googleRole = GOOGLE_ROLE_TABS.find((tab) => tab.id === googleRoleTab) ?? GOOGLE_ROLE_TABS[0];
  const googleRoleCounts = googleByRole[googleRole.id];
  const googleConnectedForRole = useMemo(
    () => googleConnectedUsers.filter((user) => googleRoleOf(user) === googleRoleTab),
    [googleConnectedUsers, googleRoleTab]
  );
  const googleMissingForRole = useMemo(
    () => googleMissingUsers.filter((user) => googleRoleOf(user) === googleRoleTab),
    [googleMissingUsers, googleRoleTab]
  );
  const whatsappResendable = useMemo(
    () => whatsappRecentErrors.filter((row) => row.can_resend === true),
    [whatsappRecentErrors]
  );

  const coveragePct = useMemo(() => {
    if (!summary.active_users) return 0;
    return Math.round((summary.users_with_tokens / summary.active_users) * 100);
  }, [summary.active_users, summary.users_with_tokens]);

  const coverageCharts = useMemo(() => {
    const users = (
      rows: { id: string; username: string; email?: string | null; phone?: string | null }[],
      badge?: string
    ) => rows.map((row) => coveragePerson(String(row.id), row.username, row.email || row.phone, badge));

    const pushPie: CoverageSlice[] = [
      {
        id: "with_tokens",
        label: "With tokens",
        value: summary.users_with_tokens,
        fill: COVERAGE_FILLS.emerald,
        people: Array.from(
          new Map(
            devices.map((device) => [
              device.user_id,
              coveragePerson(device.user_id, device.username, device.device_label, "Has token"),
            ])
          ).values()
        ),
      },
      {
        id: "without_tokens",
        label: "Without tokens",
        value: summary.users_without_tokens,
        fill: COVERAGE_FILLS.rose,
        people: users(missingUsers, "No token"),
      },
    ];
    const pushBar: CoverageSlice[] = [
      sliceHint(
        {
          id: "devices",
          label: "Device tokens",
          value: summary.total_device_tokens,
          fill: COVERAGE_FILLS.cyan,
          people: devices.map((device, index) =>
            coveragePerson(
              `${device.user_id}-${index}`,
              device.username,
              `${device.browser_name || "Unknown"} / ${device.os_name || "Unknown"}`,
              device.last_used || undefined
            )
          ),
        },
        "Showing the latest loaded devices. The bar is the full token count."
      ),
      {
        id: "fresh",
        label: "Fresh 24h",
        value: summary.recent_tokens_24h,
        fill: COVERAGE_FILLS.emerald,
        people: devices
          .filter((device) => deviceUsedWithin24h(device.last_used))
          .map((device, index) =>
            coveragePerson(`${device.user_id}-fresh-${index}`, device.username, device.last_used, "Fresh")
          ),
      },
      {
        id: "stale",
        label: "Stale 30d+",
        value: summary.stale_tokens_30d ?? 0,
        fill: COVERAGE_FILLS.amber,
        people: devices
          .filter((device) => device.is_stale === 1)
          .map((device, index) =>
            coveragePerson(`${device.user_id}-stale-${index}`, device.username, device.last_used || "No recent use", "Stale")
          ),
      },
      {
        id: "legacy",
        label: "Legacy rows",
        value: summary.legacy_recovered_tokens ?? 0,
        fill: COVERAGE_FILLS.rose,
        people: devices
          .filter((device) => device.is_legacy === 1)
          .map((device, index) =>
            coveragePerson(`${device.user_id}-legacy-${index}`, device.username, device.device_label, "Legacy")
          ),
      },
      {
        id: "pwa",
        label: "PWA installed",
        value: summary.pwa_installed_users,
        fill: COVERAGE_FILLS.violet,
        people: pwaInstalledUsers.map((user) =>
          coveragePerson(user.id, user.username, user.email, `${user.device_count || 0} devices`)
        ),
      },
    ];

    const notifyPie: CoverageSlice[] = [
      {
        id: "notify_on",
        label: "Enabled",
        value: summary.notification_enabled_users,
        fill: COVERAGE_FILLS.emerald,
        people: users(notificationEnabledUsers, "On"),
      },
      {
        id: "notify_off",
        label: "Disabled",
        value: summary.notification_disabled_users,
        fill: COVERAGE_FILLS.rose,
        people: users(notificationDisabledUsers, "Off"),
      },
    ];

    const mailPie: CoverageSlice[] = [
      {
        id: "mail_ready",
        label: "Mail ready",
        value: summary.mail_ready ?? 0,
        fill: COVERAGE_FILLS.sky,
        people: users(mailReadyUsers, "Ready"),
      },
      {
        id: "mail_missing",
        label: "Mail missing",
        value: summary.mail_missing ?? 0,
        fill: COVERAGE_FILLS.rose,
        people: users(mailMissingUsers, "Missing"),
      },
    ];
    const mailBar: CoverageSlice[] = [
      sliceHint(
        {
          id: "mail_sent",
          label: "Mail sent 7d",
          value: summary.mail_sent_7d ?? 0,
          fill: COVERAGE_FILLS.emerald,
          people: mailRecentSent.map((row) =>
            coveragePerson(String(row.id), row.username || row.recipient, row.recipient, row.created_at)
          ),
        },
        "The bar is the 7-day total. This list is the latest logged sends."
      ),
      sliceHint(
        {
          id: "mail_errors",
          label: "Mail errors 7d",
          value: summary.mail_failed_7d ?? 0,
          fill: COVERAGE_FILLS.rose,
          people: mailRecentErrors.map((row) =>
            coveragePerson(String(row.id), row.username || row.recipient, row.error_message || row.recipient, row.created_at)
          ),
        },
        "The bar is the 7-day total. This list is the latest logged errors."
      ),
    ];

    const whatsappPie: CoverageSlice[] = [
      {
        id: "wa_ready",
        label: "WhatsApp ready",
        value: summary.whatsapp_ready ?? 0,
        fill: COVERAGE_FILLS.teal,
        people: users(whatsappReadyUsers, "Ready"),
      },
      {
        id: "wa_missing",
        label: "WhatsApp missing",
        value: summary.whatsapp_missing ?? 0,
        fill: COVERAGE_FILLS.rose,
        people: users(whatsappMissingUsers, "Missing"),
      },
    ];
    const whatsappBar: CoverageSlice[] = [
      sliceHint(
        {
          id: "wa_sent",
          label: "WA sent 7d",
          value: summary.whatsapp_sent_7d ?? 0,
          fill: COVERAGE_FILLS.emerald,
          people: whatsappRecentSent.map((row) =>
            coveragePerson(String(row.id), row.username || row.recipient, row.recipient, row.created_at)
          ),
        },
        "The bar is the 7-day total. This list is the latest logged sends."
      ),
      sliceHint(
        {
          id: "wa_errors",
          label: "WA errors 7d",
          value: summary.whatsapp_failed_7d ?? 0,
          fill: COVERAGE_FILLS.rose,
          people: whatsappRecentErrors.map((row) =>
            coveragePerson(String(row.id), row.username || row.recipient, row.error_message || row.recipient, row.created_at)
          ),
        },
        "The bar is the 7-day total. This list is the latest logged errors."
      ),
    ];

    const googlePie: CoverageSlice[] = [
      {
        id: "google_on",
        label: "Connected",
        value: summary.google_connected ?? 0,
        fill: COVERAGE_FILLS.emerald,
        people: googleConnectedUsers.map((user) =>
          coveragePerson(user.id, user.username, user.google_email || user.email, "Connected")
        ),
      },
      {
        id: "google_off",
        label: "Not connected",
        value: summary.google_not_connected ?? 0,
        fill: COVERAGE_FILLS.rose,
        people: googleMissingUsers.map((user) => coveragePerson(user.id, user.username, user.email, "Not connected")),
      },
    ];
    const googleBar: CoverageSlice[] = GOOGLE_ROLE_TABS.map((tab, index) => {
      const fills = [
        COVERAGE_FILLS.indigo,
        COVERAGE_FILLS.cyan,
        COVERAGE_FILLS.violet,
        COVERAGE_FILLS.sky,
        COVERAGE_FILLS.teal,
      ];
      return {
        id: `google_role_${tab.id}`,
        label: tab.label,
        value: googleByRole[tab.id]?.connected ?? 0,
        fill: fills[index] || COVERAGE_FILLS.indigo,
        people: googleConnectedUsers
          .filter((user) => googleRoleOf(user) === tab.id)
          .map((user) => coveragePerson(user.id, user.username, user.google_email || user.email, tab.singular)),
      };
    });

    return {
      push: { pie: pushPie, bar: pushBar, center: coveragePct, centerLabel: "coverage" },
      notify: {
        pie: notifyPie,
        bar: notifyPie,
        center: summary.notification_enabled_users,
        centerLabel: "enabled",
      },
      mail: { pie: mailPie, bar: mailBar, center: summary.mail_ready ?? 0, centerLabel: "ready" },
      whatsapp: {
        pie: whatsappPie,
        bar: whatsappBar,
        center: summary.whatsapp_ready ?? 0,
        centerLabel: "ready",
      },
      google: {
        pie: googlePie,
        bar: googleBar,
        center: summary.google_connected ?? 0,
        centerLabel: "connected",
      },
    } satisfies Record<
      CoverageTopicId,
      { pie: CoverageSlice[]; bar: CoverageSlice[]; center: number; centerLabel: string }
    >;
  }, [
    coveragePct,
    devices,
    googleByRole,
    googleConnectedUsers,
    googleMissingUsers,
    mailMissingUsers,
    mailReadyUsers,
    mailRecentErrors,
    mailRecentSent,
    missingUsers,
    notificationDisabledUsers,
    notificationEnabledUsers,
    pwaInstalledUsers,
    summary,
    whatsappMissingUsers,
    whatsappReadyUsers,
    whatsappRecentErrors,
    whatsappRecentSent,
  ]);

  const activeCoverage = coverageCharts[coverageTopic];
  const selectedCoverage =
    [...activeCoverage.pie, ...activeCoverage.bar].find((slice) => slice.id === coverageSlice) ||
    activeCoverage.pie[0];

  const openCoverageTopic = (topic: CoverageTopicId) => {
    setCoverageTopic(topic);
    setCoverageSlice(coverageCharts[topic].pie[0]?.id || "");
  };

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
                  Monitor FCM adoption, Google accounts.
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

        <section className="space-y-4">
          <div className="grid grid-cols-12 gap-2">
            {COVERAGE_TOPICS.map((topic) => {
              const active = coverageTopic === topic.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => openCoverageTopic(topic.id)}
                  className={`col-span-6 md:col-span-4 xl:col-span-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "border-cyan-500 bg-cyan-500 text-white"
                      : "border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-900/80 text-foreground"
                  }`}
                >
                  {topic.label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-5 h-80 rounded-2xl bg-muted animate-pulse" />
              <div className="col-span-12 lg:col-span-7 h-80 rounded-2xl bg-muted animate-pulse" />
              <div className="col-span-12 h-40 rounded-2xl bg-muted animate-pulse" />
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-4">
              <Card className="col-span-12 lg:col-span-5 border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Split</CardTitle>
                  <p className="text-xs text-muted-foreground font-normal">
                    Click a slice to open that group.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeCoverage.pie.every((slice) => slice.value === 0) ? (
                    <p className="text-sm text-muted-foreground py-16 text-center">Nothing in this split yet.</p>
                  ) : (
                    <div className="relative">
                      <ChartContainer
                        config={Object.fromEntries(
                          activeCoverage.pie.map((slice) => [slice.id, { label: slice.label, color: slice.fill }])
                        ) satisfies ChartConfig}
                        className="mx-auto aspect-square max-h-[280px] w-full"
                      >
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel />} />
                          <Pie
                            data={activeCoverage.pie.map((slice) => ({
                              id: slice.id,
                              label: slice.label,
                              value: slice.value,
                            }))}
                            dataKey="value"
                            nameKey="label"
                            innerRadius={62}
                            outerRadius={96}
                            paddingAngle={2}
                            strokeWidth={0}
                            cursor="pointer"
                            onClick={(entry) => {
                              const id = String(entry?.payload?.id || entry?.id || "");
                              if (id) setCoverageSlice(id);
                            }}
                          >
                            {activeCoverage.pie.map((slice) => (
                              <Cell
                                key={slice.id}
                                fill={slice.fill}
                                opacity={
                                  activeCoverage.pie.some((item) => item.id === coverageSlice) &&
                                  slice.id !== coverageSlice
                                    ? 0.35
                                    : 1
                                }
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ChartContainer>
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="text-center rounded-full bg-background/90 px-4 py-2">
                          <p className="text-2xl font-bold text-foreground tabular-nums">
                            {coverageTopic === "push" ? `${activeCoverage.center}%` : activeCoverage.center.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">{activeCoverage.centerLabel}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {activeCoverage.pie.map((slice) => (
                      <button
                        key={slice.id}
                        type="button"
                        onClick={() => setCoverageSlice(slice.id)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                          coverageSlice === slice.id ? "" : "bg-background text-foreground"
                        }`}
                        style={sliceChipStyle(slice.fill, coverageSlice === slice.id)}
                      >
                        {slice.label} · {slice.value.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-12 lg:col-span-7 border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Counts</CardTitle>
                  <p className="text-xs text-muted-foreground font-normal">
                    Click a bar to open that group.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ChartContainer
                    config={{
                      value: { label: "Count", color: COVERAGE_FILLS.cyan },
                      ...Object.fromEntries(
                        activeCoverage.bar.map((slice) => [slice.id, { label: slice.label, color: slice.fill }])
                      ),
                    } satisfies ChartConfig}
                    className="aspect-auto h-[280px] w-full"
                  >
                    <BarChart
                      data={activeCoverage.bar.map((slice) => ({
                        id: slice.id,
                        label: slice.label,
                        value: slice.value,
                      }))}
                      layout="vertical"
                      margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis
                        dataKey="label"
                        type="category"
                        width={112}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="value"
                        radius={[0, 8, 8, 0]}
                        cursor="pointer"
                        onClick={(entry) => {
                          const id = String(entry?.payload?.id || entry?.id || "");
                          if (id) setCoverageSlice(id);
                        }}
                      >
                        {activeCoverage.bar.map((slice) => (
                          <Cell
                            key={slice.id}
                            fill={slice.fill}
                            opacity={
                              activeCoverage.bar.some((item) => item.id === coverageSlice) &&
                              slice.id !== coverageSlice
                                ? 0.35
                                : 1
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                  <div className="flex flex-wrap gap-2">
                    {activeCoverage.bar.map((slice) => (
                      <button
                        key={slice.id}
                        type="button"
                        onClick={() => setCoverageSlice(slice.id)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                          coverageSlice === slice.id ? "" : "bg-background text-foreground"
                        }`}
                        style={sliceChipStyle(slice.fill, coverageSlice === slice.id)}
                      >
                        {slice.label} · {slice.value.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-12 border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    {selectedCoverage?.label || "Group"} ({selectedCoverage?.value.toLocaleString() || 0})
                  </CardTitle>
                  {selectedCoverage?.hint ? (
                    <p className="text-xs text-muted-foreground font-normal">{selectedCoverage.hint}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground font-normal">
                      People in the selected slice or bar.
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  {!selectedCoverage || selectedCoverage.people.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {selectedCoverage && selectedCoverage.value > 0
                        ? "This count has no names loaded."
                        : "No one in this group."}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                      {selectedCoverage.people.map((person) => (
                        <div
                          key={person.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-background/70 p-3 min-w-0"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{person.title}</p>
                            {person.subtitle ? (
                              <p className="text-xs text-muted-foreground truncate">{person.subtitle}</p>
                            ) : null}
                          </div>
                          {person.badge ? (
                            <Badge variant="secondary" className="rounded-full shrink-0 max-w-[12rem] truncate">
                              {person.badge}
                            </Badge>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
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
          <h2 className="text-lg font-semibold">Google accounts</h2>
          <Tabs value={googleRoleTab} onValueChange={(value) => setGoogleRoleTab(value as GoogleRoleKey)}>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 rounded-2xl border border-gray-200/50 bg-white/70 p-2 shadow-sm backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/70">
                <TabsList className="grid h-auto w-full grid-cols-12 gap-4 bg-transparent p-0">
                  {GOOGLE_ROLE_TABS.map((tab) => {
                    const counts = googleByRole[tab.id];
                    return (
                      <ListPageTabTrigger
                        key={tab.id}
                        value={tab.id}
                        className={`${tab.span} h-auto min-h-14 w-full whitespace-normal px-2 py-2.5`}
                      >
                        <span className="flex min-w-0 flex-col items-center gap-1 leading-tight">
                          <span className="max-w-full truncate text-xs sm:text-sm">{tab.label}</span>
                          <span
                            className="flex items-center gap-1.5 text-[10px] font-semibold"
                            title={`${loading ? "Loading" : `${counts.connected} connected, ${counts.not_connected} not connected`}`}
                          >
                            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300">
                              {loading ? "…" : counts.connected}
                            </span>
                            <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-rose-700 dark:text-rose-300">
                              {loading ? "…" : counts.not_connected}
                            </span>
                          </span>
                        </span>
                      </ListPageTabTrigger>
                    );
                  })}
                </TabsList>
              </div>
            </div>
          </Tabs>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
            <Card className="overflow-hidden rounded-2xl border border-gray-200/50 bg-white/80 shadow-xl backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/80">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Google Connected ({loading ? "..." : googleRoleCounts.connected})
                </CardTitle>
                <p className="text-xs font-normal text-muted-foreground">
                  Active {googleRole.label.toLowerCase()} who have linked a Google account for Docs, Sheets, and Meet.
                </p>
              </CardHeader>
              <CardContent className="max-h-[24rem] space-y-2 overflow-auto">
                {loading ? (
                  <div className="h-14 animate-pulse rounded-xl bg-muted" />
                ) : googleConnectedForRole.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No {googleRole.singular} has a Google account connected.
                  </p>
                ) : (
                  googleConnectedForRole.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/60 bg-background/70 p-3 dark:border-gray-700/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{u.username}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {u.google_email?.trim() || u.email?.trim() || "Connected"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        <Badge className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          Connected
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          disabled={googlePromptBusy}
                          onClick={() => setGooglePrompt({ kind: "disconnect", user: u })}
                        >
                          <Unlink className="mr-1.5 h-3.5 w-3.5" />
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-2xl border border-gray-200/50 bg-white/80 shadow-xl backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/80">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <UserX className="h-4 w-4 text-rose-500" />
                  Google Not Connected ({loading ? "..." : googleRoleCounts.not_connected})
                </CardTitle>
                <p className="text-xs font-normal text-muted-foreground">
                  Active {googleRole.label.toLowerCase()} with no Google account linked.
                </p>
              </CardHeader>
              <CardContent className="max-h-[24rem] space-y-2 overflow-auto">
                {loading ? (
                  <div className="h-14 animate-pulse rounded-xl bg-muted" />
                ) : googleMissingForRole.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/60 p-4 text-sm text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/20 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Every {googleRole.singular} has a Google account connected.
                  </div>
                ) : (
                  googleMissingForRole.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/60 bg-background/70 p-3 dark:border-gray-700/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{u.username}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {u.email?.trim() || "No email"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        {isGoogleAsked(u) ? (
                          <Badge variant="outline" className="rounded-full">
                            Asked
                          </Badge>
                        ) : null}
                        <Badge variant="destructive" className="rounded-full">
                          Not connected
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-xl"
                          disabled={googlePromptBusy}
                          onClick={() => setGooglePrompt({ kind: "notify", user: u })}
                        >
                          <Bell className="mr-1.5 h-3.5 w-3.5" />
                          Notify
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
          <Dialog
            open={googlePrompt !== null}
            onOpenChange={(open) => {
              if (!open && !googlePromptBusy) setGooglePrompt(null);
            }}
          >
            <DialogContent className="w-[400px] max-w-[calc(100vw-2rem)] rounded-2xl">
              <DialogHeader>
                <DialogTitle>
                  {googlePrompt?.kind === "disconnect"
                    ? `Disconnect ${googlePrompt.user.username}?`
                    : `Ask ${googlePrompt?.user.username || "this user"} to connect Google?`}
                </DialogTitle>
                <DialogDescription>
                  {googlePrompt?.kind === "disconnect"
                    ? "Their Google link for Docs, Sheets, and Meet will be removed. They can still use the dashboard until you ask them to connect again."
                    : "They will see a required prompt and cannot open the dashboard until Google is connected."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={googlePromptBusy}
                  onClick={() => setGooglePrompt(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant={googlePrompt?.kind === "disconnect" ? "destructive" : "default"}
                  className="rounded-xl"
                  disabled={googlePromptBusy}
                  onClick={() => void confirmGooglePrompt()}
                >
                  {googlePromptBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {googlePrompt?.kind === "disconnect" ? "Disconnect" : "Notify"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                      <AlertTriangle className="h-4 w-4 text-rose-500" />
                      WhatsApp Errors ({whatsappRecentErrors.length})
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-normal mt-1">
                      {whatsappResendable.length > 0
                        ? "Resend sends the same message again. Sent rows stay sent, and a busy campaign is not started twice."
                        : whatsappRecentErrors.length > 0
                          ? "These failures were saved without the message text, so they cannot be resent. New failures can."
                          : "Failed WhatsApp attempts with error details."}
                    </p>
                  </div>
                  {whatsappResendable.length > 1 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-xl shrink-0"
                      disabled={whatsappResendBusy}
                      onClick={() => setWhatsappResendRows(whatsappResendable)}
                    >
                      {whatsappResendBusy && (whatsappResendRows?.length ?? 0) > 1 ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Resend failed
                    </Button>
                  ) : null}
                </div>
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
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold truncate min-w-0 flex-1">
                          {row.username || row.recipient}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="destructive" className="rounded-full">
                            Error
                          </Badge>
                          {row.can_resend ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-xl px-2.5"
                              disabled={whatsappResendBusy}
                              onClick={() => setWhatsappResendRows([row])}
                            >
                              {whatsappResendActiveId === String(row.id) ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              Resend
                            </Button>
                          ) : null}
                        </div>
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
          <Dialog
            open={whatsappResendRows !== null}
            onOpenChange={(open) => {
              if (!open && !whatsappResendBusy) setWhatsappResendRows(null);
            }}
          >
            <DialogContent className="w-[400px] max-w-[calc(100vw-2rem)] rounded-2xl">
              <DialogHeader>
                <DialogTitle>
                  {whatsappResendRows && whatsappResendRows.length > 1
                    ? `Resend ${whatsappResendRows.length} failed WhatsApp messages?`
                    : `Resend WhatsApp to ${whatsappResendRows?.[0]?.username || whatsappResendRows?.[0]?.recipient || "this number"}?`}
                </DialogTitle>
                <DialogDescription>
                  {whatsappResendRows && whatsappResendRows.length > 1
                    ? "Each saved message is sent again, one at a time. Messages already sent are skipped. If WhatsApp is busy with another campaign, the rest stay in this list."
                    : "The original message is sent again to this number. If WhatsApp is already sending a campaign, this one waits instead of starting a second send."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={whatsappResendBusy}
                  onClick={() => setWhatsappResendRows(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="rounded-xl"
                  disabled={whatsappResendBusy || !whatsappResendRows?.length}
                  onClick={() => void confirmWhatsappResend()}
                >
                  {whatsappResendBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Resend
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>
    </div>
  );
}
