import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Printer,
  RefreshCw,
  Share2,
  Smartphone,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useState } from "react";

interface Screenshot {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
}

interface ScreenshotViewerProps {
  screenshots: Screenshot[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIndex?: number;
}

export function ScreenshotViewer({
  screenshots,
  open,
  onOpenChange,
  initialIndex = 0,
}: ScreenshotViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(50); // 50% default zoom

  if (screenshots.length === 0) return null;

  const currentScreenshot = screenshots[currentIndex];
  const imageUrl = `${import.meta.env.VITE_API_URL?.replace("/api", "")}/${
    currentScreenshot.file_path
  }`;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : screenshots.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < screenshots.length - 1 ? prev + 1 : 0));
  };

  const zoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 25, 200));
  };

  const zoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 25, 25));
  };

  const resetZoom = () => {
    setZoomLevel(50);
  };

  const downloadScreenshot = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = currentScreenshot.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyScreenshot = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
    } catch (error) {
      console.error("Failed to copy screenshot:", error);
    }
  };

  const shareScreenshot = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Screenshot",
          text: currentScreenshot.file_name,
          url: imageUrl,
        });
      } else {
        // Fallback: copy to clipboard
        await copyScreenshot();
      }
    } catch (error) {
      console.error("Failed to share screenshot:", error);
    }
  };

  const printScreenshot = () => {
    const printWindow = window.open(imageUrl, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const deleteScreenshot = () => {
    // This would typically call an API to delete the screenshot
    console.log("Delete screenshot:", currentScreenshot.id);
  };

  const handleClose = () => {
    setCurrentIndex(initialIndex);
    setZoomLevel(50);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-background border-0 shadow-none">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Screenshot Preview</h2>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
              {/* Navigation */}
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrevious}
                disabled={screenshots.length <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNext}
                disabled={screenshots.length <= 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              {/* Zoom Controls */}
              <Button variant="ghost" size="sm" onClick={zoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={zoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={resetZoom}>
                <RefreshCw className="h-4 w-4" />
              </Button>

              {/* Action Buttons */}
              <Button variant="ghost" size="sm" onClick={downloadScreenshot}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={copyScreenshot}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={shareScreenshot}>
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={printScreenshot}>
                <Printer className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={deleteScreenshot}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>

              {/* Close */}
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Device Info Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b text-sm">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span>BugRacer | CODO AI Innovations</span>
              <span>412 x 914</span>
              <span>{zoomLevel}%</span>
            </div>
            <div className="text-muted-foreground">
              {currentIndex + 1} of {screenshots.length}
            </div>
          </div>

          {/* Image Display */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <div
              className="relative bg-white rounded-lg shadow-lg overflow-hidden"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: "center center",
                transition: "transform 0.2s ease-in-out",
              }}
            >
              <img
                src={imageUrl}
                alt={`Screenshot ${currentIndex + 1}`}
                className="max-w-none"
                style={{
                  width: "412px",
                  height: "914px",
                  objectFit: "cover",
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
