import { Suspense } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
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
import { useAuth } from "@/context/AuthContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Bell, FolderOpen, FileText, Plus, User, Send } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useState } from "react";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { sendNewUpdateNotification } from "@/services/emailService";
import { Skeleton } from '@/components/ui/skeleton';
import { broadcastNotificationService } from "@/services/broadcastNotificationService";
import { apiClient } from "@/lib/axios";

const API_BASE = import.meta.env.VITE_API_URL + "/updates";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["feature", "updation", "maintenance"], {
    required_error: "Please select an update type",
  }),
  description: z.string().min(1, "Description is required"),
});

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Enhanced Header skeleton
const HeaderSkeleton = () => (
  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 sm:gap-6">
    <div className="space-y-2 sm:space-y-3">
      <Skeleton className="h-8 sm:h-10 w-32 sm:w-40 lg:w-48" />
      <Skeleton className="h-4 sm:h-5 w-48 sm:w-64 lg:w-80" />
    </div>
    <div className="flex items-center gap-3 w-full md:w-auto">
      <Skeleton className="h-11 sm:h-12 w-full sm:w-32 lg:w-40 rounded-lg" />
    </div>
  </div>
);

// Enhanced Form skeleton
const FormSkeleton = () => (
  <div className="relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 rounded-2xl"></div>
    <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-11 w-32 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const NewUpdate = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch projects the user is a member of
  const { data: allProjects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/projects/getAll.php`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.success) return data.data;
      return [];
    },
    enabled: !!currentUser,
  });

  // Filter projects based on user role
  const projects = (allProjects || []).filter((project: any) => {
    if (currentUser?.role === "admin") return true;
    if (Array.isArray(project.members)) {
      // If array of IDs
      if (typeof project.members[0] === "string") {
        return project.members.includes(currentUser.id);
      }
      // If array of objects
      return project.members.some((m: any) => m.id === currentUser.id || m.user_id === currentUser.id);
    }
    // fallback: show if user is creator
    return project.created_by === currentUser.id;
  });

  // Disable form if no projects
  const isFormDisabled = projects.length === 0;

  const form = useForm<z.infer<typeof formSchema> & { project_id: string }>({
    resolver: zodResolver(formSchema.extend({ project_id: z.string().min(1, "Project is required") })),
    defaultValues: {
      title: "",
      type: undefined,
      description: "",
      project_id: "",
    },
  });

  const mutation = useMutation<unknown, unknown, z.infer<typeof formSchema> & { project_id: string }>({
    mutationFn: async (values) => {
      const response = await apiClient.post('/updates/create.php', values);
      return response.data;
    },
    onSuccess: async (data: any, values) => {
      if (data.success) {
        toast({ title: "Success", description: "Update created successfully" });
        queryClient.invalidateQueries({ queryKey: ["updates"] });
        sendNewUpdateNotification({
          ...values,
          id: data.data?.id,
          created_at: new Date().toISOString(),
          created_by: currentUser?.username || "BugRicer"
        });
        await broadcastNotificationService.broadcastNotification({
          type: "new_update",
          title: "New Update Posted",
          message: `A new update has been posted: ${values.title}`,
          bugId: data.data?.id || "0",
          bugTitle: values.title,
          createdBy: currentUser?.name || "BugRicer"
        });
        navigate(currentUser?.role ? `/${currentUser.role}/updates` : "/updates");
      } else {
        let errorMsg = data.message || "Failed to create update";
        if (data.message && (data.message.includes("Unauthorized") || data.message.includes("not a member"))) {
          errorMsg = "You do not have permission to create updates for this project.";
        }
        toast({ title: "Error", description: errorMsg, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      let errorMsg = "Failed to create update";
      if (error?.message && (error.message.includes("401") || error.message.includes("403"))) {
        errorMsg = "You do not have permission to create updates for this project.";
      }
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    }
  });

  const onSubmit = async (values) => {
    setIsSubmitting(true);
    mutation.mutate(values, {
      onSettled: () => setIsSubmitting(false)
    });
  };

  const renderEmptyState = () => (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-yellow-50/30 to-red-50/50 dark:from-orange-950/20 dark:via-yellow-950/10 dark:to-red-950/20 rounded-2xl"></div>
      <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
          <FolderOpen className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Projects Assigned</h3>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          You are not assigned to any projects yet. Contact your admin to be added to a project before creating updates.
        </p>
        <Button
          variant="outline"
          size="lg"
          onClick={() => navigate(-1)}
          className="h-12 px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-700 text-gray-700 dark:text-gray-300 hover:text-orange-700 dark:hover:text-orange-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Go Back
        </Button>
      </div>
    </div>
  );

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center text-muted-foreground hover:text-foreground p-2"
                    onClick={() => navigate(-1)}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg">
                    <Bell className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      New Update
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Share important updates about features, and maintenance.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-blue-600 rounded-lg">
                      <Plus className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        New
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Content */}
        {projectsLoading ? (
          <FormSkeleton />
        ) : isFormDisabled ? (
          renderEmptyState()
        ) : (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl"></div>
            <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-1.5 bg-blue-500 rounded-lg">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Update Details</h3>
                </div>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid gap-6">
                      <FormField
                        control={form.control}
                        name="project_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                              <div className="p-1 bg-purple-500 rounded-lg">
                                <FolderOpen className="h-3 w-3 text-white" />
                              </div>
                              Project
                            </FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                disabled={isSubmitting || projects.length === 0}
                              >
                                <SelectTrigger className="h-12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                                  <SelectValue placeholder="Select a project" />
                                </SelectTrigger>
                                <SelectContent position="popper" className="z-[60]">
                                  {projects.length === 0 ? (
                                    <SelectItem value="" disabled>No projects available</SelectItem>
                                  ) : (
                                    projects.map((project) => (
                                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormDescription className="text-sm text-gray-600 dark:text-gray-400">
                              The project this update belongs to
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                              <div className="p-1 bg-orange-500 rounded-lg">
                                <FileText className="h-3 w-3 text-white" />
                              </div>
                              Title
                            </FormLabel>
                            <FormControl>
                              {isSubmitting ? <Skeleton className="w-full h-12 rounded-xl" /> : (
                                <Input
                                  placeholder="Enter update title"
                                  className="h-12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                                  {...field}
                                  disabled={isSubmitting}
                                />
                              )}
                            </FormControl>
                            <FormDescription className="text-sm text-gray-600 dark:text-gray-400">
                              A clear and concise title for the update
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                              <div className="p-1 bg-green-500 rounded-lg">
                                <Bell className="h-3 w-3 text-white" />
                              </div>
                              Type
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              disabled={isSubmitting}
                            >
                              <FormControl>
                                <SelectTrigger className="h-12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                                  <SelectValue placeholder="Select update type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent position="popper" className="z-[60]">
                                <SelectItem value="feature">Feature</SelectItem>
                                <SelectItem value="updation">Updation</SelectItem>
                                <SelectItem value="maintenance">Maintenance</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-sm text-gray-600 dark:text-gray-400">
                              The type of update you're creating
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                              <div className="p-1 bg-blue-500 rounded-lg">
                                <FileText className="h-3 w-3 text-white" />
                              </div>
                              Description
                            </FormLabel>
                            <FormControl>
                              {isSubmitting ? <Skeleton className="w-full h-32 rounded-xl" /> : (
                                <Textarea
                                  placeholder="Enter update description"
                                  className="min-h-[120px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                                  {...field}
                                  disabled={isSubmitting}
                                />
                              )}
                            </FormControl>
                            <FormDescription className="text-sm text-gray-600 dark:text-gray-400">
                              Detailed description of the update
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
                      <Button 
                        type="submit" 
                        disabled={isSubmitting || isFormDisabled}
                        className="h-12 px-8 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creating...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-5 w-5" />
                            Submit
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default NewUpdate;
