import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useBugs } from "@/context/BugContext";
import { ENV } from "@/lib/env";
import {
  getNotificationRecipients,
  sendEmailNotification,
} from "@/services/emailService";
import { BugPriority, Project } from "@/types";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  ArrowLeft,
  File,
  FileImage,
  ImagePlus,
  Paperclip,
  X,
} from "lucide-react";
import React, {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

interface FileWithPreview extends File {
  preview?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const NewBug = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const preSelectedProjectId = searchParams.get("projectId");
  const { currentUser } = useAuth();
  const { addBug } = useBugs();

  // Get the source path from state or default to '/bugs'
  const redirectPath = location.state?.from || "/bugs";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(preSelectedProjectId || "");
  const [priority, setPriority] = useState<BugPriority>("medium");

  // File uploads
  const [screenshots, setScreenshots] = useState<FileWithPreview[]>([]);
  const [files, setFiles] = useState<FileWithPreview[]>([]);

  // Refs for file inputs
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: projects = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get<ApiResponse<Project[]>>(
        `${ENV.API_URL}/projects/getAll.php`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "Failed to fetch projects");
    },
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      return;
    }

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a bug name",
        variant: "destructive",
      });
      return;
    }

    if (!projectId) {
      toast({
        title: "Error",
        description: "Please select a project",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for file uploads
      const formData = new FormData();
      formData.append("title", name);
      formData.append("description", description);
      formData.append("project_id", projectId);
      formData.append("reporter_id", currentUser.id);
      formData.append("priority", priority);
      formData.append("status", "pending");

      // Add screenshots
      screenshots.forEach((file, index) => {
        formData.append(`screenshots[]`, file);
      });

      // Add other files
      files.forEach((file, index) => {
        formData.append(`files[]`, file);
      });

      const response = await fetch(`${ENV.API_URL}/bugs/create.php`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Bug report submitted successfully",
        });

        // Handle redirection immediately after successful submission and toast
        if (preSelectedProjectId) {
          navigate(`/projects/${preSelectedProjectId}`);
        } else if (redirectPath === "/") {
          navigate("/");
        } else {
          navigate("/bugs");
        }

        // Send email notification asynchronously without blocking navigation
        setTimeout(async () => {
          try {
            console.log("Sending notification for bug:", name);

            // Get the bug ID from the response
            const bugId = data.bugId || data.data?.id || data.id;

            // Safety check - don't proceed with undefined bugId
            if (!bugId) {
              console.error(
                "Bug ID is undefined, can't generate attachment URLs"
              );
              return;
            }

            // Use absolute URLs for attachments to work in emails across environments
            const baseUrl = window.location.origin;
            // const apiPath = ENV.API_URL.replace(/^https?:\/\/[^/]+/, ""); // This is not needed

            let allAttachments: string[] = [];

            // Directly generate attachment URLs from the state variables
            const screenshotUrls =
              screenshots.length > 0
                ? screenshots.map((file) => {
                    return `${baseUrl}/Bugricer/backend/api/get_attachment.php?bug_id=${bugId}&type=screenshot&filename=${encodeURIComponent(
                      file.name
                    )}`;
                  })
                : [];

            const fileUrls =
              files.length > 0
                ? files.map((file) => {
                    return `${baseUrl}/Bugricer/backend/api/get_attachment.php?bug_id=${bugId}&type=file&filename=${encodeURIComponent(
                      file.name
                    )}`;
                  })
                : [];

            allAttachments = [...screenshotUrls, ...fileUrls];

            const emailResponse = await sendEmailNotification(
              await getNotificationRecipients(), // Get all admins and developers
              `Bug Report: ${name}`,
              `
              <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f7f6; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <div style="background-color: #2563eb; color: #ffffff; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px; display: flex; align-items: center; justify-content: center;">
                       <img src="https://fonts.gstatic.com/s/e/notoemoji/16.0/1f41e/32.png" alt="Bug Ricer Logo" style="width: 30px; height: 30px; margin-right: 10px; vertical-align: middle;">
                      BugRacer Alert
                    </h1>
                    <p style="margin: 5px 0 0 0; font-size: 16px;">New Bug Reported</p>
                  </div>
                  
                  <!-- Body -->
                  <div style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
                    <h3 style="margin-top: 0; color: #1e293b; font-size: 18px;">${name}</h3>
                    <p style="white-space: pre-wrap; margin-bottom: 15px; font-size: 14px;">${description || "No description provided."}</p>
                    
                    <p style="font-size: 14px; margin-bottom: 5px;"><strong>Priority:</strong> <span style="font-weight: normal; text-transform: capitalize; ${priority === "high" ? "color: #dc2626;" : priority === "medium" ? "color: #ea580c;" : "color: #65a30d;"}">${priority}</span></p>
                    <p style="font-size: 14px; margin-bottom: 5px;"><strong>Status:</strong> <span style="font-weight: normal;">Pending</span></p>
                    <p style="font-size: 14px; margin-bottom: 5px;"><strong>Reported By:</strong> <span style="font-weight: normal;">${currentUser?.name || "Bug Ricer User"}</span></p>
                    <p style="font-size: 14px; margin-bottom: 0;"><strong>Date:</strong> <span style="font-weight: normal;">${new Date().toLocaleString()}</span></p>
                  </div>
                  
                  <!-- Attachments -->
                  ${allAttachments.length > 0
                    ? `
                  <div style="padding: 20px; border-top: 1px solid #e2e8f0;">
                    <p style="margin-top: 0; margin-bottom: 10px; font-size: 14px;"><strong>Attachments (${allAttachments.length}):</strong></p>
                    <ul style="padding-left: 20px; margin: 0; font-size: 14px;">
                      ${allAttachments
                        .map(
                          (url) =>
                            `<li style="margin-bottom: 5px;"><a href="${url}" style="color: #2563eb; text-decoration: none;">${decodeURIComponent(
                              url.split("/").pop() || ""
                            )}</a></li>`
                        )
                        .join("")}
                    </ul>
                  </div>
                  `
                    : ""
                }
                  
                  <!-- Footer -->
                  <div style="background-color: #f8fafc; color: #64748b; padding: 20px; text-align: center; font-size: 12px;">
                    <p style="margin: 0;">This is an automated notification from Bug Ricer. Please do not reply to this email.</p>
                    <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Bug Ricer. All rights reserved.</p>
                  </div>
                  
                </div>
              </div>
              `,
              allAttachments // Pass all attachment URLs
            );
            console.log("Email notification sent:", emailResponse);
          } catch (emailError) {
            console.error("Failed to send email notification:", emailError);
          }
        }, 100);
      } else {
        throw new Error(data.message || "Failed to submit bug report");
      }
    } catch (error) {
      console.error("Error submitting bug:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to submit bug report",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScreenshotClick = () => {
    screenshotInputRef.current?.click();
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleScreenshotChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files) as FileWithPreview[];

      // Create preview URLs for each file
      newFiles.forEach((file) => {
        if (file.type.startsWith("image/")) {
          file.preview = URL.createObjectURL(file);
        }
      });

      setScreenshots((prev) => [...prev, ...newFiles]);

      // Reset input value so the same file can be selected again
      e.target.value = "";
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files) as FileWithPreview[];

      // Create preview URLs for image files
      newFiles.forEach((file) => {
        if (file.type.startsWith("image/")) {
          file.preview = URL.createObjectURL(file);
        }
      });

      setFiles((prev) => [...prev, ...newFiles]);

      // Reset input value so the same file can be selected again
      e.target.value = "";
    }
  };

  const removeScreenshot = (index: number) => {
    const newScreenshots = [...screenshots];

    // Clean up the object URL to prevent memory leaks
    if (newScreenshots[index].preview) {
      URL.revokeObjectURL(newScreenshots[index].preview!);
    }

    newScreenshots.splice(index, 1);
    setScreenshots(newScreenshots);
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];

    // Clean up the object URL to prevent memory leaks
    if (newFiles[index].preview) {
      URL.revokeObjectURL(newFiles[index].preview!);
    }

    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const handlePasteScreenshot = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          const fileWithPreview = Object.assign(file, {
            preview: URL.createObjectURL(file),
          });
          setScreenshots((prev) => [...prev, fileWithPreview]);
        }
      }
    }
  };

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      screenshots.forEach((file) => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });

      files.forEach((file) => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
    };
  }, [screenshots, files]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          className="flex items-center text-muted-foreground hover:text-foreground"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report a Bug</CardTitle>
          <CardDescription>
            Fill out the form below to report a new bug
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Bug Name</Label>
              <Input
                id="name"
                placeholder="Enter a descriptive title"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the bug in detail. What were you doing when it happened? What did you expect to happen?"
                className="min-h-[150px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Only show project dropdown if no projectId in URL */}
            {!preSelectedProjectId && (
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select value={projectId} onValueChange={setProjectId} required>
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading projects...
                      </SelectItem>
                    ) : error ? (
                      <SelectItem value="error" disabled>
                        Error loading projects
                      </SelectItem>
                    ) : projects?.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No projects available
                      </SelectItem>
                    ) : (
                      projects?.map((project: Project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as BugPriority)}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label>Attachments</Label>

              {/* Hidden file inputs */}
              <input
                type="file"
                ref={screenshotInputRef}
                onChange={handleScreenshotChange}
                accept="image/*"
                className="hidden"
                multiple
              />

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
              />

              <div className="grid gap-4 md:grid-cols-2">
                {/* Screenshots section */}
                <div
                  className="space-y-3"
                  tabIndex={0}
                  onPaste={handlePasteScreenshot}
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="h-24 w-full flex flex-col items-center justify-center"
                    onClick={handleScreenshotClick}
                  >
                    <ImagePlus className="h-8 w-8 mb-2 text-muted-foreground" />
                    <span>Add Screenshots</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      (Paste or Upload)
                    </span>
                  </Button>

                  {/* Preview of screenshots */}
                  {screenshots.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">
                        Screenshots ({screenshots.length})
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {screenshots.map((file, index) => (
                          <div
                            key={index}
                            className="relative rounded border p-1 group"
                          >
                            {file.preview ? (
                              <img
                                src={file.preview}
                                alt={`Screenshot ${index + 1}`}
                                className="h-20 w-full object-cover rounded"
                              />
                            ) : (
                              <div className="h-20 w-full flex items-center justify-center bg-muted rounded">
                                <FileImage className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="h-6 w-6 absolute top-1 right-1 opacity-70 hover:opacity-100"
                              onClick={() => removeScreenshot(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <div className="text-xs truncate mt-1 px-1">
                              {file.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Files section */}
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-24 w-full flex flex-col items-center justify-center"
                    onClick={handleFileClick}
                  >
                    <Paperclip className="h-8 w-8 mb-2 text-muted-foreground" />
                    <span>Attach Files</span>
                  </Button>

                  {/* Preview of files */}
                  {files.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">Files ({files.length})</Label>
                      <div className="space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded border p-2 text-sm group"
                          >
                            <div className="flex items-center space-x-2 overflow-hidden">
                              {file.preview ? (
                                <img
                                  src={file.preview}
                                  alt={`File preview ${index + 1}`}
                                  className="h-8 w-8 object-cover rounded"
                                />
                              ) : (
                                <File className="h-8 w-8 text-muted-foreground" />
                              )}
                              <span className="truncate max-w-[120px]">
                                {file.name}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-70 hover:opacity-100"
                              onClick={() => removeFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !projectId}>
              {isSubmitting ? "Submitting..." : "Submit Bug Report"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default NewBug;
