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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ENV } from "@/lib/env";
import { broadcastNotificationService } from "@/services/broadcastNotificationService";
import { Bug } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { apiClient } from "@/lib/axios";
import { 
  AlertCircle, 
  ArrowLeft, 
  Bug as BugIcon, 
  CheckCircle, 
  Clock, 
  File, 
  FolderOpen, 
  Save, 
  User, 
  X 
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BugFixCelebration } from "@/components/celebration/BugFixCelebration";

interface FileWithPreview extends File {
  preview?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const FixBug = () => {
  // Changed component name
  const navigate = useNavigate();
  const { bugId } = useParams<{ bugId: string }>(); // Get bugId from URL
  const { currentUser } = useAuth();
  const queryClient = useQueryClient(); // Get query client
  const [searchParams] = useSearchParams(); // Get search params to check navigation context

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bug, setBug] = useState<Bug | null>(null); // State to hold bug details
  const [fixDescription, setFixDescription] = useState(""); // Added field for fix description
  const [status, setStatus] = useState<Bug["status"]>("fixed"); // Status defaults to 'fixed'
  const [showCelebration, setShowCelebration] = useState(false); // State for celebration animation
  const [celebrationBug, setCelebrationBug] = useState<Bug | null>(null); // Bug data for celebration
  
  // Check if user came from project page
  const fromProject = searchParams.get("from") === "project";
  
  // Default fix description for better UX
  const DEFAULT_FIX_DESCRIPTION = "Fixed, Can U check Now";

  // File uploads (for fix-related attachments)
  const [fixAttachments, setFixAttachments] = useState<FileWithPreview[]>([]);

  // Refs for file inputs
  const fixAttachmentInputRef = useRef<HTMLInputElement>(null);

  // State to control minimal loading time display
  const [showSkeleton, setShowSkeleton] = useState(true);

  // Fetch bug details
  const {
    data: fetchedBug,
    isLoading,
    error,
  } = useQuery<Bug>({
    queryKey: ["bug", bugId], // Query key includes bugId
    queryFn: async () => {
      if (!bugId) throw new Error("Bug ID is missing");
      const token = localStorage.getItem("token");
      const response = await axios.get<ApiResponse<Bug>>(
        `${ENV.API_URL}/bugs/get.php?id=${bugId}`, // Endpoint to get single bug
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.data.success) {
        // Initialize status state based on fetched bug status, but maybe default to 'fixed' for this page?
        // For now, let's default the form status to 'fixed' as this is a fix page.
        // setStatus(response.data.data.status);
        return response.data.data;
      }
      throw new Error(response.data.message || "Failed to fetch bug details");
    },
    enabled: !!bugId, // Only run query if bugId is available
    // Keep data in cache for a short time to avoid refetch on minor changes
    staleTime: 1000 * 5, // 5 seconds
  });

  useEffect(() => {
    if (fetchedBug) {
      setBug(fetchedBug);
      
      // Auto-fill fix description if status is fixed and no existing fix description
      if (fetchedBug.status === 'fixed' && (!fetchedBug.fix_description || fetchedBug.fix_description.trim() === '')) {
        setFixDescription(DEFAULT_FIX_DESCRIPTION);
      } else if (fetchedBug.fix_description) {
        // Use existing fix description if available
        setFixDescription(fetchedBug.fix_description);
      }
    }
  }, [fetchedBug]);

  // Effect to auto-fill fix description when status changes to 'fixed'
  useEffect(() => {
    if (status === 'fixed' && (!fixDescription || fixDescription.trim() === '')) {
      setFixDescription(DEFAULT_FIX_DESCRIPTION);
    }
  }, [status, fixDescription]);

  // Effect to manage minimal skeleton display time
  useEffect(() => {
    // Start the timer only if currently loading
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowSkeleton(false);
      }, 1500); // Show skeleton for at least 1.5 seconds

      // Cleanup function to clear the timer
      return () => clearTimeout(timer);
    } else {
      // If not loading, hide skeleton immediately
      setShowSkeleton(false);
    }

    // Re-run this effect if isLoading or bugId changes
  }, [isLoading, bugId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!currentUser || !bugId) {
      return;
    }

    // Show optimistic UI immediately
    setIsSubmitting(true);
    toast({
      title: "Updating...",
      description: "Updating bug status...",
    });

    try {
      const formData = new FormData();
      formData.append("id", bugId);
      formData.append("status", status); // Use the status from state
      formData.append("fix_description", fixDescription); // Include fix description
      formData.append("fixed_by", currentUser.id); // Record who fixed it

      // Send update request
      const response = await apiClient.post('/bugs/update.php', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data as ApiResponse<Bug>;

      if (data.success) {
        // Update bug state with the updated bug data
        const updatedBug = { ...bug, ...data.data, status };

        // Update bug state first for celebration component
        setBug(updatedBug);

        // Show success toast
        toast({
          title: "Success",
          description: "Bug status updated successfully",
        });

        // Store updated bug for celebration and show animation if status is fixed
        if (status === "fixed") {
          setCelebrationBug(updatedBug);
          setShowCelebration(true);
        }

        // Send broadcast notification asynchronously (non-blocking)
        if (status && bug) {
          setTimeout(() => {
            broadcastNotificationService.broadcastStatusChange(
              bug.title,
              bug.id,
              status,
              currentUser?.name || "BugRicer"
            ).catch(err => {
              console.error("Failed to send broadcast notification:", err);
            });
          }, 0);
        }

        // Invalidate the bug details query to force refetch on the details page
        queryClient.invalidateQueries({ queryKey: ["bug", bugId] });

        // If not fixed, redirect immediately. If fixed, wait for celebration
        if (status !== "fixed") {
          setTimeout(() => {
            const bugDetailsUrl = currentUser?.role
              ? `/${currentUser.role}/bugs/${bugId}`
              : `/bugs/${bugId}`;
            
            const redirectUrl = fromProject ? `${bugDetailsUrl}?from=project` : bugDetailsUrl;
            navigate(redirectUrl);
          }, 500);
        }
      } else {
        throw new Error(data.message || "Failed to update bug status");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update bug status",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFixAttachmentClick = () => {
    fixAttachmentInputRef.current?.click();
  };

  const handleFixAttachmentChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files) as FileWithPreview[];

      // Create preview URLs for each file
      newFiles.forEach((file) => {
        if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
          file.preview = URL.createObjectURL(file);
        }
      });

      setFixAttachments((prev) => [...prev, ...newFiles]);

      // Reset input value so the same file can be selected again
      e.target.value = "";
    }
  };

  const removeFixAttachment = (index: number) => {
    const newFiles = [...fixAttachments];

    // Clean up the object URL to prevent memory leaks
    if (newFiles[index].preview) {
      URL.revokeObjectURL(newFiles[index].preview!);
    }

    newFiles.splice(index, 1);
    setFixAttachments(newFiles);
  };

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      fixAttachments.forEach((file) => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
    };
  }, [fixAttachments]);

  // Enhanced skeleton component for loading state
  const LoadingSkeleton = () => (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header Skeleton */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-green-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-green-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-1 w-20" />
                  </div>
                </div>
                <Skeleton className="h-5 w-96" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-32" />
              </div>
            </div>
          </div>
        </div>

        {/* Form Skeleton */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl"></div>
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
            <div className="space-y-6">
              {/* Bug Info Skeleton */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-[150px] w-full" />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-[100px] w-full" />
              </div>

              {/* Action Buttons Skeleton */}
              <div className="flex justify-between pt-6">
                <Skeleton className="h-11 w-24" />
                <Skeleton className="h-11 w-40" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );

  // Render logic based on loading and error states
  if (isLoading && showSkeleton) {
    return <LoadingSkeleton />;
  }

  if (error || !bug) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 via-orange-50/30 to-yellow-50/50 dark:from-red-950/20 dark:via-orange-950/10 dark:to-yellow-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <AlertCircle className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Error Loading Bug</h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                {error?.message || "Could not fetch bug details. Please try again later."}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => navigate(-1)}
                  variant="outline"
                  size="lg"
                  className="h-12 px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 text-gray-700 dark:text-gray-300 hover:text-red-700 dark:hover:text-red-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Go Back
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  size="lg"
                  className="h-12 px-6 bg-gradient-to-r from-red-600 to-orange-700 hover:from-red-700 hover:to-orange-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-green-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-green-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-green-600 rounded-xl shadow-lg">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Fix Bug
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-green-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Update the status and provide details for bug resolution
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Button
                  variant="outline"
                  className="h-12 px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                  onClick={() => {
                    // Navigate back to bug details with the same context
                    const bugDetailsUrl = currentUser?.role
                      ? `/${currentUser.role}/bugs/${bugId}`
                      : `/bugs/${bugId}`;
                    const redirectUrl = fromProject ? `${bugDetailsUrl}?from=project` : bugDetailsUrl;
                    navigate(redirectUrl);
                  }}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back
                </Button>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-blue-500 rounded-lg">
                      <BugIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {bug.priority}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Form */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl"></div>
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
            <div className="space-y-6">
              {/* Bug Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-blue-500 rounded-lg">
                    <BugIcon className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bug Information</h3>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Bug Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Bug Title
                    </Label>
                    <div className="relative group">
                      <Input
                        id="title"
                        value={bug.title}
                        readOnly
                        disabled
                        className="h-11 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium cursor-not-allowed"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <BugIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Bug ID */}
                  <div className="space-y-2">
                    <Label htmlFor="bugId" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Bug ID
                    </Label>
                    <div className="relative group">
                      <Input
                        id="bugId"
                        value={bug.id}
                        readOnly
                        disabled
                        className="h-11 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-mono font-medium cursor-not-allowed"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </Label>
                  <div className="relative group">
                    <Textarea
                      id="description"
                      value={bug.description}
                      readOnly
                      disabled
                      className="min-h-[120px] bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white cursor-not-allowed resize-none"
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Project */}
                  <div className="space-y-2">
                    <Label htmlFor="project" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Project
                    </Label>
                    <div className="relative group">
                      <Input
                        id="project"
                        value={bug.project_name || "Loading..."}
                        readOnly
                        disabled
                        className="h-11 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium cursor-not-allowed"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <FolderOpen className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="space-y-2">
                    <Label htmlFor="priority" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Priority
                    </Label>
                    <div className="relative group">
                      <Input
                        id="priority"
                        value={bug.priority}
                        readOnly
                        disabled
                        className="h-11 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium cursor-not-allowed capitalize"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <div className={`w-2 h-2 rounded-full ${
                          bug.priority === 'high' ? 'bg-red-500' : 
                          bug.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Section */}
              <div className="border-t border-gray-200/50 dark:border-gray-700/50 pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-green-500 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Update Status</h3>
                  </div>
                  
                  {/* Status Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </Label>
                    <div className="relative group">
                      <Select
                        value={status}
                        onValueChange={(value: Bug["status"]) => setStatus(value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger 
                          id="status" 
                          className="h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                        >
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="z-[60]">
                          <SelectItem value="fixed" className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Fixed
                          </SelectItem>
                          <SelectItem value="in_progress" className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500" />
                            In Progress
                          </SelectItem>
                          <SelectItem value="declined" className="flex items-center gap-2">
                            <X className="h-4 w-4 text-orange-500" />
                            Declined
                          </SelectItem>
                          <SelectItem value="rejected" className="flex items-center gap-2">
                            <X className="h-4 w-4 text-red-500" />
                            Rejected
                          </SelectItem>
                          <SelectItem value="pending" className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            Pending
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Fix Description */}
                  <div className="space-y-2">
                    <Label htmlFor="fixDescription" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Fix Details / Notes
                    </Label>
                    <div className="relative group">
                      <Textarea
                        id="fixDescription"
                        placeholder="Provide details about the fix, steps taken, etc."
                        className="min-h-[120px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 resize-none"
                        value={fixDescription}
                        onChange={(e) => setFixDescription(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    {status === 'fixed' && fixDescription === DEFAULT_FIX_DESCRIPTION && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                          💡 Default message provided. You can edit this to add more specific details about the fix.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200/50 dark:border-gray-700/50 pt-6">
                <form onSubmit={handleSubmit}>
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // Navigate back to bug details with the same context
                        const bugDetailsUrl = currentUser?.role
                          ? `/${currentUser.role}/bugs/${bugId}`
                          : `/bugs/${bugId}`;
                        const redirectUrl = fromProject ? `${bugDetailsUrl}?from=project` : bugDetailsUrl;
                        navigate(redirectUrl);
                      }}
                      disabled={isSubmitting}
                      className="h-12 px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      <ArrowLeft className="mr-2 h-5 w-5" />
                      Cancel
                    </Button>
                    
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || !bugId}
                      className="h-12 px-8 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-5 w-5" />
                          Update Bug Status
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Celebration Animation */}
      <BugFixCelebration
        bug={celebrationBug}
        isVisible={showCelebration}
        onClose={() => {
          setShowCelebration(false);
          setCelebrationBug(null);
          // Redirect after celebration closes
          const bugDetailsUrl = currentUser?.role
            ? `/${currentUser.role}/bugs/${bugId}`
            : `/bugs/${bugId}`;
          
          const redirectUrl = fromProject ? `${bugDetailsUrl}?from=project` : bugDetailsUrl;
          navigate(redirectUrl);
        }}
      />
    </main>
  );
};

export default FixBug;
