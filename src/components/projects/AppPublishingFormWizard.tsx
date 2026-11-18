import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  ANDROID_CATEGORY_OPTIONS,
  APP_AUDIENCE_OPTIONS,
  AppAudience,
  AppPublishingFieldErrors,
  AppPublishingFormData,
  clampPhone,
  emptyAppPublishingForm,
  getAppPublishingSteps,
  IOS_AGE_RATING_OPTIONS,
  IOS_CATEGORY_OPTIONS,
  IOS_LANGUAGE_OPTIONS,
  parseAppPublishingForm,
  PUBLISHING_ASSET_FOLDERS,
  PublishingAssetSlot,
  serializeAppPublishingForm,
  validateAppPublishingStep,
} from '@/lib/utils/appPublishingForm';
import type { Project, ProjectAttachment } from '@/lib/utils/projectUtils';
import { appPublishingLinkService } from '@/services/appPublishingLinkService';
import { projectService } from '@/services/projectService';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  FileImage,
  Loader2,
  Save,
  Send,
  Smartphone,
  Upload,
} from 'lucide-react';

const fieldClass =
  'rounded-xl border-border/70 bg-background focus-visible:ring-violet-500/40';

type PrefillSource = Pick<
  Project,
  | 'name'
  | 'client_name'
  | 'client_contact_name'
  | 'client_phone'
  | 'client'
  | 'platforms'
  | 'app_publishing_form'
>;

function buildInitialForm(project: PrefillSource): AppPublishingFormData {
  const existing = parseAppPublishingForm(project.app_publishing_form);
  if (
    existing.company_name ||
    existing.app_name ||
    existing.contact_person ||
    existing.publish_platforms ||
    existing.status === 'submitted'
  ) {
    return existing;
  }

  const platformsRaw = String(project.platforms || '').toLowerCase();
  const hasAndroid = platformsRaw.includes('android');
  const hasIos = platformsRaw.includes('ios');
  let publish_platforms: AppPublishingFormData['publish_platforms'] = '';
  if (hasAndroid && hasIos) publish_platforms = 'both';
  else if (hasAndroid) publish_platforms = 'android';
  else if (hasIos) publish_platforms = 'ios';

  return {
    ...emptyAppPublishingForm(),
    company_name:
      project.client?.corporate_name || project.client_name || '',
    contact_person: project.client_contact_name || '',
    phone_number: clampPhone(project.client_phone || ''),
    app_name: project.name || '',
    publish_platforms,
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/80 p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {hint ? (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function AssetUploadSlot({
  label,
  hint,
  slot,
  files,
  uploading,
  onPick,
}: {
  label: string;
  hint: string;
  slot: PublishingAssetSlot;
  files: ProjectAttachment[];
  uploading: boolean;
  onPick: (slot: PublishingAssetSlot, list: FileList | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const folder = PUBLISHING_ASSET_FOLDERS[slot];
  const matched = files.filter((f) => f.folder === folder);

  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl shrink-0"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <Upload className="h-4 w-4 mr-1.5" />
          )}
          Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={slot === 'icon' || slot === 'feature_graphic' ? 'image/*' : 'image/*,video/*'}
          multiple={slot === 'phone_screenshots' || slot === 'tablet_screenshots'}
          onChange={(e) => {
            onPick(slot, e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {matched.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {matched.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2 text-xs text-muted-foreground min-w-0"
            >
              <FileImage className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{f.file_name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No files uploaded yet</p>
      )}
    </div>
  );
}

export interface AppPublishingFormWizardProps {
  projectId: string;
  project: PrefillSource;
  canEdit: boolean;
  onSaved?: (payload: string) => void;
  /** When set, saves/uploads via public one-time share APIs (no login). */
  publicToken?: string;
  initialAttachments?: ProjectAttachment[];
  onPublicSubmitted?: () => void;
}

export function AppPublishingFormWizard({
  projectId,
  project,
  canEdit,
  onSaved,
  publicToken,
  initialAttachments,
  onPublicSubmitted,
}: AppPublishingFormWizardProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<AppPublishingFormData>(() => buildInitialForm(project));
  const [errors, setErrors] = useState<AppPublishingFieldErrors>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>(
    () => initialAttachments || []
  );
  const [uploadingSlot, setUploadingSlot] = useState<PublishingAssetSlot | null>(null);
  const isPublic = Boolean(publicToken);

  const steps = useMemo(
    () => getAppPublishingSteps(form.publish_platforms),
    [form.publish_platforms]
  );
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)]?.id ?? 'basics';

  useEffect(() => {
    setForm(buildInitialForm(project));
    setDirty(false);
    setErrors({});
    setStepIndex(0);
  }, [projectId, project.app_publishing_form]);

  useEffect(() => {
    if (stepIndex >= steps.length) setStepIndex(Math.max(0, steps.length - 1));
  }, [steps.length, stepIndex]);

  useEffect(() => {
    if (initialAttachments) {
      setAttachments(initialAttachments);
    }
  }, [initialAttachments]);

  useEffect(() => {
    if (isPublic) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await projectService.getAttachments(projectId);
        if (!cancelled) setAttachments(list);
      } catch {
        /* empty list is fine */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, isPublic]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const setField = <K extends keyof AppPublishingFormData>(
    key: K,
    value: AppPublishingFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const persist = async (
    next: AppPublishingFormData,
    intent: 'draft' | 'submit' = 'draft'
  ) => {
    if (isPublic && publicToken) {
      await appPublishingLinkService.savePublicForm(publicToken, next, intent);
      onSaved?.(serializeAppPublishingForm(next));
      setDirty(false);
      return serializeAppPublishingForm(next);
    }
    const payload = serializeAppPublishingForm(next);
    await projectService.updateProject(projectId, { app_publishing_form: payload });
    onSaved?.(payload);
    setDirty(false);
    return payload;
  };

  const handleSaveDraft = async () => {
    if (!canEdit || saving || submitting) return;
    setSaving(true);
    try {
      // Why: Staff editing an already-submitted form should keep Submitted status on quick save.
      const keepSubmitted = !isPublic && form.status === 'submitted';
      const next = {
        ...form,
        status: keepSubmitted ? ('submitted' as const) : ('draft' as const),
        submitted_at: keepSubmitted
          ? form.submitted_at || new Date().toISOString()
          : form.submitted_at,
      };
      await persist(next, 'draft');
      setForm(next);
      toast({
        title: keepSubmitted ? 'Details saved' : 'Draft saved',
        description: isPublic
          ? 'Your progress is saved on this link until you submit.'
          : keepSubmitted
            ? 'App Form details updated for this project.'
            : 'You can continue editing anytime.',
      });
    } catch (err) {
      toast({
        title: 'Could not save',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const validateCurrent = () => {
    const stepErrors = validateAppPublishingStep(currentStep, form);
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrent()) {
      toast({
        title: 'Check required fields',
        description: 'Fix the highlighted fields before continuing.',
        variant: 'destructive',
      });
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const handleBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const handleSubmit = async () => {
    if (!canEdit || saving || submitting) return;
    for (const step of steps) {
      const stepErrors = validateAppPublishingStep(step.id, form);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        setStepIndex(steps.findIndex((s) => s.id === step.id));
        toast({
          title: 'Form incomplete',
          description: `Please complete “${step.title}” before submitting.`,
          variant: 'destructive',
        });
        return;
      }
    }
    setSubmitting(true);
    try {
      const next: AppPublishingFormData = {
        ...form,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      };
      await persist(next, 'submit');
      setForm(next);
      toast({
        title: 'Publishing form submitted',
        description: isPublic
          ? 'Thank you. This link is now closed. Contact your team if you need to update anything.'
          : 'Store teams can use this information for Play Store and App Store.',
      });
      if (isPublic) onPublicSubmitted?.();
    } catch (err) {
      toast({
        title: 'Submit failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssetUpload = async (slot: PublishingAssetSlot, list: FileList | null) => {
    if (!canEdit || !list?.length || uploadingSlot) return;
    setUploadingSlot(slot);
    try {
      const folder = PUBLISHING_ASSET_FOLDERS[slot];
      let uploaded: ProjectAttachment[] = [];
      if (isPublic && publicToken) {
        uploaded = await appPublishingLinkService.uploadPublicAssets(
          publicToken,
          folder,
          Array.from(list)
        );
      } else {
        const tagged = Array.from(list).map((file) => {
          const f = file as File & { category?: string; folder?: string };
          f.category = 'APP';
          f.folder = folder;
          return f;
        });
        uploaded = await projectService.uploadAttachments(projectId, tagged);
      }
      setAttachments((prev) => [...uploaded, ...prev]);
      setDirty(true);
      toast({ title: 'Assets uploaded', description: `${uploaded.length} file(s) added.` });
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploadingSlot(null);
    }
  };

  const toggleAudience = (value: AppAudience, checked: boolean) => {
    setForm((prev) => {
      const set = new Set(prev.android_target_audience);
      if (checked) set.add(value);
      else set.delete(value);
      return { ...prev, android_target_audience: Array.from(set) };
    });
    setDirty(true);
  };

  const locked = !canEdit;
  const isLast = stepIndex >= steps.length - 1;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-violet-50/80 via-background to-fuchsia-50/40 dark:from-violet-950/30 dark:via-background dark:to-fuchsia-950/20 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700 dark:text-violet-300">
              Store publishing intake
            </p>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {isPublic
                ? 'This is a secure one-time link. After you submit, the link closes. Ask your team for a new link if you need to make changes later.'
                : 'Complete this once so your team can publish accurately on Google Play and the Apple App Store. Accurate URLs and package IDs avoid review delays.'}
            </p>
          </div>
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
              form.status === 'submitted'
                ? 'border-emerald-300/80 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                : 'border-amber-300/80 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200'
            )}
          >
            {form.status === 'submitted' ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Smartphone className="h-3.5 w-3.5" />
            )}
            {form.status === 'submitted' ? 'Submitted' : dirty ? 'Unsaved draft' : 'Draft'}
          </div>
        </div>

        <ol className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {steps.map((step, index) => {
            const active = index === stepIndex;
            const done = index < stepIndex;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  disabled={locked && !active}
                  onClick={() => {
                    if (index <= stepIndex || form.status === 'submitted') setStepIndex(index);
                    else if (validateCurrent()) setStepIndex(index);
                  }}
                  className={cn(
                    'w-full rounded-xl border px-3 py-2.5 text-left transition-colors',
                    active
                      ? 'border-violet-400 bg-violet-100/70 dark:border-violet-600 dark:bg-violet-950/50'
                      : done
                        ? 'border-emerald-300/70 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/20'
                        : 'border-border/60 bg-background/60'
                  )}
                >
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Step {index + 1}
                  </p>
                  <p className="text-sm font-semibold text-foreground truncate">{step.title}</p>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {currentStep === 'basics' && (
        <SectionCard
          title="App & company"
          hint="Basic identity used on both stores. Fields marked required must be accurate."
        >
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="company_name">
                Company name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="company_name"
                className={fieldClass}
                maxLength={120}
                disabled={locked}
                value={form.company_name}
                onChange={(e) => setField('company_name', e.target.value.slice(0, 120))}
              />
              <FieldError message={errors.company_name} />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="contact_person">
                Contact person <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact_person"
                className={fieldClass}
                maxLength={100}
                disabled={locked}
                value={form.contact_person}
                onChange={(e) => setField('contact_person', e.target.value.slice(0, 100))}
              />
              <FieldError message={errors.contact_person} />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="phone_number">
                Phone number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone_number"
                className={fieldClass}
                inputMode="tel"
                disabled={locked}
                value={form.phone_number}
                onChange={(e) => setField('phone_number', clampPhone(e.target.value))}
                placeholder="+919876543210"
              />
              <FieldError message={errors.phone_number} />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="app_name">
                App name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="app_name"
                className={fieldClass}
                maxLength={100}
                disabled={locked}
                value={form.app_name}
                onChange={(e) => setField('app_name', e.target.value.slice(0, 100))}
              />
              <FieldError message={errors.app_name} />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="app_subtitle">App subtitle</Label>
              <Input
                id="app_subtitle"
                className={fieldClass}
                maxLength={100}
                disabled={locked}
                value={form.app_subtitle}
                onChange={(e) => setField('app_subtitle', e.target.value.slice(0, 100))}
                placeholder="Short line under the app name"
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="existing_website_domain">Existing website domain</Label>
              <Input
                id="existing_website_domain"
                className={fieldClass}
                maxLength={255}
                disabled={locked}
                value={form.existing_website_domain}
                onChange={(e) =>
                  setField('existing_website_domain', e.target.value.slice(0, 255))
                }
                placeholder="https://example.com"
              />
            </div>
            <div className="col-span-12 space-y-2">
              <Label htmlFor="app_description">App description</Label>
              <Textarea
                id="app_description"
                className={cn(fieldClass, 'min-h-[120px]')}
                maxLength={4000}
                disabled={locked}
                value={form.app_description}
                onChange={(e) => setField('app_description', e.target.value.slice(0, 4000))}
                placeholder="What the app does, who it is for, and key features"
              />
            </div>
            <div className="col-span-12 space-y-3">
              <Label>
                Is this a new app or an update? <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={form.app_release_type}
                disabled={locked}
                onValueChange={(v) =>
                  setField('app_release_type', v as AppPublishingFormData['app_release_type'])
                }
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                {[
                  { value: 'new', label: 'New app' },
                  { value: 'update', label: 'Existing app update' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3 cursor-pointer hover:bg-muted/30"
                  >
                    <RadioGroupItem value={opt.value} id={`release-${opt.value}`} />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </RadioGroup>
              <FieldError message={errors.app_release_type} />
            </div>
            <div className="col-span-12 space-y-3">
              <Label>
                Which platforms do you want to publish?{' '}
                <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={form.publish_platforms}
                disabled={locked}
                onValueChange={(v) => {
                  setField(
                    'publish_platforms',
                    v as AppPublishingFormData['publish_platforms']
                  );
                  setStepIndex(0);
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                {[
                  { value: 'android', label: 'Android (Google Play)' },
                  { value: 'ios', label: 'iOS (App Store)' },
                  { value: 'both', label: 'Android & iOS' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3 cursor-pointer hover:bg-muted/30"
                  >
                    <RadioGroupItem value={opt.value} id={`plat-${opt.value}`} />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </RadioGroup>
              <FieldError message={errors.publish_platforms} />
            </div>
            <div className="col-span-12 md:col-span-4 space-y-2">
              <Label htmlFor="privacy_policy_url">Privacy policy URL</Label>
              <Input
                id="privacy_policy_url"
                className={fieldClass}
                maxLength={500}
                disabled={locked}
                value={form.privacy_policy_url}
                onChange={(e) => setField('privacy_policy_url', e.target.value.slice(0, 500))}
                placeholder="https://"
              />
            </div>
            <div className="col-span-12 md:col-span-4 space-y-2">
              <Label htmlFor="data_deletion_url">Data deletion URL</Label>
              <Input
                id="data_deletion_url"
                className={fieldClass}
                maxLength={500}
                disabled={locked}
                value={form.data_deletion_url}
                onChange={(e) => setField('data_deletion_url', e.target.value.slice(0, 500))}
                placeholder="https://"
              />
            </div>
            <div className="col-span-12 md:col-span-4 space-y-2">
              <Label htmlFor="support_url">Support URL</Label>
              <Input
                id="support_url"
                className={fieldClass}
                maxLength={500}
                disabled={locked}
                value={form.support_url}
                onChange={(e) => setField('support_url', e.target.value.slice(0, 500))}
                placeholder="https://"
              />
            </div>
          </div>
        </SectionCard>
      )}

      {currentStep === 'android' && (
        <SectionCard
          title="Android publishing"
          hint="Details for Google Play Console listing and release."
        >
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 space-y-3">
              <Label>Do you already have a Google Play Developer Account?</Label>
              <RadioGroup
                value={form.android_has_play_account}
                disabled={locked}
                onValueChange={(v) =>
                  setField('android_has_play_account', v as AppPublishingFormData['android_has_play_account'])
                }
                className="grid grid-cols-2 gap-3 max-w-md"
              >
                {['yes', 'no'].map((v) => (
                  <label
                    key={v}
                    className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3 cursor-pointer"
                  >
                    <RadioGroupItem value={v} />
                    <span className="text-sm font-medium capitalize">{v}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="android_console_email">Google Play Console email</Label>
              <Input
                id="android_console_email"
                type="email"
                className={fieldClass}
                disabled={locked}
                value={form.android_console_email}
                onChange={(e) => setField('android_console_email', e.target.value.slice(0, 255))}
              />
              <FieldError message={errors.android_console_email} />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="android_package_name">
                Package name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="android_package_name"
                className={fieldClass}
                disabled={locked}
                value={form.android_package_name}
                onChange={(e) => setField('android_package_name', e.target.value.slice(0, 255))}
                placeholder="com.company.appname"
              />
              <p className="text-[11px] text-muted-foreground">Example: com.company.appname</p>
              <FieldError message={errors.android_package_name} />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label>App category</Label>
              <Select
                disabled={locked}
                value={form.android_category || undefined}
                onValueChange={(v) => setField('android_category', v)}
              >
                <SelectTrigger className={cn(fieldClass, 'h-10')}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ANDROID_CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-12 md:col-span-6 space-y-3">
              <Label>Is the app free or paid?</Label>
              <RadioGroup
                value={form.android_pricing}
                disabled={locked}
                onValueChange={(v) =>
                  setField('android_pricing', v as AppPublishingFormData['android_pricing'])
                }
                className="grid grid-cols-2 gap-3"
              >
                {['free', 'paid'].map((v) => (
                  <label
                    key={v}
                    className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3 cursor-pointer"
                  >
                    <RadioGroupItem value={v} />
                    <span className="text-sm font-medium capitalize">{v}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="col-span-12 md:col-span-6 space-y-3">
              <Label>Contains ads?</Label>
              <RadioGroup
                value={form.android_contains_ads}
                disabled={locked}
                onValueChange={(v) =>
                  setField(
                    'android_contains_ads',
                    v as AppPublishingFormData['android_contains_ads']
                  )
                }
                className="grid grid-cols-2 gap-3"
              >
                {['yes', 'no'].map((v) => (
                  <label
                    key={v}
                    className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3 cursor-pointer"
                  >
                    <RadioGroupItem value={v} />
                    <span className="text-sm font-medium capitalize">{v}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="col-span-12 space-y-3">
              <Label>Target audience</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {APP_AUDIENCE_OPTIONS.map((opt) => {
                  const checked = form.android_target_audience.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3 cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        disabled={locked}
                        onCheckedChange={(v) => toggleAudience(opt.value, v === true)}
                      />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="col-span-12 space-y-2">
              <Label htmlFor="android_store_description">Play Store description</Label>
              <Textarea
                id="android_store_description"
                className={cn(fieldClass, 'min-h-[100px]')}
                maxLength={4000}
                disabled={locked}
                value={form.android_store_description}
                onChange={(e) =>
                  setField('android_store_description', e.target.value.slice(0, 4000))
                }
              />
            </div>
            <div className="col-span-12 space-y-2">
              <Label htmlFor="android_keywords">Keywords</Label>
              <Textarea
                id="android_keywords"
                className={cn(fieldClass, 'min-h-[80px]')}
                maxLength={500}
                disabled={locked}
                value={form.android_keywords}
                onChange={(e) => setField('android_keywords', e.target.value.slice(0, 500))}
                placeholder="Comma-separated keywords for discoverability"
              />
            </div>
          </div>
        </SectionCard>
      )}

      {currentStep === 'ios' && (
        <SectionCard
          title="iOS publishing"
          hint="Details for Apple Developer Program and App Store Connect."
        >
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 space-y-3">
              <Label>Apple Developer Account?</Label>
              <RadioGroup
                value={form.ios_has_developer_account}
                disabled={locked}
                onValueChange={(v) =>
                  setField(
                    'ios_has_developer_account',
                    v as AppPublishingFormData['ios_has_developer_account']
                  )
                }
                className="grid grid-cols-2 gap-3 max-w-md"
              >
                {['yes', 'no'].map((v) => (
                  <label
                    key={v}
                    className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3 cursor-pointer"
                  >
                    <RadioGroupItem value={v} />
                    <span className="text-sm font-medium capitalize">{v}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="ios_apple_id_email">Apple ID email</Label>
              <Input
                id="ios_apple_id_email"
                type="email"
                className={fieldClass}
                disabled={locked}
                value={form.ios_apple_id_email}
                onChange={(e) => setField('ios_apple_id_email', e.target.value.slice(0, 255))}
              />
              <FieldError message={errors.ios_apple_id_email} />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="ios_team_name">Team name</Label>
              <Input
                id="ios_team_name"
                className={fieldClass}
                disabled={locked}
                value={form.ios_team_name}
                onChange={(e) => setField('ios_team_name', e.target.value.slice(0, 120))}
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="ios_team_id">Team ID</Label>
              <Input
                id="ios_team_id"
                className={fieldClass}
                disabled={locked}
                value={form.ios_team_id}
                onChange={(e) => setField('ios_team_id', e.target.value.slice(0, 64))}
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="ios_bundle_id">
                Bundle identifier <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ios_bundle_id"
                className={fieldClass}
                disabled={locked}
                value={form.ios_bundle_id}
                onChange={(e) => setField('ios_bundle_id', e.target.value.slice(0, 255))}
                placeholder="com.company.appname"
              />
              <p className="text-[11px] text-muted-foreground">Example: com.company.appname</p>
              <FieldError message={errors.ios_bundle_id} />
            </div>
            <div className="col-span-12 md:col-span-4 space-y-2">
              <Label>Primary language</Label>
              <Select
                disabled={locked}
                value={form.ios_primary_language || undefined}
                onValueChange={(v) => setField('ios_primary_language', v)}
              >
                <SelectTrigger className={cn(fieldClass, 'h-10')}>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {IOS_LANGUAGE_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-12 md:col-span-4 space-y-2">
              <Label>App category</Label>
              <Select
                disabled={locked}
                value={form.ios_category || undefined}
                onValueChange={(v) => setField('ios_category', v)}
              >
                <SelectTrigger className={cn(fieldClass, 'h-10')}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {IOS_CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-12 md:col-span-4 space-y-2">
              <Label>Age rating</Label>
              <Select
                disabled={locked}
                value={form.ios_age_rating || undefined}
                onValueChange={(v) => setField('ios_age_rating', v)}
              >
                <SelectTrigger className={cn(fieldClass, 'h-10')}>
                  <SelectValue placeholder="Select age rating" />
                </SelectTrigger>
                <SelectContent>
                  {IOS_AGE_RATING_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SectionCard>
      )}

      {currentStep === 'assets' && (
        <SectionCard
          title="Store assets"
          hint="Upload final creatives used on store listings. You can paste a YouTube URL for the promo video."
        >
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6">
              <AssetUploadSlot
                label="App icon"
                hint="512 × 512 px PNG recommended"
                slot="icon"
                files={attachments}
                uploading={uploadingSlot === 'icon'}
                onPick={handleAssetUpload}
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <AssetUploadSlot
                label="Feature graphic"
                hint="1024 × 500 PNG/JPG (Play Store)"
                slot="feature_graphic"
                files={attachments}
                uploading={uploadingSlot === 'feature_graphic'}
                onPick={handleAssetUpload}
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <AssetUploadSlot
                label="Phone screenshots"
                hint="Upload multiple phone frames"
                slot="phone_screenshots"
                files={attachments}
                uploading={uploadingSlot === 'phone_screenshots'}
                onPick={handleAssetUpload}
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <AssetUploadSlot
                label="Tablet screenshots"
                hint="Optional tablet frames"
                slot="tablet_screenshots"
                files={attachments}
                uploading={uploadingSlot === 'tablet_screenshots'}
                onPick={handleAssetUpload}
              />
            </div>
            <div className="col-span-12 space-y-2">
              <Label htmlFor="promotional_video_url">Promotional video (YouTube URL)</Label>
              <Input
                id="promotional_video_url"
                className={fieldClass}
                disabled={locked}
                value={form.promotional_video_url}
                onChange={(e) =>
                  setField('promotional_video_url', e.target.value.slice(0, 500))
                }
                placeholder="https://www.youtube.com/watch?v=…"
              />
              <FieldError message={errors.promotional_video_url} />
            </div>
            <div className="col-span-12 space-y-2">
              <Label htmlFor="notes">Notes for the publishing team</Label>
              <Textarea
                id="notes"
                className={cn(fieldClass, 'min-h-[100px]')}
                maxLength={4000}
                disabled={locked}
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value.slice(0, 4000))}
                placeholder="Anything reviewers or publishers should know"
              />
            </div>
          </div>
        </SectionCard>
      )}

      <div className="sticky bottom-3 z-10 rounded-2xl border border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-3 sm:p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground px-1">
            Step {stepIndex + 1} of {steps.length}
            {dirty ? ' · Unsaved changes' : ''}
          </p>
          <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={stepIndex === 0 || saving || submitting}
              onClick={handleBack}
            >
              Back
            </Button>
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={saving || submitting}
                onClick={handleSaveDraft}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isPublic || form.status !== 'submitted' ? 'Save draft' : 'Save changes'}
              </Button>
            )}
            {!isLast ? (
              <Button
                type="button"
                className="rounded-xl bg-violet-600 hover:bg-violet-700"
                disabled={saving || submitting}
                onClick={handleNext}
              >
                Continue
              </Button>
            ) : canEdit ? (
              <Button
                type="button"
                className="rounded-xl bg-violet-600 hover:bg-violet-700"
                disabled={saving || submitting}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {isPublic ? 'Submit for publishing' : 'Save & mark submitted'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
