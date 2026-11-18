/**
 * Why: Client-facing Mobile App Publishing Information Form —
 * structured JSON on projects.app_publishing_form for store submission intake.
 */

export type AppPublishingStatus = 'draft' | 'submitted';

export type AppReleaseType = 'new' | 'update' | '';
export type AppPublishPlatforms = 'android' | 'ios' | 'both' | '';
export type YesNo = 'yes' | 'no' | '';
export type FreePaid = 'free' | 'paid' | '';
export type AppAudience = 'children' | 'teens' | 'adults';

export const ANDROID_CATEGORY_OPTIONS = [
  'Business',
  'Education',
  'Finance',
  'Food',
  'Health',
  'Lifestyle',
  'Productivity',
  'Shopping',
  'Social',
  'Travel',
  'Utilities',
  'Other',
] as const;

export const IOS_CATEGORY_OPTIONS = [
  'Business',
  'Education',
  'Finance',
  'Medical',
  'Lifestyle',
  'Shopping',
  'Productivity',
  'Food',
  'Travel',
  'Utilities',
] as const;

export const IOS_LANGUAGE_OPTIONS = [
  'English',
  'Arabic',
  'Hindi',
  'Malayalam',
  'Other',
] as const;

export const IOS_AGE_RATING_OPTIONS = ['4+', '9+', '12+', '17+'] as const;

export const APP_AUDIENCE_OPTIONS: { value: AppAudience; label: string }[] = [
  { value: 'children', label: 'Children' },
  { value: 'teens', label: 'Teens' },
  { value: 'adults', label: 'Adults' },
];

export const PUBLISHING_ASSET_FOLDERS = {
  icon: 'publishing_icon',
  feature_graphic: 'publishing_feature_graphic',
  phone_screenshots: 'publishing_phone_screenshots',
  tablet_screenshots: 'publishing_tablet_screenshots',
} as const;

export type PublishingAssetSlot = keyof typeof PUBLISHING_ASSET_FOLDERS;

export interface AppPublishingFormData {
  status: AppPublishingStatus;
  updated_at: string | null;
  submitted_at: string | null;

  company_name: string;
  contact_person: string;
  phone_number: string;
  app_name: string;
  app_subtitle: string;
  app_description: string;
  existing_website_domain: string;
  app_release_type: AppReleaseType;
  publish_platforms: AppPublishPlatforms;
  privacy_policy_url: string;
  data_deletion_url: string;
  support_url: string;

  android_has_play_account: YesNo;
  android_console_email: string;
  android_package_name: string;
  android_category: string;
  android_pricing: FreePaid;
  android_contains_ads: YesNo;
  android_target_audience: AppAudience[];
  android_store_description: string;
  android_keywords: string;

  ios_has_developer_account: YesNo;
  ios_apple_id_email: string;
  ios_team_name: string;
  ios_team_id: string;
  ios_bundle_id: string;
  ios_primary_language: string;
  ios_category: string;
  ios_age_rating: string;

  promotional_video_url: string;
  notes: string;
}

export const emptyAppPublishingForm = (): AppPublishingFormData => ({
  status: 'draft',
  updated_at: null,
  submitted_at: null,

  company_name: '',
  contact_person: '',
  phone_number: '',
  app_name: '',
  app_subtitle: '',
  app_description: '',
  existing_website_domain: '',
  app_release_type: '',
  publish_platforms: '',
  privacy_policy_url: '',
  data_deletion_url: '',
  support_url: '',

  android_has_play_account: '',
  android_console_email: '',
  android_package_name: '',
  android_category: '',
  android_pricing: '',
  android_contains_ads: '',
  android_target_audience: [],
  android_store_description: '',
  android_keywords: '',

  ios_has_developer_account: '',
  ios_apple_id_email: '',
  ios_team_name: '',
  ios_team_id: '',
  ios_bundle_id: '',
  ios_primary_language: '',
  ios_category: '',
  ios_age_rating: '',

  promotional_video_url: '',
  notes: '',
});

function asYesNo(v: unknown): YesNo {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'yes' || s === 'no') return s;
  return '';
}

function asFreePaid(v: unknown): FreePaid {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'free' || s === 'paid') return s;
  return '';
}

function asReleaseType(v: unknown): AppReleaseType {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'new' || s === 'update') return s;
  return '';
}

function asPlatforms(v: unknown): AppPublishPlatforms {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'android' || s === 'ios' || s === 'both') return s;
  return '';
}

function asAudienceList(v: unknown): AppAudience[] {
  if (!Array.isArray(v)) return [];
  const allowed = new Set<AppAudience>(['children', 'teens', 'adults']);
  return v
    .map((x) => String(x || '').trim().toLowerCase())
    .filter((x): x is AppAudience => allowed.has(x as AppAudience));
}

export function parseAppPublishingForm(value?: string | null): AppPublishingFormData {
  const empty = emptyAppPublishingForm();
  if (!value?.trim()) return empty;
  try {
    const parsed = JSON.parse(value) as Partial<AppPublishingFormData>;
    const status =
      parsed.status === 'submitted' || parsed.status === 'draft' ? parsed.status : 'draft';
    return {
      ...empty,
      ...parsed,
      status,
      android_target_audience: asAudienceList(parsed.android_target_audience),
      android_has_play_account: asYesNo(parsed.android_has_play_account),
      android_contains_ads: asYesNo(parsed.android_contains_ads),
      ios_has_developer_account: asYesNo(parsed.ios_has_developer_account),
      android_pricing: asFreePaid(parsed.android_pricing),
      app_release_type: asReleaseType(parsed.app_release_type),
      publish_platforms: asPlatforms(parsed.publish_platforms),
      phone_number: clampPhone(String(parsed.phone_number || '')),
      company_name: String(parsed.company_name || '').slice(0, 120),
      contact_person: String(parsed.contact_person || '').slice(0, 100),
      app_name: String(parsed.app_name || '').slice(0, 100),
      app_subtitle: String(parsed.app_subtitle || '').slice(0, 100),
      app_description: String(parsed.app_description || '').slice(0, 4000),
      android_store_description: String(parsed.android_store_description || '').slice(0, 4000),
      android_keywords: String(parsed.android_keywords || '').slice(0, 500),
      notes: String(parsed.notes || '').slice(0, 4000),
    };
  } catch {
    return empty;
  }
}

export function serializeAppPublishingForm(data: AppPublishingFormData): string {
  const cleaned: AppPublishingFormData = {
    ...data,
    company_name: data.company_name.trim().slice(0, 120),
    contact_person: data.contact_person.trim().slice(0, 100),
    phone_number: clampPhone(data.phone_number),
    app_name: data.app_name.trim().slice(0, 100),
    app_subtitle: data.app_subtitle.trim().slice(0, 100),
    app_description: data.app_description.trim().slice(0, 4000),
    existing_website_domain: data.existing_website_domain.trim().slice(0, 255),
    privacy_policy_url: data.privacy_policy_url.trim().slice(0, 500),
    data_deletion_url: data.data_deletion_url.trim().slice(0, 500),
    support_url: data.support_url.trim().slice(0, 500),
    android_console_email: data.android_console_email.trim().slice(0, 255),
    android_package_name: data.android_package_name.trim().slice(0, 255),
    android_store_description: data.android_store_description.trim().slice(0, 4000),
    android_keywords: data.android_keywords.trim().slice(0, 500),
    ios_apple_id_email: data.ios_apple_id_email.trim().slice(0, 255),
    ios_team_name: data.ios_team_name.trim().slice(0, 120),
    ios_team_id: data.ios_team_id.trim().slice(0, 64),
    ios_bundle_id: data.ios_bundle_id.trim().slice(0, 255),
    promotional_video_url: data.promotional_video_url.trim().slice(0, 500),
    notes: data.notes.trim().slice(0, 4000),
    android_target_audience: [...data.android_target_audience],
    updated_at: new Date().toISOString(),
  };
  return JSON.stringify(cleaned);
}

/** Digits + leading +, spaces/dashes stripped to max 15 digits (E.164-ish). */
export function clampPhone(raw: string): string {
  const trimmed = String(raw || '').trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '').slice(0, 15);
  return hasPlus && digits ? `+${digits}` : digits;
}

export function needsAndroidSection(platforms: AppPublishPlatforms): boolean {
  return platforms === 'android' || platforms === 'both' || platforms === '';
}

export function needsIosSection(platforms: AppPublishPlatforms): boolean {
  return platforms === 'ios' || platforms === 'both' || platforms === '';
}

export type AppPublishingStepId = 'basics' | 'android' | 'ios' | 'assets';

export function getAppPublishingSteps(
  platforms: AppPublishPlatforms
): { id: AppPublishingStepId; title: string; subtitle: string }[] {
  const steps: { id: AppPublishingStepId; title: string; subtitle: string }[] = [
    {
      id: 'basics',
      title: 'App & company',
      subtitle: 'Who you are and what you are publishing',
    },
  ];
  if (needsAndroidSection(platforms)) {
    steps.push({
      id: 'android',
      title: 'Android',
      subtitle: 'Google Play Console details',
    });
  }
  if (needsIosSection(platforms)) {
    steps.push({
      id: 'ios',
      title: 'iOS',
      subtitle: 'Apple App Store details',
    });
  }
  steps.push({
    id: 'assets',
    title: 'Store assets',
    subtitle: 'Icons, screenshots, and notes',
  });
  return steps;
}

export type AppPublishingFieldErrors = Partial<Record<keyof AppPublishingFormData, string>>;

export function validateAppPublishingStep(
  step: AppPublishingStepId,
  data: AppPublishingFormData
): AppPublishingFieldErrors {
  const errors: AppPublishingFieldErrors = {};

  if (step === 'basics') {
    if (!data.company_name.trim()) errors.company_name = 'Company name is required';
    if (!data.contact_person.trim()) errors.contact_person = 'Contact person is required';
    if (!data.phone_number.trim()) errors.phone_number = 'Phone number is required';
    else if (data.phone_number.replace(/\D/g, '').length < 8) {
      errors.phone_number = 'Enter a valid phone number';
    }
    if (!data.app_name.trim()) errors.app_name = 'App name is required';
    if (!data.app_release_type) errors.app_release_type = 'Select new app or update';
    if (!data.publish_platforms) errors.publish_platforms = 'Select publish platforms';
  }

  if (step === 'android' && needsAndroidSection(data.publish_platforms)) {
    if (!data.android_package_name.trim()) {
      errors.android_package_name = 'Package name is required for Android';
    } else if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i.test(data.android_package_name.trim())) {
      errors.android_package_name = 'Use format com.company.appname';
    }
    if (data.android_console_email.trim() && !data.android_console_email.includes('@')) {
      errors.android_console_email = 'Enter a valid email';
    }
  }

  if (step === 'ios' && needsIosSection(data.publish_platforms)) {
    if (!data.ios_bundle_id.trim()) {
      errors.ios_bundle_id = 'Bundle identifier is required for iOS';
    } else if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i.test(data.ios_bundle_id.trim())) {
      errors.ios_bundle_id = 'Use format com.company.appname';
    }
    if (data.ios_apple_id_email.trim() && !data.ios_apple_id_email.includes('@')) {
      errors.ios_apple_id_email = 'Enter a valid Apple ID email';
    }
  }

  if (step === 'assets') {
    if (
      data.promotional_video_url.trim() &&
      !/^https?:\/\//i.test(data.promotional_video_url.trim())
    ) {
      errors.promotional_video_url = 'Paste a full YouTube URL (https://…)';
    }
  }

  return errors;
}

export function appPublishingFormHasContent(data: AppPublishingFormData): boolean {
  return Boolean(
    data.company_name.trim() ||
      data.contact_person.trim() ||
      data.phone_number.trim() ||
      data.app_name.trim() ||
      data.publish_platforms ||
      data.status === 'submitted'
  );
}

export function appPublishingStatusLabel(status?: AppPublishingStatus | null): string {
  if (status === 'submitted') return 'Submitted';
  if (status === 'draft') return 'Draft';
  return 'Not started';
}
