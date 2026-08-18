import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/axios";
import { broadcastNotificationService } from "@/services/broadcastNotificationService";
import { notificationService } from "@/services/notificationService";
import { whatsappService } from "@/services/whatsappService";
import { Bug, BugLevel, BugStatus, BugType, Project } from "@/types";
import {
  alreadyRaisedBadgeClass,
  BUG_LEVEL_FORM_OPTIONS,
  bugLevelBadgeClass,
  bugTypeBadgeClass,
  formatAlreadyRaisedLabel,
  formatBugLevelLabel,
  isAlreadyRaised,
} from "@/lib/bugMetaUtils";
import { Badge } from "@/components/ui/badge";
import { formatRetestSummary } from "@/components/bugs/details/TesterVerificationPanel";
import { BugTypeMultiSelect } from "@/components/bugs/BugTypeMultiSelect";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { GoogleDocsButton } from "./GoogleDocsButton";
import { BugFixCelebration } from "@/components/celebration/BugFixCelebration";

interface BugDetailsCardProps {
  bug: Bug;
  project?: Project;
  canUpdateStatus: boolean;
  updateBugStatus: (bugId: string, status: BugStatus) => Promise<void>;
  formattedUpdatedDate: string;
}

export const BugDetailsCard = ({
  bug,
  project,
  canUpdateStatus,
  updateBugStatus: _updateBugStatus,
  formattedUpdatedDate,
}: BugDetailsCardProps) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState(false);
  const updatingRef = useRef(false);
  const [bugState, setBugState] = useState(bug);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    setBugState(bug);
  }, [bug]);

  const handleUpdate = async (
    field: "status" | "priority" | "bug_level" | "already_raised",
    value: string
  ) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to update bugs.",
        variant: "destructive",
      });
      return;
    }

    const currentValue =
      field === "already_raised"
        ? isAlreadyRaised(bugState.already_raised)
          ? "1"
          : "0"
        : String(bugState[field] ?? "");
    if (currentValue === value) return;

    const previous = bugState;
    const markingFixed = field === "status" && value === "fixed";
    const optimistic: Bug = {
      ...bugState,
      ...(field === "already_raised"
        ? { already_raised: value === "1" }
        : field === "bug_level"
          ? { bug_level: value as BugLevel }
          : { [field]: value }),
      updated_by: currentUser.id,
      updated_by_name: currentUser.name || currentUser.username,
      ...(markingFixed
        ? {
            fixed_by: currentUser.id,
            fixed_by_name: currentUser.name || currentUser.username,
          }
        : {}),
    };

    await persistBugUpdate(
      {
        id: bug.id,
        [field]: value,
        updated_by: currentUser.id,
        ...(markingFixed ? { fixed_by: currentUser.id } : {}),
      },
      previous,
      optimistic,
      field.replace(/_/g, " "),
      markingFixed
    );
  };

  const handleTypesUpdate = async (ids: string[]) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to update bugs.",
        variant: "destructive",
      });
      return;
    }

    const previousIds = [...(bugState.bug_types || []).map((type) => type.id)].sort().join(",");
    const nextIds = [...ids].sort().join(",");
    if (previousIds === nextIds) return;

    const catalog =
      queryClient.getQueryData<BugType[]>(["bug-types", "active"]) || [];
    const optimisticTypes = ids
      .map(
        (id) =>
          catalog.find((type) => type.id === id) ||
          bugState.bug_types?.find((type) => type.id === id)
      )
      .filter((type): type is BugType => Boolean(type))
      .map((type) => ({
        id: type.id,
        name: type.name,
        slug: type.slug,
      }));

    const previous = bugState;
    const optimistic: Bug = {
      ...bugState,
      bug_types: optimisticTypes,
      updated_by: currentUser.id,
      updated_by_name: currentUser.name || currentUser.username,
    };

    await persistBugUpdate(
      {
        id: bug.id,
        bug_types: JSON.stringify(ids),
        bug_type_ids: ids,
        updated_by: currentUser.id,
      },
      previous,
      optimistic,
      "bug type"
    );
  };

  const persistBugUpdate = async (
    payload: Record<string, unknown>,
    previous: Bug,
    optimistic: Bug,
    fieldLabel: string,
    markingFixed = false
  ) => {
    if (updatingRef.current) return;
    updatingRef.current = true;

    setBugState(optimistic);
    setUpdating(true);
    queryClient.setQueryData(["bug", bug.id], optimistic);

    try {
      const response = await apiClient.post<{
        success: boolean;
        data?: Bug;
        message?: string;
      }>("/bugs/update.php", payload);

      if (!response.data?.success) {
        throw new Error(response.data?.message || `Failed to update bug ${fieldLabel}`);
      }

      const serverBug = response.data.data
        ? { ...optimistic, ...response.data.data }
        : optimistic;
      setBugState(serverBug);
      queryClient.setQueryData(["bug", bug.id], serverBug);

      void queryClient.invalidateQueries({ queryKey: ["bugs"] });
      void queryClient.invalidateQueries({ queryKey: ["bugLifecycle", bug.id] });
      void queryClient.invalidateQueries({
        queryKey: ["userStats", currentUser?.id],
      });
      void queryClient.invalidateQueries({ queryKey: ["userProfilePortfolio"] });

      toast({
        title: "Success",
        description: `Bug ${fieldLabel} updated successfully.`,
      });

      if (markingFixed && currentUser) {
        setShowCelebration(true);

        void broadcastNotificationService
          .broadcastStatusChange(
            serverBug.title,
            serverBug.id,
            "fixed",
            currentUser.name || currentUser.username || "BugRicer User"
          )
          .catch(() => undefined);

        const notificationSettings = notificationService.getSettings();
        if (
          notificationSettings.whatsappNotifications &&
          notificationSettings.statusChangeNotifications
        ) {
          try {
            whatsappService.shareStatusUpdate({
              bugTitle: serverBug.title,
              bugId: serverBug.id,
              status: "fixed",
              priority: serverBug.priority,
              updatedBy:
                currentUser.name || currentUser.username || "BugRicer User",
              projectName: serverBug.project_name || serverBug.project_id,
              bugLevel: serverBug.bug_level,
              alreadyRaised: serverBug.already_raised,
            });
          } catch {
            // ignore WhatsApp share errors
          }
        }
      }
    } catch (error) {
      setBugState(previous);
      queryClient.setQueryData(["bug", bug.id], previous);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : `Failed to update bug ${fieldLabel}.`,
        variant: "destructive",
      });
    } finally {
      updatingRef.current = false;
      setUpdating(false);
    }
  };

  return (
    <div className="w-full">
      <Card className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm w-full h-full">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-50/30 via-transparent to-red-50/30 dark:from-orange-950/10 dark:via-transparent dark:to-red-950/10" />
        <CardHeader className="relative pb-3">
          <CardTitle className="text-base sm:text-lg break-words">
            Bug Details
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Status</Label>
            {canUpdateStatus ? (
              <Select
                value={bugState.status}
                onValueChange={(value) => void handleUpdate("status", value)}
                disabled={updating}
              >
                <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent searchable={false}>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="p-2 border rounded-md text-xs sm:text-sm bg-muted/30 w-full">
                <span className="capitalize break-words">
                  {bug.status.replace("_", " ")}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Priority</Label>
            {canUpdateStatus ? (
              <Select
                value={bugState.priority}
                onValueChange={(value) => void handleUpdate("priority", value)}
                disabled={updating}
              >
                <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent searchable={false}>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="p-2 border rounded-md text-xs sm:text-sm bg-muted/30 w-full">
                <span className="capitalize break-words">{bug.priority}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Bug Level</Label>
            {canUpdateStatus ? (
              <Select
                value={
                  bugState.bug_level === "floap" || bugState.bug_level === "utter_floap"
                    ? bugState.bug_level
                    : "normal"
                }
                onValueChange={(value) => void handleUpdate("bug_level", value)}
                disabled={updating}
              >
                <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent searchable={false}>
                  {BUG_LEVEL_FORM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="p-2 border rounded-xl text-xs sm:text-sm bg-muted/30 w-full">
                <Badge
                  variant="outline"
                  className={bugLevelBadgeClass(bugState.bug_level)}
                >
                  {formatBugLevelLabel(bugState.bug_level)}
                </Badge>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Bug Type</Label>
            {canUpdateStatus ? (
              <BugTypeMultiSelect
                hideLabel
                compact
                disabled={updating}
                selectedIds={(bugState.bug_types || []).map((type) => type.id)}
                onChange={(ids) => void handleTypesUpdate(ids)}
              />
            ) : (
              <div className="p-2 border rounded-xl text-xs sm:text-sm bg-muted/30 w-full">
                {bugState.bug_types && bugState.bug_types.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {bugState.bug_types.map((type) => (
                      <Badge
                        key={type.id}
                        variant="outline"
                        className={bugTypeBadgeClass()}
                      >
                        {type.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Already Raised</Label>
            {canUpdateStatus ? (
              <Select
                value={isAlreadyRaised(bugState.already_raised) ? "1" : "0"}
                onValueChange={(value) => void handleUpdate("already_raised", value)}
                disabled={updating}
              >
                <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent searchable={false}>
                  <SelectItem value="0">No</SelectItem>
                  <SelectItem value="1">Yes</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="p-2 border rounded-xl text-xs sm:text-sm bg-muted/30 w-full">
                <Badge
                  variant="outline"
                  className={alreadyRaisedBadgeClass(bugState.already_raised)}
                >
                  {formatAlreadyRaisedLabel(bugState.already_raised)}
                </Badge>
              </div>
            )}
          </div>

          <div className="space-y-2 py-3 border-t border-border">
            <div className="flex flex-col space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="font-medium">{formattedUpdatedDate}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Reported By:</span>
                <span className="font-medium break-words">
                  {bugState.reporter_name || bugState.reported_by || "Unknown"}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Updated By:</span>
                <span className="font-medium break-words">
                  {bugState.updated_by_name || "Unknown"}
                </span>
              </div>
              {bugState.status === "fixed" && (
                <div className="flex justify-between items-start gap-3 text-sm">
                  <span className="text-muted-foreground shrink-0">
                    Tester verification:
                  </span>
                  <span
                    className={cn(
                      "font-medium text-right",
                      formatRetestSummary(bugState).toneClass
                    )}
                  >
                    {formatRetestSummary(bugState).label}
                  </span>
                </div>
              )}
            </div>
          </div>

          <GoogleDocsButton bug={bugState} project={project} />
        </CardContent>
      </Card>

      <BugFixCelebration
        bug={bugState}
        isVisible={showCelebration}
        onClose={() => setShowCelebration(false)}
      />
    </div>
  );
};
