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
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useState } from "react";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendNewUpdateNotification } from "@/services/emailService";

const API_BASE = import.meta.env.VITE_API_URL + "/updates";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["feature", "updation", "maintenance"], {
    required_error: "Please select an update type",
  }),
  description: z.string().min(1, "Description is required"),
});

const NewUpdate = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: undefined,
      description: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values) => {
      const response = await fetch(`${API_BASE}/create.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(values),
      });
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.success) {
        toast({ title: "Success", description: "Update created successfully" });
        queryClient.invalidateQueries({ queryKey: ["updates"] });
        await sendNewUpdateNotification({
          title: data.title,
          description: data.description,
          type: data.type,
          created_at: new Date().toISOString(),
          created_by: currentUser?.username || "BugRicer"
        });
        navigate("/updates");
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create update", variant: "destructive" });
    }
  });

  const onSubmit = (values) => {
    mutation.mutate(values);
  };

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
            <CardTitle className="text-xl sm:text-2xl">Create New Update</CardTitle>
            <CardDescription>
              Share important updates about features, updations, or maintenance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                          disabled={isSubmitting}
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
                        <Textarea
                          placeholder="Enter update description"
                          className="min-h-[120px]"
                          {...field}
                          disabled={isSubmitting}
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
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Update"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default NewUpdate;
