import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLocalDate } from "@/lib/utils/dateUtils";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  MessageCircle,
  Phone,
  Send,
  TrendingUp,
  Users,
  Volume2,
} from "lucide-react";
import { useEffect, useState } from "react";

interface WhatsAppStats {
  totalMessages: number;
  totalVoiceNotes: number;
  totalUsers: number;
  messagesToday: number;
  voiceNotesToday: number;
  deliveryRate: number;
  averageResponseTime: number;
  topRecipients: Array<{
    phone: string;
    name: string;
    messageCount: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: "message" | "voice";
    phone: string;
    timestamp: string;
    status: "sent" | "delivered" | "read" | "failed";
  }>;
}

interface WhatsAppStatsWidgetProps {
  className?: string;
}

export function WhatsAppStatsWidget({ className }: WhatsAppStatsWidgetProps) {
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Simulate API call - replace with actual API
      const mockStats: WhatsAppStats = {
        totalMessages: 1247,
        totalVoiceNotes: 89,
        totalUsers: 156,
        messagesToday: 23,
        voiceNotesToday: 4,
        deliveryRate: 98.5,
        averageResponseTime: 2.3,
        topRecipients: [
          { phone: "+918848676627", name: "John Doe", messageCount: 45 },
          { phone: "+919876543210", name: "Jane Smith", messageCount: 32 },
          { phone: "+919876543211", name: "Mike Johnson", messageCount: 28 },
        ],
        recentActivity: [
          {
            id: "1",
            type: "message",
            phone: "+918848676627",
            timestamp: "2024-01-15T10:30:00Z",
            status: "delivered",
          },
          {
            id: "2",
            type: "voice",
            phone: "+919876543210",
            timestamp: "2024-01-15T10:25:00Z",
            status: "read",
          },
          {
            id: "3",
            type: "message",
            phone: "+919876543211",
            timestamp: "2024-01-15T10:20:00Z",
            status: "sent",
          },
        ],
      };

      setStats(mockStats);
    } catch (error) {
      console.error("Error loading WhatsApp stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case "read":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "read":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            WhatsApp Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-muted-foreground">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p>No WhatsApp data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-500" />
          WhatsApp Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.totalMessages}
            </div>
            <div className="text-sm text-muted-foreground">Total Messages</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalVoiceNotes}
            </div>
            <div className="text-sm text-muted-foreground">Voice Notes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {stats.totalUsers}
            </div>
            <div className="text-sm text-muted-foreground">Active Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {stats.deliveryRate}%
            </div>
            <div className="text-sm text-muted-foreground">Delivery Rate</div>
          </div>
        </div>

        {/* Today's Activity */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Today's Messages</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {stats.messagesToday}
            </div>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Today's Voice Notes</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {stats.voiceNotesToday}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Performance Metrics
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm">Avg Response Time</span>
              <Badge variant="secondary">{stats.averageResponseTime}m</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm">Success Rate</span>
              <Badge variant="secondary">{stats.deliveryRate}%</Badge>
            </div>
          </div>
        </div>

        {/* Top Recipients */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            Top Recipients
          </h4>
          <div className="space-y-2">
            {stats.topRecipients.map((recipient, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted/30 rounded"
              >
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{recipient.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {recipient.phone}
                    </div>
                  </div>
                </div>
                <Badge variant="outline">
                  {recipient.messageCount} messages
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Activity
          </h4>
          <div className="space-y-2">
            {stats.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-2 bg-muted/30 rounded"
              >
                <div className="flex items-center gap-2">
                  {activity.type === "voice" ? (
                    <Volume2 className="w-4 h-4 text-blue-500" />
                  ) : (
                    <MessageCircle className="w-4 h-4 text-green-500" />
                  )}
                  <div>
                    <div className="text-sm font-medium">{activity.phone}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatLocalDate(activity.timestamp, "time")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(activity.status)}
                  <Badge className={getStatusColor(activity.status)}>
                    {activity.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-4 border-t">
          <Button size="sm" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            New Message
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <Volume2 className="w-4 h-4" />
            Voice Note
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Bulk Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
