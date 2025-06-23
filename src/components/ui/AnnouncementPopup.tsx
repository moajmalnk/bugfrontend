import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
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
          const seen = localStorage.getItem(`seen_announcement_${data.id}`);
          if (!seen) {
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

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        handleClose();
      }, 8000); // Auto-dismiss after 8 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleClose = () => {
    setIsVisible(false);
    if (announcement) {
      localStorage.setItem(`seen_announcement_${announcement.id}`, 'true');
    }
  };

  if (!isVisible || !announcement) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-full max-w-sm">
      <Card className="shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle>{announcement.title}</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert">
            <ReactMarkdown
              components={{
                  a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />,
              }}
            >
              {announcement.content}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnnouncementPopup; 