import { useEffect, useMemo, useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { copyShareText } from '@/lib/attachmentShare';
import {
  buildAndroidStoreListingPrompt,
  buildIosStoreListingPrompt,
  defaultStoreListingPromptExtras,
  downloadTextFile,
  emptyStoreListingPromptExtras,
  extrasAreDirty,
  storeListingFileSlug,
  storeListingPlatformFlags,
  type StoreListingPromptExtras,
  type StoreListingProject,
} from '@/lib/appStoreListingPrompts';
import type { AppPublishingFormData } from '@/lib/utils/appPublishingForm';
import { cn } from '@/lib/utils';
import { Check, Download, Loader2, SquareTerminal } from 'lucide-react';

export type StoreListingPromptPlatform = 'ios' | 'android';

type AppStoreListingPromptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: AppPublishingFormData;
  project: StoreListingProject;
  /** Which platform tab/actions to emphasize when opened from a button. */
  initialPlatform?: StoreListingPromptPlatform;
};

function Field({
  label,
  className,
  children,
  hint,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className={cn('col-span-12 space-y-1.5 min-w-0', className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/**
 * Why: Staff fill Cursor-prompt gaps in a popup (prefilled from App Form)
 * without extending the public client form schema (plan 2C + popup UX).
 */
export function AppStoreListingPromptDialog({
  open,
  onOpenChange,
  form,
  project,
  initialPlatform = 'ios',
}: AppStoreListingPromptDialogProps) {
  const { showIos, showAndroid } = storeListingPlatformFlags(form);
  const defaults = useMemo(
    () => defaultStoreListingPromptExtras(form, project),
    [form, project]
  );
  const [extras, setExtras] = useState<StoreListingPromptExtras>(defaults);
  const [baseline, setBaseline] = useState<StoreListingPromptExtras>(defaults);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [busy, setBusy] = useState<'copy-ios' | 'copy-android' | 'dl-ios' | 'dl-android' | null>(
    null
  );
  const [copied, setCopied] = useState<'ios' | 'android' | null>(null);

  useEffect(() => {
    if (!open) {
      setExtras(emptyStoreListingPromptExtras());
      setBaseline(emptyStoreListingPromptExtras());
      setBusy(null);
      setCopied(null);
      setDiscardOpen(false);
      return;
    }
    const next = defaultStoreListingPromptExtras(form, project);
    setExtras(next);
    setBaseline(next);
  }, [open, form, project]);

  const isDirty = extrasAreDirty(extras, baseline);

  const update = <K extends keyof StoreListingPromptExtras>(
    key: K,
    value: StoreListingPromptExtras[K]
  ) => {
    setExtras((prev) => ({ ...prev, [key]: value }));
  };

  const requestClose = () => {
    if (busy) return;
    if (isDirty) {
      setDiscardOpen(true);
      return;
    }
    onOpenChange(false);
  };

  const forceClose = () => {
    setDiscardOpen(false);
    setExtras(emptyStoreListingPromptExtras());
    setBaseline(emptyStoreListingPromptExtras());
    onOpenChange(false);
  };

  const runAction = async (
    action: 'copy-ios' | 'copy-android' | 'dl-ios' | 'dl-android'
  ) => {
    if (busy) return;
    setBusy(action);
    try {
      const slug = storeListingFileSlug(form, project);
      if (action === 'copy-ios' || action === 'dl-ios') {
        const text = buildIosStoreListingPrompt(form, project, extras);
        if (action === 'copy-ios') {
          await copyShareText(text);
          setCopied('ios');
          setBaseline(extras);
          toast({
            title: 'iOS Cursor prompt copied',
            description: 'Paste into Cursor to publish this app to the App Store.',
          });
          window.setTimeout(() => setCopied(null), 2000);
        } else {
          downloadTextFile(`store_listing_ios_${slug}.txt`, text);
          setBaseline(extras);
          toast({
            title: 'iOS listing downloaded',
            description: `store_listing_ios_${slug}.txt`,
          });
        }
      } else {
        const text = buildAndroidStoreListingPrompt(form, project, extras);
        if (action === 'copy-android') {
          await copyShareText(text);
          setCopied('android');
          setBaseline(extras);
          toast({
            title: 'Android Cursor prompt copied',
            description: 'Paste into Cursor to publish this app to Google Play.',
          });
          window.setTimeout(() => setCopied(null), 2000);
        } else {
          downloadTextFile(`store_listing_android_${slug}.txt`, text);
          setBaseline(extras);
          toast({
            title: 'Android listing downloaded',
            description: `store_listing_android_${slug}.txt`,
          });
        }
      }
    } catch {
      toast({
        title: 'Could not prepare store prompt',
        description: 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const appLabel = form.app_name.trim() || project.name || 'App';

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
          else onOpenChange(true);
        }}
      >
        <DialogContent
          showCloseButton={!busy}
          className="max-w-[720px] w-[calc(100%-1.5rem)] rounded-2xl max-h-[90vh] overflow-y-auto p-0 gap-0"
          onPointerDownOutside={(e) => {
            if (busy || isDirty) e.preventDefault();
            if (isDirty && !busy) setDiscardOpen(true);
          }}
          onEscapeKeyDown={(e) => {
            if (busy) {
              e.preventDefault();
              return;
            }
            if (isDirty) {
              e.preventDefault();
              setDiscardOpen(true);
            }
          }}
        >
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <SquareTerminal className="h-5 w-5 text-violet-600 dark:text-violet-300" />
              Fill store prompt — {appLabel}
            </DialogTitle>
            <DialogDescription>
              Prefills from App Form. Complete gaps below, then copy or download the
              Cursor publish prompt
              {initialPlatform === 'ios' ? ' (opened for iOS)' : ' (opened for Android)'}.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-4 grid grid-cols-12 gap-4">
            <Field className="sm:col-span-4" label="Version">
              <Input
                className="h-10 rounded-xl"
                maxLength={40}
                value={extras.version}
                disabled={Boolean(busy)}
                onChange={(e) => update('version', e.target.value.slice(0, 40))}
                placeholder="1.0.0+1"
              />
            </Field>
            <Field className="sm:col-span-4" label="Sign-in required">
              <Input
                className="h-10 rounded-xl"
                maxLength={20}
                value={extras.sign_in_required}
                disabled={Boolean(busy)}
                onChange={(e) => update('sign_in_required', e.target.value.slice(0, 20))}
                placeholder="Yes"
              />
            </Field>
            <Field className="sm:col-span-4" label="Shell type">
              <Input
                className="h-10 rounded-xl"
                maxLength={80}
                value={extras.shell_type}
                disabled={Boolean(busy)}
                onChange={(e) => update('shell_type', e.target.value.slice(0, 80))}
                placeholder="Flutter WebView shell"
              />
            </Field>

            <Field className="sm:col-span-6" label="Marketing URL">
              <Input
                className="h-10 rounded-xl"
                maxLength={500}
                value={extras.marketing_url}
                disabled={Boolean(busy)}
                onChange={(e) => update('marketing_url', e.target.value.slice(0, 500))}
                placeholder="https://"
              />
            </Field>
            <Field className="sm:col-span-6" label="Support URL">
              <Input
                className="h-10 rounded-xl"
                maxLength={500}
                value={extras.support_url}
                disabled={Boolean(busy)}
                onChange={(e) => update('support_url', e.target.value.slice(0, 500))}
                placeholder="https://…/support"
              />
            </Field>
            <Field className="sm:col-span-6" label="Privacy Policy URL">
              <Input
                className="h-10 rounded-xl"
                maxLength={500}
                value={extras.privacy_policy_url}
                disabled={Boolean(busy)}
                onChange={(e) =>
                  update('privacy_policy_url', e.target.value.slice(0, 500))
                }
              />
            </Field>
            <Field className="sm:col-span-6" label="Data deletion URL">
              <Input
                className="h-10 rounded-xl"
                maxLength={500}
                value={extras.data_deletion_url}
                disabled={Boolean(busy)}
                onChange={(e) =>
                  update('data_deletion_url', e.target.value.slice(0, 500))
                }
              />
            </Field>
            <Field className="sm:col-span-6" label="Portal / WebView URL">
              <Input
                className="h-10 rounded-xl"
                maxLength={500}
                value={extras.portal_url}
                disabled={Boolean(busy)}
                onChange={(e) => update('portal_url', e.target.value.slice(0, 500))}
                placeholder="https://app.example.com/"
              />
            </Field>
            <Field className="sm:col-span-6" label="Reviewer login URL">
              <Input
                className="h-10 rounded-xl"
                maxLength={500}
                value={extras.login_url}
                disabled={Boolean(busy)}
                onChange={(e) => update('login_url', e.target.value.slice(0, 500))}
                placeholder="https://…/login"
              />
            </Field>

            <Field className="sm:col-span-6" label="Demo email">
              <Input
                className="h-10 rounded-xl"
                maxLength={255}
                type="email"
                value={extras.demo_email}
                disabled={Boolean(busy)}
                onChange={(e) => update('demo_email', e.target.value.slice(0, 255))}
              />
            </Field>
            <Field className="sm:col-span-6" label="Demo password">
              <Input
                className="h-10 rounded-xl"
                maxLength={120}
                value={extras.demo_password}
                disabled={Boolean(busy)}
                onChange={(e) => update('demo_password', e.target.value.slice(0, 120))}
              />
            </Field>
            <Field className="sm:col-span-6" label="Backup roles / accounts">
              <Input
                className="h-10 rounded-xl"
                maxLength={200}
                value={extras.demo_backup}
                disabled={Boolean(busy)}
                onChange={(e) => update('demo_backup', e.target.value.slice(0, 200))}
                placeholder="Admin / Agent"
              />
            </Field>
            <Field className="sm:col-span-6" label="Push in this build">
              <Input
                className="h-10 rounded-xl"
                maxLength={40}
                value={extras.push_enabled}
                disabled={Boolean(busy)}
                onChange={(e) => update('push_enabled', e.target.value.slice(0, 40))}
                placeholder="No"
              />
            </Field>

            <Field className="sm:col-span-6" label="Who creates accounts?">
              <Input
                className="h-10 rounded-xl"
                maxLength={200}
                value={extras.accounts_created_by}
                disabled={Boolean(busy)}
                onChange={(e) =>
                  update('accounts_created_by', e.target.value.slice(0, 200))
                }
                placeholder="Agency admin outside the app"
              />
            </Field>
            <Field className="sm:col-span-3" label="IAP / subscriptions">
              <Input
                className="h-10 rounded-xl"
                maxLength={80}
                value={extras.has_iap}
                disabled={Boolean(busy)}
                onChange={(e) => update('has_iap', e.target.value.slice(0, 80))}
                placeholder="None"
              />
            </Field>
            <Field className="sm:col-span-3" label="Paid outside app">
              <Input
                className="h-10 rounded-xl"
                maxLength={40}
                value={extras.paid_outside_app}
                disabled={Boolean(busy)}
                onChange={(e) =>
                  update('paid_outside_app', e.target.value.slice(0, 40))
                }
                placeholder="Yes / No"
              />
            </Field>

            <Field label="Purpose & audience (App Review)">
              <Textarea
                className="min-h-[72px] rounded-xl"
                maxLength={1200}
                value={extras.purpose_audience}
                disabled={Boolean(busy)}
                onChange={(e) =>
                  update('purpose_audience', e.target.value.slice(0, 1200))
                }
                placeholder="What the app does and who uses it…"
              />
            </Field>
            <Field label="Reviewer steps">
              <Textarea
                className="min-h-[64px] rounded-xl"
                maxLength={800}
                value={extras.review_steps}
                disabled={Boolean(busy)}
                onChange={(e) => update('review_steps', e.target.value.slice(0, 800))}
                placeholder="Launch → Login → Dashboard → … → Log Out"
              />
            </Field>
            <Field label="External services">
              <Textarea
                className="min-h-[64px] rounded-xl"
                maxLength={800}
                value={extras.external_services}
                disabled={Boolean(busy)}
                onChange={(e) =>
                  update('external_services', e.target.value.slice(0, 800))
                }
                placeholder="Portal host, auth, payments, Firebase…"
              />
            </Field>

            {showIos ? (
              <>
                <div className="col-span-12 pt-1">
                  <p className="text-sm font-semibold text-foreground">iOS extras</p>
                </div>
                <Field className="sm:col-span-4" label="SKU">
                  <Input
                    className="h-10 rounded-xl"
                    maxLength={80}
                    value={extras.ios_sku}
                    disabled={Boolean(busy)}
                    onChange={(e) => update('ios_sku', e.target.value.slice(0, 80))}
                  />
                </Field>
                <Field
                  className="sm:col-span-4"
                  label="Bundle ID override"
                  hint="Prefills from App Form"
                >
                  <Input
                    className="h-10 rounded-xl"
                    maxLength={255}
                    value={extras.ios_bundle_id}
                    disabled={Boolean(busy)}
                    onChange={(e) =>
                      update('ios_bundle_id', e.target.value.slice(0, 255))
                    }
                  />
                </Field>
                <Field className="sm:col-span-4" label="Team ID override">
                  <Input
                    className="h-10 rounded-xl"
                    maxLength={64}
                    value={extras.ios_team_id}
                    disabled={Boolean(busy)}
                    onChange={(e) => update('ios_team_id', e.target.value.slice(0, 64))}
                  />
                </Field>
                <Field className="sm:col-span-6" label="Device platforms">
                  <Input
                    className="h-10 rounded-xl"
                    maxLength={60}
                    value={extras.ios_platforms}
                    disabled={Boolean(busy)}
                    onChange={(e) =>
                      update('ios_platforms', e.target.value.slice(0, 60))
                    }
                  />
                </Field>
                <Field className="sm:col-span-6" label="Secondary category">
                  <Input
                    className="h-10 rounded-xl"
                    maxLength={60}
                    value={extras.ios_secondary_category}
                    disabled={Boolean(busy)}
                    onChange={(e) =>
                      update('ios_secondary_category', e.target.value.slice(0, 60))
                    }
                  />
                </Field>
                <Field label="Promotional text (≤170)">
                  <Textarea
                    className="min-h-[56px] rounded-xl"
                    maxLength={170}
                    value={extras.ios_promotional_text}
                    disabled={Boolean(busy)}
                    onChange={(e) =>
                      update('ios_promotional_text', e.target.value.slice(0, 170))
                    }
                  />
                </Field>
                <Field className="sm:col-span-6" label="iOS keywords (≤100)">
                  <Input
                    className="h-10 rounded-xl"
                    maxLength={100}
                    value={extras.ios_keywords}
                    disabled={Boolean(busy)}
                    onChange={(e) =>
                      update('ios_keywords', e.target.value.slice(0, 100))
                    }
                  />
                </Field>
                <Field className="sm:col-span-6" label="What's New">
                  <Input
                    className="h-10 rounded-xl"
                    maxLength={400}
                    value={extras.ios_whats_new}
                    disabled={Boolean(busy)}
                    onChange={(e) =>
                      update('ios_whats_new', e.target.value.slice(0, 400))
                    }
                  />
                </Field>
              </>
            ) : null}

            {showAndroid ? (
              <>
                <div className="col-span-12 pt-1">
                  <p className="text-sm font-semibold text-foreground">Android extras</p>
                </div>
                <Field className="sm:col-span-6" label="Package name override">
                  <Input
                    className="h-10 rounded-xl"
                    maxLength={255}
                    value={extras.android_package_name}
                    disabled={Boolean(busy)}
                    onChange={(e) =>
                      update('android_package_name', e.target.value.slice(0, 255))
                    }
                  />
                </Field>
                <Field className="sm:col-span-6" label="Short description (≤80)">
                  <Input
                    className="h-10 rounded-xl"
                    maxLength={80}
                    value={extras.android_short_description}
                    disabled={Boolean(busy)}
                    onChange={(e) =>
                      update(
                        'android_short_description',
                        e.target.value.slice(0, 80)
                      )
                    }
                  />
                </Field>
                <Field className="sm:col-span-6" label="What's New">
                  <Input
                    className="h-10 rounded-xl"
                    maxLength={400}
                    value={extras.android_whats_new}
                    disabled={Boolean(busy)}
                    onChange={(e) =>
                      update('android_whats_new', e.target.value.slice(0, 400))
                    }
                  />
                </Field>
                <Field
                  className="sm:col-span-6"
                  label="Keystore / key.properties note"
                  hint="Do not commit secrets"
                >
                  <Input
                    className="h-10 rounded-xl"
                    maxLength={300}
                    value={extras.android_keystore_note}
                    disabled={Boolean(busy)}
                    onChange={(e) =>
                      update('android_keystore_note', e.target.value.slice(0, 300))
                    }
                    placeholder="Path on this Mac"
                  />
                </Field>
              </>
            ) : null}
          </div>

          <DialogFooter className="px-5 py-4 border-t border-border/60 flex-wrap gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={Boolean(busy)}
              onClick={requestClose}
            >
              Cancel
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              {showIos ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    disabled={Boolean(busy)}
                    onClick={() => void runAction('dl-ios')}
                  >
                    {busy === 'dl-ios' ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Download iOS
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl bg-violet-600 hover:bg-violet-700"
                    disabled={Boolean(busy)}
                    onClick={() => void runAction('copy-ios')}
                  >
                    {busy === 'copy-ios' ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : copied === 'ios' ? (
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                    ) : (
                      <SquareTerminal className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Copy iOS
                  </Button>
                </>
              ) : null}
              {showAndroid ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    disabled={Boolean(busy)}
                    onClick={() => void runAction('dl-android')}
                  >
                    {busy === 'dl-android' ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Download Android
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl bg-violet-600 hover:bg-violet-700"
                    disabled={Boolean(busy)}
                    onClick={() => void runAction('copy-android')}
                  >
                    {busy === 'copy-android' ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : copied === 'android' ? (
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                    ) : (
                      <SquareTerminal className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Copy Android
                  </Button>
                </>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved prompt details. Closing discards them for this session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Keep editing</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl" onClick={forceClose}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
