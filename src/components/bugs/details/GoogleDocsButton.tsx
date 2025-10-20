import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { googleDocsService } from "@/services/googleDocsService";
import { FileText, ExternalLink, Link as LinkIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface GoogleDocsButtonProps {
  bugId: string;
}

export const GoogleDocsButton = ({ bugId }: GoogleDocsButtonProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Check connection status on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setIsLoading(true);
    try {
      const connected = await googleDocsService.checkConnection();
      setIsConnected(connected);
    } catch (error) {
      console.error('Failed to check connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGoogleDocs = () => {
    // Store current bug ID in session storage so we can return to it
    sessionStorage.setItem('bugdocs_return_bug_id', bugId);
    
    // Get JWT token to pass as state parameter
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    // Navigate to Google OAuth with JWT token as state
    const authUrl = googleDocsService.getAuthUrl(token);
    window.location.href = authUrl;
  };

  const handleCreateBugDoc = async () => {
    setIsCreating(true);
    try {
      const result = await googleDocsService.createBugDocument(bugId);
      
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
      <div className="space-y-3">
        <Button
          variant="outline"
          size="lg"
          onClick={handleConnectGoogleDocs}
          disabled={isLoading}
          className="
            w-full h-12 px-6 py-3 rounded-xl font-semibold text-sm
            bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900
            hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-700 dark:hover:to-slate-800
            text-slate-700 dark:text-slate-300 border-2 border-slate-300 dark:border-slate-600
            shadow-lg hover:shadow-xl
            transition-all duration-300 ease-in-out
            transform hover:scale-[1.02] active:scale-[0.98]
            disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
            disabled:shadow-md
            relative overflow-hidden
          "
        >
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200/20 dark:via-slate-600/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          
          <div className="relative flex items-center justify-center space-x-3">
            {isLoading ? (
              <>
                <div className="relative">
                  <LinkIcon className="h-5 w-5 animate-pulse" />
                  <div className="absolute inset-0 h-5 w-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                </div>
                <span className="font-semibold tracking-wide">Connecting...</span>
              </>
            ) : (
              <>
                <div className="relative group/icon">
                  <LinkIcon className="h-5 w-5 transition-all duration-200 group-hover/icon:scale-110 group-hover/icon:rotate-12" />
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-orange-400 rounded-full border-2 border-white animate-pulse shadow-sm"></div>
                </div>
                <span className="font-semibold tracking-wide">Connect Google Docs</span>
                <ExternalLink className="h-4 w-4 transition-all duration-200 hover:translate-x-0.5 hover:-translate-y-0.5 hover:scale-110" />
              </>
            )}
          </div>
        </Button>
        
        {/* Professional status indicator */}
        <div className="flex items-center justify-center space-x-2 text-xs">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <div className="h-2 w-2 bg-orange-500 rounded-full shadow-sm"></div>
            <span className="text-orange-700 dark:text-orange-400 font-medium">Connect to create BugDocs</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
      
      {/* Professional status indicator */}
      <div className="flex items-center justify-center space-x-2 text-xs">
        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
          <span className="text-green-700 dark:text-green-400 font-medium">Google Docs Connected</span>
        </div>
      </div>
    </div>
  );
};

