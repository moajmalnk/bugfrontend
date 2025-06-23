import { useEffect, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { ENV } from "@/lib/env";
import { User } from "@/types";
import { apiClient } from "@/lib/axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Bug, 
  Code2, 
  Calendar, 
  Mail, 
  AtSign, 
  Shield, 
  ExternalLink,
  AlertTriangle,
  Clock,
  CheckCircle
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface DashboardToken {
  user_id: string;
  username: string;
  role: string;
  admin_id: string;
  purpose: string;
  exp: number;
}

interface UserStats {
  total_projects: number;
  total_bugs: number;
  recent_activity: Array<{
    type: "bug" | "project";
    title: string;
    created_at: string;
  }>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  [key: string]: any;
}

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      // If no token in URL, maybe we are already logged in via session
      const sessionToken = sessionStorage.getItem('token');
      if (!sessionToken) {
          setError('No access token provided');
          setIsLoading(false);
          return;
      }
      validateAndDecodeToken(sessionToken);
    } else {
        setToken(tokenParam);
        validateAndDecodeToken(tokenParam);
    }
  }, [searchParams]);

  const validateAndDecodeToken = async (tokenString: string) => {
    try {
      const payload = JSON.parse(atob(tokenString.split('.')[1]));

      if (payload.exp && payload.exp < Date.now() / 1000) {
        setTokenExpired(true);
        setError('Access link has expired');
        setIsLoading(false);
        sessionStorage.removeItem('token');
        return;
      }

      if (payload.purpose !== 'dashboard_access') {
        setError('Invalid access token');
        setIsLoading(false);
        return;
      }
      
      // Store token in session storage for this tab
      sessionStorage.setItem('token', tokenString);

      await fetchUserDetails(payload.user_id, tokenString);

    } catch (error) {
      //console.error('Token validation error:', error);
      setError('Invalid access token');
      setIsLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string, authToken: string) => {
    try {
      const response = await apiClient.get<ApiResponse<User>>(`/users/get.php?id=${userId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
      });

      if (response.data.success) {
        setUser(response.data.data);
        await fetchUserStats(userId, authToken);
      } else {
        setError('Failed to fetch user details');
      }
    } catch (error) {
     // console.error('Error fetching user details:', error);
      setError('Failed to fetch user details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserStats = async (userId: string, authToken: string) => {
    try {
        const response = await apiClient.get<ApiResponse<UserStats>>(`/users/stats.php?id=${userId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      //console.error('Error fetching user stats:', error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-5 w-5 text-blue-500" />;
      case "developer":
        return <Code2 className="h-5 w-5 text-green-500" />;
      case "tester":
        return <Bug className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-blue-100 text-blue-800";
      case "developer":
        return "bg-green-100 text-green-800";
      case "tester":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div className="text-center">
            <Skeleton className="h-8 w-64 mx-auto mb-2" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Alert variant={tokenExpired ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-center">
            {error}
            {tokenExpired && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  This link was generated by an administrator and has expired for security reasons.
                  Please contact an administrator to generate a new link.
                </p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="relative">
            <img
              src={user.avatar || '/placeholder.svg'}
              alt={`${user.name}'s avatar`}
              className="h-16 w-16 rounded-full border-2 border-primary shadow"
            />
            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <div className="flex items-center gap-2">
              {getRoleIcon(user.role)}
              <Badge className={getRoleColor(user.role)}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <AtSign className="h-4 w-4" />
            {user.username}
          </span>
          <span className="flex items-center gap-1">
            <Mail className="h-4 w-4" />
            {user.email}
          </span>
          {user.created_at && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Joined {format(new Date(user.created_at), "PPP")}
            </span>
          )}
        </div>

        {/* Admin Access Notice */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">
              Admin Access - This is a temporary view generated by an administrator
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              Projects
            </CardTitle>
            <CardDescription>Total projects this user is involved in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.total_projects || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Bugs
            </CardTitle>
            <CardDescription>Total bugs reported by this user</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.total_bugs || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest actions and contributions</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recent_activity && stats.recent_activity.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_activity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {activity.type === "bug" ? (
                    <Bug className="h-5 w-5 mt-0.5 text-yellow-500" />
                  ) : (
                    <Code2 className="h-5 w-5 mt-0.5 text-green-500" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>This dashboard view was generated by an administrator</p>
        <p className="mt-1">
          Link expires in: {token && (() => {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              const timeLeft = Math.max(0, payload.exp - Date.now() / 1000);
              return `${Math.floor(timeLeft / 60)}m ${Math.floor(timeLeft % 60)}s`;
            } catch {
              return 'Unknown';
            }
          })()}
        </p>
      </div>
    </div>
  );
} 