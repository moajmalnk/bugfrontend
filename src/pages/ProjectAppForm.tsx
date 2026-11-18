import { useMemo, useState } from 'react';
import { ProjectAppFormDetails } from '@/components/projects/ProjectAppFormDetails';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { getReturnPathFromState } from '@/hooks/useUrlPagination';
import { projectShowsAppForm } from '@/lib/utils/projectUtils';
import {
  appPublishingLinkService,
  buildAppPublishPublicUrl,
} from '@/services/appPublishingLinkService';
import { projectService } from '@/services/projectService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  Copy,
  Link2,
  Loader2,
  RefreshCw,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';

type LinkConfirmAction = 'new' | 'revoke' | null;

/**
 * Why: Staff hub to mint one-time public App Publishing links for clients.
 * Clients fill `/app-publish/:token` without login; submit expires the link.
 */
const ProjectAppForm = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'admin';
  const projectDetailsPath = projectId
    ? `/${role}/projects/${projectId}`
    : getReturnPathFromState(location.state, `/${role}/projects`);
  const [copied, setCopied] = useState(false);
  const [confirmAction, setConfirmAction] = useState<LinkConfirmAction>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId!),
    enabled: !!projectId,
  });

  const canManage = useMemo(() => {
    if (!currentUser || !project) return false;
    if (currentUser.role === 'admin' || currentUser.is_super_admin) return true;
    if (currentUser.role !== 'developer' && currentUser.role !== 'tester') return false;
    const uid = String(currentUser.id);
    return (project.members_detail || []).some((m) => String(m.user_id) === uid);
  }, [currentUser, project]);

  /** Why: Staff edit of collected form — admin / super admin / assigned developers. */
  const canEditDetails = useMemo(() => {
    if (!currentUser || !project) return false;
    if (currentUser.role === 'admin' || currentUser.is_super_admin) return true;
    if (currentUser.role !== 'developer') return false;
    const uid = String(currentUser.id);
    return (project.members_detail || []).some((m) => String(m.user_id) === uid);
  }, [currentUser, project]);

  const {
    data: linkState,
    isLoading: linkLoading,
    refetch: refetchLink,
  } = useQuery({
    queryKey: ['app-publishing-link', projectId],
    queryFn: () => appPublishingLinkService.getManageState(projectId!),
    enabled: !!projectId && canManage,
  });

  const createMutation = useMutation({
    mutationFn: () => appPublishingLinkService.createLink(projectId!, 14),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['app-publishing-link', projectId] });
      toast({
        title: 'Share link ready',
        description: 'Send this one-time link to your client. It closes after they submit.',
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Could not create link',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: () => appPublishingLinkService.revokeLink(projectId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['app-publishing-link', projectId] });
      toast({ title: 'Link revoked', description: 'The previous share link no longer works.' });
    },
    onError: (err: Error) => {
      toast({
        title: 'Could not revoke link',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const activeUrl = linkState?.active_link?.token
    ? buildAppPublishPublicUrl(linkState.active_link.token)
    : null;
  const projectWithForm =
    project && linkState?.app_publishing_form
      ? { ...project, app_publishing_form: linkState.app_publishing_form }
      : project;

  const copyLink = async () => {
    if (!activeUrl) return;
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      toast({ title: 'Link copied', description: 'Share it with your client privately.' });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Select the link and copy it manually.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-w-0 w-full space-y-6 sm:space-y-8">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!project || !projectId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        Project not found
      </div>
    );
  }

  if (!projectShowsAppForm(project)) {
    return <Navigate to={projectDetailsPath} replace />;
  }

  const busy = createMutation.isPending || revokeMutation.isPending;

  return (
    <div className="min-w-0 w-full space-y-6 sm:space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-6 sm:p-8">
        <div className="flex items-start gap-3 min-w-0">
          <Button asChild variant="ghost" size="icon" className="rounded-xl shrink-0">
            <Link to={projectDetailsPath}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-md">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">
                App publishing form
              </h1>
            </div>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              Share a one-time public link with the client for{' '}
              <span className="font-semibold text-foreground">{project.name}</span>
            </p>
          </div>
        </div>
      </div>

      {!canManage ? (
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
          Only admins or assigned developers/testers can create client share links.
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4 sm:gap-6">
          <section className="col-span-12 lg:col-span-7 rounded-2xl border border-border/60 bg-card p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Client share link</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                No login required. The client opens the link, fills the publishing details, and
                submits once. After submit the link expires. To collect updates, create a new
                link.
              </p>
            </div>

            {linkLoading ? (
              <Skeleton className="h-28 w-full rounded-xl" />
            ) : activeUrl && linkState?.active_link ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-violet-300/60 dark:border-violet-700/50 bg-violet-50/50 dark:bg-violet-950/20 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-violet-800 dark:text-violet-200">
                    <Link2 className="h-3.5 w-3.5" />
                    Active one-time link
                  </div>
                  <p className="text-xs sm:text-sm font-mono break-all text-foreground">
                    {activeUrl}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expires{' '}
                    {new Date(linkState.active_link.expires_at).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    className="rounded-xl bg-violet-600 hover:bg-violet-700"
                    disabled={busy}
                    onClick={() => void copyLink()}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {copied ? 'Copied' : 'Copy link'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    disabled={busy}
                    onClick={() => setConfirmAction('new')}
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    New link
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl text-destructive hover:text-destructive"
                    disabled={busy}
                    onClick={() => setConfirmAction('revoke')}
                  >
                    {revokeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Revoke
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-5 text-sm text-muted-foreground">
                  No active client link. Create one when you are ready to collect publishing
                  details.
                </div>
                <Button
                  type="button"
                  className="rounded-xl bg-violet-600 hover:bg-violet-700"
                  disabled={busy}
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Create share link
                </Button>
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl"
              onClick={() => void refetchLink()}
            >
              Refresh status
            </Button>
          </section>

          <section className="col-span-12 lg:col-span-5 rounded-2xl border border-border/60 bg-card p-5 sm:p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Link history</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Each project keeps its own collected App Form. After a client submits, create a new
              link only when they need to update.
            </p>
            {(linkState?.history || []).length > 0 ? (
              <ul className="flex flex-col gap-2">
                {linkState!.history.slice(0, 8).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2 text-xs text-muted-foreground"
                  >
                    <span className="capitalize font-medium text-foreground">{item.status}</span>
                    <span>
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        dateStyle: 'medium',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No share links created yet.</p>
            )}
          </section>
        </div>
      )}

      {projectWithForm ? (
        <ProjectAppFormDetails
          project={projectWithForm}
          showManageLink={false}
          startEditing={canEditDetails && !projectWithForm.app_publishing_form}
        />
      ) : null}

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirmAction(null);
        }}
      >
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'revoke' ? 'Revoke share link?' : 'Create a new link?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'revoke'
                ? 'Clients will no longer be able to open this link. You can create a new one anytime.'
                : 'The current active link will stop working immediately. Share the new link with your client instead.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={busy}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmAction === 'revoke'
                  ? 'rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'rounded-xl bg-violet-600 hover:bg-violet-700'
              }
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                if (confirmAction === 'revoke') {
                  revokeMutation.mutate(undefined, {
                    onSettled: () => setConfirmAction(null),
                  });
                } else if (confirmAction === 'new') {
                  createMutation.mutate(undefined, {
                    onSettled: () => setConfirmAction(null),
                  });
                }
              }}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {confirmAction === 'revoke' ? 'Revoke link' : 'Create new link'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectAppForm;
