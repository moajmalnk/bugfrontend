import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  project_name?: string;
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
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [showZoomSlider, setShowZoomSlider] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageDisplayAreaRef = useRef<HTMLDivElement>(null);

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
      setImageDimensions(null);
    }
  }, [open, initialIndex]);

  // Update container dimensions on resize and when dialog opens
  useEffect(() => {
    if (!open) return;

    const updateContainerDimensions = () => {
      if (imageDisplayAreaRef.current) {
        const rect = imageDisplayAreaRef.current.getBoundingClientRect();
        setContainerDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    // Initial update
    updateContainerDimensions();

    // Update on window resize
    window.addEventListener('resize', updateContainerDimensions);
    
    // Update when image loads
    const timeoutId = setTimeout(updateContainerDimensions, 100);

    return () => {
      window.removeEventListener('resize', updateContainerDimensions);
      clearTimeout(timeoutId);
    };
  }, [open, imageLoaded, showInfo]);


  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);


  const currentScreenshot = screenshots[currentIndex];
  const imageUrl = `${import.meta.env.VITE_API_URL}/image.php?path=${encodeURIComponent(currentScreenshot.file_path)}`;

  // Reset image dimensions when screenshot changes
  useEffect(() => {
    setImageDimensions(null);
    setImageLoaded(false);
    setImageError(false);
    setImagePosition({ x: 0, y: 0 });
  }, [currentIndex]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : screenshots.length - 1));
  }, [screenshots.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < screenshots.length - 1 ? prev + 1 : 0));
  }, [screenshots.length]);

  // Enhanced zoom functions with smooth transitions
  const zoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 25, 500));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 25, 25));
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel(100);
    setImagePosition({ x: 0, y: 0 });
  }, []);

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

  // Mouse wheel zoom with native event listener
  useEffect(() => {
    if (!open) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY < 0) {
        setZoomLevel((prev) => Math.min(prev + 25, 500));
      } else {
        setZoomLevel((prev) => Math.max(prev - 25, 25));
      }
    };

    // Add native wheel event listener with passive: false
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [open]);

  // Additional wheel event listener for image display area
  useEffect(() => {
    if (!open) return;

    const handleImageAreaWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY < 0) {
        setZoomLevel((prev) => Math.min(prev + 25, 500));
      } else {
        setZoomLevel((prev) => Math.max(prev - 25, 25));
      }
    };

    const imageArea = imageContainerRef.current;
    if (imageArea) {
      imageArea.addEventListener('wheel', handleImageAreaWheel, { passive: false });
      return () => {
        imageArea.removeEventListener('wheel', handleImageAreaWheel);
      };
    }
  }, [open]);

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

  const handleDoubleClick = useCallback(() => {
    resetZoom();
  }, [resetZoom]);

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
      // Single touch for navigation and double-tap
      const currentTime = Date.now();
      const tapLength = currentTime - lastTapTime;
      
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setTouchStartTime(currentTime);
      
      // Check for double tap (within 300ms)
      if (tapLength < 300 && tapLength > 0) {
        // Double tap - reset zoom
        resetZoom();
        setLastTapTime(0); // Reset to prevent triple tap
      } else {
        setLastTapTime(currentTime);
      }
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
    } else if (e.touches.length === 1 && touchStart && zoomLevel > 100) {
      // Handle single finger pan
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;
      
      setImagePosition({ x: deltaX, y: deltaY });
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

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  }, []);

  const downloadScreenshot = useCallback(() => {
    try {
      // Use the proper API endpoint for downloading
      const downloadUrl = `${import.meta.env.VITE_API_URL}/get_attachment.php?path=${encodeURIComponent(currentScreenshot.file_path)}&name=${encodeURIComponent(currentScreenshot.file_name)}${bug_id ? `&bug_id=${encodeURIComponent(bug_id)}` : ''}`;
      
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = currentScreenshot.file_name;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Error",
        description: "Failed to download screenshot. Please try again.",
        variant: "destructive",
      });
    }
  }, [currentScreenshot, bug_id]);

  const copyScreenshot = useCallback(async () => {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      toast({
        title: "Copied",
        description: "Screenshot copied to clipboard",
      });
    } catch (error) {
      console.error("Failed to copy screenshot:", error);
      toast({
        title: "Copy Error",
        description: "Failed to copy screenshot to clipboard",
        variant: "destructive",
      });
    }
  }, [imageUrl]);

  const shareScreenshot = useCallback(async () => {
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
      toast({
        title: "Share Error",
        description: "Failed to share screenshot",
        variant: "destructive",
      });
    }
  }, [imageUrl, currentScreenshot.file_name, copyScreenshot]);

  const printScreenshot = useCallback(() => {
    try {
      const printWindow = window.open(imageUrl, "_blank");
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
        printWindow.onerror = () => {
          toast({
            title: "Print Error",
            description: "Failed to open print dialog",
            variant: "destructive",
          });
        };
      } else {
        toast({
          title: "Print Error",
          description: "Failed to open print window. Please check popup blockers.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Print error:", error);
      toast({
        title: "Print Error",
        description: "Failed to print screenshot",
        variant: "destructive",
      });
    }
  }, [imageUrl]);

  const deleteScreenshot = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(async () => {
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
  }, [currentScreenshot, bug_id, screenshots, currentIndex, onScreenshotDelete, onOpenChange]);

  const handleClose = useCallback(() => {
    setCurrentIndex(initialIndex);
    setZoomLevel(100);
    setRotation(0);
    setIsFullscreen(false);
    setShowInfo(false);
    setImagePosition({ x: 0, y: 0 });
    setShowZoomSlider(false);
    setShowDeleteDialog(false);
    onOpenChange(false);
  }, [initialIndex, onOpenChange]);

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
  }, [open, showInfo, showZoomSlider, goToPrevious, goToNext, zoomIn, zoomOut, resetZoom, rotateRight, rotateLeft, toggleFullscreen, handleClose]);


  // Helper function to calculate image container size based on aspect ratio
  const calculateImageContainerSize = useCallback(() => {
    if (!imageDimensions || !containerDimensions.width || !containerDimensions.height) {
      return { width: '100%', height: '100%' };
    }

    const containerAspect = containerDimensions.width / containerDimensions.height;
    const imageAspect = imageDimensions.width / imageDimensions.height;

    // Calculate size to fit within container while maintaining aspect ratio
    let width: number | string;
    let height: number | string;

    if (imageAspect > containerAspect) {
      // Image is wider - fit to width
      width = containerDimensions.width;
      height = containerDimensions.width / imageAspect;
    } else {
      // Image is taller - fit to height
      height = containerDimensions.height;
      width = containerDimensions.height * imageAspect;
    }

    return { width, height };
  }, [imageDimensions, containerDimensions]);

  // Helper function to constrain image position within container bounds
  const constrainImagePosition = useCallback((x: number, y: number) => {
    if (zoomLevel <= 100) return { x: 0, y: 0 };
    
    if (!imageDimensions || !containerDimensions.width || !containerDimensions.height) {
      return { x: 0, y: 0 };
    }

    const containerSize = calculateImageContainerSize();
    const containerWidth = typeof containerSize.width === 'number' ? containerSize.width : containerDimensions.width;
    const containerHeight = typeof containerSize.height === 'number' ? containerSize.height : containerDimensions.height;
    
    // Calculate maximum allowed positions to keep image within bounds
    const scaledWidth = containerWidth * (zoomLevel / 100);
    const scaledHeight = containerHeight * (zoomLevel / 100);
    
    const maxX = Math.max(0, (scaledWidth - containerDimensions.width) / 2);
    const maxY = Math.max(0, (scaledHeight - containerDimensions.height) / 2);
    const minX = -maxX;
    const minY = -maxY;
    
    // Constrain the position
    const constrainedX = Math.max(minX, Math.min(maxX, x));
    const constrainedY = Math.max(minY, Math.min(maxY, y));
    
    return { x: constrainedX, y: constrainedY };
  }, [zoomLevel, imageDimensions, containerDimensions, calculateImageContainerSize]);

  // Constrain image position when zoom or rotation changes to prevent overflow
  useEffect(() => {
    if (open && zoomLevel > 100) {
      const constrainedPosition = constrainImagePosition(imagePosition.x, imagePosition.y);
      if (constrainedPosition.x !== imagePosition.x || constrainedPosition.y !== imagePosition.y) {
        setImagePosition(constrainedPosition);
      }
    } else if (zoomLevel <= 100) {
      // Reset position when zoom is reset
      setImagePosition({ x: 0, y: 0 });
    }
  }, [zoomLevel, rotation, open, constrainImagePosition, imagePosition]);

  return (
    <Dialog open={open} onOpenChange={handleClose} >
      <DialogTitle className="sr-only">Screenshot Viewer</DialogTitle>
      <DialogDescription className="sr-only">
        Interactive screenshot viewer with zoom, pan, and navigation controls
      </DialogDescription>
      <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-w-[95vw] max-h-[95vh] h-[95vh] sm:h-[90vh] md:h-[85vh] p-0 bg-background/95 backdrop-blur-md border-0 shadow-2xl">
        <div 
          ref={containerRef}
          className="flex flex-col h-full relative overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Enhanced Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 md:p-4 border-b bg-gradient-to-r from-background via-muted/20 to-background backdrop-blur-sm shrink-0"
          >
            {/* Left Section - Title and Info */}
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <FileImage className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">
                  Screenshot Preview
                </h2>
              </div>
              <Badge variant="secondary" className="text-[10px] sm:text-xs flex-shrink-0">
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
              {/* Enhanced Zoom Controls - Desktop */}
              <div className="hidden md:flex items-center gap-1">
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
                <Badge
                  variant="outline"
                  className={`text-xs font-mono cursor-pointer hover:bg-primary/10 ${
                    zoomLevel > 100 
                      ? "bg-primary/20 border-primary/50 text-primary font-bold" 
                      : "bg-background"
                  }`}
                  onClick={() => setShowZoomSlider(!showZoomSlider)}
                  title="Click to show zoom slider (Z)"
                >
                  {zoomLevel}%
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={zoomIn}
                  disabled={zoomLevel >= 500}
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

              {/* Mobile Zoom Controls */}
              <div className="flex md:hidden items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={zoomOut}
                  disabled={zoomLevel <= 25}
                  className="h-7 w-7 p-0"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <Badge
                  variant="outline"
                  className={`text-xs font-mono px-1.5 py-0.5 ${
                    zoomLevel > 100 
                      ? "bg-primary/20 border-primary/50 text-primary font-bold" 
                      : ""
                  }`}
                >
                  {zoomLevel}%
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={zoomIn}
                  disabled={zoomLevel >= 500}
                  className="h-7 w-7 p-0"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Separator
                orientation="vertical"
                className="h-6 hidden md:block"
              />

              {/* Enhanced Rotation Controls - Desktop */}
              <div className="hidden md:flex items-center gap-1">
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
                className="h-6 hidden md:block"
              />

              {/* Action Buttons */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                {/* Desktop-only buttons */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyScreenshot}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 hidden sm:flex"
                  title="Copy"
                >
                  <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={printScreenshot}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 hidden md:flex"
                  title="Print"
                >
                  <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                
                {/* Always visible buttons */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={downloadScreenshot}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={shareScreenshot}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                  title="Share"
                >
                  <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInfo(!showInfo)}
                  className={`h-7 w-7 sm:h-8 sm:w-8 p-0 ${
                    showInfo ? "bg-primary/10 text-primary" : ""
                  }`}
                  title="Info"
                >
                  <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 hidden sm:flex"
                  title="Fullscreen"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deleteScreenshot}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                  title="Close"
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Device Info Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-muted/10 via-muted/20 to-muted/10 border-b text-[10px] sm:text-xs md:text-sm shrink-0"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-0 flex-wrap">
              <Smartphone className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-primary flex-shrink-0" />
              <span className="font-medium truncate max-w-[120px] sm:max-w-none">
                BugRicer{currentScreenshot.project_name ? ` | ${currentScreenshot.project_name}` : ''}
              </span>
              <Separator orientation="vertical" className="h-3 hidden sm:block" />
              <span className="font-mono hidden sm:inline">
                Container
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
            <div className="sm:hidden text-muted-foreground text-[10px] mb-1.5">
              Swipe • Pinch • Double tap
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
          ref={imageDisplayAreaRef}
          className="flex-1 flex items-center justify-center bg-gradient-to-br from-muted/20 via-background to-muted/20 relative overflow-hidden"
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
            minHeight: 0,
          }}
        >
            <div
              key={`${currentIndex}`}
              ref={imageContainerRef}
              className="relative bg-white rounded-xl shadow-2xl transition-all duration-300 border border-border/50"
              title={`Zoom: ${zoomLevel}% | Rot: ${rotation}°`}
              onDoubleClick={handleDoubleClick}
              style={{
                ...calculateImageContainerSize(),
                maxWidth: '100%',
                maxHeight: '100%',
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
                zIndex: 10,
                opacity: imageLoaded ? 1 : 0,
                backgroundColor: "rgb(255, 255, 255)",
              }}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt={`Screenshot ${currentIndex + 1}`}
                className="transition-opacity duration-300 opacity-100 w-full h-full"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  pointerEvents: "none",
                  display: "block",
                }}
                onLoad={() => {
                  if (imageRef.current) {
                    const naturalWidth = imageRef.current.naturalWidth;
                    const naturalHeight = imageRef.current.naturalHeight;
                    setImageDimensions({ width: naturalWidth, height: naturalHeight });
                    setImageLoaded(true);
                    setImageError(false);
                    
                    // Update container dimensions after image loads
                    setTimeout(() => {
                      if (imageDisplayAreaRef.current) {
                        const rect = imageDisplayAreaRef.current.getBoundingClientRect();
                        setContainerDimensions({
                          width: rect.width,
                          height: rect.height,
                        });
                      }
                    }, 50);
                  }
                }}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(false);
                  setImageDimensions(null);
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
            </div>

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

            {/* Debug Transform Info - Desktop Only */}
            <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 text-xs font-mono hidden lg:block">
              <div className="flex flex-col gap-1 text-foreground">
                <div className="flex items-center gap-2">
                  <Search className="h-3 w-3 text-primary" />
                  <span className={`font-bold ${zoomLevel > 100 ? "text-primary" : "text-muted-foreground"}`}>
                    ZOOM: {zoomLevel}% (×{zoomLevel / 100})
                  </span>
                  <span className="text-muted-foreground">|</span>
                  <span className={`font-bold ${rotation !== 0 ? "text-blue-600" : "text-muted-foreground"}`}>
                    ROT: {rotation}°
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Transform: scale({zoomLevel / 100}) rotate({rotation}deg) translate({imagePosition.x}px, {imagePosition.y}px)
                </div>
              </div>
            </div>

            {/* Zoom and Rotation Hints */}
            {zoomLevel > 100 && (
              <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-auto bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Search className="h-3 w-3 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs">
                    <span className="hidden sm:inline">Drag to pan • Scroll to zoom • Double-click to reset • R/L to rotate</span>
                    <span className="sm:hidden">Drag to pan • Pinch to zoom • Double-tap to reset</span>
                  </span>
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
                        Full container (responsive)
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
                        <span>Double tap/click: Reset zoom</span>
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
