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
import { ENV } from "@/lib/env";
import { BugPriority, Bug, Project } from "@/types"; // Added Bug import
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
    ArrowLeft,
    File,
    FileImage,
    ImagePlus,
    Paperclip,
    X,
    Bug as BugIcon,
    AlertCircle
} from "lucide-react";
import * as Skeleton from "@/components/ui/skeleton";
import React, {
    ChangeEvent,
    FormEvent,
    useEffect,
    useRef,
    useState,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom"; // Added useParams
import { sendBugStatusUpdateNotification } from "@/services/emailService";

interface FileWithPreview extends File {
    preview?: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

const FixBug = () => { // Changed component name
    const navigate = useNavigate();
    const { bugId } = useParams<{ bugId: string }>(); // Get bugId from URL
    const { currentUser } = useAuth();
    const queryClient = useQueryClient(); // Get query client

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bug, setBug] = useState<Bug | null>(null); // State to hold bug details
    const [fixDescription, setFixDescription] = useState(""); // Added field for fix description
    const [status, setStatus] = useState<Bug['status']>("fixed"); // Status defaults to 'fixed'

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
        }
    }, [fetchedBug]);

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

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append("id", bugId);
            formData.append("status", status); // Use the status from state
            formData.append("fix_description", fixDescription); // Include fix description
            formData.append("fixed_by", currentUser.id); // Record who fixed it

            // Add fix attachments
            fixAttachments.forEach((file) => {
                formData.append(`fix_attachments[]`, file);
            });

            // Assuming an update endpoint exists
            const response = await fetch(`${ENV.API_URL}/bugs/update.php`, { // Assuming an update endpoint
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                // Send notification if status is fixed
                if (status === "fixed") {
                    await sendBugStatusUpdateNotification({
                        ...bug,
                        status: "fixed",
                        updated_by_name: currentUser?.name || "Bug Ricer"
                    });
                }

                toast({
                    title: "Success",
                    description: "Bug status updated successfully",
                });

                // Invalidate the bug details query to force refetch on the details page
                queryClient.invalidateQueries({ queryKey: ["bug", bugId] });

                // Redirect back to the bug details page or bugs list
                navigate(`/bugs/${bugId}`);
            } else {
                throw new Error(data.message || "Failed to update bug status");
            }
        } catch (error) {
            console.error("Error updating bug:", error);
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

    // Render logic based on loading and error states
    if (isLoading && showSkeleton) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex items-center">
                    <Button variant="ghost" disabled>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton.Skeleton className="h-7 w-48" />
                        <Skeleton.Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Skeleton.Skeleton className="h-4 w-24" />
                            <Skeleton.Skeleton className="h-10 w-full" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton.Skeleton className="h-4 w-24" />
                            <Skeleton.Skeleton className="h-[150px] w-full" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton.Skeleton className="h-4 w-24" />
                            <Skeleton.Skeleton className="h-10 w-full" />
                        </div>
                        <div className="space-y-4">
                            <Skeleton.Skeleton className="h-4 w-24" />
                            <div className="grid gap-4 md:grid-cols-2">
                                <Skeleton.Skeleton className="h-24 w-full" />
                                <Skeleton.Skeleton className="h-24 w-full" />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Skeleton.Skeleton className="h-10 w-20" />
                        <Skeleton.Skeleton className="h-10 w-32" />
                    </CardFooter>
                </Card>
            </div>
        ); // Show skeleton only if still loading within the initial window
    }

    if (error || !bug) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-xl font-semibold mb-2">Error Loading Bug</h3>
                <p className="text-muted-foreground mb-6">{error?.message || "Could not fetch bug details."}</p>
                <Button onClick={() => navigate(-1)}>Go Back</Button>
            </div>
        ); // Show error if there's an error or no bug data fetched
    }

    return (
        <div className="space-y-6 w-full max-w-4xl mx-auto px-2 sm:px-4 py-4">
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
                    <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                        <BugIcon className="h-6 w-6 text-primary" />
                        Fixing Bug: {bug.id.substring(0, 8)}
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                        Update the status and provide details for the bug fix.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6 p-4 sm:p-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Bug Name</Label>
                            <Input
                                id="name"
                                value={bug.title}
                                readOnly // Make title read-only
                                disabled // Visually indicate it's disabled
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={bug.description}
                                readOnly // Make description read-only
                                disabled // Visually indicate it's disabled
                                className="min-h-[150px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="project">Project</Label>
                            <Input
                                id="project"
                                value={bug.project_id || 'Loading...'}
                                readOnly
                                disabled
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Input
                                id="priority"
                                value={bug.priority}
                                readOnly // Make priority read-only
                                disabled
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={status} onValueChange={(value: Bug['status']) => setStatus(value)} disabled={isSubmitting}>
                                <SelectTrigger id="status" className="text-sm sm:text-base">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {/* Only allow relevant statuses for fixing */}
                                    <SelectItem value="fixed">Fixed</SelectItem>
                                    <SelectItem value="declined">Declined</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem> {/* Keep pending option */}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="fixDescription">Fix Details / Notes</Label>
                            <Textarea
                                id="fixDescription"
                                placeholder="Provide details about the fix, steps taken, etc."
                                className="min-h-[100px]"
                                value={fixDescription}
                                onChange={(e) => setFixDescription(e.target.value)}
                            />
                        </div>


                        <div className="space-y-4">
                            <Label className="text-sm sm:text-base">Fix Attachments (Screenshots, logs, etc.)</Label>

                            {/* Hidden file input */}
                            <input
                                type="file"
                                ref={fixAttachmentInputRef}
                                onChange={handleFixAttachmentChange}
                                className="hidden"
                                multiple
                            />

                            <div className="space-y-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-24 w-full flex flex-col items-center justify-center"
                                    onClick={handleFixAttachmentClick}
                                >
                                    <Paperclip className="h-8 w-8 mb-2 text-muted-foreground" />
                                    <span>Attach Fix Files</span>
                                    <span className="text-xs text-muted-foreground mt-1">
                                        (Screenshots, logs, etc.)
                                    </span>
                                </Button>

                                {/* Preview of attachments */}
                                {fixAttachments.length > 0 && (
                                    <div className="space-y-2">
                                        <Label className="text-sm">
                                            Attachments ({fixAttachments.length})
                                        </Label>
                                        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                            {fixAttachments.map((file, index) => (
                                                <div
                                                    key={index}
                                                    className="relative rounded border p-1 group flex flex-col"
                                                >
                                                    {file.type.startsWith("image/") ? (
                                                        <img
                                                            src={file.preview}
                                                            alt={`Fix attachment ${index + 1}`}
                                                            className="h-24 w-full object-cover rounded flex-shrink-0"
                                                        />
                                                    ) : file.type.startsWith("video/") ? (
                                                        <video
                                                            src={file.preview}
                                                            controls
                                                            className="h-24 w-full object-cover rounded flex-shrink-0"
                                                            id={`video-preview-${index}`}
                                                        />
                                                    ) : (
                                                        <div className="h-24 w-full flex items-center justify-center bg-muted rounded flex-shrink-0">
                                                            <File className="h-8 w-8 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="h-6 w-6 absolute top-2 right-2 opacity-70 hover:opacity-100"
                                                        onClick={() => removeFixAttachment(index)}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                    <div className="text-xs truncate mt-1 px-1 flex-grow">
                                                        {file.name}
                                                    </div>
                                                    {/* Speed control for videos */}
                                                    {file.type.startsWith("video/") && (
                                                        <div className="mt-2 px-1 flex items-center gap-2">
                                                            <Label htmlFor={`speed-${index}`} className="text-xs">Speed:</Label>
                                                            <select
                                                                id={`speed-${index}`}
                                                                className="text-xs px-1 py-0.5 border rounded bg-background"
                                                                onChange={(e) => {
                                                                    const videoElement = document.getElementById(`video-preview-${index}`) as HTMLVideoElement;
                                                                    if (videoElement) {
                                                                        videoElement.playbackRate = parseFloat(e.target.value);
                                                                    }
                                                                }}
                                                            >
                                                                <option value="1">1x</option>
                                                                <option value="2">2x</option>
                                                                <option value="4">4x</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(-1)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !bugId}>
                            {isSubmitting ? "Submitting..." : "Update Bug Status"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default FixBug; 