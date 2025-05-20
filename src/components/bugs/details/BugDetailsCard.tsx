import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { bugService } from "@/services/bugService";
import { Bug, BugStatus, Project } from '@/types';
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
  formattedUpdatedDate 
}: BugDetailsCardProps) => {
  const [updating, setUpdating] = useState(false);
  const [bugState, setBugState] = useState(bug);

  const handleUpdate = async (field: "status" | "priority", value: string) => {
    setUpdating(true);
    try {
      const updatedBug = { ...bugState, [field]: value };
      await bugService.updateBug(updatedBug);
      setBugState(updatedBug);
      toast({
        title: "Success",
        description: `Bug ${field} updated successfully.`,
      });
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
    <div className="w-full max-w-full sm:max-w-sm mx-auto">
      <Card className="w-full h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg break-words">Bug Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Status</Label>
            {canUpdateStatus ? (
              <Select
                value={bugState.status}
                onValueChange={(value) => handleUpdate("status", value)}
                disabled={updating}
              >
                <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full">
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
                <span className="capitalize break-words">{bug.status.replace('_', ' ')}</span>
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
                <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full">
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

          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Last Updated</Label>
            <div className="p-2 border rounded-md text-xs sm:text-sm bg-muted/30 w-full">
              {formattedUpdatedDate}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
