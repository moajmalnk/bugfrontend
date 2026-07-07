import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Archive,
  ArrowLeft,
  Code2,
  Database,
  FileText,
  Loader2,
  Mail,
  Shield,
} from "lucide-react";

const BACKUP_INCLUDES = [
  "Complete database SQL dump (all tables and data)",
  "All uploaded files and attachments",
  "Configuration files (if applicable)",
  "Restoration instructions for backend developers",
] as const;

const RESTORE_STEPS = [
  {
    title: "Database",
    description: "Import the SQL file to restore all tables and data",
  },
  {
    title: "Files",
    description: "Extract the uploads folder to restore all user-uploaded content",
  },
  {
    title: "Instructions",
    description: "A README file is included with step-by-step restoration guide",
  },
] as const;

const BugBackup = () => {
  const { currentUser } = useAuth();
  const { hasPermission, isLoading } = usePermissions(null);
  const navigate = useNavigate();
  const [email, setEmail] = useState(currentUser?.email || "");
  const [isBackingUp, setIsBackingUp] = useState(false);

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-[520px] w-full rounded-2xl" />
        </section>
      </main>
    );
  }

  if (!hasPermission("SETTINGS_EDIT")) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w-7xl mx-auto">
          <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              You do not have permission to access the backup page.
            </p>
          </div>
        </section>
      </main>
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

      setIsBackingUp(false);

      toast({
        title: "Backup Started",
        description:
          "Your backup is being created and will be sent to your email shortly. This may take a few minutes.",
      });
    } catch (error: unknown) {
      console.error("Backup error:", error);
      setIsBackingUp(false);
      toast({
        title: "Backup Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create backup. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(-1)}
                    className="shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg shrink-0">
                    <Database className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      BugBackup
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Create a complete backup of your BugRicer platform and receive it via email
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex h-12 min-w-[12rem] items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                    <Archive className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-blue-800/80 dark:text-blue-200/80">
                      Format
                    </div>
                    <div className="text-sm font-bold text-blue-700 dark:text-blue-300">
                      ZIP Export
                    </div>
                  </div>
                </div>

                <div className="flex h-12 min-w-[12rem] items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-emerald-600 rounded-lg shrink-0">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-emerald-800/80 dark:text-emerald-200/80">
                      Delivery
                    </div>
                    <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      Email
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Backup Form */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl pointer-events-none" />
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 sm:p-8 space-y-6 sm:space-y-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shrink-0">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Get Backup
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base mt-1 max-w-3xl">
                      Enter your email address to receive a complete backup of the BugRicer platform.
                      The backup includes database dump and uploaded files, ready for restoration.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-900/80 p-4 sm:p-5 space-y-3">
                <Label
                  htmlFor="email"
                  className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2"
                >
                  <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-base border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  disabled={isBackingUp}
                />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The backup will be sent to this email address as a ZIP file attachment.
                </p>
              </div>

              <div className="rounded-2xl border border-blue-200/70 dark:border-blue-800/70 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 p-4 sm:p-5 space-y-3">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                    <Database className="h-4 w-4 text-white" />
                  </div>
                  What&apos;s Included in the Backup
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                  {BACKUP_INCLUDES.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-3 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                <Button
                  onClick={handleBackup}
                  disabled={isBackingUp || !email}
                  className="h-12 px-8 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
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
                  <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                    This process may take several minutes. Please do not close this page.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Developer Info */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-emerald-50/30 dark:from-gray-800/30 dark:to-emerald-900/30 rounded-2xl pointer-events-none" />
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shrink-0">
                  <Code2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    For Backend Developers
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base mt-1">
                    The backup file contains everything needed to restore the BugRicer platform
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {RESTORE_STEPS.map((step) => (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-900/80 p-4 sm:p-5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {step.title}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-emerald-200/70 dark:border-emerald-800/70 bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
                <Shield className="h-4 w-4 shrink-0" />
                <span>Store backups securely and only share with authorized team members.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default BugBackup;
