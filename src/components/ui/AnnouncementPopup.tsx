import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Announcement,
  announcementService,
} from "@/services/announcementService";
import { Bug, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const AnnouncementPopup: React.FC = () => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const data = await announcementService.getLatestActive();
        if (data) {
          const seenInfo = localStorage.getItem(`seen_announcement_${data.id}`);
          const lastSeenDate = seenInfo ? new Date(seenInfo) : null;
          const broadcastDate = data.last_broadcast_at
            ? new Date(data.last_broadcast_at)
            : null;

          if (
            !lastSeenDate ||
            (broadcastDate && lastSeenDate < broadcastDate)
          ) {
            setAnnouncement(data);
            setIsVisible(true);
          }
        }
      } catch (error) {
        //console.error('Failed to fetch announcement:', error);
      }
    };

    fetchAnnouncement();
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    if (announcement) {
      window.location.reload();
      localStorage.setItem(
        `seen_announcement_${announcement.id}`,
        new Date().toISOString()
      );
    }
  };

  if (!isVisible || !announcement) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
    >
      <Card
        className="relative w-[98vw] max-w-md sm:max-w-lg md:max-w-xl rounded-2xl border-0 p-0 shadow-2xl bg-background animate-popup-glow"
        style={{ animation: "popup-glow 0.5s cubic-bezier(.4,2,.6,1)" }}
      >
        {/* Gradient Accent Bar */}
        <div className="absolute top-0 left-0 w-full h-2 rounded-t-2xl bg-gradient-to-r from-primary to-blue-400 animate-gradient-move" />
        {/* Close Button */}
        <button
          aria-label="Close announcement"
          onClick={handleClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-primary transition-colors rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <X className="h-5 w-5" />
        </button>
        <CardHeader className="text-center pb-2 pt-10">
          <div className="flex items-center justify-center mb-3">
            <span className="inline-block animate-bounce-slow">
              <Bug className="h-8 w-8 text-primary drop-shadow-glow" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight ml-2">BugRicer</h2>
          </div>
          <CardTitle className="text-xl sm:text-2xl">
            {announcement.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-center mx-auto sm:text-base text-sm
              max-h-[40vh] sm:max-h-[50vh] overflow-y-auto px-2 custom-scrollbar"
            style={{ wordBreak: "break-word" }}
          >
            <ReactMarkdown
              components={{
                a: ({ node, ...props }) => (
                  <a
                    {...props}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  />
                ),
              }}
            >
              {announcement.content}
            </ReactMarkdown>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center pb-8 pt-2">
          <Button
            onClick={handleClose}
            className="w-full sm:w-auto text-base font-semibold transition-all duration-150 hover:scale-105 active:scale-95 shadow-lg"
          >
            Continue
          </Button>
        </CardFooter>
      </Card>
      <style>{`
        @keyframes popup-glow {
          0% { transform: scale(0.95); opacity: 0; box-shadow: 0 0 0 0 #3b82f6; }
          100% { transform: scale(1); opacity: 1; box-shadow: 0 8px 32px 0 #3b82f6aa; }
        }
        .drop-shadow-glow {
          filter: drop-shadow(0 0 8px #3b82f6cc);
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0);}
          50% { transform: translateY(-8px);}
        }
        .animate-bounce-slow {
          animation: bounce-slow 1.8s infinite;
        }
        @keyframes gradient-move {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        .animate-gradient-move {
          background-size: 200% 200%;
          animation: gradient-move 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AnnouncementPopup;
