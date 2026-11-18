import { useEffect, useState } from 'react';
import {
  AppStoreListingPromptDialog,
  type StoreListingPromptPlatform,
} from '@/components/projects/AppStoreListingPromptDialog';
import { AppPublishingFormWizard } from '@/components/projects/AppPublishingFormWizard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useUrlDialogParam } from '@/hooks/useUrlDialogParam';
import { storeListingPlatformFlags } from '@/lib/appStoreListingPrompts';
import {
  APP_AUDIENCE_OPTIONS,
  AppPublishingFormData,
  needsAndroidSection,
  needsIosSection,
  parseAppPublishingForm,
  PUBLISHING_ASSET_FOLDERS,
} from '@/lib/utils/appPublishingForm';
import {
  appPublishingFormHasContent,
  Project,
  ProjectAttachment,
  projectShowsAppForm,
} from '@/lib/utils/projectUtils';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import {
  Apple,
  CheckCircle2,
  ExternalLink,
  FileImage,
  Link2,
  Pencil,
  Smartphone,
  SquareTerminal,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

/** Why: Shareable deep link — `?store-prompt=ios|android` (Rule 26 Back closes). */
const STORE_PROMPT_URL_PARAM = 'store-prompt';

function isStorePromptPlatform(value: string | null): value is StoreListingPromptPlatform {
  return value === 'ios' || value === 'android';
}

function DetailItem({
  label,
  value,
  href,
  className,
}: {
  label: string;
  value?: string | null;
  href?: string;
  className?: string;
}) {
  const text = String(value || '').trim();
  if (!text) return null;
  return (
    <div className={cn('min-w-0', className)}>
      <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 h-full">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:underline dark:text-violet-300 break-all"
          >
            <span className="truncate">{text}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        ) : (
          <p className="mt-1 text-sm font-medium text-foreground break-words whitespace-pre-wrap">
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

function DetailGroup({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-violet-600 dark:text-violet-300" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="grid grid-cols-12 gap-3">{children}</div>
    </div>
  );
}

function platformLabel(value: AppPublishingFormData['publish_platforms']): string {
  if (value === 'android') return 'Android (Google Play)';
  if (value === 'ios') return 'iOS (App Store)';
  if (value === 'both') return 'Android & iOS';
  return '';
}

function releaseLabel(value: AppPublishingFormData['app_release_type']): string {
  if (value === 'new') return 'New app';
  if (value === 'update') return 'Existing app update';
  return '';
}

function audienceLabel(values: AppPublishingFormData['android_target_audience']): string {
  if (!values?.length) return '';
  return values
    .map((v) => APP_AUDIENCE_OPTIONS.find((o) => o.value === v)?.label || v)
    .join(', ');
}

/**
 * Why: Admin / Super Admin always; developers only when assigned to this project
 * (API setup update enforces the same membership check).
 */
export function canEditAppPublishingDetails(
  currentUser: { id?: string; role?: string; is_super_admin?: number | boolean } | null | undefined,
  project: Pick<Project, 'members_detail'>
): boolean {
  if (!currentUser) return false;
  if (currentUser.role === 'admin' || currentUser.is_super_admin) return true;
  if (currentUser.role !== 'developer') return false;
  const uid = String(currentUser.id);
  return (project.members_detail || []).some((m) => String(m.user_id) === uid);
}

export function ProjectAppFormDetails({
  project,
  showManageLink = true,
  startEditing = false,
}: {
  project: Project;
  showManageLink?: boolean;
  startEditing?: boolean;
}) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const role = currentUser?.role || 'admin';
  const [editing, setEditing] = useState(startEditing);
  const storePromptDialog = useUrlDialogParam(STORE_PROMPT_URL_PARAM);
  const {
    value: storePromptParam,
    open: openStorePromptParam,
    close: closeStorePromptParam,
  } = storePromptDialog;

  const showsAppForm = projectShowsAppForm(project);
  const form = parseAppPublishingForm(project.app_publishing_form);
  const hasData = appPublishingFormHasContent(form) || form.status === 'submitted';
  const canEdit = canEditAppPublishingDetails(currentUser, project);
  const canManageLink =
    showManageLink &&
    (currentUser?.role === 'admin' ||
      currentUser?.is_super_admin ||
      currentUser?.role === 'developer' ||
      currentUser?.role === 'tester');
  const { showIos: promptShowIos, showAndroid: promptShowAndroid } =
    storeListingPlatformFlags(form);

  const promptPlatform: StoreListingPromptPlatform = isStorePromptPlatform(
    storePromptParam
  )
    ? storePromptParam
    : 'ios';
  const promptOpen =
    showsAppForm &&
    canEdit &&
    hasData &&
    isStorePromptPlatform(storePromptParam) &&
    ((storePromptParam === 'ios' && promptShowIos) ||
      (storePromptParam === 'android' && promptShowAndroid));

  const openStorePrompt = (platform: StoreListingPromptPlatform) => {
    openStorePromptParam(platform);
  };

  // Why: Strip stale/unauthorized deep links (wrong role, no data, wrong platform).
  useEffect(() => {
    if (!storePromptParam) return;
    if (!showsAppForm || !canEdit || !hasData) {
      closeStorePromptParam();
      return;
    }
    if (!isStorePromptPlatform(storePromptParam)) {
      closeStorePromptParam();
      return;
    }
    if (storePromptParam === 'ios' && !promptShowIos) {
      closeStorePromptParam();
      return;
    }
    if (storePromptParam === 'android' && !promptShowAndroid) {
      closeStorePromptParam();
    }
  }, [
    storePromptParam,
    showsAppForm,
    canEdit,
    hasData,
    promptShowIos,
    promptShowAndroid,
    closeStorePromptParam,
  ]);

  if (!showsAppForm) return null;

  const attachments = project.attachments || [];
  const assetSlots: { label: string; folder: string; files: ProjectAttachment[] }[] = [
    {
      label: 'App icon',
      folder: PUBLISHING_ASSET_FOLDERS.icon,
      files: attachments.filter((a) => a.folder === PUBLISHING_ASSET_FOLDERS.icon),
    },
    {
      label: 'Feature graphic',
      folder: PUBLISHING_ASSET_FOLDERS.feature_graphic,
      files: attachments.filter(
        (a) => a.folder === PUBLISHING_ASSET_FOLDERS.feature_graphic
      ),
    },
    {
      label: 'Phone screenshots',
      folder: PUBLISHING_ASSET_FOLDERS.phone_screenshots,
      files: attachments.filter(
        (a) => a.folder === PUBLISHING_ASSET_FOLDERS.phone_screenshots
      ),
    },
    {
      label: 'Tablet screenshots',
      folder: PUBLISHING_ASSET_FOLDERS.tablet_screenshots,
      files: attachments.filter(
        (a) => a.folder === PUBLISHING_ASSET_FOLDERS.tablet_screenshots
      ),
    },
  ].filter((s) => s.files.length > 0);

  const showAndroid = needsAndroidSection(form.publish_platforms);
  const showIos = needsIosSection(form.publish_platforms);

  return (
    <>
    <section className="relative overflow-hidden rounded-2xl border border-violet-200/70 dark:border-violet-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-50/50 via-transparent to-fuchsia-50/30 dark:from-violet-950/20 dark:to-fuchsia-950/10" />
      <div className="relative p-4 sm:p-5 lg:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-md shrink-0">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-semibold text-foreground">
                  App Form details
                </h2>
                <Badge
                  variant="outline"
                  className={cn(
                    'rounded-full text-[10px]',
                    form.status === 'submitted'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                      : hasData
                        ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                        : 'border-border text-muted-foreground'
                  )}
                >
                  {form.status === 'submitted'
                    ? 'Submitted'
                    : hasData
                      ? 'Draft'
                      : 'Not collected'}
                </Badge>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Store publishing information collected for this project only
              </p>
              {form.submitted_at ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Submitted{' '}
                  {new Date(form.submitted_at).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canEdit && hasData && !editing ? (
              <>
                {promptShowIos ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    title="Fill details and copy iOS Cursor prompt"
                    aria-label="Fill details and copy iOS Cursor prompt"
                    onClick={() => openStorePrompt('ios')}
                  >
                    <SquareTerminal className="h-3.5 w-3.5 mr-1.5" />
                    Copy iOS
                  </Button>
                ) : null}
                {promptShowAndroid ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    title="Fill details and copy Android Cursor prompt"
                    aria-label="Fill details and copy Android Cursor prompt"
                    onClick={() => openStorePrompt('android')}
                  >
                    <Smartphone className="h-3.5 w-3.5 mr-1.5" />
                    Copy Android
                  </Button>
                ) : null}
              </>
            ) : null}
            {canEdit ? (
              <Button
                type="button"
                size="sm"
                variant={editing ? 'outline' : 'default'}
                className={cn(
                  'rounded-xl',
                  !editing && 'bg-violet-600 hover:bg-violet-700'
                )}
                onClick={() => setEditing((v) => !v)}
              >
                {editing ? (
                  <>
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Close editor
                  </>
                ) : (
                  <>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    {hasData ? 'Edit details' : 'Add details'}
                  </>
                )}
              </Button>
            ) : null}
            {canManageLink ? (
              <Button asChild size="sm" variant="outline" className="rounded-xl">
                <Link to={`/${role}/projects/${project.id}/app-form`}>
                  <Link2 className="h-3.5 w-3.5 mr-1.5" />
                  Manage link
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        {editing && canEdit ? (
          <AppPublishingFormWizard
            projectId={project.id}
            project={project}
            canEdit
            onSaved={async () => {
              await queryClient.invalidateQueries({ queryKey: ['project', project.id] });
              await queryClient.invalidateQueries({
                queryKey: ['app-publishing-link', project.id],
              });
              setEditing(false);
            }}
          />
        ) : !hasData ? (
          <div className="rounded-xl border border-dashed border-violet-300/70 dark:border-violet-800/50 bg-violet-50/40 dark:bg-violet-950/20 px-4 py-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              No publishing details yet. Admins and assigned developers can add them here, or
              share a client link.
            </p>
            {canEdit ? (
              <Button
                type="button"
                size="sm"
                className="rounded-xl bg-violet-600 hover:bg-violet-700"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Add details
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <DetailGroup title="Company & app" icon={CheckCircle2}>
              <DetailItem className="col-span-12 md:col-span-4" label="Company" value={form.company_name} />
              <DetailItem className="col-span-12 md:col-span-4" label="Contact person" value={form.contact_person} />
              <DetailItem className="col-span-12 md:col-span-4" label="Phone" value={form.phone_number} />
              <DetailItem className="col-span-12 md:col-span-4" label="App name" value={form.app_name} />
              <DetailItem className="col-span-12 md:col-span-4" label="Subtitle" value={form.app_subtitle} />
              <DetailItem className="col-span-12 md:col-span-4" label="Release type" value={releaseLabel(form.app_release_type)} />
              <DetailItem className="col-span-12 md:col-span-4" label="Platforms" value={platformLabel(form.publish_platforms)} />
              <DetailItem
                className="col-span-12 md:col-span-4"
                label="Website"
                value={form.existing_website_domain}
                href={
                  form.existing_website_domain &&
                  /^https?:\/\//i.test(form.existing_website_domain)
                    ? form.existing_website_domain
                    : undefined
                }
              />
              <DetailItem
                className="col-span-12 md:col-span-4"
                label="Privacy policy"
                value={form.privacy_policy_url}
                href={form.privacy_policy_url || undefined}
              />
              <DetailItem
                className="col-span-12 md:col-span-4"
                label="Data deletion"
                value={form.data_deletion_url}
                href={form.data_deletion_url || undefined}
              />
              <DetailItem
                className="col-span-12 md:col-span-4"
                label="Support URL"
                value={form.support_url}
                href={form.support_url || undefined}
              />
              <DetailItem className="col-span-12" label="App description" value={form.app_description} />
            </DetailGroup>

            {showAndroid ? (
              <DetailGroup title="Android publishing" icon={Smartphone}>
                <DetailItem
                  className="col-span-12 md:col-span-4"
                  label="Play account"
                  value={
                    form.android_has_play_account
                      ? form.android_has_play_account === 'yes'
                        ? 'Yes'
                        : 'No'
                      : ''
                  }
                />
                <DetailItem className="col-span-12 md:col-span-4" label="Console email" value={form.android_console_email} />
                <DetailItem className="col-span-12 md:col-span-4" label="Package name" value={form.android_package_name} />
                <DetailItem className="col-span-12 md:col-span-4" label="Category" value={form.android_category} />
                <DetailItem
                  className="col-span-12 md:col-span-4"
                  label="Pricing"
                  value={
                    form.android_pricing
                      ? form.android_pricing === 'free'
                        ? 'Free'
                        : 'Paid'
                      : ''
                  }
                />
                <DetailItem
                  className="col-span-12 md:col-span-4"
                  label="Contains ads"
                  value={
                    form.android_contains_ads
                      ? form.android_contains_ads === 'yes'
                        ? 'Yes'
                        : 'No'
                      : ''
                  }
                />
                <DetailItem
                  className="col-span-12 md:col-span-6"
                  label="Target audience"
                  value={audienceLabel(form.android_target_audience)}
                />
                <DetailItem
                  className="col-span-12"
                  label="Play Store description"
                  value={form.android_store_description}
                />
                <DetailItem className="col-span-12" label="Keywords" value={form.android_keywords} />
              </DetailGroup>
            ) : null}

            {showIos ? (
              <DetailGroup title="iOS publishing" icon={Apple}>
                <DetailItem
                  className="col-span-12 md:col-span-4"
                  label="Apple Developer Account"
                  value={
                    form.ios_has_developer_account
                      ? form.ios_has_developer_account === 'yes'
                        ? 'Yes'
                        : 'No'
                      : ''
                  }
                />
                <DetailItem className="col-span-12 md:col-span-4" label="Apple ID email" value={form.ios_apple_id_email} />
                <DetailItem className="col-span-12 md:col-span-4" label="Team name" value={form.ios_team_name} />
                <DetailItem className="col-span-12 md:col-span-4" label="Team ID" value={form.ios_team_id} />
                <DetailItem className="col-span-12 md:col-span-4" label="Bundle ID" value={form.ios_bundle_id} />
                <DetailItem className="col-span-12 md:col-span-4" label="Primary language" value={form.ios_primary_language} />
                <DetailItem className="col-span-12 md:col-span-4" label="Category" value={form.ios_category} />
                <DetailItem className="col-span-12 md:col-span-4" label="Age rating" value={form.ios_age_rating} />
              </DetailGroup>
            ) : null}

            <DetailGroup title="Assets & notes" icon={FileImage}>
              <DetailItem
                className="col-span-12 md:col-span-6"
                label="Promo video"
                value={form.promotional_video_url}
                href={form.promotional_video_url || undefined}
              />
              <DetailItem className="col-span-12" label="Notes" value={form.notes} />
              {assetSlots.length > 0 ? (
                <div className="col-span-12 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assetSlots.map((slot) => (
                    <div
                      key={slot.folder}
                      className="rounded-xl border border-border/60 bg-background/60 px-3 py-2.5"
                    >
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {slot.label}
                      </p>
                      <ul className="mt-2 flex flex-col gap-1.5">
                        {slot.files.map((f) => (
                          <li
                            key={f.id}
                            className="flex items-center gap-2 text-xs text-foreground min-w-0"
                          >
                            <FileImage className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{f.file_name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}
            </DetailGroup>
          </div>
        )}
      </div>
    </section>
    {canEdit && hasData ? (
      <AppStoreListingPromptDialog
        open={promptOpen}
        onOpenChange={(next) => {
          if (!next) closeStorePromptParam();
          else if (isStorePromptPlatform(storePromptParam)) {
            openStorePromptParam(storePromptParam);
          } else {
            openStorePromptParam(promptPlatform);
          }
        }}
        form={form}
        project={project}
        initialPlatform={promptPlatform}
      />
    ) : null}
    </>
  );
}
