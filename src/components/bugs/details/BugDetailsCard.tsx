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
import { broadcastNotificationService } from "@/services/broadcastNotificationService";
import { bugService } from "@/services/bugService";
import { sendBugStatusUpdateNotification } from "@/services/emailService";
import { notificationService } from "@/services/notificationService";
import { whatsappService } from "@/services/whatsappService";
import { Bug, BugStatus, Project } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

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
  updateBugStatus,
  formattedUpdatedDate,
}: BugDetailsCardProps) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState(false);
  const [bugState, setBugState] = useState(bug);

  const handleUpdate = async (field: "status" | "priority", value: string) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to update bugs.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const updatedBug = {
        ...bugState,
        [field]: value,
        updated_by: currentUser.id, // Ensure the current user is set as the updater
        updated_by_name: currentUser.name || currentUser.username, // Include the updater name
        fixed_by:
          field === "status" && value === "fixed" ? currentUser.id : undefined, // Set fixed_by if status is fixed
      };

      await bugService.updateBug(updatedBug);
      setBugState(updatedBug);

      // Invalidate queries to refresh the bugs list and user stats
      queryClient.invalidateQueries({ queryKey: ["bugs"] });
      queryClient.invalidateQueries({ queryKey: ["bug", bug.id] });
      queryClient.invalidateQueries({
        queryKey: ["userStats", currentUser.id],
      });

      // Send notification when status is changed to "fixed"
      if (field === "status" && value === "fixed") {
        const notificationResult = await sendBugStatusUpdateNotification(
          updatedBug
        );

        // Broadcast browser notification to all users
        try {
          await broadcastNotificationService.broadcastStatusChange(
            updatedBug.title,
            updatedBug.id,
            value,
            currentUser?.name || "Bug Ricer User"
          );
          //.log("Broadcast notification sent for status change");
        } catch (broadcastError) {
          //.error("Failed to send broadcast notification:", broadcastError);
        }

        // Check if WhatsApp notifications are enabled and share
        const notificationSettings = notificationService.getSettings();
        if (
          notificationSettings.whatsappNotifications &&
          notificationSettings.statusChangeNotifications
        ) {
          whatsappService.shareStatusUpdate({
            bugTitle: updatedBug.title,
            bugId: updatedBug.id,
            status: value,
            priority: updatedBug.priority,
            updatedBy: currentUser?.name || "Bug Ricer User",
            projectName: updatedBug.project_name || updatedBug.project_id,
          });
          //.log("WhatsApp share opened for status change");
        }

        if (notificationResult.success) {
          toast({
            title: "Success",
            description: `Bug ${field} updated and notifications sent.`,
          });
        } else {
          toast({
            title: "Warning",
            description: `Bug ${field} updated but failed to send notifications.`,
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Success",
          description: `Bug ${field} updated successfully.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update bug ${field}.`,
        variant: "destructive",
      });
    } finally {
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
                onValueChange={(value) => handleUpdate("status", value)}
                disabled={updating}
              >
                <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                onValueChange={(value) => handleUpdate("priority", value)}
                disabled={updating}
              >
                <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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

          {/* Last Updated and Updated By Section */}
          <div className="space-y-2 py-3 border-t border-border">
            <div className="flex flex-col space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="font-medium">{formattedUpdatedDate}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Reported By:</span>
                <span className="font-medium">
                  {bugState.reporter_name || bug.reporter_name}
                </span>
              </div>
              {/* Add the Updated By information with null check */}
              {(bugState.updated_by_name || bug.updated_by_name) && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Updated By:</span>
                  <span className="font-medium">
                    {bugState.updated_by_name || bug.updated_by_name}
                  </span>
                </div>
              )}
              {/* Show Fixed By if bug is fixed */}
              {bugState.status === "fixed" &&
                (bugState.fixed_by_name || bug.fixed_by_name) && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Fixed By:</span>
                    <span className="font-medium">
                      {bugState.fixed_by_name || bug.fixed_by_name}
                    </span>
                  </div>
                )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
