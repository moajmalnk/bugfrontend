import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { googleDocsService } from "@/services/googleDocsService";
import { CheckCircle2, FileText, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const DocsSetupSuccess = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isLinking, setIsLinking] = useState(true);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    // Check if account was already linked via URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const alreadyLinked = urlParams.get('linked') === 'true';
    const linkedEmail = urlParams.get('email');
    
    if (alreadyLinked && linkedEmail) {
      setLinkSuccess(true);
      setEmail(linkedEmail);
      setIsLinking(false);
      
      toast({
        title: "Success!",
        description: "Your Google account has been connected successfully.",
      });
    } else {
      // Automatically link the account when the page loads
      linkAccount();
    }
  }, []);

  const linkAccount = async () => {
    try {
      const result = await googleDocsService.linkAccount();
      
      if (result.success) {
        setLinkSuccess(true);
        setEmail(result.email || "");
        
        toast({
          title: "Success!",
          description: "Your Google account has been connected successfully.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to link Google account. Please try again.",
        variant: "destructive",
      });
      
      // If linking fails, redirect to home after a delay
      setTimeout(() => {
        handleGoHome();
      }, 3000);
    } finally {
      setIsLinking(false);
    }
  };

  const handleGoHome = () => {
    const role = currentUser?.role || "admin";
    
    // Check if we should return to a specific bug
    const returnBugId = sessionStorage.getItem('bugdocs_return_bug_id');
    
    if (returnBugId) {
      sessionStorage.removeItem('bugdocs_return_bug_id');
      navigate(`/${role}/bugs/${returnBugId}`);
    } else {
      navigate(`/${role}/dashboard`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-green-50/50 via-blue-50/30 to-purple-50/50 dark:from-green-950/20 dark:via-blue-950/10 dark:to-purple-950/20" />
        
        <CardHeader className="relative text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center shadow-lg mb-4">
            {isLinking ? (
              <FileText className="h-8 w-8 text-white animate-pulse" />
            ) : linkSuccess ? (
              <CheckCircle2 className="h-8 w-8 text-white" />
            ) : (
              <FileText className="h-8 w-8 text-white" />
            )}
          </div>
          
          <CardTitle className="text-2xl font-bold">
            {isLinking ? "Setting Up..." : "Google Docs Connected!"}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="relative space-y-4">
          {isLinking ? (
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                Linking your Google account to BugRicer...
              </p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </div>
          ) : linkSuccess ? (
            <>
              <div className="text-center space-y-3">
                <p className="text-muted-foreground">
                  Your Google account has been successfully connected to BugRicer!
                </p>
                
                {email && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium">Connected Account:</p>
                    <p className="text-sm text-muted-foreground">{email}</p>
                  </div>
                )}
                
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-left">
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        You can now create BugDocs!
                      </p>
                      <p className="text-blue-700 dark:text-blue-300 mt-1">
                        Go to any bug details page and click "Create BugDoc" to generate a Google Document for your bug reports.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button
                  onClick={handleGoHome}
                  className="flex-1"
                  size="lg"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">
                Something went wrong. Redirecting you back...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocsSetupSuccess;

