import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { googleDocsService } from "@/services/googleDocsService";

const DocsSetupError = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error') || 'An unknown error occurred';

  const handleGoHome = () => {
    const role = currentUser?.role || "admin";
    navigate(`/${role}/dashboard`);
  };

  const handleTryAgain = () => {
    const authUrl = googleDocsService.getAuthUrl();
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-50/50 via-orange-50/30 to-yellow-50/50 dark:from-red-950/20 dark:via-orange-950/10 dark:to-yellow-950/20" />
        
        <CardHeader className="relative text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg mb-4">
            <AlertCircle className="h-8 w-8 text-white" />
          </div>
          
          <CardTitle className="text-2xl font-bold">
            Setup Failed
          </CardTitle>
        </CardHeader>
        
        <CardContent className="relative space-y-4">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">
              We couldn't connect your Google account to BugRicer.
            </p>
            
            <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
            
            <p className="text-sm text-muted-foreground">
              This could be because you denied access or there was a problem with the OAuth flow. You can try again or return to the dashboard.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              onClick={handleTryAgain}
              variant="default"
              className="flex-1"
              size="lg"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocsSetupError;

