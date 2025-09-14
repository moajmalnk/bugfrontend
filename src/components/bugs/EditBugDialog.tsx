import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/axios";
import { sendBugStatusUpdateNotification } from "@/services/emailService";
import { Bug, BugPriority, BugStatus } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  title: z.string().min(3, "Bug title must be at least 3 characters"),
  description: z.string().min(2, "Description must be at least 2 characters"),
  priority: z.enum(["low", "medium", "high"] as const),
  status: z.enum([
    "pending",
    "in_progress",
    "fixed",
    "declined",
    "rejected",
  ] as const),
});

type FormValues = z.infer<typeof formSchema>;

interface EditBugDialogProps {
  bug: Bug;
  children: React.ReactNode;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

const EditBugDialog = ({ bug, children }: EditBugDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: bug.title,
      description: bug.description,
      priority: bug.priority as BugPriority,
      status: bug.status as BugStatus,
    },
  });

  // Reset form when bug changes
  useEffect(() => {
    form.reset({
      title: bug.title,
      description: bug.description,
      priority: bug.priority as BugPriority,
      status: bug.status as BugStatus,
    });
  }, [bug, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      
      // Add more detailed logging for production debugging
      // console.log('Submitting bug update:', {
      //   bugId: bug.id,
      //   apiUrl: apiClient.defaults.baseURL,
      //   values: values
      // });

      const response = await apiClient.post<ApiResponse<Bug>>(
        "/bugs/update.php",
        {
          id: bug.id,
          title: values.title,
          description: values.description,
          priority: values.priority,
          status: values.status,
          updated_by: bug.updated_by || bug.reported_by, // Ensure we have an updater
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 30000, // 30 second timeout
        }
      );

      // console.log('Update response:', response.data);

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to update bug");
      }

      // Send notification if status changed to "fixed"
      if (values.status === "fixed" && bug.status !== "fixed") {
        const updatedBug = {
          ...bug,
          title: values.title,
          description: values.description,
          priority: values.priority,
          status: values.status,
        };

        try {
          await sendBugStatusUpdateNotification(updatedBug);
          toast({
            title: "Success",
            description: "Bug updated and notifications sent",
          });
        } catch (notificationError) {
          // console.warn('Failed to send notification:', notificationError);
          toast({
            title: "Success",
            description: "Bug updated successfully (notification failed)",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Bug updated successfully",
        });
      }

      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ["bug", bug.id] });
      queryClient.invalidateQueries({ queryKey: ["bugs"] });

      setOpen(false);
    } catch (error: any) {
      // console.error("Failed to update bug:", error);
      
      // Provide more specific error messages based on error type
      let errorMessage = "Failed to update bug. Please try again.";
      
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.response?.status === 401) {
        errorMessage = "Authentication failed. Please login again.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to edit this bug.";
      } else if (error.response?.status === 404) {
        errorMessage = "Bug not found. It may have been deleted.";
      } else if (error.response?.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Bug</DialogTitle>
          <DialogDescription>
            Update the details of this bug. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bug Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditBugDialog;
