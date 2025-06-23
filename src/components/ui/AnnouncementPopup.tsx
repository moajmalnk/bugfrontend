import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bug, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { announcementService, Announcement } from '@/services/announcementService';

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
          const broadcastDate = data.last_broadcast_at ? new Date(data.last_broadcast_at) : null;

          if (!lastSeenDate || (broadcastDate && lastSeenDate < broadcastDate)) {
            setAnnouncement(data);
            setIsVisible(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch announcement:', error);
      }
    };

    fetchAnnouncement();
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    if (announcement) {
      localStorage.setItem(`seen_announcement_${announcement.id}`, new Date().toISOString());
    }
  };

  if (!isVisible || !announcement) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in-0"
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
    >
      <Card
        className="relative w-[98vw] max-w-md sm:max-w-lg md:max-w-xl rounded-2xl shadow-2xl border-0 p-0
          animate-[pop_0.3s_ease] bg-background"
        style={{ animation: 'pop 0.3s cubic-bezier(.4,2,.6,1)' }}
      >
        {/* Close Button */}
        <button
          aria-label="Close announcement"
          onClick={handleClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-primary transition-colors rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <X className="h-5 w-5" />
        </button>
        <CardHeader className="text-center pb-2 pt-8 sm:pt-10">
          <div className="flex items-center justify-center mb-3">
            <Bug className="h-8 w-8 text-primary mr-2" />
            <h2 className="text-2xl font-bold tracking-tight">BugRacer</h2>
          </div>
          <CardTitle className="text-xl sm:text-2xl">{announcement.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-center mx-auto sm:text-base text-sm
              max-h-[40vh] sm:max-h-[50vh] overflow-y-auto px-2 custom-scrollbar"
            style={{ wordBreak: 'break-word' }}
          >
            <ReactMarkdown
              components={{
                a: ({ node, ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />
                ),
              }}
            >
              {announcement.content}
            </ReactMarkdown>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center pb-8 pt-2">
          <Button onClick={handleClose} className="w-full sm:w-auto text-base font-semibold">
            Continue
          </Button>
        </CardFooter>
      </Card>
      <style>{`
        @keyframes pop {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AnnouncementPopup;