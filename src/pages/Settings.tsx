import { AnnouncementManager } from "@/components/settings/AnnouncementManager";
import { NotificationSettingsCard } from "@/components/settings/NotificationSettings";
import { WhatsAppContactsManager } from "@/components/settings/WhatsAppContactsManager";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useNotificationSettings } from "@/context/NotificationSettingsContext";
import { useTheme } from "@/context/ThemeContext";
import { ENV } from "@/lib/env";
import { Moon, Shield, Sun } from "lucide-react";
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
  const data = await response.json();
  return data;
};

const Settings = () => {
  const { currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [autoAssign, setAutoAssign] = useState(true);
  const { emailNotificationsEnabled, refreshGlobalSettings } =
    useNotificationSettings();

  // Only admin should access this page
  if (currentUser?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-full px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <div className="text-center space-y-4 sm:space-y-6">
          <div className="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-muted">
            <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
            Access Denied
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg max-w-md">
            Only administrators can access the settings page.
          </p>
        </div>
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
    if (
      result &&
      result.data &&
      result.data.email_notifications_enabled !== undefined
    ) {
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
    <div className="space-y-6 sm:space-y-8 px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      {/* Enhanced Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 sm:gap-6">
        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Settings
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
            Manage your BugRacer application configuration
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4 sm:mb-6 h-10 sm:h-12">
          <TabsTrigger
            value="general"
            className="text-sm sm:text-base px-3 sm:px-4"
          >
            General
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="text-sm sm:text-base px-3 sm:px-4"
          >
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="whatsapp"
            className="text-sm sm:text-base px-3 sm:px-4"
          >
            WhatsApp
          </TabsTrigger>
          <TabsTrigger
            value="announcements"
            className="text-sm sm:text-base px-3 sm:px-4"
          >
            Announcements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="p-4 sm:p-5 lg:p-6">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl">
                General Settings
              </CardTitle>
              <CardDescription className="text-sm sm:text-base lg:text-lg">
                Manage your BugRacer application settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-5 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    {theme === "dark" ? (
                      <Moon className="h-5 w-5 sm:h-6 sm:w-6" />
                    ) : (
                      <Sun className="h-5 w-5 sm:h-6 sm:w-6" />
                    )}
                    <div className="space-y-1 sm:space-y-2">
                      <Label
                        htmlFor="darkMode"
                        className="text-base sm:text-lg font-semibold"
                      >
                        Dark Mode
                      </Label>
                      <p className="text-sm sm:text-base text-muted-foreground">
                        Enable dark mode for the application
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="darkMode"
                    checked={theme === "dark"}
                    onCheckedChange={toggleTheme}
                    className="scale-110 sm:scale-125"
                  />
                </div>

                <Separator className="my-4 sm:my-6" />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="space-y-1 sm:space-y-2">
                    <Label
                      htmlFor="autoAssign"
                      className="text-base sm:text-lg font-semibold"
                    >
                      Auto-assign bugs
                    </Label>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      Automatically assign new bugs to developers
                    </p>
                  </div>
                  <Switch
                    id="autoAssign"
                    checked={autoAssign}
                    onCheckedChange={setAutoAssign}
                    className="scale-110 sm:scale-125"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveGeneral}
                className="w-full sm:w-auto h-10 sm:h-11 px-6 sm:px-8 text-sm sm:text-base"
              >
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="space-y-4 sm:space-y-6">
            <NotificationSettingsCard />
          </div>
        </TabsContent>

        <TabsContent value="whatsapp">
          <div className="space-y-4 sm:space-y-6">
            <WhatsAppContactsManager />
          </div>
        </TabsContent>

        <TabsContent value="announcements">
          <div className="space-y-4 sm:space-y-6">
            <AnnouncementManager />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
