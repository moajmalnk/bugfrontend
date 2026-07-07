import { AnnouncementManager } from "@/components/settings/AnnouncementManager";
import { NotificationSettingsCard } from "@/components/settings/NotificationSettings";
import { RolesTab } from "@/components/settings/RolesTab";
// WhatsApp feature removed
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Bell,
  Check,
  ChevronDown,
  Megaphone,
  Moon,
  Settings as SettingsIcon,
  Shield,
  Sun,
  Users,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const Settings = () => {
  const { currentUser } = useAuth();
  const { hasPermission, isLoading, clearCache, refreshPermissions } = usePermissions(null);
  const { theme, toggleTheme } = useTheme();
  const [autoAssign, setAutoAssign] = useState(true);
  const [initialAutoAssign, setInitialAutoAssign] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") || "general";
  const initialTab = requestedTab === "whatsapp" ? "general" : requestedTab;
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isMobileTabSelectorOpen, setIsMobileTabSelectorOpen] = useState(false);
  const settingsTabs = [
    { value: "general", label: "General", shortLabel: "General", icon: SettingsIcon },
    { value: "notifications", label: "Notifications", shortLabel: "Alerts", icon: Bell },
    { value: "announcements", label: "Announcements", shortLabel: "News", icon: Megaphone },
    { value: "roles", label: "Roles", shortLabel: "Roles", icon: Users },
  ];
  const activeSettingsTab =
    settingsTabs.find((tab) => tab.value === activeTab) ?? settingsTabs[0];

  useEffect(() => {
    const rawTab = searchParams.get("tab") || "general";
    const urlTab = rawTab === "whatsapp" ? "general" : rawTab;
    if (urlTab !== activeTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Check for SETTINGS_EDIT permission
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <div className="text-center space-y-4 sm:space-y-6">
          <div className="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-muted">
            <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
            Loading...
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg max-w-md">
            Verifying your access permissions...
          </p>
        </div>
      </div>
    );
  }

  if (!hasPermission('SETTINGS_EDIT')) {
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
            You do not have permission to access the settings page.
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

  const handleRefreshPermissions = async () => {
    clearCache();
    await refreshPermissions();
    toast({
      title: "Permissions Refreshed",
      description: "Your permissions have been refreshed from the server.",
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
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleRefreshPermissions}
                  variant="outline"
                  className="gap-2"
                  title="Refresh your permissions from the server"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Refresh Permissions</span>
                  <span className="sm:hidden">Refresh</span>
                </Button>
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
              <div className="md:hidden p-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-2xl justify-between border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70"
                  onClick={() => setIsMobileTabSelectorOpen(true)}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {activeSettingsTab?.icon && (
                      <activeSettingsTab.icon className="h-4 w-4" />
                    )}
                    {activeSettingsTab?.label}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
              </div>
              <TabsList className="hidden md:grid w-full grid-cols-4 h-14 bg-transparent p-1">
                {settingsTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                  >
                    <tab.icon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.shortLabel}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <Drawer
            open={isMobileTabSelectorOpen}
            onOpenChange={setIsMobileTabSelectorOpen}
          >
            <DrawerContent className="md:hidden rounded-t-3xl border-gray-200/70 dark:border-gray-800/70 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
              <DrawerHeader className="text-left pb-2">
                <DrawerTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  Select Section
                </DrawerTitle>
                <DrawerDescription>
                  Navigate to different settings areas
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-6 space-y-3 max-h-[65vh] overflow-y-auto">
                {settingsTabs.map((tab) => {
                  const isActive = activeTab === tab.value;
                  return (
                    <Button
                      key={tab.value}
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setActiveTab(tab.value);
                        setSearchParams((prev) => {
                          const p = new URLSearchParams(prev);
                          p.set("tab", tab.value);
                          return p as any;
                        });
                        setIsMobileTabSelectorOpen(false);
                      }}
                      className={`w-full h-auto min-h-20 rounded-3xl px-4 py-4 flex items-center justify-between ${
                        isActive
                          ? "bg-lime-400 text-gray-950 hover:bg-lime-400"
                          : "bg-gray-100/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 hover:bg-gray-200/80 dark:hover:bg-gray-700/80"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${
                            isActive
                              ? "bg-lime-500/80 text-gray-950"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                          }`}
                        >
                          <tab.icon className="h-5 w-5" />
                        </span>
                        <span className="text-lg font-semibold">{tab.label}</span>
                      </span>
                      <span
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${
                          isActive
                            ? "bg-gray-950 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100"
                        }`}
                      >
                        {isActive ? <Check className="h-5 w-5" /> : <ChevronDown className="h-4 w-4 -rotate-90 opacity-80" />}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </DrawerContent>
          </Drawer>

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

          <TabsContent value="roles" className="space-y-6 sm:space-y-8">
            <div className="space-y-4 sm:space-y-6">
              <RolesTab />
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
};

export default Settings;
