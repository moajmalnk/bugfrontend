import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { whatsappService, WhatsAppMessageData } from "@/services/whatsappService";
import { MessageCircle, Copy } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WhatsAppShareButtonProps {
  data: WhatsAppMessageData;
  type: 'new_bug' | 'status_update';
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export function WhatsAppShareButton({ 
  data, 
  type, 
  variant = 'outline', 
  size = 'sm',
  showLabel = true 
}: WhatsAppShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleShare = () => {
    if (type === 'new_bug') {
      whatsappService.shareNewBug(data);
    } else {
      whatsappService.shareStatusUpdate(data);
    }
    
    toast({
      title: "WhatsApp opened",
      description: "WhatsApp should open with a pre-filled message.",
    });
  };

  const handleCopyLink = async () => {
    try {
      const link = whatsappService.getShareableLink(data, type);
      await navigator.clipboard.writeText(link);
      
      toast({
        title: "Link copied",
        description: "WhatsApp share link copied to clipboard.",
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy the WhatsApp link.",
        variant: "destructive",
      });
    }
  };

  const getButtonText = () => {
    if (!showLabel) return '';
    return type === 'new_bug' ? 'Share Bug' : 'Share Update';
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <MessageCircle className="h-4 w-4" />
          {showLabel && getButtonText()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleShare} className="gap-2">
          <MessageCircle className="h-4 w-4" />
          Open WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink} className="gap-2">
          <Copy className="h-4 w-4" />
          Copy WhatsApp Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 