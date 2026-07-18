import { CodoCompliancePanel } from '@/components/compliance/CodoCompliancePanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { complianceService } from '@/services/complianceService';
import { projectService } from '@/services/projectService';
import { getProjectStatusLabel, type ProjectStatus } from '@/lib/utils/projectUtils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FolderOpen, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { getReturnPathFromState } from '@/hooks/useUrlPagination';

const ProjectCompliance = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'admin';
  const queryClient = useQueryClient();
  const projectsListPath = getReturnPathFromState(
    location.state,
    `/${role}/projects`
  );

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId!),
    enabled: !!projectId,
  });

  const { data: compliance, isLoading: complianceLoading } = useQuery({
    queryKey: ['project-compliance', projectId],
    queryFn: () => complianceService.getCompliance(projectId!),
    enabled: !!projectId,
  });

  const handleStatusFinalized = (status: ProjectStatus) => {
    queryClient.setQueryData(['project', projectId], (prev: typeof project) =>
      prev ? { ...prev, status } : prev
    );
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-compliance', projectId] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const progressPercent = compliance
    ? Math.round(
        ((compliance.developer_progress.verified +
          compliance.tester_progress.verified +
          (compliance.project_progress?.verified ?? 0)) /
          (compliance.developer_progress.total +
            compliance.tester_progress.total +
            (compliance.project_progress?.total ?? 0))) *
          100
      )
    : 0;

  const displayStatus: ProjectStatus =
    compliance?.project?.status ?? project?.status ?? 'active';

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-[520px] w-full rounded-2xl" />
        </section>
      </main>
    );
  }

  if (!project || !projectId) {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-muted-foreground">Project not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
              <div className="space-y-3 min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg shrink-0">
                    <ShieldCheck className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Compliance
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl break-words">
                  {project.name} — verification pipeline
                </p>
              </div>

              <div className="flex w-full xl:w-auto flex-wrap gap-3 shrink-0">
                <div className="flex h-12 min-w-0 flex-1 sm:flex-none items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                    <FolderOpen className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300 truncate">
                    {project.name}
                  </span>
                </div>

                <div className="flex h-12 items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200 dark:border-violet-800 rounded-xl shadow-sm shrink-0">
                  <Badge variant="secondary" className="text-xs font-semibold uppercase tracking-wide">
                    {getProjectStatusLabel(displayStatus)}
                  </Badge>
                </div>

                {!complianceLoading && compliance && (
                  <div className="flex h-12 items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm shrink-0">
                    <div className="p-1.5 bg-emerald-600 rounded-lg shrink-0">
                      <ShieldCheck className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-emerald-800/80 dark:text-emerald-200/80">
                        Overall
                      </div>
                      <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 leading-none">
                        {progressPercent}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!complianceLoading && compliance && (
              <div className="mt-6 space-y-2 w-full">
                <div className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
                  <span>Overall compliance progress</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-200/80 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <CodoCompliancePanel
          projectId={projectId}
          projectStatus={project.status}
          projectsListPath={projectsListPath}
          onStatusFinalized={handleStatusFinalized}
        />
      </section>
    </main>
  );
};

export default ProjectCompliance;
