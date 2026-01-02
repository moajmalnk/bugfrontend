import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Announcement,
  AnnouncementPayload,
  announcementService,
} from "@/services/announcementService";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { CalendarIcon, X, Users, Shield, Code, TestTube, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "../ui/use-toast";

interface AnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: Announcement | null;
  onSave: () => void;
}

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  is_active: z.boolean(),
  expiry_date: z.date().nullable(),
  role: z.string().optional(),
});

export const AnnouncementDialog = ({
  open,
  onOpenChange,
  announcement,
  onSave,
}: AnnouncementDialogProps) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["all"]);

  const form = useForm<z.infer<typeof announcementSchema>>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "",
      content: "",
      is_active: false,
      expiry_date: null,
      role: "all",
    },
  });

  useEffect(() => {
    if (announcement) {
      const role = announcement.role || "all";
      const rolesArray = role === "all" ? ["all"] : role.split(",").map(r => r.trim());
      setSelectedRoles(rolesArray);
      
      form.reset({
        title: announcement.title,
        content: announcement.content,
        is_active: !!announcement.is_active,
        expiry_date: announcement.expiry_date
          ? parseISO(announcement.expiry_date)
          : null,
        role: role,
      });
    } else {
      setSelectedRoles(["all"]);
      form.reset({
        title: "",
        content: "",
        is_active: false,
        expiry_date: null,
        role: "all",
      });
    }
  }, [announcement, form, open]);

  const onSubmit = async (values: z.infer<typeof announcementSchema>) => {
    try {
      // Determine role value from selected roles
      const roleValue = selectedRoles.length === 1 && selectedRoles[0] === 'all' 
        ? 'all' 
        : selectedRoles.filter(r => r !== 'all').join(',');
      
      const payload: AnnouncementPayload = {
        title: values.title,
        content: values.content,
        is_active: values.is_active ? 1 : 0,
        expiry_date: values.expiry_date
          ? format(values.expiry_date, "yyyy-MM-dd HH:mm:ss")
          : null,
        role: roleValue,
      };

      if (announcement) {
        // Update
        await announcementService.update(announcement.id, payload);
        toast({
          title: "Success",
          description: "Announcement updated successfully.",
        });
      } else {
        // Create
        await announcementService.create(payload);
        toast({
          title: "Success",
          description: "Announcement created successfully.",
        });
      }
      onSave();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save announcement.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] sm:max-w-[600px] max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader className="p-4 sm:p-5 lg:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg sm:text-xl lg:text-2xl">
                {announcement ? "Edit Announcement" : "Create Announcement"}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base lg:text-lg mt-1 sm:mt-2">
                {announcement
                  ? "Make changes to your announcement."
                  : "Create a new announcement for all users."}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 sm:h-9 sm:w-9 p-0 flex-shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 sm:space-y-6 p-4 sm:p-5 lg:p-6 pt-0 sm:pt-0 lg:pt-0"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base font-medium">
                    Title
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="h-10 sm:h-11 text-sm sm:text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base font-medium">
                    Content
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      className="min-h-[100px] sm:min-h-[120px] lg:min-h-[140px] custom-scrollbar text-sm sm:text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4 lg:p-5 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm sm:text-base lg:text-lg font-medium">
                      Active
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="scale-110 sm:scale-125"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiry_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-sm sm:text-base font-medium">
                    Expiry Date (Optional)
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal h-10 sm:h-11 text-sm sm:text-base",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Role Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel className="text-sm sm:text-base font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Accessible to Roles *
                </FormLabel>
                {selectedRoles.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedRoles.length} selected
                  </Badge>
                )}
              </div>

              {/* Selected Roles Chips */}
              {selectedRoles.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border border-dashed">
                  {selectedRoles.map((roleValue) => {
                    const roleMap: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
                      all: { label: "All Users", icon: <Users className="h-3 w-3" />, color: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300" },
                      admins: { label: "Admins Only", icon: <Shield className="h-3 w-3" />, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300" },
                      developers: { label: "Developers Only", icon: <Code className="h-3 w-3" />, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300" },
                      testers: { label: "Testers Only", icon: <TestTube className="h-3 w-3" />, color: "bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300" },
                    };
                    const role = roleMap[roleValue];
                    if (!role) return null;
                    return (
                      <Badge
                        key={roleValue}
                        variant="outline"
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${role.color}`}
                      >
                        {role.icon}
                        {role.label}
                        <button
                          type="button"
                          onClick={() => setSelectedRoles(prev => prev.filter(r => r !== roleValue))}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Roles List */}
              <div className="space-y-2 p-4 border rounded-lg bg-background">
                {[
                  { value: "all", label: "All Users", icon: <Users className="h-4 w-4" />, color: "text-green-600 dark:text-green-400" },
                  { value: "admins", label: "Admins Only", icon: <Shield className="h-4 w-4" />, color: "text-purple-600 dark:text-purple-400" },
                  { value: "developers", label: "Developers Only", icon: <Code className="h-4 w-4" />, color: "text-blue-600 dark:text-blue-400" },
                  { value: "testers", label: "Testers Only", icon: <TestTube className="h-4 w-4" />, color: "text-pink-600 dark:text-pink-400" },
                ].map((role) => (
                  <div
                    key={role.value}
                    className={`flex items-center space-x-3 p-2.5 rounded-md transition-colors ${
                      selectedRoles.includes(role.value)
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                  >
                    <Checkbox
                      id={`announcement-role-${role.value}`}
                      checked={selectedRoles.includes(role.value)}
                      onCheckedChange={(checked) => {
                        if (role.value === "all") {
                          // If "All Users" is selected, clear other selections
                          setSelectedRoles(checked ? ["all"] : []);
                        } else {
                          // If a specific role is selected, remove "all" and toggle the role
                          if (checked) {
                            setSelectedRoles((prev) => 
                              prev.filter(r => r !== "all").concat(role.value)
                            );
                          } else {
                            setSelectedRoles((prev) => prev.filter(r => r !== role.value));
                          }
                        }
                      }}
                    />
                    <label
                      htmlFor={`announcement-role-${role.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 flex items-center gap-2"
                    >
                      <span className={role.color}>{role.icon}</span>
                      {role.label}
                      {selectedRoles.includes(role.value) && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">💡</span>
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  <strong>Tip:</strong> Selecting "All Users" will automatically override other role selections. 
                  For specific access, uncheck "All Users" and select individual roles.
                </p>
              </div>
            </div>
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base"
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
