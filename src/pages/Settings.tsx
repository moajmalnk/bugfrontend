import { AnnouncementManager, type AnnouncementManagerHandle } from "@/components/settings/AnnouncementManager";
import { BugTypesTab, type BugTypesTabHandle } from "@/components/settings/BugTypesTab";
import {
  NotificationSettingsCard,
  type NotificationSettingsHandle,
} from "@/components/settings/NotificationSettings";
import {
  OfficeLocationMapPicker,
  OfficeLocationMapPreview,
} from "@/components/settings/OfficeLocationMapPicker";
import { RolesTab, type RolesTabHandle } from "@/components/settings/RolesTab";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  defaultCheckInCutoffSettings,
  defaultOfficeLocationSettings,
  formatCheckInCutoffLabel,
  getAppSettings,
  updateCheckInCutoffSettings,
  updateOfficeLocationSettings,
  type CheckInCutoffSettings,
  type OfficeLocationSettings,
} from "@/services/settingsService";
import { TimePicker } from "@/components/ui/TimePicker";
import {
  Bell,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  Map,
  MapPin,
  Megaphone,
  Moon,
  Plus,
  Save,
  Settings as SettingsIcon,
  Shield,
  Sun,
  Tags,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

const Settings = () => {
  const { currentUser } = useAuth();
  const { hasPermission, isLoading } = usePermissions(null);
  const { theme, toggleTheme } = useTheme();
  const [autoAssign, setAutoAssign] = useState(true);
  const [initialAutoAssign, setInitialAutoAssign] = useState(true);
  const [officeLocation, setOfficeLocation] = useState<OfficeLocationSettings>(
    defaultOfficeLocationSettings()
  );
  const [initialOfficeLocation, setInitialOfficeLocation] = useState<OfficeLocationSettings>(
    defaultOfficeLocationSettings()
  );
  const [officeDefaults, setOfficeDefaults] = useState<OfficeLocationSettings>(
    defaultOfficeLocationSettings()
  );
  const [checkInCutoff, setCheckInCutoff] = useState<CheckInCutoffSettings>(
    defaultCheckInCutoffSettings()
  );
  const [initialCheckInCutoff, setInitialCheckInCutoff] =
    useState<CheckInCutoffSettings>(defaultCheckInCutoffSettings());
  const [loadingOfficeSettings, setLoadingOfficeSettings] = useState(true);
  const [savingOfficeSettings, setSavingOfficeSettings] = useState(false);
  const [officeMapOpen, setOfficeMapOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") || "general";
  const normalizeSettingsTab = (tab: string) => {
    if (tab === "whatsapp") return "general";
    if (tab === "bug-types") return "types";
    return tab;
  };
  const initialTab = normalizeSettingsTab(requestedTab);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isMobileTabSelectorOpen, setIsMobileTabSelectorOpen] = useState(false);
  const bugTypesRef = useRef<BugTypesTabHandle>(null);
  const rolesRef = useRef<RolesTabHandle>(null);
  const announcementsRef = useRef<AnnouncementManagerHandle>(null);
  const notificationsRef = useRef<NotificationSettingsHandle>(null);
  const settingsTabs = [
    { value: "general", label: "General", shortLabel: "General", icon: SettingsIcon },
    { value: "notifications", label: "Notifications", shortLabel: "Alerts", icon: Bell },
    { value: "announcements", label: "Announcements", shortLabel: "News", icon: Megaphone },
    { value: "types", label: "Bug Types", shortLabel: "Types", icon: Tags },
    { value: "roles", label: "Roles", shortLabel: "Roles", icon: Users },
  ];
  const activeSettingsTab =
    settingsTabs.find((tab) => tab.value === activeTab) ?? settingsTabs[0];

  useEffect(() => {
    const rawTab = searchParams.get("tab") || "general";
    const normalized = normalizeSettingsTab(rawTab);
    if (normalized !== activeTab) setActiveTab(normalized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loadOfficeSettings = useCallback(async () => {
    setLoadingOfficeSettings(true);
    try {
      const settings = await getAppSettings();
      const next: OfficeLocationSettings = {
        office_lat: settings.office_lat,
        office_lng: settings.office_lng,
        office_radius_m: settings.office_radius_m,
        office_label: settings.office_label,
      };
      setOfficeLocation(next);
      setInitialOfficeLocation(next);
      if (settings.office_defaults) {
        setOfficeDefaults(settings.office_defaults);
      }
      const cutoff: CheckInCutoffSettings = {
        checkin_cutoff_enabled: settings.checkin_cutoff_enabled,
        checkin_cutoff_time: settings.checkin_cutoff_time,
        checkin_cutoff_label:
          settings.checkin_cutoff_label ||
          formatCheckInCutoffLabel(settings.checkin_cutoff_time),
      };
      setCheckInCutoff(cutoff);
      setInitialCheckInCutoff(cutoff);
    } catch (e) {
      toast({
        title: "Could not load office location",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingOfficeSettings(false);
    }
  }, []);

  useEffect(() => {
    void loadOfficeSettings();
  }, [loadOfficeSettings]);

  const officeDirty = useMemo(() => {
    return (
      officeLocation.office_lat !== initialOfficeLocation.office_lat ||
      officeLocation.office_lng !== initialOfficeLocation.office_lng ||
      officeLocation.office_radius_m !== initialOfficeLocation.office_radius_m ||
      officeLocation.office_label !== initialOfficeLocation.office_label
    );
  }, [officeLocation, initialOfficeLocation]);

  const cutoffDirty = useMemo(() => {
    return (
      checkInCutoff.checkin_cutoff_enabled !==
        initialCheckInCutoff.checkin_cutoff_enabled ||
      checkInCutoff.checkin_cutoff_time !== initialCheckInCutoff.checkin_cutoff_time
    );
  }, [checkInCutoff, initialCheckInCutoff]);

  const generalDirty = autoAssign !== initialAutoAssign || officeDirty || cutoffDirty;

  // Check for SETTINGS_EDIT permission
  if (isLoading) {
    return (
      <div className="min-w-0 w-full space-y-4 sm:space-y-6">
        <Skeleton className="h-28 sm:h-40 w-full rounded-2xl" />
        <Skeleton className="h-12 sm:h-16 w-full rounded-2xl" />
        <Skeleton className="h-64 sm:h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (!hasPermission('SETTINGS_EDIT')) {
    return (
      <div className="min-w-0 w-full">
        <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 p-6 sm:p-12 text-center min-w-0">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground max-w-md mx-auto text-sm sm:text-base">
            You do not have permission to access the settings page.
          </p>
        </div>
      </div>
    );
  }

  const handleSaveGeneral = async () => {
    setSavingOfficeSettings(true);
    try {
      if (officeDirty) {
        const lat = Number(officeLocation.office_lat);
        const lng = Number(officeLocation.office_lng);
        const radius = Number(officeLocation.office_radius_m);
        const label = officeLocation.office_label.trim();

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          throw new Error("Enter valid latitude and longitude.");
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          throw new Error("Coordinates are out of range.");
        }
        if (!Number.isFinite(radius) || radius < 50 || radius > 5000) {
          throw new Error("Radius must be between 50 m and 5000 m.");
        }
        if (!label) {
          throw new Error("Office label is required.");
        }

        const saved = await updateOfficeLocationSettings({
          office_lat: lat,
          office_lng: lng,
          office_radius_m: Math.round(radius),
          office_label: label.slice(0, 120),
        });
        setOfficeLocation(saved);
        setInitialOfficeLocation(saved);
      }

      if (cutoffDirty) {
        const time = checkInCutoff.checkin_cutoff_time.trim();
        if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(time)) {
          throw new Error("Enter a valid check-in cutoff time.");
        }
        const savedCutoff = await updateCheckInCutoffSettings({
          checkin_cutoff_enabled: checkInCutoff.checkin_cutoff_enabled,
          checkin_cutoff_time: time,
        });
        setCheckInCutoff(savedCutoff);
        setInitialCheckInCutoff(savedCutoff);
      }

      setInitialAutoAssign(autoAssign);
      toast({
        title: "Settings saved",
        description:
          officeDirty || cutoffDirty
            ? "Check-in policy and general settings updated."
            : "Your general settings have been updated.",
      });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Could not save settings.",
        variant: "destructive",
      });
    } finally {
      setSavingOfficeSettings(false);
    }
  };

  const handleResetGeneral = () => {
    if (theme === "dark") {
      toggleTheme();
    }
    setAutoAssign(true);
    setInitialAutoAssign(true);
    setOfficeLocation(initialOfficeLocation);
    setCheckInCutoff(initialCheckInCutoff);
    toast({
      title: "Settings reset",
      description: "Unsaved changes were discarded.",
    });
  };

  const handleRestoreOfficeDefaults = () => {
    setOfficeLocation({ ...officeDefaults });
    toast({
      title: "Office defaults loaded",
      description: "Wired In Coworks defaults applied — click Save to persist.",
    });
  };

  const headerAction = (() => {
    switch (activeTab) {
      case "types":
        return {
          label: "Add types",
          icon: Plus,
          onClick: () => bugTypesRef.current?.focusCreate(),
          disabled: false,
        };
      case "roles":
        return {
          label: "Add roles",
          icon: Plus,
          onClick: () => rolesRef.current?.openCreate(),
          disabled: false,
        };
      case "announcements":
        return {
          label: "Add announcement",
          icon: Plus,
          onClick: () => announcementsRef.current?.openCreate(),
          disabled: false,
        };
      case "notifications":
        return {
          label: "Save notifications",
          icon: Save,
          onClick: () => notificationsRef.current?.save(),
          disabled: false,
        };
      default:
        return {
          label: "Save changes",
          icon: Save,
          onClick: () => void handleSaveGeneral(),
          disabled: !generalDirty || savingOfficeSettings || loadingOfficeSettings,
        };
    }
  })();

  return (
    <div className="min-w-0 w-full space-y-4 sm:space-y-6 md:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden rounded-2xl min-w-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-green-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-green-950/20 pointer-events-none" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 md:p-8 min-w-0">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 sm:gap-6 min-w-0">
              <div className="space-y-2 sm:space-y-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg shrink-0">
                    <SettingsIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Settings
                    </h1>
                    <div className="h-1 w-16 sm:w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base lg:text-lg font-medium max-w-2xl">
                  Manage your BugRicer application configuration
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 shrink-0">
                <Button
                  onClick={headerAction.onClick}
                  disabled={headerAction.disabled || savingOfficeSettings}
                  className="h-11 sm:h-12 px-4 sm:px-6 w-full sm:w-auto font-semibold shadow-sm hover:shadow-md rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white disabled:opacity-50"
                >
                  {savingOfficeSettings && activeTab === "general" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <headerAction.icon className="mr-2 h-4 w-4" />
                  )}
                  {headerAction.label}
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
              <div className="lg:hidden p-1">
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
              <TabsList className="hidden lg:grid w-full grid-cols-5 h-14 bg-transparent p-1">
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
            <DrawerContent className="lg:hidden rounded-t-3xl border-gray-200/70 dark:border-gray-800/70 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
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
                          ? "bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-500 hover:to-red-600"
                          : "bg-gray-100/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 hover:bg-gray-200/80 dark:hover:bg-gray-700/80"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${
                            isActive
                              ? "bg-white/20 text-white"
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

          <TabsContent value="general" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6 min-w-0">
            <div className="relative min-w-0 w-full">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl pointer-events-none" />
              <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl min-w-0">
                <Card className="border-0 shadow-none bg-transparent">
                  <CardContent className="space-y-4 p-4 sm:p-6 md:p-8 pt-4 min-w-0">
                    <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-900/80 p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 shrink-0">
                            {theme === "dark" ? (
                              <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <Sun className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="darkMode" className="text-base font-semibold text-gray-900 dark:text-white">
                              Dark Mode
                            </Label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Enable dark mode for the application
                            </p>
                          </div>
                        </div>
                        <Switch
                          id="darkMode"
                          checked={theme === "dark"}
                          onCheckedChange={toggleTheme}
                          className="self-start sm:self-center"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-900/80 p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 shrink-0">
                            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="autoAssign" className="text-base font-semibold text-gray-900 dark:text-white">
                              Auto-assign bugs
                            </Label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Automatically assign new bugs to developers
                            </p>
                          </div>
                        </div>
                        <Switch
                          id="autoAssign"
                          checked={autoAssign}
                          onCheckedChange={setAutoAssign}
                          className="self-start sm:self-center"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-900/80 p-4 sm:p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-900/40 shrink-0">
                            <MapPin className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                          </div>
                          <div className="space-y-1 min-w-0">
                            <p className="text-base font-semibold text-gray-900 dark:text-white">
                              Office check-in location
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Employees must be within this radius to check in as Office. WFH does not require GPS.
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRestoreOfficeDefaults}
                          disabled={loadingOfficeSettings || savingOfficeSettings}
                          className="h-10 rounded-xl shrink-0"
                        >
                          Load defaults
                        </Button>
                      </div>

                      {loadingOfficeSettings ? (
                        <div className="grid grid-cols-12 gap-4">
                          <Skeleton className="col-span-12 h-10 rounded-xl" />
                          <Skeleton className="col-span-12 md:col-span-6 h-10 rounded-xl" />
                          <Skeleton className="col-span-12 md:col-span-6 h-10 rounded-xl" />
                          <Skeleton className="col-span-12 h-44 rounded-xl" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-12 gap-4">
                          <div className="col-span-12 space-y-2">
                            <Label htmlFor="officeLabel" className="text-sm font-medium">
                              Office name
                            </Label>
                            <Input
                              id="officeLabel"
                              value={officeLocation.office_label}
                              maxLength={120}
                              onChange={(e) =>
                                setOfficeLocation((prev) => ({
                                  ...prev,
                                  office_label: e.target.value.slice(0, 120),
                                }))
                              }
                              placeholder="Wired In Coworks, Kottakkal"
                              className="h-11 rounded-xl"
                            />
                          </div>

                          <div className="col-span-12 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <Label className="text-sm font-medium">Map preview</Label>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  className="h-10 rounded-xl"
                                  onClick={() => setOfficeMapOpen(true)}
                                >
                                  <Map className="h-4 w-4 mr-2" />
                                  Choose on map
                                </Button>
                                <a
                                  href={`https://www.google.com/maps?q=${encodeURIComponent(
                                    `${officeLocation.office_lat},${officeLocation.office_lng}`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                                >
                                  <MapPin className="h-4 w-4" />
                                  Open in Google Maps
                                </a>
                              </div>
                            </div>
                            <OfficeLocationMapPreview
                              lat={officeLocation.office_lat}
                              lng={officeLocation.office_lng}
                              radiusM={officeLocation.office_radius_m}
                            />
                            <p className="text-xs text-muted-foreground">
                              Blue circle = allowed Office check-in radius (
                              {officeLocation.office_radius_m} m). Click{" "}
                              <span className="font-medium text-foreground">Choose on map</span> to
                              search, drop a pin, or use GPS.
                            </p>
                          </div>

                          <div className="col-span-12 md:col-span-4 space-y-2">
                            <Label htmlFor="officeLat" className="text-sm font-medium">
                              Latitude
                            </Label>
                            <Input
                              id="officeLat"
                              type="number"
                              step="any"
                              inputMode="decimal"
                              value={officeLocation.office_lat}
                              onChange={(e) =>
                                setOfficeLocation((prev) => ({
                                  ...prev,
                                  office_lat: Number(e.target.value),
                                }))
                              }
                              className="h-11 rounded-xl"
                            />
                          </div>
                          <div className="col-span-12 md:col-span-4 space-y-2">
                            <Label htmlFor="officeLng" className="text-sm font-medium">
                              Longitude
                            </Label>
                            <Input
                              id="officeLng"
                              type="number"
                              step="any"
                              inputMode="decimal"
                              value={officeLocation.office_lng}
                              onChange={(e) =>
                                setOfficeLocation((prev) => ({
                                  ...prev,
                                  office_lng: Number(e.target.value),
                                }))
                              }
                              className="h-11 rounded-xl"
                            />
                          </div>
                          <div className="col-span-12 md:col-span-4 space-y-2">
                            <Label htmlFor="officeRadius" className="text-sm font-medium">
                              Allowed radius (meters)
                            </Label>
                            <Input
                              id="officeRadius"
                              type="number"
                              min={50}
                              max={5000}
                              step={10}
                              inputMode="numeric"
                              value={officeLocation.office_radius_m}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/[^\d]/g, "");
                                const next = digits === "" ? 0 : Number(digits.slice(0, 4));
                                setOfficeLocation((prev) => ({
                                  ...prev,
                                  office_radius_m: Math.min(5000, next),
                                }));
                              }}
                              className="h-11 rounded-xl"
                            />
                            <p className="text-xs text-muted-foreground">
                              Recommended 200–500 m for indoor GPS drift. Range: 50–5000 m.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-900/80 p-4 sm:p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 shrink-0">
                            <Clock className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                          </div>
                          <div className="space-y-1 min-w-0">
                            <p className="text-base font-semibold text-gray-900 dark:text-white">
                              Check-in before time
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Employees should check in before this IST time (Mon–Sat). After the
                              cutoff, check-ins count as late toward Office-only weeks. Sundays are
                              never late.
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setCheckInCutoff(defaultCheckInCutoffSettings())
                          }
                          disabled={loadingOfficeSettings || savingOfficeSettings}
                          className="h-10 rounded-xl shrink-0"
                        >
                          Load defaults
                        </Button>
                      </div>

                      {loadingOfficeSettings ? (
                        <div className="grid grid-cols-12 gap-4">
                          <Skeleton className="col-span-12 h-14 rounded-xl" />
                          <Skeleton className="col-span-12 md:col-span-6 h-11 rounded-xl" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-12 gap-4">
                          <div className="col-span-12 flex items-center justify-between gap-4 rounded-xl border border-border/60 px-4 py-3 min-w-0">
                            <div className="min-w-0 space-y-0.5">
                              <Label
                                htmlFor="checkinCutoffEnabled"
                                className="text-sm font-semibold text-gray-900 dark:text-white"
                              >
                                Enforce late check-in cutoff
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                When off, no check-in is marked late and Office-only weeks are not
                                triggered by time.
                              </p>
                            </div>
                            <Switch
                              id="checkinCutoffEnabled"
                              checked={checkInCutoff.checkin_cutoff_enabled}
                              onCheckedChange={(checked) =>
                                setCheckInCutoff((prev) => ({
                                  ...prev,
                                  checkin_cutoff_enabled: checked,
                                }))
                              }
                              className="shrink-0"
                            />
                          </div>

                          <div
                            className={`col-span-12 md:col-span-6 space-y-2 min-w-0 ${
                              checkInCutoff.checkin_cutoff_enabled
                                ? ""
                                : "opacity-50 pointer-events-none"
                            }`}
                          >
                            <Label className="text-sm font-medium">
                              Must check in before (IST)
                            </Label>
                            <TimePicker
                              value={checkInCutoff.checkin_cutoff_time}
                              onChange={(value) =>
                                setCheckInCutoff((prev) => ({
                                  ...prev,
                                  checkin_cutoff_time: value,
                                  checkin_cutoff_label: formatCheckInCutoffLabel(value),
                                }))
                              }
                              placeholder="Select cutoff time"
                              className="h-11 rounded-xl"
                            />
                            <p className="text-xs text-muted-foreground">
                              Current policy:{" "}
                              <span className="font-medium text-foreground">
                                {checkInCutoff.checkin_cutoff_enabled
                                  ? `before ${formatCheckInCutoffLabel(
                                      checkInCutoff.checkin_cutoff_time
                                    )}`
                                  : "late cutoff disabled"}
                              </span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <OfficeLocationMapPicker
                      open={officeMapOpen}
                      onOpenChange={setOfficeMapOpen}
                      value={officeLocation}
                      onApply={(next) => {
                        setOfficeLocation(next);
                        toast({
                          title: "Location selected",
                          description: "Review the preview, then Save Settings to apply.",
                        });
                      }}
                    />

                    <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                      <Button
                        onClick={() => void handleSaveGeneral()}
                        disabled={!generalDirty || savingOfficeSettings || loadingOfficeSettings}
                        className="h-12 px-8 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 rounded-xl"
                      >
                        {savingOfficeSettings ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving…
                          </span>
                        ) : (
                          "Save Settings"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleResetGeneral}
                        disabled={savingOfficeSettings}
                        className="h-12 px-6 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-semibold rounded-xl"
                      >
                        Reset
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6 min-w-0">
            <div className="relative min-w-0 w-full">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl pointer-events-none" />
              <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-3 sm:p-6 md:p-8 shadow-xl min-w-0 overflow-x-hidden">
                <NotificationSettingsCard ref={notificationsRef} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="announcements" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6 min-w-0">
            <div className="relative min-w-0 w-full">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl pointer-events-none" />
              <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-3 sm:p-6 md:p-8 shadow-xl min-w-0 overflow-x-hidden">
                <div className="flex items-start gap-3 mb-4 sm:mb-6 min-w-0">
                </div>
                <AnnouncementManager ref={announcementsRef} />
              </div>
            </div>
          </TabsContent>

          {activeTab === "types" ? (
            <div className="space-y-4 sm:space-y-6 mt-4 sm:mt-6 min-w-0">
              <div className="relative min-w-0 w-full">
                <div className="absolute inset-0 bg-gradient-to-r from-sky-50/30 to-blue-50/30 dark:from-sky-900/20 dark:to-blue-900/20 rounded-2xl pointer-events-none" />
                <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-3 sm:p-6 md:p-8 shadow-xl min-w-0 overflow-x-hidden">
                  <BugTypesTab ref={bugTypesRef} />
                </div>
              </div>
            </div>
          ) : null}

          <TabsContent value="roles" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6 min-w-0">
            <div className="relative min-w-0 w-full">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl pointer-events-none" />
              <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-3 sm:p-6 md:p-8 shadow-xl min-w-0 overflow-x-hidden">
                <RolesTab ref={rolesRef} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
    </div>
  );
};

export default Settings;
