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
    <div className={`w-full space-y-6 ${className || ''}`}>
      {/* Search and Quick Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border border-gray-200/50 dark:border-gray-700/50 rounded-xl">
          <div className="p-2 bg-blue-500 rounded-lg">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <Label className="text-sm font-semibold text-gray-900 dark:text-white">Recipients</Label>
            <p className="text-xs text-gray-600 dark:text-gray-400">Search and select users to send messages to</p>
          </div>
        </div>
        
        <Input
          placeholder="Search users by name, username, phone, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
        />

        {/* Quick Selection */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={loading}
            className="h-9 px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300 rounded-xl"
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
              className="h-9 px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-700 text-gray-700 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300 rounded-xl"
            >
              Select {role} ({getSelectedRoleCount(role)}/{getRoleCount(role)})
            </Button>
          ))}
        </div>
      </div>

      {/* User List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-gray-900 dark:text-white">
            Recipients ({selectedUsers.size} selected)
          </Label>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {filteredUsers.length} users available
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto border border-gray-200/50 dark:border-gray-700/50 rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Loading users...
                </p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No users found</p>
                <p className="text-xs">Try adjusting your search criteria</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-950/20 dark:hover:to-purple-950/20 rounded-xl transition-all duration-200 group"
                >
                  <Checkbox
                    checked={selectedUsers.has(user.id)}
                    onCheckedChange={() => handleUserToggle(user.id)}
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                        {user.name || user.username}
                      </span>
                      <span className="text-xs bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg font-medium">
                        {user.role}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {user.phone} • {user.email}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Message Template */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20 border border-gray-200/50 dark:border-gray-700/50 rounded-xl">
          <div className="p-2 bg-purple-500 rounded-lg">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <Label className="text-sm font-semibold text-gray-900 dark:text-white">Message Template</Label>
            <p className="text-xs text-gray-600 dark:text-gray-400">Choose from predefined templates</p>
          </div>
        </div>
        <MessageTemplateSelector
          onTemplateSelect={handleTemplateSelect}
          disabled={isSending}
        />
      </div>

      {/* Message Content */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 border border-gray-200/50 dark:border-gray-700/50 rounded-xl">
          <div className="p-2 bg-green-500 rounded-lg">
            <Send className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <Label className="text-sm font-semibold text-gray-900 dark:text-white">Message Content</Label>
            <p className="text-xs text-gray-600 dark:text-gray-400">Enter your message content</p>
          </div>
        </div>
        <Textarea
          placeholder="Enter your message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          disabled={isSending}
          className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
        />
      </div>

      {/* Progress Indicator */}
      {showProgress && (
        <div className="p-4 bg-gradient-to-r from-blue-50/50 to-green-50/50 dark:from-blue-950/20 dark:to-green-950/20 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Sending Progress</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {progress.sent}/{progress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${(progress.sent / progress.total) * 100}%` }}
            />
          </div>
          {progress.failed > 0 && (
            <div className="mt-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {progress.failed} messages failed to send
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {selectedUsers.size > 0 && (
            <span className="font-medium">Ready to send to {selectedUsers.size} recipient(s)</span>
          )}
        </div>

        <Button
          onClick={handleSendBulkMessage}
          disabled={isSending || selectedUsers.size === 0 || !message.trim()}
          className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 rounded-xl"
        >
          <Send className="w-5 h-5 mr-2" />
          {isSending ? "Sending..." : `Send to ${selectedUsers.size}`}
        </Button>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 pt-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span className="font-medium">Batch processing</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span className="font-medium">Progress tracking</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span className="font-medium">Error handling</span>
        </div>
      </div>
    </div>
  );
}
