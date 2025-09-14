import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { ENV } from "@/lib/env";
import { User } from "@/types";
import axios from "axios";
import { KeyRound, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface ChangePasswordDialogProps {
  user: User;
  onPasswordChange: (
    userId: string,
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  trigger?: React.ReactElement;
}

export function ChangePasswordDialog({
  user,
  onPasswordChange,
  trigger,
}: ChangePasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const { currentUser } = useAuth();

  const isAdmin = currentUser?.role === 'admin';
  const isChangingOwnPassword = currentUser?.id === user.id;
  const showCurrentPasswordField = !isAdmin || isChangingOwnPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      await onPasswordChange(user.id, currentPassword, password);
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setOpen(false);
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="ghost" size="sm">
            <KeyRound className="h-4 w-4" />
            <span className="sr-only">Change Password</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            {isChangingOwnPassword ? "Set a new password for your account." : `Set a new password for ${user.name || 'this user'}'s account.`}
          </DialogDescription>
        </DialogHeader>
        <DialogClose asChild>
            <Button variant="ghost" size="icon" className="absolute top-3 right-4">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
            </Button>
        </DialogClose>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            {showCurrentPasswordField && (
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

async function handlePasswordChange(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  try {
    // Use the ENV configuration that's already set up in your application
    await axios.post(`${ENV.API_URL}/users/change-password.php`, {
      userId,
      currentPassword,
      newPassword,
    });
    // No return value
  } catch (error: any) {
    throw error;
  }
}

export default handlePasswordChange;
