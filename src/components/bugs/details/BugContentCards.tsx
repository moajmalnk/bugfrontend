import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bug } from "@/types";
import { RotateCw, X, ZoomIn, ZoomOut, ArrowLeft, ArrowRight, Download, Copy, Share2, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { generateShareableUrl } from "@/lib/utils";

interface BugContentCardsProps {
  bug: Bug;
}

function isMobileOrTablet() {
  return /android|iphone|ipad|mobile/i.test(navigator.userAgent);
}

function getRelativeImagePath(fullPath: string) {
  const match = fullPath.match(/[?&]path=([^&]+)/);
  if (match) return decodeURIComponent(match[1]);
  if (fullPath.startsWith('uploads/')) return fullPath;
  const idx = fullPath.indexOf('uploads/');
  if (idx !== -1) return fullPath.substring(idx);
  return fullPath;
}

export const BugContentCards = ({ bug }: BugContentCardsProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { currentUser } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

  const handleOpenImage = (imagePath: string, index: number) => {
    setSelectedImage(imagePath);
    setCurrentImageIndex(index);
    setScale(1);
    setRotation(0);
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex((prevIndex) => Math.max(0, prevIndex - 1));
    setScale(1);
    setRotation(0);
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) => Math.min(bug.screenshots.length - 1, prevIndex + 1));
    setScale(1);
    setRotation(0);
  };

  const handleCopyImage = async (scaleFactor = 0.5) => {
    if (!selectedImage) return;
    if (!navigator.clipboard || !navigator.clipboard.write) {
      toast({
        title: "Error",
        description: "Copying images is only supported in Chrome on HTTPS.",
        variant: "destructive",
      });
      return;
    }

    try {
      let blob: Blob;
      let success = false;

      // Try multiple approaches to get the image

      // Approach 1: Direct fetch with CORS
      try {
        const response = await fetch(selectedImage, {
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Accept': 'image/*'
          }
        });
        if (response.ok) {
          blob = await response.blob();
          success = true;
        }
      } catch (fetchError) {
        //.log('CORS fetch failed:', fetchError);
      }

      // Approach 2: Try with no-cors mode if CORS failed
      if (!success) {
        try {
          const response = await fetch(selectedImage, {
            mode: 'no-cors',
            credentials: 'omit'
          });
          // Note: no-cors responses are opaque, so we can't read them
          // This approach won't work for copying, but we need to try canvas
        } catch (noCorsError) {
          //.log('No-CORS fetch also failed:', noCorsError);
        }
      }

      // Approach 3: Canvas approach (fallback)
      if (!success) {
        //.log('Trying canvas approach...');
        const img = document.createElement("img");
        img.crossOrigin = "anonymous";

        const imgLoad = new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          setTimeout(() => reject(new Error('Timeout')), 10000); // 10 second timeout
        });

        img.src = selectedImage;
        await imgLoad;

        // Create canvas and draw the image
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(img.width * scaleFactor));
        canvas.height = Math.max(1, Math.floor(img.height * scaleFactor));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to blob
        blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            resolve(blob!);
          }, "image/png", 0.9);
        });
        success = true;
      }

      // If we have a blob but need to process it
      if (success && blob) {
        let finalBlob = blob;
        if (blob.type !== "image/png" || scaleFactor !== 1) {
          const img = document.createElement("img");
          const imgLoad = new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          img.src = URL.createObjectURL(blob);
          await imgLoad;

          // Create canvas and process the image
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.floor(img.width * scaleFactor));
          canvas.height = Math.max(1, Math.floor(img.height * scaleFactor));
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Convert to PNG blob
          finalBlob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => {
              resolve(blob!);
            }, "image/png", 0.9);
          });

          URL.revokeObjectURL(img.src);
        }

        await navigator.clipboard.write([new window.ClipboardItem({ "image/png": finalBlob })]);
        toast({
          title: "Success",
          description: scaleFactor < 1 ? `Image copied to clipboard (${Math.round(scaleFactor * 100)}% size)` : "Image copied to clipboard"
        });
      } else {
        throw new Error('Could not load image with any method');
      }
    } catch (error) {
      //.error("Copy image error:", error);
      toast({
        title: "Error",
        description: "Failed to copy image. Try right-clicking and selecting 'Copy image' instead.",
        variant: "destructive",
      });
    }
  };

  const handleCopyImageWithDescription = async () => {
    // If an image is selected, copy both image and description as HTML
    if (selectedImage) {
      try {
        const response = await fetch(selectedImage, { mode: 'cors' });
        const blob = await response.blob();
        const reader = new FileReader();

        reader.onload = async function () {
          const base64 = reader.result;
          const html = `
            <div>
              <img src="${base64}" alt="Bug Screenshot" style="max-width: 400px; display: block; margin-bottom: 8px;" />
              <div style="font-family: sans-serif; font-size: 14px;">
                <strong>Description:</strong> ${bug.description ? bug.description.replace(/\n/g, "<br/>") : ""}
              </div>
            </div>
          `;
          try {
            await navigator.clipboard.write([
              new window.ClipboardItem({
                "text/html": new Blob([html], { type: "text/html" }),
                "text/plain": new Blob([bug.description || ""], { type: "text/plain" }),
              }),
            ]);
            toast({
              title: "Copied!",
              description: "Image and description copied to clipboard as rich content.",
            });
          } catch (err) {
            // Fallback: just copy description
            await navigator.clipboard.writeText(bug.description || "");
            toast({
              title: "Copied Description",
              description: "Only the description was copied (image copy failed).",
            });
          }
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        // Fallback: just copy description
        try {
          await navigator.clipboard.writeText(bug.description || "");
          toast({
            title: "Copied Description",
            description: "Only the description was copied (image copy failed).",
          });
        } catch {
          toast({
            title: "Error",
            description: "Failed to copy image and description.",
            variant: "destructive",
          });
        }
      }
    } else {
      // No image selected, just copy description
      try {
        await navigator.clipboard.writeText(bug.description || "");
        toast({
          title: "Copied Description",
          description: "Description copied to clipboard.",
        });
      } catch {
        toast({
          title: "Error",
          description: "Failed to copy description.",
          variant: "destructive",
        });
      }
    }
  };

  const handleShare = async () => {
    // Generate a role-neutral URL that works for all users
    const roleNeutralUrl = generateRoleNeutralUrl();
    const shareText = `Check out this bug: ${bug.title}\n${roleNeutralUrl}`;

    // 1. Try Web Share API (native share sheet)
    if (navigator.share) {
      try {
        await navigator.share({
          title: bug.title,
          text: shareText,
          url: roleNeutralUrl,
        });
        toast({ title: "Shared!", description: "Shared via your device's share sheet." });
        return;
      } catch (err) {
        // User cancelled or error
      }
    }

    // 2. Fallback: Show custom modal with share options
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    const whatsappBusinessUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

    // For demo, just open WhatsApp Web:
    window.open(whatsappUrl, "_blank");
  };

  // Generate a role-neutral URL that works for all users
  const generateRoleNeutralUrl = () => {
    return generateShareableUrl('bugs', bug.id);
  };

  const handleCopyDescription = async () => {
    if (!bug?.description || !navigator.clipboard || !navigator.clipboard.writeText) {
      toast({
        title: "Error",
        description: "Copying description is not supported or description is empty.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(bug.description);
      toast({
        title: "Success",
        description: "Description copied to clipboard.",
      });
    } catch (error) {
      // //.error("Failed to copy description:", error);
      toast({
        title: "Error",
        description: "Failed to copy description.",
        variant: "destructive",
      });
    }
  };

  const handlePrintImage = async () => {
    if (!selectedImage) return;

    try {
      let imageUrl = selectedImage;
      let shouldCreateBlob = false;

      // Check if we need to convert to blob for printing
      try {
        const response = await fetch(selectedImage, { mode: 'cors', credentials: 'omit' });
        if (!response.ok) {
          shouldCreateBlob = true;
        } else {
          const blob = await response.blob();
          if (!blob.type.startsWith('image/')) {
            shouldCreateBlob = true;
          }
        }
      } catch (fetchError) {
        shouldCreateBlob = true;
      }

      // If we need to create a blob (CORS issues), use canvas approach
      if (shouldCreateBlob) {
        try {
          const img = document.createElement("img");
          img.crossOrigin = "anonymous";

          const imgLoad = new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            setTimeout(() => reject(new Error('Timeout')), 10000);
          });

          img.src = selectedImage;
          await imgLoad;

          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);

          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => {
              resolve(blob!);
            }, "image/png", 1.0);
          });

          imageUrl = URL.createObjectURL(blob);
        } catch (canvasError) {
          //.log('Canvas approach failed for printing:', canvasError);
          toast({
            title: "Print Error",
            description: "Could not prepare image for printing. Try downloading instead.",
            variant: "destructive",
          });
          return;
        }
      }

      // Create print window
      const printWindow = window.open('', '_blank', 'width=800,height=600');

      if (!printWindow) {
        toast({
          title: "Print Error",
          description: "Could not open print window. Please check popup blocker settings.",
          variant: "destructive",
        });
        return;
      }

      // Create simple print HTML
      const printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Bug Screenshot</title>
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; text-align: center; }
              h1 { font-size: 18px; margin-bottom: 10px; }
              .details { font-size: 12px; color: #666; margin-bottom: 20px; }
              img { max-width: 100%; max-height: 80vh; border: 1px solid #ddd; }
              @media print { body { padding: 0; } img { max-height: 90vh; } }
            </style>
          </head>
          <body>
            <h1>Bug Screenshot: ${bug.title || 'Untitled Bug'}</h1>
            <div class="details">
              ${bug.description ? `Description: ${bug.description.substring(0, 200)}${bug.description.length > 200 ? '...' : ''}` : ''}
              ${bug.priority ? ` | Priority: ${bug.priority}` : ''}
              ${bug.status ? ` | Status: ${bug.status}` : ''}
            </div>
            <img src="${imageUrl}" alt="Bug Screenshot" onload="setTimeout(() => { window.print(); setTimeout(() => window.close(), 1000); }, 500);" />
          </body>
        </html>
      `;

      printWindow.document.write(printHtml);
      printWindow.document.close();

      // Clean up blob URL if we created one
      if (shouldCreateBlob && imageUrl.startsWith('blob:')) {
        setTimeout(() => URL.revokeObjectURL(imageUrl), 30000);
      }

      toast({
        title: "Print Window Opened",
        description: "Print dialog should open shortly.",
        variant: "default",
      });

    } catch (error) {
      //.error("Print error:", error);
      toast({
        title: "Print Error",
        description: "Could not print image. Try downloading and printing manually.",
        variant: "destructive",
      });
    }
  };

  // Check if current user can delete images
  const canDeleteImage = currentUser && (currentUser.role === "admin" || currentUser.id === bug.reported_by);

  // Handler to delete image (API call to backend)
  const handleDeleteImage = async () => {
    if (!selectedImage) return;
    const screenshot = bug.screenshots[currentImageIndex];
    setDeletingImage(true);
    try {
      const apiUrl = "http://localhost/Bugricer/backend/api";
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/bugs/delete_image.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ bug_id: bug.id, attachment_id: screenshot.id }),
      });
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error('Invalid JSON response from server');
      }
      if (!data.success) throw new Error(data.message);

      // Remove from UI
      if (Array.isArray(bug.screenshots)) {
        bug.screenshots = bug.screenshots.filter((img) => getRelativeImagePath(img.path) !== getRelativeImagePath(selectedImage));
      }
      setSelectedImage(null);
      setShowDeleteConfirm(false);
      toast({ title: "Deleted", description: "Image deleted successfully." });
    } catch (error) {
      toast({ title: "Error", description: error.message || "Failed to delete image.", variant: "destructive" });
    } finally {
      setDeletingImage(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base sm:text-lg">Description</CardTitle>
          {/* Single Copy Button: copies image+description if image selected, else just description */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 sm:h-9 sm:w-9 p-1 sm:p-1.5 flex-shrink-0"
            onClick={handleCopyImageWithDescription}
            aria-label="Copy image and description"
            title="Copy image and description"
          >
            <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="max-w-full overflow-x-auto">
            <p className="whitespace-pre-wrap text-sm sm:text-base break-words">
              {bug.description}
            </p>
          </div>
        </CardContent>
      </Card>

      {bug.screenshots && bug.screenshots.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Screenshots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {bug.screenshots.map((screenshot, index) => (
                <div
                  key={index}
                  className="relative group rounded-md border overflow-hidden aspect-[16/10]"
                >
                  <img
                    src={screenshot.path}
                    alt={screenshot.name}
                    className="object-cover w-full h-full transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                      onClick={() => handleOpenImage(screenshot.path, index)}
                    >
                      <span className="hidden xs:inline">View Full Size</span>
                      <span className="xs:hidden">View</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {bug.files?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">
              Attached Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {bug.files.map((file, index) => (
                <li key={index} className="flex items-center gap-2 sm:gap-3">
                  <a
                    href={file.path}
                    className="text-sm sm:text-base text-primary hover:underline flex-1 min-w-0"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="truncate block">{file.name}</span>
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    aria-label={`Download file ${file.name}`}
                    className="h-8 w-8 sm:h-9 sm:w-9 p-1 sm:p-1.5 flex-shrink-0"
                  >
                    <a href={file.path} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Image Full View Dialog */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={() => {
          setSelectedImage(null);
          setScale(1);
          setRotation(0);
          setCurrentImageIndex(0);
        }}
      >
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full flex flex-col p-0 gap-0" aria-describedby="screenshot-preview-description">
          <DialogHeader className="p-3 sm:p-4 flex-shrink-0 border-b">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <DialogTitle className="text-sm sm:text-base flex-shrink-0">
                Screenshot Preview
              </DialogTitle>
              <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 overflow-x-auto">
                {bug.screenshots && bug.screenshots.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 sm:h-9 sm:w-9 p-1 sm:p-1.5 flex-shrink-0"
                      onClick={handlePreviousImage}
                      disabled={currentImageIndex === 0}
                      aria-label="Previous image"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 sm:h-9 sm:w-9 p-1 sm:p-1.5 flex-shrink-0"
                      onClick={handleNextImage}
                      disabled={currentImageIndex === (bug.screenshots.length - 1)}
                      aria-label="Next image"
                    >
                      <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 sm:h-9 sm:w-9 p-1 sm:p-1.5 flex-shrink-0"
                  onClick={handleZoomOut}
                  disabled={scale <= 0.5}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 sm:h-9 sm:w-9 p-1 sm:p-1.5 flex-shrink-0"
                  onClick={handleZoomIn}
                  disabled={scale >= 3}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 sm:h-9 sm:w-9 p-1 sm:p-1.5 flex-shrink-0"
                  onClick={handleRotate}
                  aria-label="Rotate image 90 degrees clockwise"
                >
                  <RotateCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                {selectedImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 sm:h-9 sm:w-9 p-1 sm:p-1.5 flex-shrink-0"
                    asChild
                    aria-label="Download image"
                  >
                    <a
                      href={`${selectedImage}${selectedImage.includes('?') ? '&' : '?'}download=1`}
                      download={selectedImage ? selectedImage.split('/').pop() : 'bug-screenshot.jpg'}
                    >
                      <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </a>
                  </Button>
                )}

                {/* Only one Copy Button: image+description if image selected, else just description */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 sm:h-9 sm:w-9 p-1 sm:p-1.5 flex-shrink-0"
                  onClick={handleCopyImageWithDescription}
                  aria-label="Copy image and description"
                  title="Copy image and description"
                >
                  <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>

                {selectedImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 sm:h-9 sm:w-9 p-1 sm:p-1.5 flex-shrink-0"
                    onClick={handleShare}
                    aria-label="Share image"
                    title="Share image"
                  >
                    <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                )}

                {/* Only show Print button on desktop (not mobile/tablet) */}
                {!isMobileOrTablet() && selectedImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 sm:h-9 sm:w-9 p-1 sm:p-1.5 flex-shrink-0 hidden sm:flex"
                    onClick={handlePrintImage}
                    aria-label="Print image"
                  >
                    <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                )}

                {/* Only show Delete Image button for admins or bug reporter */}
                {canDeleteImage && selectedImage && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 w-8 sm:h-9 sm:w-9 p-1 sm:p-1.5 flex-shrink-0"
                    onClick={() => setShowDeleteConfirm(true)}
                    aria-label="Delete image"
                    title="Delete image"
                  >
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" /></svg>
                  </Button>
                )}

                {selectedImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 sm:h-9 sm:w-9 p-1 sm:p-1.5 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
                    onClick={() => {
                      setSelectedImage(null);
                      setScale(1);
                      setRotation(0);
                    }}
                    aria-label="Close dialog"
                  >
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          {selectedImage && bug.screenshots && bug.screenshots.length > 0 && (
            <div className="relative flex-1 overflow-auto p-2 sm:p-3 md:p-4 custom-scrollbar">
              <div className="min-h-full flex items-center justify-center">
                <img
                  src={bug.screenshots[currentImageIndex].path}
                  alt={`Screenshot ${currentImageIndex + 1} of ${bug.screenshots.length}`}
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{
                    transform: `scale(${scale}) rotate(${rotation}deg)`,
                    transformOrigin: "center center",
                  }}
                />
              </div>
            </div>
          )}

          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 pointer-events-auto">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-lg flex flex-col gap-4 min-w-[250px] z-[10000] relative focus:outline-none" tabIndex={0}>
                {/* Close (X) button */}
                <button
                  className="absolute top-2 right-2 text-lg text-muted-foreground hover:text-destructive focus:outline-none"
                  onClick={() => setShowDeleteConfirm(false)}
                  aria-label="Close"
                >
                  <X />
                </button>
                <h2 className="text-lg font-semibold mb-2">Delete Image?</h2>
                <p>Are you sure you want to delete this image? This action cannot be undone.</p>
                <div className="flex gap-2 mt-4 justify-end">
                  <Button variant="destructive" onClick={handleDeleteImage} disabled={deletingImage}>
                    {deletingImage ? "Deleting..." : "Delete"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deletingImage}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {showShareDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-lg flex flex-col gap-4 min-w-[250px]">
            <h2 className="text-lg font-semibold mb-2">Share Image</h2>
            {isMobileOrTablet() ? (
              <div className="flex flex-col gap-2">
                <Button onClick={() => handleShare()}>WhatsApp</Button>
                <Button onClick={() => handleShare()}>WhatsApp Business</Button>
                <Button onClick={() => handleShare()}>Copy Link</Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button onClick={() => handleShare()}>Email</Button>
                <Button onClick={() => handleShare()}>Outlook</Button>
                <Button onClick={() => handleShare()}>Copy Link</Button>
              </div>
            )}
            <Button variant="ghost" onClick={() => setShowShareDialog(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
};
