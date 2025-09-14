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
import { ArrowLeft } from "lucide-react";
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

  // Skeleton for loading state
  const ProjectSkeleton = () => (
    <Card className="mt-8">
      <CardHeader>
        <Skeleton className="h-8 w-1/3 mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <div className="flex justify-end">
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 sm:px-4 py-4 sm:py-6 md:px-6 lg:px-8 xl:px-10">
      <section className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="flex items-center text-muted-foreground hover:text-foreground"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {projectsLoading ? (
          <ProjectSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">Create New Update</CardTitle>
              <CardDescription>
                Share important updates about features, updations, or maintenance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isFormDisabled ? (
                <div className="text-center text-muted-foreground py-8">
                  <p className="mb-2">You are not assigned to any projects.</p>
                  <p>Contact your admin to be added to a project before creating updates.</p>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="project_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              disabled={isSubmitting || projects.length === 0}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a project" />
                              </SelectTrigger>
                              <SelectContent>
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
                          <FormDescription>
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
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            {isSubmitting ? <Skeleton className="w-full h-10" /> : (
                              <Input
                                placeholder="Enter update title"
                                {...field}
                                disabled={isSubmitting}
                              />
                            )}
                          </FormControl>
                          <FormDescription>
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
                          <FormLabel>Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select update type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="updation">Updation</SelectItem>
                              <SelectItem value="feature">Feature</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
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
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            {isSubmitting ? <Skeleton className="w-full h-10" /> : (
                              <Textarea
                                placeholder="Enter update description"
                                className="min-h-[120px]"
                                {...field}
                                disabled={isSubmitting}
                              />
                            )}
                          </FormControl>
                          <FormDescription>
                            Detailed description of the update
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSubmitting || isFormDisabled}>
                        {isSubmitting ? "Creating..." : "Create Update"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
};

export default NewUpdate;
