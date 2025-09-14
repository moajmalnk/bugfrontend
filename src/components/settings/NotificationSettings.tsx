import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { useNotificationSettings } from "@/context/NotificationSettingsContext";
import { ENV } from "@/lib/env";
import { broadcastNotificationService } from "@/services/broadcastNotificationService";
import {
  notificationService,
  NotificationSettings,
} from "@/services/notificationService";
import { whatsappService } from "@/services/whatsappService";
import { Bell, BellRing, Mail, MessageCircle, Volume2 } from "lucide-react";
import { useState } from "react";

const updateGlobalEmailSetting = async (enabled: boolean) => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${ENV.API_URL}/settings/update.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email_notifications_enabled: enabled }),
  });
  if (!response.ok) {
    throw new Error("Failed to update global email setting.");
  }
  const data = await response.json();
  return data;
};

export function NotificationSettingsCard() {
  const [settings, setSettings] = useState(() =>
    notificationService.getSettings()
  );
  const [showEmailConfirmDialog, setShowEmailConfirmDialog] = useState(false);
  const [pendingEmailChange, setPendingEmailChange] = useState<boolean | null>(
    null
  );

  const { emailNotificationsEnabled, refreshGlobalSettings } =
    useNotificationSettings();

  const executeGlobalUpdate = async (checked: boolean) => {
    try {
      const result = await updateGlobalEmailSetting(checked);
      if (result?.data?.email_notifications_enabled !== undefined) {
        refreshGlobalSettings();
        toast({
          title: "Global email notifications updated",
          description: checked
            ? "Email notifications are now enabled for all users."
            : "Email notifications are now disabled for all users.",
        });
      } else {
        throw new Error(result?.message || "An unknown error occurred.");
      }
    } catch (error) {
      toast({
        title: "Failed to update setting",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      refreshGlobalSettings();
    }
  };

  const handleGlobalEmailToggle = (checked: boolean) => {
    if (checked) {
      executeGlobalUpdate(true);
    } else {
      setPendingEmailChange(false);
      setShowEmailConfirmDialog(true);
    }
  };

  const handleConfirmDisableEmail = () => {
    if (pendingEmailChange === false) {
      executeGlobalUpdate(false);
    }
    setShowEmailConfirmDialog(false);
    setPendingEmailChange(null);
  };

  const handleCancelDisableEmail = () => {
    setShowEmailConfirmDialog(false);
    setPendingEmailChange(null);
    refreshGlobalSettings();
  };

  const handleSettingChange = (
    key: Exclude<keyof NotificationSettings, "emailNotifications">,
    value: boolean
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    notificationService.saveSettings(newSettings);
  };

  const handleSave = () => {
    notificationService.saveSettings(settings);
    toast({
      title: "Notification preferences saved",
      description: "Your notification settings have been updated.",
    });
  };

  const handleTestNotification = async () => {
    if (settings.browserNotifications) {
      const success = await notificationService.sendTestNotification();
      if (success) {
        if (settings.notificationSound) {
          notificationService.playNotificationSound();
        }
        toast({
          title: "Test notification sent",
          description: "Check your browser notifications.",
        });
      } else {
        toast({
          title: "Notification permission denied",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Browser notifications disabled",
        description: "Enable browser notifications first to test them.",
        variant: "destructive",
      });
    }
  };

  const handleTestBroadcastNotification = async () => {
    try {
      // Test broadcast a fake notification
      await broadcastNotificationService.broadcastNewBug(
        "Test Bug - Broadcast Notification",
        "test-123",
        "Test User"
      );

      toast({
        title: "Test broadcast sent",
        description: "A test notification has been broadcasted to all users.",
      });
    } catch (error) {
      toast({
        title: "Broadcast test failed",
        description: "Failed to send test broadcast notification.",
        variant: "destructive",
      });
    }
  };

  const handleTestWhatsAppNotification = () => {
    if (settings.whatsappNotifications) {
      // Test WhatsApp notification with sample data
      whatsappService.shareNewBug({
        bugTitle: "Test Bug - WhatsApp Integration",
        bugId: "test-123",
        priority: "medium",
        description: "This is a test bug notification via WhatsApp",
        reportedBy: "Test User",
        projectName: "Test Project",
      });

      toast({
        title: "WhatsApp opened",
        description: "WhatsApp should open with a pre-filled test message.",
      });
    } else {
      toast({
        title: "WhatsApp notifications disabled",
        description: "Enable WhatsApp notifications first to test them.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/20 rounded-2xl"></div>
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
            <div className="space-y-3 min-w-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                  <BellRing className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight truncate">
                    Notification Preferences
                  </h1>
                  <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mt-2"></div>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                Control how you receive notifications about bug activities
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-2xl"></div>
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 sm:p-8">
            <div className="space-y-6">
              {/* Email Notifications */}
              <div className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-purple-50/40 dark:from-blue-950/15 dark:via-transparent dark:to-purple-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-6 sm:p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                        <Mail className="h-6 w-6 text-white" />
                      </div>
                      <div className="space-y-2 flex-1">
                        <Label
                          htmlFor="emailNotifications"
                          className="text-xl font-bold text-gray-900 dark:text-white cursor-pointer"
                        >
                          Email Notifications
                        </Label>
                        <p className="text-gray-600 dark:text-gray-400 text-base">
                          Receive email notifications for bug reports and status changes (Global Setting)
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={emailNotificationsEnabled}
                      onCheckedChange={handleGlobalEmailToggle}
                      className="scale-125"
                    />
                  </div>
                </div>
              </div>

              {/* Browser Notifications */}
              <div className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-green-50/40 via-transparent to-emerald-50/40 dark:from-green-950/15 dark:via-transparent dark:to-emerald-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-6 sm:p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                        <Bell className="h-6 w-6 text-white" />
                      </div>
                      <div className="space-y-2 flex-1">
                        <Label
                          htmlFor="browserNotifications"
                          className="text-xl font-bold text-gray-900 dark:text-white cursor-pointer"
                        >
                          Browser Notifications
                        </Label>
                        <p className="text-gray-600 dark:text-gray-400 text-base">
                          Show desktop notifications when using the browser
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="browserNotifications"
                      checked={settings.browserNotifications}
                      onCheckedChange={(checked) =>
                        handleSettingChange("browserNotifications", checked)
                      }
                      className="scale-125"
                    />
                  </div>
                </div>
              </div>

              {/* WhatsApp Notifications */}
              <div className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-transparent to-teal-50/40 dark:from-emerald-950/15 dark:via-transparent dark:to-teal-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-6 sm:p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                        <MessageCircle className="h-6 w-6 text-white" />
                      </div>
                      <div className="space-y-2 flex-1">
                        <Label
                          htmlFor="whatsappNotifications"
                          className="text-xl font-bold text-gray-900 dark:text-white cursor-pointer"
                        >
                          WhatsApp Notifications
                        </Label>
                        <p className="text-gray-600 dark:text-gray-400 text-base">
                          Open WhatsApp with pre-filled messages for bug updates
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="whatsappNotifications"
                      checked={settings.whatsappNotifications}
                      onCheckedChange={(checked) =>
                        handleSettingChange("whatsappNotifications", checked)
                      }
                      className="scale-125"
                    />
                  </div>
                </div>
              </div>

              {/* Sound Notifications */}
              <div className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/40 via-transparent to-pink-50/40 dark:from-purple-950/15 dark:via-transparent dark:to-pink-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-6 sm:p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                        <Volume2 className="h-6 w-6 text-white" />
                      </div>
                      <div className="space-y-2 flex-1">
                        <Label
                          htmlFor="notificationSound"
                          className="text-xl font-bold text-gray-900 dark:text-white cursor-pointer"
                        >
                          Notification Sound
                        </Label>
                        <p className="text-gray-600 dark:text-gray-400 text-base">
                          Play a sound when receiving browser notifications
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="notificationSound"
                      checked={settings.notificationSound}
                      onCheckedChange={(checked) =>
                        handleSettingChange("notificationSound", checked)
                      }
                      className="scale-125"
                    />
                  </div>
                </div>
              </div>

              {/* Notification Types Section */}
              <div className="mt-8 p-6 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Notification Types</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Choose which types of events trigger notifications
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="group relative overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/40 via-transparent to-red-50/40 dark:from-orange-950/15 dark:via-transparent dark:to-red-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                              <Bell className="h-5 w-5 text-white" />
                            </div>
                            <Label
                              htmlFor="newBugNotifications"
                              className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer"
                            >
                              New Bug Reports
                            </Label>
                          </div>
                          <Switch
                            id="newBugNotifications"
                            checked={settings.newBugNotifications}
                            onCheckedChange={(checked) =>
                              handleSettingChange("newBugNotifications", checked)
                            }
                            disabled={
                              !settings.browserNotifications &&
                              !emailNotificationsEnabled &&
                              !settings.whatsappNotifications
                            }
                            className="scale-110"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="group relative overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-transparent to-purple-50/40 dark:from-indigo-950/15 dark:via-transparent dark:to-purple-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
                              <BellRing className="h-5 w-5 text-white" />
                            </div>
                            <Label
                              htmlFor="statusChangeNotifications"
                              className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer"
                            >
                              Status Changes
                            </Label>
                          </div>
                          <Switch
                            id="statusChangeNotifications"
                            checked={settings.statusChangeNotifications}
                            onCheckedChange={(checked) =>
                              handleSettingChange("statusChangeNotifications", checked)
                            }
                            disabled={
                              !settings.browserNotifications &&
                              !emailNotificationsEnabled &&
                              !settings.whatsappNotifications
                            }
                            className="scale-110"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {!settings.browserNotifications &&
                !emailNotificationsEnabled &&
                !settings.whatsappNotifications && (
                  <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border border-yellow-200/60 dark:border-yellow-800/60 rounded-2xl">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl">
                        <BellRing className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                          No notification methods enabled
                        </h4>
                        <p className="text-yellow-700 dark:text-yellow-300">
                          Enable email, browser, or WhatsApp notifications to receive alerts about bug activities.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="mt-8 pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  onClick={handleSave}
                  className="h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  Save Preferences
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestNotification}
                  disabled={!settings.browserNotifications}
                  className="h-12 border-2 hover:bg-green-50 hover:border-green-300 hover:text-green-700 dark:hover:bg-green-900/20 dark:hover:border-green-600 dark:hover:text-green-400 transition-all duration-300"
                >
                  Test Browser
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestBroadcastNotification}
                  className="h-12 border-2 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:border-blue-600 dark:hover:text-blue-400 transition-all duration-300"
                >
                  Test Broadcast
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestWhatsAppNotification}
                  disabled={!settings.whatsappNotifications}
                  className="h-12 border-2 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:border-emerald-600 dark:hover:text-emerald-400 transition-all duration-300"
                >
                  Test WhatsApp
                </Button>
              </div>
            </div>

            {/* Debug Tools */}
            <div className="mt-8 pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
              <details className="group">
                <summary className="cursor-pointer text-lg font-semibold mb-4 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2">
                  <span className="text-2xl">🔧</span>
                  Debug Tools (Advanced)
                </summary>
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        broadcastNotificationService.resetLastCheckTime();
                        toast({
                          title: "Debug",
                          description:
                            "Last check time reset. Polling will now check for all recent notifications.",
                        });
                      }}
                      className="h-10 text-sm hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 dark:hover:bg-orange-900/20 dark:hover:border-orange-600 dark:hover:text-orange-400"
                    >
                      Reset Check Time
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await broadcastNotificationService.checkNow();
                        toast({
                          title: "Debug",
                          description:
                            "Manual notification check triggered. Check console for logs.",
                        });
                      }}
                      className="h-10 text-sm hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:border-blue-600 dark:hover:text-blue-400"
                    >
                      Force Check Now
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const isPolling =
                          broadcastNotificationService.isCurrentlyPolling();
                        toast({
                          title: "Debug Info",
                          description: `Polling status: ${
                            isPolling ? "Active" : "Stopped"
                          }`,
                        });
                      }}
                      className="h-10 text-sm hover:bg-green-50 hover:border-green-300 hover:text-green-700 dark:hover:bg-green-900/20 dark:hover:border-green-600 dark:hover:text-green-400"
                    >
                      Check Status
                    </Button>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <p className="text-gray-700 dark:text-gray-300 mb-2 font-medium">
                      Check browser console for detailed logs
                    </p>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <p>• <strong>Reset Check Time:</strong> Forces polling to check all recent notifications</p>
                      <p>• <strong>Force Check Now:</strong> Manually triggers notification check</p>
                      <p>• <strong>Check Status:</strong> Shows current polling and settings status</p>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>

      {/* Email Confirmation Dialog */}
      <AlertDialog
        open={showEmailConfirmDialog}
        onOpenChange={setShowEmailConfirmDialog}
      >
        <AlertDialogContent className="max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Email Notifications?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to disable email notifications? This means
              you will no longer receive emails about:
              <br />
              <br />
              • New bug reports
              <br />
              • Bug status changes
              <br />
              • Bug fixes and updates
              <br />
              <br />
              You can still receive browser notifications if enabled. You can
              re-enable email notifications at any time from this settings page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={handleCancelDisableEmail}
              className="w-full sm:w-auto"
            >
              Keep Email Notifications
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDisableEmail}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
            >
              Disable Email Notifications
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
