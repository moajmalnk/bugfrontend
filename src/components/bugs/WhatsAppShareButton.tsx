import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { whatsappService, WhatsAppMessageData } from "@/services/whatsappService";
import { MessageCircle, Copy, MessageSquareQuote } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WhatsAppShareButtonProps {
  data: WhatsAppMessageData;
  type: 'new_bug' | 'status_update' | 'update_details';
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
    } else if (type === 'status_update') {
      whatsappService.shareStatusUpdate(data);
    } else {
      whatsappService.shareUpdateDetails(data);
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
    if (type === 'new_bug') return 'Share Bug';
    if (type === 'status_update') return 'Share Status';
    return 'Share Update';
  };
  
  const getIcon = () => {
    if (type === 'update_details') {
      return <MessageSquareQuote className="h-4 w-4" />;
    }
    return <MessageCircle className="h-4 w-4" />;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className="gap-2 h-9 px-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 text-gray-700 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-300 transition-colors"
        >
          {getIcon()}
          {showLabel && getButtonText()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleShare} className="gap-2">
          {getIcon()}
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