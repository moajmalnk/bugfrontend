import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { Bell, BellRing, Volume2, Mail } from 'lucide-react';
import { notificationService, NotificationSettings } from '@/services/notificationService';
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

export function NotificationSettingsCard() {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    browserNotifications: true,
    newBugNotifications: true,
    statusChangeNotifications: true,
    notificationSound: true
  });
  
  const [showEmailConfirmDialog, setShowEmailConfirmDialog] = useState(false);
  const [pendingEmailChange, setPendingEmailChange] = useState<boolean | null>(null);

  useEffect(() => {
    const savedSettings = notificationService.getSettings();
    console.log('Loaded settings:', savedSettings); // Debug log
    setSettings(savedSettings);
  }, []);

  const handleEmailNotificationChange = (checked: boolean) => {
    if (!checked) {
      // If disabling email notifications, show confirmation dialog
      setPendingEmailChange(checked);
      setShowEmailConfirmDialog(true);
    } else {
      // If enabling, just apply immediately
      updateEmailNotifications(checked);
    }
  };

  const updateEmailNotifications = (checked: boolean) => {
    const newSettings = { ...settings, emailNotifications: checked };
    setSettings(newSettings);
    
    // Save immediately when changed
    notificationService.saveSettings(newSettings);
    console.log('Settings saved:', newSettings); // Debug log
    
    toast({
      title: checked ? "Email notifications enabled" : "Email notifications disabled",
      description: checked 
        ? "You will now receive email notifications for bug activities."
        : "You will no longer receive any email notifications from BugRacer.",
    });
  };

  const handleConfirmDisableEmail = () => {
    if (pendingEmailChange !== null) {
      updateEmailNotifications(pendingEmailChange);
    }
    setShowEmailConfirmDialog(false);
    setPendingEmailChange(null);
  };

  const handleCancelDisableEmail = () => {
    setShowEmailConfirmDialog(false);
    setPendingEmailChange(null);
  };

  const handleSettingChange = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Save immediately when changed
    notificationService.saveSettings(newSettings);
    console.log('Settings updated and saved:', newSettings); // Debug log
  };

  const handleSave = () => {
    notificationService.saveSettings(settings);
    console.log('Settings manually saved:', settings); // Debug log
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Control how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <div>
                  <Label htmlFor="emailNotifications" className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications for bug reports and status changes
                  </p>
                </div>
              </div>
              <Switch
                id="emailNotifications"
                checked={settings.emailNotifications}
                onCheckedChange={handleEmailNotificationChange}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <div>
                  <Label htmlFor="browserNotifications" className="text-base">Browser Notifications</Label>
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
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                <div>
                  <Label htmlFor="notificationSound" className="text-base">Notification Sound</Label>
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
              />
            </div>

            <Separator />
            
            <div className="pl-7 space-y-3">
              <h3 className="font-medium">Notification Types</h3>
              <p className="text-sm text-muted-foreground">
                Choose which types of events trigger notifications
              </p>
              
              <div className="flex items-center justify-between pl-4">
                <Label htmlFor="newBugNotifications" className="text-sm">
                  New bug reports
                </Label>
                <Switch
                  id="newBugNotifications"
                  checked={settings.newBugNotifications}
                  onCheckedChange={(checked) => 
                    handleSettingChange('newBugNotifications', checked)
                  }
                  disabled={!settings.browserNotifications && !settings.emailNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between pl-4">
                <Label htmlFor="statusChangeNotifications" className="text-sm">
                  Bug status changes
                </Label>
                <Switch
                  id="statusChangeNotifications"
                  checked={settings.statusChangeNotifications}
                  onCheckedChange={(checked) => 
                    handleSettingChange('statusChangeNotifications', checked)
                  }
                  disabled={!settings.browserNotifications && !settings.emailNotifications}
                />
              </div>
            </div>
            
            {(!settings.browserNotifications && !settings.emailNotifications) && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  Enable email or browser notifications to receive alerts about bug activities.
                </p>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleSave}>Save Preferences</Button>
            <Button 
              variant="outline" 
              onClick={handleTestNotification}
              disabled={!settings.browserNotifications}
            >
              Test Notification
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showEmailConfirmDialog} onOpenChange={setShowEmailConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Email Notifications?</AlertDialogTitle>
            <AlertDialogDescription>
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
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDisableEmail}>
              Keep Email Notifications
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDisableEmail}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disable Email Notifications
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
