import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bug } from "@/types";
import { RotateCw, X, ZoomIn, ZoomOut, ArrowLeft, ArrowRight, Download, Copy, Share2 } from "lucide-react";
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
      const response = await fetch(selectedImage, { mode: "cors" });
      if (!response.ok) throw new Error("Image fetch failed");
      const blob = await response.blob();

      // Convert to PNG if not already PNG, and downscale for speed
      let pngBlob = blob;
      if (blob.type !== "image/png" || scaleFactor !== 1) {
        const img = document.createElement("img");
        img.crossOrigin = "anonymous";
        const imgLoad = new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        img.src = URL.createObjectURL(blob);
        await imgLoad;

        // Downscale
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(img.width * scaleFactor));
        canvas.height = Math.max(1, Math.floor(img.height * scaleFactor));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const pngDataUrl = canvas.toDataURL("image/png");
        const res = await fetch(pngDataUrl);
        pngBlob = await res.blob();
        URL.revokeObjectURL(img.src);
      }

      await navigator.clipboard.write([new window.ClipboardItem({ "image/png": pngBlob })]);
      toast({ title: "Success", description: `Image copied to clipboard as PNG).` });
    } catch (error) {
      console.error("Copy image error:", error);
      toast({
        title: "Error",
        description: "Failed to copy image. Check browser support and CORS.",
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
      const response = await fetch(selectedImage, { mode: "cors" });
      if (!response.ok) throw new Error("Image fetch failed");
      const blob = await response.blob();
      const file = new File([blob], "screenshot.png", { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Bug Screenshot",
          text: bug.description,
        });
      } else {
        toast({
          title: "Error",
          description: "Sharing files is not supported in your browser.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share image. Check browser support and CORS.",
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
      console.error("Failed to copy description:", error);
      toast({
        title: "Error",
        description: "Failed to copy description.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base sm:text-lg">Description</CardTitle>
          {/* Add Copy Description Button */}
          {bug?.description && navigator.clipboard && navigator.clipboard.writeText && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0.5"
              onClick={handleCopyDescription}
              aria-label="Copy description to clipboard"
            >
              <Copy className="h-4 w-4" />
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
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 px-3 text-xs"
                      onClick={() => handleOpenImage(screenshot.path, index)}
                    >
                      View Full Size
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
                <li key={index} className="flex items-center gap-2">
                  <a
                    href={file.path}
                    className="text-sm sm:text-base text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {file.name}
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    aria-label={`Download file ${file.name}`}
                    className="h-auto p-1"
                  >
                    <a href={file.path} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5" />
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
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-sm sm:text-base">
                Screenshot Preview
              </DialogTitle>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {bug.screenshots && bug.screenshots.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8"
                      onClick={handlePreviousImage}
                      disabled={currentImageIndex === 0}
                      aria-label="Previous image"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8"
                      onClick={handleNextImage}
                      disabled={currentImageIndex === (bug.screenshots.length - 1)}
                      aria-label="Next image"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8"
                  onClick={handleZoomOut}
                  disabled={scale <= 0.5}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8"
                  onClick={handleZoomIn}
                  disabled={scale >= 3}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8"
                  onClick={handleRotate}
                  aria-label="Rotate image 90 degrees clockwise"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>
                {selectedImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8"
                    asChild
                    aria-label="Download image"
                  >
                    <a href={selectedImage} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}

                {/* Add Copy Image Button */}
                {navigator.clipboard && navigator.clipboard.write && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8"
                    onClick={() => handleCopyImage(0.25)}
                    aria-label="Copy image to clipboard (2x faster)"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}

                {/* Add Share Button */}
                {navigator.share && navigator.canShare && bug.screenshots && bug.screenshots.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8"
                    onClick={handleShareImage}
                    aria-label="Share image"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                )}

                {selectedImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => {
                      setSelectedImage(null);
                      setScale(1);
                      setRotation(0);
                    }}
                    aria-label="Close dialog"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          {selectedImage && bug.screenshots && bug.screenshots.length > 0 && (
            <div className="relative flex-1 overflow-auto p-3 sm:p-4">
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
