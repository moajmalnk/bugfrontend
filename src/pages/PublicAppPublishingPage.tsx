import { useCallback, useEffect, useState } from 'react';
import { AppPublishingFormWizard } from '@/components/projects/AppPublishingFormWizard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  appPublishingLinkService,
  type PublicAppFormResponse,
} from '@/services/appPublishingLinkService';
import { CheckCircle2, Link2Off, Smartphone } from 'lucide-react';
import { useParams } from 'react-router-dom';

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: PublicAppFormResponse }
  | { status: 'submitted'; projectName: string };

/**
 * Why: Client-facing public App Publishing form — no login, one-time token.
 */
export default function PublicAppPublishingPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>({ status: 'loading' });

  const load = useCallback(async () => {
    if (!token) {
      setState({ status: 'error', message: 'This form link is invalid.' });
      return;
    }
    setState({ status: 'loading' });
    try {
      const data = await appPublishingLinkService.getPublicForm(token);
      if (!data.can_edit) {
        if (data.link.status === 'submitted') {
          setState({
            status: 'submitted',
            projectName: data.project.name,
          });
          return;
        }
        setState({
          status: 'error',
          message:
            data.message ||
            'This form link is no longer available. Ask your team for a new share link.',
        });
        return;
      }
      setState({ status: 'ready', data });
    } catch (err) {
      setState({
        status: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'This form link is invalid or has expired.',
      });
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 via-background to-background dark:from-violet-950/40 dark:via-background px-4 py-10">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-background dark:from-slate-950 px-4">
        <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <Link2Off className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Link unavailable</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{state.message}</p>
          <Button variant="outline" className="rounded-xl" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (state.status === 'submitted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-background dark:from-emerald-950/30 px-4">
        <div className="w-full max-w-md rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50 bg-card p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60">
            <CheckCircle2 className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Submitted</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Publishing details for{' '}
            <span className="font-medium text-foreground">{state.projectName}</span> were
            received. This one-time link is now closed. Contact your team if you need a new
            link to update anything.
          </p>
        </div>
      </div>
    );
  }

  const { data } = state;

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-background to-background dark:from-violet-950/40 dark:via-background">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10 space-y-6">
        <header className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-md shrink-0">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-violet-700 dark:text-violet-300">
                Mobile app publishing
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate mt-1">
                {data.project.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Please complete the information needed to publish on Google Play and the Apple
                App Store. Accurate details help avoid review delays.
              </p>
              {data.link.expires_at ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Link expires{' '}
                  {new Date(data.link.expires_at).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              ) : null}
            </div>
          </div>
        </header>

        <AppPublishingFormWizard
          projectId="public"
          project={{
            name: data.project.name,
            client_name: data.project.client_name,
            client_contact_name: data.project.client_contact_name,
            client_phone: data.project.client_phone,
            platforms: data.project.platforms,
            app_publishing_form: data.project.app_publishing_form,
          }}
          canEdit
          publicToken={token}
          initialAttachments={data.attachments || []}
          onPublicSubmitted={() =>
            setState({ status: 'submitted', projectName: data.project.name })
          }
        />

        <p className="text-center text-xs text-muted-foreground pb-8">
          Secured one-time link · Powered by BugRicer
        </p>
      </div>
    </div>
  );
}
