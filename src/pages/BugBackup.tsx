import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Database, ArrowLeft, Loader2, Mail } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const BugBackup = () => {
  const { currentUser } = useAuth();
  const { hasPermission, isLoading } = usePermissions(null);
  const navigate = useNavigate();
  const [email, setEmail] = useState(currentUser?.email || "");
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [searchParams] = useSearchParams();

  // Check for SETTINGS_EDIT permission (same as Settings page)
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <div className="text-center space-y-4 sm:space-y-6">
          <div className="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-muted">
            <Database className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
            Loading...
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg max-w-md">
            Verifying your access permissions...
          </p>
        </div>
      </div>
    );
  }

  if (!hasPermission("SETTINGS_EDIT")) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <div className="text-center space-y-4 sm:space-y-6">
          <div className="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-muted">
            <Database className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
            Access Denied
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg max-w-md">
            You do not have permission to access the backup page.
          </p>
        </div>
      </div>
    );
  }

  const handleBackup = async () => {
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsBackingUp(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost/BugRicer/backend/api"}/backup/create.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to create backup" }));
        throw new Error(errorData.message || "Failed to create backup");
      }

      const data = await response.json();

      // Reset button state immediately after successful response
      setIsBackingUp(false);

      toast({
        title: "Backup Started",
        description:
          "Your backup is being created and will be sent to your email shortly. This may take a few minutes.",
      });
    } catch (error: any) {
      console.error("Backup error:", error);
      setIsBackingUp(false);
      toast({
        title: "Backup Failed",
        description: error.message || "Failed to create backup. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-green-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-green-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="hover:bg-accent"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg">
                  <Database className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                    BugBackup
                  </h1>
                  <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2"></div>
                </div>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
              Create a complete backup of your BugRicer platform and receive it via email
            </p>
          </div>
        </div>

        {/* Backup Card */}
        <Card className="shadow-lg hover:shadow-xl transition-all duration-200">
          <CardHeader className="p-6 sm:p-8">
            <CardTitle className="text-2xl sm:text-3xl flex items-center gap-3">
              <Mail className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              Get Backup
            </CardTitle>
            <CardDescription className="text-base sm:text-lg">
              Enter your email address to receive a complete backup of the BugRicer platform.
              The backup includes database dump and uploaded files, ready for restoration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6 sm:p-8 pt-0">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-base"
                  disabled={isBackingUp}
                />
                <p className="text-sm text-muted-foreground">
                  The backup will be sent to this email address as a ZIP file attachment.
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  What's Included in the Backup:
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                  <li>Complete database SQL dump (all tables and data)</li>
                  <li>All uploaded files and attachments</li>
                  <li>Configuration files (if applicable)</li>
                  <li>Restoration instructions for backend developers</li>
                </ul>
              </div>

              <Button
                onClick={handleBackup}
                disabled={isBackingUp || !email}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white"
                size="lg"
              >
                {isBackingUp ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-5 w-5" />
                    Backup
                  </>
                )}
              </Button>

              {isBackingUp && (
                <div className="text-center text-sm text-muted-foreground">
                  <p>This process may take several minutes. Please do not close this page.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="p-6 sm:p-8">
            <h3 className="font-semibold text-lg mb-3">For Backend Developers</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The backup file you receive contains everything needed to restore the BugRicer platform:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>
                <strong>Database:</strong> Import the SQL file to restore all tables and data
              </li>
              <li>
                <strong>Files:</strong> Extract the uploads folder to restore all user-uploaded content
              </li>
              <li>
                <strong>Instructions:</strong> A README file is included with step-by-step restoration guide
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default BugBackup;

