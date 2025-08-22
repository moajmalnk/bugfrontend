import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
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
  Share2,
  Smartphone,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, showInfo]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

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
    setZoomLevel((prev) => Math.min(prev + 25, 400));
  };

  const zoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 25, 25));
  };

  const resetZoom = () => {
    setZoomLevel(100);
  };

  const rotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const rotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
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
    console.log("Delete screenshot:", currentScreenshot.id);
  };

  const handleClose = () => {
    setCurrentIndex(initialIndex);
    setZoomLevel(100);
    setRotation(0);
    setIsFullscreen(false);
    setShowInfo(false);
    onOpenChange(false);
  };

  // Touch gesture handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setTouchStartTime(Date.now());
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };
    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const deltaTime = Date.now() - touchStartTime;

    // Swipe gesture detection
    if (deltaTime < 300 && Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100) {
      if (deltaX > 0) {
        goToPrevious();
      } else {
        goToNext();
      }
    }

    setTouchStart(null);
  };

  // Get image dimensions for responsive display
  const getImageDimensions = () => {
    const baseWidth = 412;
    const baseHeight = 914;
    const aspectRatio = baseHeight / baseWidth;

    // Responsive sizing based on viewport
    const maxWidth = Math.min(window.innerWidth * 0.8, 800);
    const maxHeight = Math.min(window.innerHeight * 0.7, 600);

    let width = baseWidth;
    let height = baseHeight;

    if (width > maxWidth) {
      width = maxWidth;
      height = width * aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height / aspectRatio;
    }

    return { width, height };
  };

  const { width, height } = getImageDimensions();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[98vw] max-h-[98vh] p-0 bg-background/95 backdrop-blur-md border-0 shadow-2xl">
        <div
          ref={containerRef}
          className="flex flex-col h-full relative"
          onTouchStart={handleTouchStart}
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
              {/* Zoom Controls */}
              <div className="hidden sm:flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={zoomOut}
                  disabled={zoomLevel <= 25}
                  className="h-8 w-8 p-0"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Badge variant="outline" className="text-xs font-mono">
                  {zoomLevel}%
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={zoomIn}
                  disabled={zoomLevel >= 400}
                  className="h-8 w-8 p-0"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetZoom}
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

              {/* Rotation Controls */}
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
                BugRacer | CODO AI Innovations
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

          {/* Enhanced Image Display */}
          <div className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-auto bg-gradient-to-br from-muted/20 via-background to-muted/20">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="relative bg-white rounded-xl shadow-2xl overflow-hidden border border-border/50"
                style={{
                  transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                  transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt={`Screenshot ${currentIndex + 1}`}
                  className={`max-w-none transition-opacity duration-300 ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    width: `${width}px`,
                    height: `${height}px`,
                    objectFit: "cover",
                  }}
                  onLoad={() => {
                    setImageLoaded(true);
                    setImageError(false);
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
            </AnimatePresence>
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

                  {/* Keyboard Shortcuts */}
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
