import EditBugForm from "@/components/bugs/EditBugDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { ENV } from "@/lib/env";
import { Bug } from "@/types";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  AlertCircle,
  ArrowLeft,
  Bug as BugIcon,
  Edit2,
  File,
  FolderOpen,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const EditBug = () => {
  const navigate = useNavigate();
  const { bugId } = useParams<{ bugId: string }>();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const fromProject = searchParams.get("from") === "project";

  const role = currentUser?.role || "user";

  const backUrl = fromProject
    ? `/${role}/bugs/${bugId}?from=project`
    : `/${role}/bugs/${bugId}`;

  const {
    data: bug,
    isLoading,
    error,
  } = useQuery<Bug>({
    queryKey: ["bug", bugId],
    queryFn: async () => {
      if (!bugId) throw new Error("Bug ID is missing");
      const token = localStorage.getItem("token");
      const response = await axios.get<ApiResponse<Bug>>(
        `${ENV.API_URL}/bugs/get.php?id=${bugId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.data.success) return response.data.data;
      throw new Error(response.data.message || "Failed to fetch bug details");
    },
    enabled: !!bugId,
    staleTime: 1000 * 5,
  });

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w mx-auto space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-[600px] w-full rounded-2xl" />
        </section>
      </main>
    );
  }

  if (error || !bug) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w mx-auto">
          <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 p-12 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Could not load bug</h3>
            <p className="text-muted-foreground mb-6">
              {error instanceof Error ? error.message : "Bug not found"}
            </p>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w mx-auto space-y-6 sm:space-y-8">
        {/* Header — matches Report Bug page */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-blue-50/50 via-transparent to-indigo-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-indigo-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    className="flex items-center text-muted-foreground hover:text-foreground p-2"
                    onClick={() => navigate(backUrl)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <Edit2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Edit Bug
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Update details for{" "}
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {bug.title}
                  </span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  {bug.project_name && (
                    <div className="flex h-12 min-w-[12rem] items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                      <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                        <FolderOpen className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-300 truncate">
                        {bug.project_name}
                      </span>
                    </div>
                  )}
                  <div className="flex h-12 min-w-[12rem] items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-50 to-slate-100 dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-gray-500 dark:bg-gray-600 rounded-lg shrink-0">
                      <BugIcon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-mono font-bold text-gray-700 dark:text-gray-300 truncate">
                      {bug.id.slice(0, 8)}…
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form card — matches Report Bug page */}
        <div className="relative">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl" />
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="p-6 sm:p-8 pb-2">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shrink-0">
                    <File className="h-5 w-5 text-white" />
                  </div>
                  Bug Report Form
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 text-base mt-2">
                  Update bug information, status, priority, and attachments
                </CardDescription>
              </CardHeader>
              <EditBugForm
                bug={bug}
                onCancel={() => navigate(backUrl)}
                onSuccess={() => navigate(backUrl)}
              />
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
};

export default EditBug;
