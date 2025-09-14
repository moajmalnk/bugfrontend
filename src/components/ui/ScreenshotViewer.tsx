import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileImage,
  Info,
  Maximize2,
  Minimize2,
  Printer,
  RefreshCw,
  RotateCcw,
  RotateCw,
  RotateCw as RotateIcon,
  Search,
  Share2,
  Smartphone,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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
  bug_id?: string;
  onScreenshotDelete?: (deletedId: string) => void;
}

export function ScreenshotViewer({
  screenshots,
  open,
  onOpenChange,
  initialIndex = 0,
  bug_id,
  onScreenshotDelete,
}: ScreenshotViewerProps) {
  // Early return before any hooks to avoid "Rendered fewer hooks than expected" error
  if (screenshots.length === 0) return null;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(100); // 100% default zoom
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [showZoomSlider, setShowZoomSlider] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoomLevel(100);
      setRotation(0);
      setIsFullscreen(false);
      setShowInfo(false);
      setImageLoaded(false);
      setImageError(false);
      setImagePosition({ x: 0, y: 0 });
      setShowZoomSlider(false);
      setShowDeleteDialog(false);
    }
  }, [open, initialIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          goToPrevious();
          break;
        case "ArrowRight":
          e.preventDefault();
          goToNext();
          break;
        case "Escape":
          e.preventDefault();
          handleClose();
          break;
        case "+":
        case "=":
          e.preventDefault();
          zoomIn();
          break;
        case "-":
          e.preventDefault();
          zoomOut();
          break;
        case "0":
          e.preventDefault();
          resetZoom();
          break;
        case "r":
          e.preventDefault();
          rotateRight();
          break;
        case "l":
          e.preventDefault();
          rotateLeft();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "i":
          e.preventDefault();
          setShowInfo(!showInfo);
          break;
        case "z":
          e.preventDefault();
          setShowZoomSlider(!showZoomSlider);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, showInfo, showZoomSlider]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Debug: Log when zoom or rotation changes
  useEffect(() => {
    if (open) {
      console.log("Transform updated:", {
        zoomLevel,
        rotation,
        imagePosition,
        transform: `scale(${
          zoomLevel / 100
        }) rotate(${rotation}deg) translate(${imagePosition.x}px, ${
          imagePosition.y
        }px)`,
      });
    }
  }, [zoomLevel, rotation, imagePosition, open]);

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

  // Enhanced zoom functions with smooth transitions
  const zoomIn = () => {
    setZoomLevel((prev) => {
      const newZoom = Math.min(prev + 25, 500);
      console.log("Zooming in from", prev, "to", newZoom);
      return newZoom;
    });
  };

  const zoomOut = () => {
    setZoomLevel((prev) => {
      const newZoom = Math.max(prev - 25, 25);
      console.log("Zooming out from", prev, "to", newZoom);
      return newZoom;
    });
  };

  const resetZoom = () => {
    setZoomLevel(100);
    setImagePosition({ x: 0, y: 0 });
    console.log("Reset zoom to 100%");
  };

  const handleZoomChange = useCallback((value: number[]) => {
    setZoomLevel(value[0]);
  }, []);

  // Enhanced rotation functions
  const rotateRight = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const rotateLeft = useCallback(() => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  }, []);

  const resetRotation = useCallback(() => {
    setRotation(0);
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  }, []);

  // Mouse drag for panning when zoomed
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoomLevel > 100) {
        setIsDragging(true);
        setDragStart({
          x: e.clientX - imagePosition.x,
          y: e.clientY - imagePosition.y,
        });
      }
    },
    [zoomLevel, imagePosition]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && dragStart && zoomLevel > 100) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        setImagePosition({ x: newX, y: newY });
      }
    },
    [isDragging, dragStart, zoomLevel]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  // Touch gesture handling with pinch zoom
  const [pinchStart, setPinchStart] = useState<{
    distance: number;
    zoom: number;
  } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch gesture
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setPinchStart({ distance, zoom: zoomLevel });
    } else if (e.touches.length === 1) {
      // Single touch for navigation
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setTouchStartTime(Date.now());
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStart) {
      // Handle pinch zoom
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = distance / pinchStart.distance;
      const newZoom = Math.max(25, Math.min(500, pinchStart.zoom * scale));
      setZoomLevel(newZoom);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setPinchStart(null);

      if (touchStart) {
        const touchEnd = {
          x: e.changedTouches[0]?.clientX || 0,
          y: e.changedTouches[0]?.clientY || 0,
        };
        const deltaX = touchEnd.x - touchStart.x;
        const deltaY = touchEnd.y - touchStart.y;
        const deltaTime = Date.now() - touchStartTime;

        // Swipe gesture detection
        if (
          deltaTime < 300 &&
          Math.abs(deltaX) > 50 &&
          Math.abs(deltaY) < 100
        ) {
          if (deltaX > 0) {
            goToPrevious();
          } else {
            goToNext();
          }
        }
        setTouchStart(null);
      }
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
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
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      // Close the delete dialog
      setShowDeleteDialog(false);

      // Show loading state
      toast({
        title: "Deleting...",
        description: "Removing screenshot from the system",
      });

      // Check if bug_id is available
      if (!bug_id) {
        throw new Error("Bug ID is required to delete screenshot");
      }

      // Make API call to delete the screenshot
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/bugs/delete_image.php`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            bug_id: bug_id,
            attachment_id: currentScreenshot.id,
            file_path: currentScreenshot.file_path,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        // Remove from screenshots array
        const updatedScreenshots = screenshots.filter(
          (s) => s.id !== currentScreenshot.id
        );

        // If no screenshots left, close the viewer
        if (updatedScreenshots.length === 0) {
          handleClose();
          toast({
            title: "Success",
            description:
              "Screenshot deleted successfully. No more screenshots to display.",
          });
          return;
        }

        // Update screenshots and reset to first image if current was deleted
        const newIndex =
          currentIndex >= updatedScreenshots.length ? 0 : currentIndex;
        setCurrentIndex(newIndex);

        // Notify parent component about the deletion
        if (onScreenshotDelete) {
          onScreenshotDelete(currentScreenshot.id);
        }

        toast({
          title: "Success",
          description: "Screenshot deleted successfully",
        });

        // Close the viewer if this was the last screenshot
        if (updatedScreenshots.length === 0) {
          handleClose();
        }
      } else {
        throw new Error(data.message || "Failed to delete screenshot");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete screenshot. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setCurrentIndex(initialIndex);
    setZoomLevel(100);
    setRotation(0);
    setIsFullscreen(false);
    setShowInfo(false);
    setImagePosition({ x: 0, y: 0 });
    setShowZoomSlider(false);
    setShowDeleteDialog(false);
    onOpenChange(false);
  };

  // Get image dimensions for responsive display
  const getImageDimensions = () => {
    // Use the FULL available space for both width and height
    const availableWidth = window.innerWidth * 0.98; // Use 98% of viewport width
    const availableHeight = window.innerHeight * 0.98; // Use 98% of viewport height (even more aggressive!)

    // For mobile screenshots, prioritize height to fill the bottom space
    // Use a more realistic mobile aspect ratio (9:16 instead of 16:9)
    const mobileAspectRatio = 9 / 16; // Height is 1.78x the width (typical mobile)

    // Calculate dimensions based on mobile aspect ratio
    const widthBasedHeight = availableWidth * mobileAspectRatio;
    const heightBasedWidth = availableHeight / mobileAspectRatio;

    let width, height;

    // For mobile screenshots, prioritize height to eliminate bottom empty space
    if (heightBasedWidth <= availableWidth) {
      // Height constraint is tighter - use full height
      height = availableHeight;
      width = heightBasedWidth;
    } else {
      // Width constraint is tighter - use full width
      width = availableWidth;
      height = widthBasedHeight;
    }

    // Ensure we're using maximum possible space
    // This should eliminate empty space on both sides AND bottom
    return { width, height };
  };

  const { width, height } = getImageDimensions();

  // Debug: Log the calculated dimensions
  console.log("Screenshot dimensions:", {
    width,
    height,
    availableWidth: window.innerWidth * 0.98,
    availableHeight: window.innerHeight * 0.98,
    widthBasedHeight: window.innerWidth * 0.98 * (9 / 16),
    heightBasedWidth: (window.innerHeight * 0.98) / (9 / 16),
    aspectRatio: "9:16 (mobile)",
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    widthUsage: `${((width / (window.innerWidth * 0.98)) * 100).toFixed(1)}%`,
    heightUsage: `${((height / (window.innerHeight * 0.98)) * 100).toFixed(
      1
    )}%`,
    spaceEfficiency: `${(
      ((width * height) /
        (window.innerWidth * 0.98 * (window.innerHeight * 0.98))) *
      100
    ).toFixed(1)}%`,
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[98vw] max-h-[98vh] p-0 bg-background/95 backdrop-blur-md border-0 shadow-2xl">
        <div
          ref={containerRef}
          className="flex flex-col h-full relative"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Enhanced Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border-b bg-gradient-to-r from-background via-muted/20 to-background backdrop-blur-sm"
          >
            {/* Left Section - Title and Info */}
            <div className="flex items-center gap-3 mb-3 sm:mb-0">
              <div className="flex items-center gap-2">
                <FileImage className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  Screenshot Preview
                </h2>
              </div>
              <Badge variant="secondary" className="text-xs">
                {currentIndex + 1} of {screenshots.length}
              </Badge>
            </div>

            {/* Center Section - Navigation (Mobile) */}
            <div className="flex items-center justify-center gap-2 sm:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevious}
                disabled={screenshots.length <= 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-muted-foreground">
                {currentIndex + 1} / {screenshots.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNext}
                disabled={screenshots.length <= 1}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Right Section - Controls */}
            <div className="flex items-center gap-1">
              {/* Enhanced Zoom Controls */}
              <div className="hidden sm:flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log(
                      "Zoom out button clicked, current zoom:",
                      zoomLevel
                    );
                    zoomOut();
                  }}
                  disabled={zoomLevel <= 25}
                  className="h-8 w-8 p-0"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Badge
                  variant="outline"
                  className="text-xs font-mono cursor-pointer hover:bg-primary/10"
                  onClick={() => setShowZoomSlider(!showZoomSlider)}
                  title="Click to show zoom slider (Z)"
                >
                  {zoomLevel}%
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log(
                      "Zoom in button clicked, current zoom:",
                      zoomLevel
                    );
                    zoomIn();
                  }}
                  disabled={zoomLevel >= 500}
                  className="h-8 w-8 p-0"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log(
                      "Reset zoom button clicked, current zoom:",
                      zoomLevel
                    );
                    resetZoom();
                  }}
                  className="h-8 w-8 p-0"
                  title="Reset Zoom (0)"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              <Separator
                orientation="vertical"
                className="h-6 hidden sm:block"
              />

              {/* Enhanced Rotation Controls */}
              <div className="hidden sm:flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={rotateLeft}
                  className="h-8 w-8 p-0"
                  title="Rotate Left (L)"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Badge
                  variant="outline"
                  className="text-xs font-mono cursor-pointer hover:bg-primary/10"
                  onClick={resetRotation}
                  title="Click to reset rotation"
                >
                  {rotation}°
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={rotateRight}
                  className="h-8 w-8 p-0"
                  title="Rotate Right (R)"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>

              <Separator
                orientation="vertical"
                className="h-6 hidden sm:block"
              />

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={downloadScreenshot}
                  className="h-8 w-8 p-0"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyScreenshot}
                  className="h-8 w-8 p-0"
                  title="Copy"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={shareScreenshot}
                  className="h-8 w-8 p-0"
                  title="Share"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={printScreenshot}
                  className="h-8 w-8 p-0"
                  title="Print"
                >
                  <Printer className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInfo(!showInfo)}
                  className={`h-8 w-8 p-0 ${
                    showInfo ? "bg-primary/10 text-primary" : ""
                  }`}
                  title="Info (I)"
                >
                  <Info className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="h-8 w-8 p-0"
                  title="Fullscreen (F)"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deleteScreenshot}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-8 w-8 p-0"
                  title="Close (Esc)"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Device Info Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-4 py-2 bg-gradient-to-r from-muted/10 via-muted/20 to-muted/10 border-b text-xs sm:text-sm"
          >
            <div className="flex items-center gap-2 mb-2 sm:mb-0">
              <Smartphone className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              <span className="font-medium">
                BugRicer | CODO AI Innovations
              </span>
              <Separator orientation="vertical" className="h-3" />
              <span className="font-mono">
                {width} × {height}
              </span>
              <Separator orientation="vertical" className="h-3" />
              <span className="font-mono">{zoomLevel}%</span>
              {rotation !== 0 && (
                <>
                  <Separator orientation="vertical" className="h-3" />
                  <span className="font-mono">{rotation}°</span>
                </>
              )}
            </div>

            {/* Mobile Navigation Hint */}
            <div className="sm:hidden text-muted-foreground text-xs">
              Swipe left/right to navigate • Pinch to zoom
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevious}
                disabled={screenshots.length <= 1}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="h-3 w-3 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNext}
                disabled={screenshots.length <= 1}
                className="h-7 px-2 text-xs"
              >
                Next
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </motion.div>

          {/* Enhanced Image Display with Pan Support */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden bg-gradient-to-br from-muted/20 via-background to-muted/20 relative"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              cursor: isDragging
                ? "grabbing"
                : zoomLevel > 100
                ? "grab"
                : "default",
            }}
          >
            <motion.div
              key={`${currentIndex}-${zoomLevel}-${rotation}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              ref={imageContainerRef}
              className="relative bg-white rounded-xl shadow-2xl border border-border/50"
              title={`Container: ${width}×${height}px`}
              style={{
                width: `${width}px`,
                height: `${height}px`,
                transform: `scale(${
                  zoomLevel / 100
                }) rotate(${rotation}deg) translate(${imagePosition.x}px, ${
                  imagePosition.y
                }px)`,
                transformOrigin: "center center",
                transition: isDragging
                  ? "none"
                  : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                willChange: "transform",
                backfaceVisibility: "hidden",
              }}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt={`Screenshot ${currentIndex + 1}`}
                className={`transition-opacity duration-300 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  width: `${width}px`,
                  height: `${height}px`,
                  objectFit: "contain",
                  pointerEvents: "none", // Prevent image from interfering with drag
                }}
                onLoad={() => {
                  setImageLoaded(true);
                  setImageError(false);
                  // Debug: Log actual image dimensions
                  console.log("Image loaded with dimensions:", {
                    naturalWidth: imageRef.current?.naturalWidth,
                    naturalHeight: imageRef.current?.naturalHeight,
                    appliedWidth: width,
                    appliedHeight: height,
                  });
                }}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(false);
                }}
              />

              {/* Loading State */}
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="text-sm text-muted-foreground">
                      Loading...
                    </span>
                  </div>
                </div>
              )}

              {/* Error State */}
              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
                  <div className="text-center">
                    <FileImage className="h-12 w-12 text-destructive mx-auto mb-2" />
                    <p className="text-sm text-destructive font-medium">
                      Failed to load image
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentScreenshot.file_name}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Zoom Slider Overlay */}
            <AnimatePresence>
              {showZoomSlider && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute top-4 right-4 bg-background/95 backdrop-blur-md border border-border/50 rounded-lg p-4 shadow-lg z-10"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Search className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Zoom Control</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowZoomSlider(false)}
                      className="h-6 w-6 p-0 ml-auto"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="w-48">
                    <Slider
                      value={[zoomLevel]}
                      onValueChange={handleZoomChange}
                      min={25}
                      max={500}
                      step={5}
                      className="mb-2"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>25%</span>
                      <span className="font-medium">{zoomLevel}%</span>
                      <span>500%</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetZoom}
                      className="h-7 px-2 text-xs"
                    >
                      Reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setZoomLevel(100)}
                      className="h-7 px-2 text-xs"
                    >
                      100%
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Debug Transform Info */}
            <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Search className="h-3 w-3" />
                <span>
                  Zoom: {zoomLevel}% | Rot: {rotation}° | Pos: (
                  {imagePosition.x}, {imagePosition.y})
                </span>
              </div>
            </div>

            {/* Zoom and Rotation Hints */}
            {zoomLevel > 100 && (
              <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Search className="h-3 w-3" />
                  <span>Drag to pan • Scroll to zoom • R/L to rotate</span>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Info Panel */}
          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t bg-muted/30 backdrop-blur-sm overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Screenshot Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">File Name:</span>
                      <p className="font-medium truncate">
                        {currentScreenshot.file_name}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">File Type:</span>
                      <p className="font-medium">
                        {currentScreenshot.file_type || "Unknown"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dimensions:</span>
                      <p className="font-medium">
                        {width} × {height} pixels
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Current Zoom:
                      </span>
                      <p className="font-medium">{zoomLevel}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rotation:</span>
                      <p className="font-medium">{rotation}°</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Position:</span>
                      <p className="font-medium">
                        {currentIndex + 1} of {screenshots.length}
                      </p>
                    </div>
                  </div>

                  {/* Enhanced Keyboard Shortcuts */}
                  <div className="pt-2 border-t">
                    <h4 className="font-medium text-xs mb-2 text-muted-foreground">
                      Keyboard Shortcuts
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
                          ←
                        </kbd>
                        <span>Previous</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
                          →
                        </kbd>
                        <span>Next</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
                          +
                        </kbd>
                        <span>Zoom In</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
                          -
                        </kbd>
                        <span>Zoom Out</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
                          0
                        </kbd>
                        <span>Reset Zoom</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
                          R
                        </kbd>
                        <span>Rotate Right</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
                          L
                        </kbd>
                        <span>Rotate Left</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
                          Z
                        </kbd>
                        <span>Zoom Slider</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
                          F
                        </kbd>
                        <span>Fullscreen</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
                          Esc
                        </kbd>
                        <span>Close</span>
                      </div>
                    </div>
                  </div>

                  {/* Touch Gestures */}
                  <div className="pt-2 border-t">
                    <h4 className="font-medium text-xs mb-2 text-muted-foreground">
                      Touch Gestures
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <RotateIcon className="h-3 w-3" />
                        <span>Swipe left/right: Navigate</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Search className="h-3 w-3" />
                        <span>Pinch: Zoom in/out</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <RotateIcon className="h-3 w-3" />
                        <span>Double tap: Reset zoom</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Professional Delete Confirmation Dialog */}
          <AnimatePresence>
            {showDeleteDialog && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setShowDeleteDialog(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-background border border-border/50 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Delete Screenshot
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        This action cannot be undone
                      </p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-muted-foreground mb-3">
                      Are you sure you want to delete this screenshot?
                    </p>
                    <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                      <div className="flex items-center gap-2 text-sm">
                        <FileImage className="w-4 h-4 text-primary" />
                        <span className="font-medium text-foreground">
                          {currentScreenshot.file_name}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        File size and type information
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteDialog(false)}
                      className="px-4"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={confirmDelete}
                      className="px-4"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Permanently
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
