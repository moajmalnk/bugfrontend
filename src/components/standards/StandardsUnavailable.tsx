import { EyeOff } from 'lucide-react';

/**
 * Why: when an admin sets CODO Rules or Cursor Tips to Hidden for someone, a
 * bookmarked URL must explain the situation instead of showing a load error.
 */
export function StandardsUnavailable({ feature }: { feature: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="max-w-md space-y-3 rounded-2xl border border-border bg-card p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <EyeOff className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">
          {feature} is not available for your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Your admin has turned off {feature} for you. Ask an admin if you need access.
        </p>
      </div>
    </div>
  );
}
