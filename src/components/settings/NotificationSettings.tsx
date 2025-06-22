import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { Bell, BellRing, Volume2, Mail, MessageCircle } from 'lucide-react';
import { notificationService, NotificationSettings } from '@/services/notificationService';
import { whatsappService } from '@/services/whatsappService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { broadcastNotificationService } from '@/services/broadcastNotificationService';
import { useNotificationSettings } from "@/context/NotificationSettingsContext";
import { ENV } from '@/lib/env';

const updateGlobalEmailSetting = async (enabled: boolean) => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${ENV.API_URL}/settings/update.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ email_notifications_enabled: enabled }),
  });
  if (!response.ok) {
    throw new Error('Failed to update global email setting.');
  }
  const data = await response.json();
  return data;
};

export function NotificationSettingsCard() {
  const [settings, setSettings] = useState(() => notificationService.getSettings());
  const [showEmailConfirmDialog, setShowEmailConfirmDialog] = useState(false);
  const [pendingEmailChange, setPendingEmailChange] = useState<boolean | null>(null);

  const { emailNotificationsEnabled, refreshGlobalSettings } = useNotificationSettings();

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
        description: error instanceof Error ? error.message : "Please try again.",
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

  const handleSettingChange = (key: Exclude<keyof NotificationSettings, 'emailNotifications'>, value: boolean) => {
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
        projectName: "Test Project"
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
    <>
      <Card className="w-full">
        <CardHeader className="space-y-2">
          <CardTitle className="text-lg sm:text-xl">Notification Preferences</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Control how you receive notifications about bug activities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
            {/* Email Notifications */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 mt-1 text-muted-foreground" />
                <div className="space-y-1 flex-1">
                  <Label htmlFor="emailNotifications" className="text-base font-medium cursor-pointer">
                    Email Notifications
                  </Label>
                <p className="text-sm text-muted-foreground">
                    Receive email notifications for bug reports and status changes (Global Setting)
                </p>
              </div>
            </div>
            <Switch
              id="emailNotifications"
              checked={emailNotificationsEnabled}
              onCheckedChange={handleGlobalEmailToggle}
              className="self-start sm:self-center"
            />
          </div>
          
          <Separator />
          
            {/* Browser Notifications */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 mt-1 text-muted-foreground" />
                <div className="space-y-1 flex-1">
                  <Label htmlFor="browserNotifications" className="text-base font-medium cursor-pointer">
                    Browser Notifications
                  </Label>
                <p className="text-sm text-muted-foreground">
                    Show desktop notifications when using the browser
                </p>
              </div>
            </div>
            <Switch
              id="browserNotifications"
              checked={settings.browserNotifications}
              onCheckedChange={(checked) => 
                  handleSettingChange('browserNotifications', checked)
              }
                className="self-start sm:self-center"
            />
          </div>

          <Separator />

            {/* WhatsApp Notifications */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <MessageCircle className="h-5 w-5 mt-1 text-muted-foreground" />
                <div className="space-y-1 flex-1">
                  <Label htmlFor="whatsappNotifications" className="text-base font-medium cursor-pointer">
                    WhatsApp Notifications
                  </Label>
                <p className="text-sm text-muted-foreground">
                    Open WhatsApp with pre-filled messages for bug updates
                </p>
              </div>
            </div>
              <Switch
                id="whatsappNotifications"
                checked={settings.whatsappNotifications}
                onCheckedChange={(checked) =>
                  handleSettingChange('whatsappNotifications', checked)
                }
                className="self-start sm:self-center"
              />
            </div>

            <Separator />

            {/* Sound Notifications */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <Volume2 className="h-5 w-5 mt-1 text-muted-foreground" />
                <div className="space-y-1 flex-1">
                  <Label htmlFor="notificationSound" className="text-base font-medium cursor-pointer">
                    Notification Sound
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Play a sound when receiving browser notifications
                </p>
              </div>
            </div>
            <Switch
              id="notificationSound"
              checked={settings.notificationSound}
              onCheckedChange={(checked) => 
                  handleSettingChange('notificationSound', checked)
              }
                className="self-start sm:self-center"
            />
          </div>

          <Separator />
          
            {/* Notification Types Section */}
            <div className="pl-4 sm:pl-7 space-y-4 border-l-2 border-muted">
              <div className="space-y-2">
                <h3 className="font-medium text-base">Notification Types</h3>
                <p className="text-sm text-muted-foreground">
                  Choose which types of events trigger notifications
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 pl-4 py-2 border rounded-lg">
                  <Label htmlFor="newBugNotifications" className="text-sm font-medium cursor-pointer">
                    New bug reports
              </Label>
              <Switch
                id="newBugNotifications"
                checked={settings.newBugNotifications}
                onCheckedChange={(checked) => 
                      handleSettingChange('newBugNotifications', checked)
                }
                    disabled={!settings.browserNotifications && !emailNotificationsEnabled && !settings.whatsappNotifications}
                    className="self-start sm:self-center"
              />
            </div>
            
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 pl-4 py-2 border rounded-lg">
                  <Label htmlFor="statusChangeNotifications" className="text-sm font-medium cursor-pointer">
                    Bug status changes
              </Label>
              <Switch
                id="statusChangeNotifications"
                checked={settings.statusChangeNotifications}
                onCheckedChange={(checked) => 
                      handleSettingChange('statusChangeNotifications', checked)
                }
                    disabled={!settings.browserNotifications && !emailNotificationsEnabled && !settings.whatsappNotifications}
                    className="self-start sm:self-center"
              />
            </div>
          </div>
        </div>
        
            {(!settings.browserNotifications && !emailNotificationsEnabled && !settings.whatsappNotifications) && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <BellRing className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">No notification methods enabled</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Enable email, browser, or WhatsApp notifications to receive alerts about bug activities.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 pt-6 border-t">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button onClick={handleSave} className="w-full">
                Save Preferences
              </Button>
          <Button 
            variant="outline" 
            onClick={handleTestNotification}
            disabled={!settings.browserNotifications}
                className="w-full"
              >
                Test Browser
              </Button>
              <Button 
                variant="outline" 
                onClick={handleTestBroadcastNotification}
                className="w-full"
              >
                Test Broadcast
              </Button>
              <Button 
                variant="outline" 
                onClick={handleTestWhatsAppNotification}
                disabled={!settings.whatsappNotifications}
                className="w-full"
              >
                Test WhatsApp
              </Button>
            </div>
            
            {/* Debug Tools */}
            <div className="pt-4 border-t">
              <details>
                <summary className="cursor-pointer text-sm font-medium mb-3 hover:text-foreground text-muted-foreground">
                  🔧 Debug Tools (Advanced)
                </summary>
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        broadcastNotificationService.resetLastCheckTime();
                        toast({
                          title: "Debug",
                          description: "Last check time reset. Polling will now check for all recent notifications.",
                        });
                      }}
                      className="text-xs"
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
                          description: "Manual notification check triggered. Check console for logs.",
                        });
                      }}
                      className="text-xs"
                    >
                      Force Check Now
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const isPolling = broadcastNotificationService.isCurrentlyPolling();
                        toast({
                          title: "Debug Info",
                          description: `Polling status: ${isPolling ? 'Active' : 'Stopped'}`,
                        });
                        // console.log('Broadcast service polling status:', isPolling);
                        // console.log('Current settings:', notificationService.getSettings());
                      }}
                      className="text-xs"
                    >
                      Check Status
                    </Button>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-2">Check browser console for detailed logs</p>
                    <p className="text-xs text-muted-foreground">
                      • Reset Check Time: Forces polling to check all recent notifications<br/>
                      • Force Check Now: Manually triggers notification check<br/>
                      • Check Status: Shows current polling and settings status
                    </p>
                  </div>
                </div>
              </details>
            </div>
          </div>
          
          {/* Debug section - can be removed in production */}
          {/* <details className="border-t pt-4 mt-4">
            <summary className="cursor-pointer text-sm font-medium mb-3 hover:text-foreground text-muted-foreground">
              Debug Information (Developer Tools)
            </summary>
            <div className="space-y-3 text-xs">
              <div>
                <strong className="text-sm">Current Settings:</strong>
                <pre className="bg-muted p-3 rounded mt-2 overflow-auto text-xs border">
                  {JSON.stringify(settings, null, 2)}
                </pre>
              </div>
              <div>
                <strong className="text-sm">localStorage Value:</strong>
                <pre className="bg-muted p-3 rounded mt-2 overflow-auto text-xs border">
                  {localStorage.getItem('notification_settings') || 'null'}
                </pre>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    notificationService.clearSettings();
                    window.location.reload();
                  }}
                  className="text-xs"
                >
                  Clear Settings & Reload
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    console.log('Current settings:', notificationService.getSettings());
                    console.log('localStorage content:', localStorage.getItem('notification_settings'));
                  }}
                  className="text-xs"
                >
                  Log to Console
          </Button>
        </div>
            </div>
          </details> */}
      </CardContent>
    </Card>

      {/* Email Confirmation Dialog */}
      <AlertDialog open={showEmailConfirmDialog} onOpenChange={setShowEmailConfirmDialog}>
        <AlertDialogContent className="max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Email Notifications?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to disable email notifications? This means you will no longer receive
              emails about:
              <br /><br />
              • New bug reports<br />
              • Bug status changes<br />
              • Bug fixes and updates
              <br /><br />
              You can still receive browser notifications if enabled. You can re-enable email
              notifications at any time from this settings page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={handleCancelDisableEmail} className="w-full sm:w-auto">
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
    </>
  );
}
