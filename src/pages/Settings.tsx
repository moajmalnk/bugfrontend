import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Moon, Sun } from 'lucide-react';
import { NotificationSettingsCard } from '@/components/settings/NotificationSettings';
import { WhatsAppContactsManager } from '@/components/settings/WhatsAppContactsManager';
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
  const data = await response.json();
  return data;
};

const Settings = () => {
  const { currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [autoAssign, setAutoAssign] = useState(true);
  const { emailNotificationsEnabled, refreshGlobalSettings } = useNotificationSettings();

  // Only admin should access this page
  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">Only administrators can access the settings page.</p>
      </div>
    );
  }

  const handleSaveGeneral = () => {
    toast({
      title: "Settings saved",
      description: "Your general settings have been updated.",
    });
  };

  const handleGlobalEmailToggle = async (checked: boolean) => {
    const result = await updateGlobalEmailSetting(checked);
    if (result && result.data && result.data.email_notifications_enabled !== undefined) {
      refreshGlobalSettings();
      toast({
        title: "Global email notifications updated",
        description: checked
          ? "Email notifications are now enabled for all users."
          : "Email notifications are now disabled for all users.",
      });
    } else {
      toast({
        title: "Failed to update global email notifications",
        description: result?.message || "An error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Manage your BugRacer application settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    <div>
                      <Label htmlFor="darkMode" className="text-base">Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable dark mode for the application
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="darkMode"
                    checked={theme === 'dark'}
                    onCheckedChange={toggleTheme}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoAssign" className="text-base">Auto-assign bugs</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically assign new bugs to developers
                    </p>
                  </div>
                  <Switch
                    id="autoAssign"
                    checked={autoAssign}
                    onCheckedChange={setAutoAssign}
                  />
                </div>
              </div>
              
              <Button onClick={handleSaveGeneral}>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <NotificationSettingsCard />
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppContactsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
