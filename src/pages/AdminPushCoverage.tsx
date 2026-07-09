import { useEffect, useMemo, useState } from "react";
import { ENV } from "@/lib/env";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Smartphone, Users, UserX, RefreshCw } from "lucide-react";

type PushSummary = {
  active_users: number;
  users_with_tokens: number;
  users_without_tokens: number;
  total_device_tokens: number;
  recent_tokens_24h: number;
};

type MissingUser = {
  id: string;
  username: string;
  email?: string;
};

type DeviceRow = {
  user_id: string;
  username: string;
  browser_name?: string;
  os_name?: string;
  device_label?: string;
  last_used?: string;
};

const defaultSummary: PushSummary = {
  active_users: 0,
  users_with_tokens: 0,
  users_without_tokens: 0,
  total_device_tokens: 0,
  recent_tokens_24h: 0,
};

export default function AdminPushCoverage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PushSummary>(defaultSummary);
  const [missingUsers, setMissingUsers] = useState<MissingUser[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchCoverage = async () => {
    setLoading(true);
    setError(null);
    try {
      const token =
        sessionStorage.getItem("token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("auth_token");

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
    <main className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Push Coverage</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor FCM token adoption across active users and devices.
          </p>
        </div>
        <Button onClick={() => void fetchCoverage()} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-300">
          <CardContent className="p-4 text-red-600 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs">Active Users</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.active_users}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs">With Tokens</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-600">{summary.users_with_tokens}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs">Without Tokens</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{summary.users_without_tokens}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs">Device Tokens</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.total_device_tokens}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs">Coverage</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{coveragePct}%</div></CardContent></Card>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserX className="h-4 w-4" /> Missing Users ({missingUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[28rem] overflow-auto">
            {missingUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">All active users have at least one FCM device token.</p>
            ) : (
              missingUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border p-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{u.username}</p>
                    {u.email ? <p className="text-xs text-muted-foreground truncate">{u.email}</p> : null}
                  </div>
                  <Badge variant="destructive">Missing</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-4 w-4" /> Recent Devices ({devices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[28rem] overflow-auto">
            {devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No device tokens found yet.</p>
            ) : (
              devices.map((d, idx) => (
                <div key={`${d.user_id}-${idx}`} className="rounded-lg border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate">{d.username || "Unknown user"}</p>
                    <Badge variant="secondary" className="whitespace-nowrap">
                      {d.browser_name || "Unknown"} / {d.os_name || "Unknown"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {d.device_label || "Unknown device"} • {d.last_used || "N/A"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Team Rollout Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>1) Ask users to login and open Settings → Notifications.</p>
          <p>2) Tap “Enable on this device” and keep app open 15 seconds.</p>
          <p>3) Refresh this page to monitor coverage percentage.</p>
        </CardContent>
      </Card>
    </main>
  );
}

