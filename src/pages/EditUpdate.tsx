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
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
    type: z.enum(["feature", "updation", "maintenance"], {
    required_error: "Please select an update type",
  }),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["pending", "approved", "declined"]).optional(),
  project_id: z.string().min(1, "Project is required"),
  project_name: z.string().optional(),
});

const API_BASE = import.meta.env.VITE_API_URL + "/updates";

const EditUpdate = () => {
  const navigate = useNavigate();
  const { updateId } = useParams<{ updateId: string }>();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [canEdit, setCanEdit] = useState(true);

  // Fetch projects the user is a member of
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", currentUser?.username],
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: undefined,
      description: "",
      status: "pending",
      project_id: "",
      project_name: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values) => {
      const response = await fetch(`${API_BASE}/update.php?id=${updateId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(values),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Success", description: "Update updated successfully" });
        queryClient.invalidateQueries({ queryKey: ["updates"] });
        queryClient.invalidateQueries({ queryKey: ["update", updateId] });
        navigate(currentUser?.role ? `/${currentUser.role}/updates/${updateId}` : `/updates/${updateId}`);
      } else {
        let errorMsg = data.message || "Failed to update update";
        if (data.message && (data.message.includes("Unauthorized") || data.message.includes("not a member") || data.message.includes("permission"))) {
          errorMsg = "You do not have permission to update this update.";
        }
        toast({ title: "Error", description: errorMsg, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      let errorMsg = "Failed to update update";
      if (error?.message && (error.message.includes("401") || error.message.includes("403"))) {
        errorMsg = "You do not have permission to update this update.";
      }
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    }
  });

  useEffect(() => {
    const fetchUpdate = async () => {
      try {
        const response = await fetch(`${API_BASE}/get.php?id=${updateId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (response.status === 403 || response.status === 404) {
          toast({
            title: "Error",
            description: "You do not have permission to edit this update.",
            variant: "destructive",
          });
          navigate(currentUser?.role ? `/${currentUser.role}/updates` : "/updates");
          return;
        }
        const data = await response.json();
        if (data.success) {
          form.reset({
            title: data.data.title,
            type: data.data.type,
            description: data.data.description,
            status: data.data.status || "pending",
            project_id: data.data.project_id || "",
            project_name: data.data.project_name || "",
          });
          // Only allow editing if admin or creator
          if (currentUser?.role !== "admin" && data.data.created_by !== currentUser?.username) {
            setCanEdit(false);
          }
        } else {
          throw new Error(data.message || "Failed to fetch update");
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to fetch update",
          variant: "destructive",
        });
        navigate(currentUser?.role ? `/${currentUser.role}/updates` : "/updates");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUpdate();
  }, [updateId, form, navigate, currentUser]);

  const onSubmit = (values) => {
    mutation.mutate(values);
  };

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 sm:px-4 py-4 sm:py-6 md:px-6 lg:px-8 xl:px-10">
        <section className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              className="flex items-center text-muted-foreground hover:text-foreground"
              onClick={() => navigate(-1)}
              disabled
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">Loading...</CardTitle>
              <CardDescription>Please wait while we load the update details</CardDescription>
            </CardHeader>
          </Card>
        </section>
      </main>
    );
  }

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

        <Card>
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Edit Update</CardTitle>
            <CardDescription>
              Modify the update details below
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!canEdit ? (
              <div className="text-center text-muted-foreground py-8">
                <p className="mb-2">You do not have permission to edit this update.</p>
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
                          <Input
                            value={form.getValues('project_name') || "BugRicer Project"}
                            disabled
                            readOnly
                          />
                        </FormControl>
                        <FormDescription>
                          The project this update belongs to
                        </FormDescription>
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
                          <Input
                            placeholder="Enter update title"
                            {...field}
                            disabled={isSubmitting || !canEdit}
                          />
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
                          disabled={isSubmitting || !canEdit}
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
                          The type of update
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Status Dropdown for Admins */}
                  {currentUser?.role === "admin" && (
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={isSubmitting || !canEdit}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="declined">Declined</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Set the status of this update
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter update description"
                            className="min-h-[120px]"
                            {...field}
                            disabled={isSubmitting || !canEdit}
                          />
                        </FormControl>
                        <FormDescription>
                          Detailed description of the update
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting || !canEdit}>
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default EditUpdate; 