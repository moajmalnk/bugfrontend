import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bug } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in-0">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Bug className="h-8 w-8 text-primary mr-2" />
            <h2 className="text-2xl font-bold">BugRacer</h2>
          </div>
          <CardTitle className="text-xl">{announcement.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none text-center mx-auto">
            <ReactMarkdown
              components={{
                  a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />,
              }}
            >
              {announcement.content}
            </ReactMarkdown>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={handleClose}>Continue</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AnnouncementPopup;