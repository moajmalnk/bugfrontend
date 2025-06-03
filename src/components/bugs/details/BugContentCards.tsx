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

interface BugContentCardsProps {
  bug: Bug;
}

export const BugContentCards = ({ bug }: BugContentCardsProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

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
      // First try the modern fetch approach
      let blob: Blob;
      try {
        const response = await fetch(selectedImage, {
          mode: 'cors',
          credentials: 'omit'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        blob = await response.blob();
      } catch (fetchError) {
        // Fallback: use canvas approach for CORS-restricted images
        console.log('Fetch failed, trying canvas approach:', fetchError);
        const img = document.createElement("img");
        img.crossOrigin = "anonymous";
        
        const imgLoad = new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          setTimeout(reject, 5000); // 5 second timeout
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
      }

      // If we have a blob but need to process it
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
    } catch (error) {
      console.error("Copy image error:", error);
      toast({
        title: "Error",
        description: "Failed to copy image. Try right-clicking and 'Copy image' instead.",
        variant: "destructive",
      });
    }
  };

  const handleShareImage = async () => {
    if (!selectedImage || !navigator.share) {
      toast({
        title: "Error",
        description: "Web Share API is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      let blob: Blob;
      let fileName = "bug-screenshot.png";
      
      try {
        // Try to fetch the image
        const response = await fetch(selectedImage, {
          mode: 'cors',
          credentials: 'omit'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        blob = await response.blob();
        
        // Try to get original filename from URL
        const urlParts = selectedImage.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        if (lastPart && lastPart.includes('.')) {
          fileName = lastPart;
        }
      } catch (fetchError) {
        console.log('Fetch failed for sharing, trying canvas approach:', fetchError);
        // Fallback: create image using canvas
        const img = document.createElement("img");
        img.crossOrigin = "anonymous";
        
        const imgLoad = new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          setTimeout(reject, 5000); // 5 second timeout
        });
        
        img.src = selectedImage;
        await imgLoad;

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            resolve(blob!);
          }, "image/png", 0.9);
        });
      }
      
      const file = new File([blob], fileName, { type: blob.type });
      
      // Prepare share content with bug details
      const shareTitle = `Bug Screenshot: ${bug.title || 'Untitled Bug'}`;
      let shareText = '';
      
      if (bug.description) {
        // Include full description if not too long, otherwise truncate
        if (bug.description.length <= 200) {
          shareText = `Bug Description:\n${bug.description}`;
        } else {
          shareText = `Bug Description:\n${bug.description.substring(0, 197)}...`;
        }
      }
      
      // Add additional bug details
      if (bug.priority) {
        shareText += `\n\nPriority: ${bug.priority}`;
      }
      if (bug.status) {
        shareText += `\nStatus: ${bug.status}`;
      }
      if (bug.project_id) {
        shareText += `\nProject: ${bug.project_id}`;
      }
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: shareTitle,
          text: shareText || "Bug Screenshot",
        });
      } else {
        toast({
          title: "Error",
          description: "File sharing is not supported in your browser.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Share image error:", error);
      toast({
        title: "Error",
        description: "Failed to share image. Try downloading it instead.",
        variant: "destructive",
      });
    }
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
      // console.error("Failed to copy description:", error);
      toast({
        title: "Error",
        description: "Failed to copy description.",
        variant: "destructive",
      });
    }
  };

  const handlePrintImage = () => {
    if (!selectedImage) return;
    // Open a new window with just the image and print it
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Image</title>
          <style>
            body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; }
            img { max-width: 100vw; max-height: 100vh; }
          </style>
        </head>
        <body>
          <img src="${selectedImage}" onload="window.print();window.close()" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base sm:text-lg">Description</CardTitle>
          {/* Responsive Copy Description Button */}
          {bug?.description && navigator.clipboard && navigator.clipboard.writeText && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 sm:h-9 sm:w-9 p-1 sm:p-1.5 flex-shrink-0"
              onClick={handleCopyDescription}
              aria-label="Copy description to clipboard"
            >
              <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          )}
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
                    <a href={selectedImage} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </a>
                  </Button>
                )}

                {/* Responsive Copy Image Button */}
                {navigator.clipboard && navigator.clipboard.write && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 sm:h-9 sm:w-9 p-1 sm:p-1.5 flex-shrink-0"
                    onClick={() => handleCopyImage(0.25)}
                    aria-label="Copy image to clipboard"
                  >
                    <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                )}

                {/* Responsive Share Button */}
                {navigator.share && navigator.canShare && bug.screenshots && bug.screenshots.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 sm:h-9 sm:w-9 p-1 sm:p-1.5 flex-shrink-0"
                    onClick={handleShareImage}
                    aria-label="Share image"
                  >
                    <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                )}

                {selectedImage && (
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
            <div className="relative flex-1 overflow-auto p-2 sm:p-3 md:p-4">
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
        </DialogContent>
      </Dialog>
    </div>
  );
};
