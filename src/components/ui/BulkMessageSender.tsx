import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { ENV } from "@/lib/env";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Send,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MessageTemplateSelector } from "./MessageTemplateSelector";

interface User {
  id: string;
  username: string;
  name: string;
  phone: string;
  email: string;
  role: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: "otp" | "notification" | "reminder" | "custom";
  description?: string;
}

interface BulkMessageSenderProps {
  onSendBulkMessage: (users: User[], message: string) => Promise<void>;
  className?: string;
}

export function BulkMessageSender({
  onSendBulkMessage,
  className,
}: BulkMessageSenderProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedTemplate, setSelectedTemplate] =
    useState<MessageTemplate | null>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, total: 0, failed: 0 });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`${ENV.API_URL}/users/getAll.php`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      if (data.success) {
        // Filter users who have phone numbers
        const usersWithPhones = data.data.filter(
          (user: User) => user.phone && user.phone.trim() !== ""
        );

        if (usersWithPhones.length === 0) {
          console.warn("No users with phone numbers found");
          toast({
            title: "No Users with Phone Numbers",
            description:
              "No users found with phone numbers. Please add phone numbers to users first.",
            variant: "destructive",
          });
        }

        setUsers(usersWithPhones);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.phone.includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const handleUserToggle = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  const handleSelectByRole = (role: string) => {
    const roleUsers = filteredUsers.filter((u) => u.role === role);
    const newSelected = new Set(selectedUsers);
    roleUsers.forEach((u) => newSelected.add(u.id));
    setSelectedUsers(newSelected);
  };

  const handleTemplateSelect = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setMessage(template.content);
  };

  const handleSendBulkMessage = async () => {
    if (selectedUsers.size === 0) {
      toast({
        title: "No Recipients",
        description: "Please select at least one user",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Empty Message",
        description: "Please enter a message to send",
        variant: "destructive",
      });
      return;
    }

    const selectedUserList = users.filter((u) => selectedUsers.has(u.id));

    setIsSending(true);
    setShowProgress(true);
    setProgress({ sent: 0, total: selectedUserList.length, failed: 0 });

    try {
      await onSendBulkMessage(selectedUserList, message);

      toast({
        title: "Bulk Message Sent",
        description: `Message sent to ${selectedUserList.length} recipients`,
      });

      // Reset form
      setMessage("");
      setSelectedTemplate(null);
      setSelectedUsers(new Set());
    } catch (error: any) {
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send bulk message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
      setShowProgress(false);
    }
  };

  const getRoleCount = (role: string) => {
    return filteredUsers.filter((u) => u.role === role).length;
  };

  const getSelectedRoleCount = (role: string) => {
    return users.filter((u) => u.role === role && selectedUsers.has(u.id))
      .length;
  };

  const roles = Array.from(new Set(users.map((u) => u.role)));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Bulk Message Sender
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Quick Selection */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={loading}
            >
              {selectedUsers.size === filteredUsers.length
                ? "Deselect All"
                : "Select All"}
            </Button>
            {roles.map((role) => (
              <Button
                key={role}
                variant="outline"
                size="sm"
                onClick={() => handleSelectByRole(role)}
                disabled={loading}
              >
                Select {role} ({getSelectedRoleCount(role)}/{getRoleCount(role)}
                )
              </Button>
            ))}
          </div>
        </div>

        {/* User List */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Recipients ({selectedUsers.size} selected)
          </Label>
          <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-2 custom-scrollbar">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Loading users...
                </p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No users found
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded"
                >
                  <Checkbox
                    checked={selectedUsers.has(user.id)}
                    onCheckedChange={() => handleUserToggle(user.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {user.name || user.username}
                      </span>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {user.role}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.phone} • {user.email}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message Template */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Message Template
          </Label>
          <MessageTemplateSelector
            onTemplateSelect={handleTemplateSelect}
            disabled={isSending}
          />
        </div>

        {/* Message Content */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Message Content</Label>
          <Textarea
            placeholder="Enter your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            disabled={isSending}
          />
        </div>

        {/* Progress Indicator */}
        {showProgress && (
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Sending Progress</span>
              <span className="text-sm text-muted-foreground">
                {progress.sent}/{progress.total}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.sent / progress.total) * 100}%` }}
              />
            </div>
            {progress.failed > 0 && (
              <div className="mt-2 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {progress.failed} failed
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedUsers.size > 0 && (
              <span>Ready to send to {selectedUsers.size} recipient(s)</span>
            )}
          </div>

          <Button
            onClick={handleSendBulkMessage}
            disabled={isSending || selectedUsers.size === 0 || !message.trim()}
            className="flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {isSending ? "Sending..." : `Send to ${selectedUsers.size}`}
          </Button>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>Batch processing</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            <span>Progress tracking</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            <span>Error handling</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
