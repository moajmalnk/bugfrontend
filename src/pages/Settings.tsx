import { AnnouncementManager } from "@/components/settings/AnnouncementManager";
import { NotificationSettingsCard } from "@/components/settings/NotificationSettings";
// WhatsApp feature removed
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
import { useTheme } from "@/context/ThemeContext";
import { Bell, Megaphone, Moon, Settings as SettingsIcon, Shield, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const Settings = () => {
  const { currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [autoAssign, setAutoAssign] = useState(true);
  const [initialAutoAssign, setInitialAutoAssign] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") || "general";
  const initialTab = requestedTab === "whatsapp" ? "general" : requestedTab;
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const rawTab = searchParams.get("tab") || "general";
    const urlTab = rawTab === "whatsapp" ? "general" : rawTab;
    if (urlTab !== activeTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
    setInitialAutoAssign(autoAssign);
    toast({
      title: "Settings saved",
      description: "Your general settings have been updated.",
    });
  };

  const handleResetGeneral = () => {
    if (theme === "dark") {
      toggleTheme();
    }
    setAutoAssign(true);
    toast({
      title: "Defaults restored",
      description: "Light mode and auto-assign have been reset to defaults.",
    });
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-green-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-green-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg">
                    <SettingsIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Settings
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Manage your BugRicer application configuration
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val);
            setSearchParams((prev) => {
              const p = new URLSearchParams(prev);
              p.set("tab", val);
              return p as any;
            });
          }}
          className="w-full"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 rounded-2xl"></div>
            <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
              <TabsList className="grid w-full grid-cols-3 h-14 bg-transparent p-1">
                <TabsTrigger
                  value="general"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">General</span>
                  <span className="sm:hidden">General</span>
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">Notifications</span>
                  <span className="sm:hidden">Alerts</span>
                </TabsTrigger>
                <TabsTrigger
                  value="announcements"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <Megaphone className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">Announcements</span>
                  <span className="sm:hidden">News</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="general" className="space-y-6 sm:space-y-8">
            <Card className="shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="p-4 sm:p-5 lg:p-6">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl">
                General Settings
              </CardTitle>
              <CardDescription className="text-sm sm:text-base lg:text-lg">
                Manage your BugRicer application settings
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

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  onClick={handleSaveGeneral}
                  className="w-full sm:w-auto h-10 sm:h-11 px-6 sm:px-8 text-sm sm:text-base"
                  disabled={autoAssign === initialAutoAssign}
                >
                  Save Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResetGeneral}
                  className="w-full sm:w-auto h-10 sm:h-11 px-6 sm:px-8 text-sm sm:text-base"
                >
                  Reset
                </Button>
              </div>
            </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6 sm:space-y-8">
            <div className="space-y-4 sm:space-y-6">
              <NotificationSettingsCard />
            </div>
          </TabsContent>

          <TabsContent value="announcements" className="space-y-6 sm:space-y-8">
            <div className="space-y-4 sm:space-y-6">
              <AnnouncementManager />
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
};

export default Settings;
