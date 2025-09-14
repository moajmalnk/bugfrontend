import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, FileText } from "lucide-react";
import { useState } from "react";

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: "otp" | "notification" | "reminder" | "custom";
  description?: string;
}

interface MessageTemplateSelectorProps {
  onTemplateSelect: (template: MessageTemplate) => void;
  selectedTemplateId?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const defaultTemplates: MessageTemplate[] = [
  {
    id: "otp-login",
    name: "OTP Login",
    content:
      "🔐 *BugRicer Login OTP*\n\nYour one-time password is: *{OTP}*\nThis OTP is valid for 5 minutes.\n\n⚠️ *Do not share this code with anyone.*\n\n🐞 _Sent from BugRicer_",
    category: "otp",
    description: "Standard OTP login message",
  },
  {
    id: "bug-notification",
    name: "Bug Notification",
    content:
      "🐛 *New Bug Reported*\n\nBug: {BUG_TITLE}\nProject: {PROJECT_NAME}\nPriority: {PRIORITY}\n\nPlease review and take necessary action.\n\n🐞 _BugRicer_",
    category: "notification",
    description: "Notify about new bug reports",
  },
  {
    id: "status-update",
    name: "Status Update",
    content:
      "📊 *Status Update*\n\nBug: {BUG_TITLE}\nStatus: {STATUS}\nUpdated by: {UPDATED_BY}\n\nView: {LINK}\n\n🐞 _BugRicer_",
    category: "notification",
    description: "Status change notifications",
  },
  {
    id: "project-reminder",
    name: "Project Reminder",
    content:
      "⏰ *Project Reminder*\n\nProject: {PROJECT_NAME}\nDeadline: {DEADLINE}\nPending tasks: {TASK_COUNT}\n\nPlease review your assigned tasks.\n\n🐞 _BugRicer_",
    category: "reminder",
    description: "Project deadline reminders",
  },
  {
    id: "meeting-reminder",
    name: "Meeting Reminder",
    content:
      "📅 *Meeting Reminder*\n\nMeeting: {MEETING_TITLE}\nTime: {MEETING_TIME}\nDate: {MEETING_DATE}\n\nPlease join on time.\n\n🐞 _BugRicer_",
    category: "reminder",
    description: "Meeting reminders",
  },
  {
    id: "welcome-message",
    name: "Welcome Message",
    content:
      "🎉 *Welcome to BugRicer!*\n\nHi {USER_NAME},\n\nWelcome to our bug tracking platform. Your account has been successfully created.\n\nRole: {USER_ROLE}\nUsername: {USERNAME}\n\nStart tracking bugs and ship faster! 🚀\n\n🐞 _BugRicer Team_",
    category: "custom",
    description: "Welcome message for new users",
  },
  {
    id: "password-reset",
    name: "Password Reset",
    content:
      "🔑 *Password Reset Request*\n\nHi {USER_NAME},\n\nYou requested a password reset for your BugRicer account.\n\nReset Code: *{RESET_CODE}*\n\nThis code is valid for 10 minutes.\n\nIf you didn't request this, please ignore this message.\n\n🐞 _BugRicer Security_",
    category: "otp",
    description: "Password reset notifications",
  },
  {
    id: "custom-message",
    name: "Custom Message",
    content:
      "📝 *Custom Message*\n\n{Your custom message here}\n\n🐞 _BugRicer_",
    category: "custom",
    description: "Template for custom messages",
  },
];

export function MessageTemplateSelector({
  onTemplateSelect,
  selectedTemplateId,
  placeholder = "Select a template...",
  className,
  disabled = false,
}: MessageTemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<MessageTemplate | null>(null);

  const handleTemplateSelect = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setOpen(false);
    onTemplateSelect(template);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "otp":
        return "🔐";
      case "notification":
        return "📢";
      case "reminder":
        return "⏰";
      case "custom":
        return "📝";
      default:
        return "📄";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "otp":
        return "text-blue-500";
      case "notification":
        return "text-green-500";
      case "reminder":
        return "text-orange-500";
      case "custom":
        return "text-purple-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !selectedTemplate && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {selectedTemplate ? (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="truncate">{selectedTemplate.name}</span>
              <span
                className={`text-sm ${getCategoryColor(
                  selectedTemplate.category
                )}`}
              >
                {getCategoryIcon(selectedTemplate.category)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{placeholder}</span>
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search templates..." />
          <CommandList className="max-h-60 custom-scrollbar">
            <CommandEmpty>No templates found.</CommandEmpty>
            {["otp", "notification", "reminder", "custom"].map((category) => (
              <CommandGroup
                key={category}
                heading={category.charAt(0).toUpperCase() + category.slice(1)}
              >
                {defaultTemplates
                  .filter((template) => template.category === category)
                  .map((template) => (
                    <CommandItem
                      key={template.id}
                      value={`${template.name} ${template.description || ""}`}
                      onSelect={() => handleTemplateSelect(template)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedTemplate?.id === template.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{template.name}</span>
                          <span
                            className={`text-sm ${getCategoryColor(
                              template.category
                            )}`}
                          >
                            {getCategoryIcon(template.category)}
                          </span>
                        </div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
