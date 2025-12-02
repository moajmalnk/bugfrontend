import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { googleDocsService } from "@/services/googleDocsService";
import { FileText, ExternalLink, Link as LinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getEffectiveRole } from "@/lib/utils";

interface GoogleDocsButtonProps {
  bugId: string;
}

export const GoogleDocsButton = ({ bugId }: GoogleDocsButtonProps) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const userRole = currentUser ? getEffectiveRole(currentUser) : 'user';
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Check connection status on mount
  useEffect(() => {
    console.log('🔵 [GoogleDocsButton] Component mounted, bugId:', bugId);
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setIsLoading(true);
    try {
      const connected = await googleDocsService.checkConnection();
      setIsConnected(connected.connected || false);
    } catch (error) {
      // Silently handle connection check errors
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGoogleDocs = () => {
    try {
      // Store current bug ID in session storage so we can return to it
      sessionStorage.setItem('bugdocs_return_bug_id', bugId);
      
      // Get JWT token to pass as state parameter
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      // Navigate to Google OAuth with JWT token as state
      const authUrl = googleDocsService.getAuthUrl(token);
      window.location.href = authUrl;
    } catch (error) {
      // Silently handle connection errors
    }
  };

  const handleCreateBugDoc = async () => {
    const startTime = Date.now();
    console.group('🟢 [GoogleDocsButton] Create BugDoc Button Clicked');
    console.log('Bug ID:', bugId);
    console.log('Is Creating (before):', isCreating);
    console.log('Is Connected:', isConnected);
    
    if (isCreating) {
      console.warn('⚠️ [GoogleDocsButton] Already creating, ignoring click');
      console.groupEnd();
      return;
    }
    
    setIsCreating(true);
    
    try {
      const result = await googleDocsService.createBugDocument(bugId);
      const elapsed = Date.now() - startTime;
      
      toast({
        title: "Success!",
        description: `Document "${result.document_name}" created successfully.`,
      });

      // Open the document in a new tab
      googleDocsService.openDocument(result.document_url);
    } catch (error: any) {
      
      toast({
        title: "Error",
        description: error.message || "Failed to create document",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
      const totalElapsed = Date.now() - startTime;
      console.log('🏁 [GoogleDocsButton] Create handler completed, total time:', totalElapsed, 'ms');
      console.log('✅ [GoogleDocsButton] Set isCreating to false');
      console.groupEnd();
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className="w-full">
        <FileText className="mr-2 h-4 w-4" />
        Loading...
      </Button>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300"
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
        }}
      >
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-sm font-semibold text-red-700 dark:text-red-300">
          Not Connected
        </span>
        <Button
          variant="link"
          size="sm"
          onClick={() => navigate(`/${userRole}/profile`)}
          className="h-auto p-0 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline ml-1"
        >
          Connect
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Google Connection Status Indicator */}
      <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300"
        style={{
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderColor: 'rgba(34, 197, 94, 0.3)',
        }}
      >
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-sm font-semibold text-green-700 dark:text-green-300">
          Google Connected
        </span>
      </div>

      {/* Create BugDoc Button */}
      <Button
        variant="default"
        size="lg"
        onClick={handleCreateBugDoc}
        disabled={isCreating}
        className="
          w-full h-12 px-6 py-3 rounded-xl font-semibold text-sm
          bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 
          hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 
          text-white border-0 shadow-lg hover:shadow-xl
          transition-all duration-300 ease-in-out
          transform hover:scale-[1.02] active:scale-[0.98]
          disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
          disabled:shadow-md
          relative overflow-hidden
        "
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        
        <div className="relative flex items-center justify-center space-x-3">
          {isCreating ? (
            <>
              <div className="relative">
                <FileText className="h-5 w-5 animate-pulse" />
                <div className="absolute inset-0 h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
              <span className="font-semibold tracking-wide">Creating BugDoc...</span>
            </>
          ) : (
            <>
              <div className="relative group/icon">
                <FileText className="h-5 w-5 transition-all duration-200 group-hover/icon:scale-110 group-hover/icon:rotate-3" />
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-white animate-pulse shadow-sm"></div>
              </div>
              <span className="font-semibold tracking-wide">Create BugDoc</span>
              <ExternalLink className="h-4 w-4 transition-all duration-200 hover:translate-x-0.5 hover:-translate-y-0.5 hover:scale-110" />
            </>
          )}
        </div>
      </Button>
    </div>
  );
};

