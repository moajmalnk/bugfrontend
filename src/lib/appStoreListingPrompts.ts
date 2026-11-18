/**
 * Why: Admins and assigned developers paste one MasHolidays-style Cursor
 * publish pack per platform from App Form data. A staff popup can fill
 * remaining gaps for one copy/download without extending the client form schema.
 */

import type { AppPublishingFormData } from '@/lib/utils/appPublishingForm';
import {
  APP_AUDIENCE_OPTIONS,
  needsAndroidSection,
  needsIosSection,
} from '@/lib/utils/appPublishingForm';

export type StoreListingProject = {
  id?: string;
  name?: string;
};

/** Ephemeral staff overrides — not persisted on projects.app_publishing_form. */
export type StoreListingPromptExtras = {
  version: string;
  marketing_url: string;
  support_url: string;
  privacy_policy_url: string;
  data_deletion_url: string;
  portal_url: string;
  login_url: string;
  demo_email: string;
  demo_password: string;
  demo_backup: string;
  sign_in_required: string;
  shell_type: string;
  push_enabled: string;
  accounts_created_by: string;
  has_iap: string;
  paid_outside_app: string;
  purpose_audience: string;
  review_steps: string;
  external_services: string;
  ios_sku: string;
  ios_platforms: string;
  ios_secondary_category: string;
  ios_promotional_text: string;
  ios_keywords: string;
  ios_whats_new: string;
  ios_team_id: string;
  ios_bundle_id: string;
  android_package_name: string;
  android_short_description: string;
  android_whats_new: string;
  android_keystore_note: string;
};

export const emptyStoreListingPromptExtras = (): StoreListingPromptExtras => ({
  version: '',
  marketing_url: '',
  support_url: '',
  privacy_policy_url: '',
  data_deletion_url: '',
  portal_url: '',
  login_url: '',
  demo_email: '',
  demo_password: '',
  demo_backup: '',
  sign_in_required: '',
  shell_type: '',
  push_enabled: '',
  accounts_created_by: '',
  has_iap: '',
  paid_outside_app: '',
  purpose_audience: '',
  review_steps: '',
  external_services: '',
  ios_sku: '',
  ios_platforms: '',
  ios_secondary_category: '',
  ios_promotional_text: '',
  ios_keywords: '',
  ios_whats_new: '',
  ios_team_id: '',
  ios_bundle_id: '',
  android_package_name: '',
  android_short_description: '',
  android_whats_new: '',
  android_keystore_note: '',
});

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 40);
  return slug || 'app';
}

/**
 * Why: Prefill popup from App Form so staff only type true gaps.
 */
export function defaultStoreListingPromptExtras(
  form: AppPublishingFormData,
  project?: StoreListingProject
): StoreListingPromptExtras {
  const slug = slugify(form.app_name || project?.name || 'app');
  return {
    ...emptyStoreListingPromptExtras(),
    version: '1.0.0+1',
    marketing_url: form.existing_website_domain.trim(),
    support_url: form.support_url.trim(),
    privacy_policy_url: form.privacy_policy_url.trim(),
    data_deletion_url: form.data_deletion_url.trim(),
    sign_in_required: 'Yes',
    shell_type: 'Flutter WebView shell',
    push_enabled: 'No',
    has_iap: 'None',
    ios_sku: `${slug}-ios`,
    ios_platforms: 'iPhone + iPad',
    ios_keywords: form.android_keywords.trim(),
    ios_whats_new: form.app_name.trim()
      ? `Initial release of ${form.app_name.trim()}.`
      : '',
    ios_team_id: form.ios_team_id.trim(),
    ios_bundle_id: form.ios_bundle_id.trim(),
    android_package_name: form.android_package_name.trim(),
    android_short_description: form.app_subtitle.trim(),
    android_whats_new: form.app_name.trim()
      ? `Initial release of ${form.app_name.trim()}.`
      : '',
  };
}

function fill(value: string | null | undefined, label: string): string {
  const text = String(value || '').trim();
  return text || `[FILL — ${label}]`;
}

function pick(
  primary: string | null | undefined,
  fallback: string | null | undefined,
  label: string
): string {
  return fill(String(primary || '').trim() || String(fallback || '').trim(), label);
}

function audienceLabel(values: AppPublishingFormData['android_target_audience']): string {
  if (!values?.length) return '[FILL — target audience]';
  return values
    .map((v) => APP_AUDIENCE_OPTIONS.find((o) => o.value === v)?.label || v)
    .join(', ');
}

function pricingLabel(value: AppPublishingFormData['android_pricing']): string {
  if (value === 'free') return 'Free';
  if (value === 'paid') return 'Paid';
  return '[FILL — Free or Paid]';
}

function yesNoLabel(value: string, label: string): string {
  if (value === 'yes') return 'Yes';
  if (value === 'no') return 'No';
  return `[FILL — ${label}]`;
}

function yearStamp(): number {
  return new Date().getFullYear();
}

function sharedUrlsBlock(
  form: AppPublishingFormData,
  extras: StoreListingPromptExtras
): string {
  return [
    '--------------------------------------------------------------------------------',
    'URLS (must load without login where required by store policy)',
    '--------------------------------------------------------------------------------',
    `Marketing URL:     ${pick(extras.marketing_url, form.existing_website_domain, 'marketing URL')}`,
    `Support URL:       ${pick(extras.support_url, form.support_url, 'support URL — not a bare login page')}`,
    `Privacy Policy:    ${pick(extras.privacy_policy_url, form.privacy_policy_url, 'privacy policy URL')}`,
    `Data deletion:     ${pick(extras.data_deletion_url, form.data_deletion_url, 'data deletion URL')}`,
    `Portal (in-app):   ${fill(extras.portal_url, 'portal / WebView URL')}`,
    `Login (review):    ${fill(extras.login_url, 'reviewer login URL if different')}`,
  ].join('\n');
}

function clientNotesBlock(form: AppPublishingFormData): string {
  const notes = form.notes.trim();
  if (!notes) {
    return [
      '--------------------------------------------------------------------------------',
      'CLIENT NOTES (from App Form)',
      '--------------------------------------------------------------------------------',
      '[FILL — none provided in App Form notes]',
    ].join('\n');
  }
  return [
    '--------------------------------------------------------------------------------',
    'CLIENT NOTES (from App Form)',
    '--------------------------------------------------------------------------------',
    notes,
  ].join('\n');
}

function reviewNotesSkeleton(
  form: AppPublishingFormData,
  appName: string,
  extras: StoreListingPromptExtras
): string {
  const demoEmail = fill(extras.demo_email, 'demo email');
  const demoPassword = fill(extras.demo_password, 'demo password');
  return [
    '--------------------------------------------------------------------------------',
    'APP REVIEW INFORMATION',
    '--------------------------------------------------------------------------------',
    `Sign-in required: ${fill(extras.sign_in_required, 'Yes/No after audit')}`,
    '',
    'Primary demo account (also enter in Sign-in fields):',
    `  Email:    ${demoEmail}`,
    `  Password: ${demoPassword}`,
    `Contact phone: ${fill(form.phone_number, 'App Review contact phone')}`,
    `Contact person: ${fill(form.contact_person, 'App Review contact name')}`,
    `Backup roles: ${fill(extras.demo_backup, 'Admin / Agent / Customer if multi-role')}`,
    '',
    '--------------------------------------------------------------------------------',
    'Notes for Review — PASTE into App Review Information → Notes',
    '--------------------------------------------------------------------------------',
    '',
    `${appName} — App Review Notes`,
    '',
    '1) PURPOSE AND TARGET AUDIENCE',
    fill(
      extras.purpose_audience,
      `one paragraph: what ${appName} does and who uses it`
    ),
    '',
    '2) HOW TO SET UP / ACCESS MAIN FEATURES (+ LOGIN)',
    'Internet required: Yes (confirm if offline-capable)',
    `Demo account: ${demoEmail} / ${demoPassword}`,
    `Steps: ${fill(extras.review_steps, 'Launch → Login → key screens: home → detail → profile')}`,
    `Accounts created by: ${fill(extras.accounts_created_by, 'admin outside app / self-serve')}`,
    `In-app purchases / subscriptions: ${fill(extras.has_iap, 'None / list')}`,
    `Paid outside the app: ${fill(extras.paid_outside_app, 'Yes/No')}`,
    '',
    '3) EXTERNAL SERVICES',
    fill(extras.external_services, 'portal host, auth, payments, Firebase, fonts, etc.'),
    '',
    '4) BUSINESS MODEL (Guideline 2.1 / 3.2 if B2B)',
    `- Who creates accounts? ${fill(extras.accounts_created_by, 'who creates accounts')}`,
    `- IAP / subscriptions? ${fill(extras.has_iap, 'IAP')}`,
    `- Sign-in required? ${fill(extras.sign_in_required, 'sign-in')}`,
    '- Distribution: Free companion / paid listing — confirm',
    '',
    '5) NATIVE SHELL',
    `Shell type: ${fill(extras.shell_type, 'Flutter WebView shell / native API client')}`,
    `Push notifications in this build: ${fill(extras.push_enabled, 'OFF unless APNs/FCM implemented')}`,
  ].join('\n');
}

/**
 * Why: Filename-safe slug for store_listing_*.txt downloads.
 */
export function storeListingFileSlug(
  form: AppPublishingFormData,
  project?: StoreListingProject
): string {
  return slugify(form.app_name || project?.name || 'app');
}

export function buildIosStoreListingPrompt(
  form: AppPublishingFormData,
  project?: StoreListingProject,
  extrasInput?: Partial<StoreListingPromptExtras> | null
): string {
  const extras = {
    ...emptyStoreListingPromptExtras(),
    ...extrasInput,
  };
  const appName = fill(form.app_name || project?.name, 'App Store display name');
  const company = fill(form.company_name, 'legal / company name');
  const skuDefault = `${slugify(form.app_name || project?.name || 'app')}-ios`;
  const sku = fill(extras.ios_sku, `e.g. ${skuDefault}`);
  const bundleId = pick(extras.ios_bundle_id, form.ios_bundle_id, 'iOS Bundle ID');
  const teamId = pick(extras.ios_team_id, form.ios_team_id, 'Apple Team ID');
  const price =
    form.android_pricing === 'paid'
      ? 'Paid (confirm iOS price tier)'
      : form.android_pricing === 'free'
        ? 'Free'
        : '[FILL — Free or Paid]';
  const year = yearStamp();
  const description =
    form.app_description.trim() ||
    form.android_store_description.trim() ||
    '';
  const keywords =
    extras.ios_keywords.trim() ||
    form.android_keywords.trim() ||
    '';
  const whatsNew =
    extras.ios_whats_new.trim() ||
    (appName.startsWith('[FILL')
      ? '[FILL — app name]'
      : `Initial release of ${appName}.`);
  const version = fill(extras.version, 'e.g. 1.0.0+1');

  return [
    '================================================================================',
    `${appName} — App Store Connect listing (paste-ready for Cursor)`,
    '================================================================================',
    `Version: ${version}`,
    `Team ID / DEVELOPMENT_TEAM: ${teamId}`,
    `Apple ID account: ${fill(form.ios_apple_id_email, 'Apple ID email')}`,
    `Team name: ${fill(form.ios_team_name, 'Apple team / org name')}`,
    `Bundle ID: ${bundleId}`,
    `SKU: ${sku}`,
    `Platforms: ${fill(extras.ios_platforms, 'iPhone only / iPhone + iPad')}`,
    `Price: ${price}`,
    `Primary category: ${fill(form.ios_category, 'iOS primary category')}`,
    `Secondary category: ${fill(extras.ios_secondary_category, 'secondary category')}`,
    `Age rating: ${fill(form.ios_age_rating, 'iOS age rating')}`,
    `Primary language: ${fill(form.ios_primary_language, 'primary language')}`,
    `Copyright: ${year} ${company}`,
    `Release type: ${form.app_release_type === 'update' ? 'Existing app update' : form.app_release_type === 'new' ? 'New app' : '[FILL — new or update]'}`,
    `Has Apple Developer account: ${yesNoLabel(form.ios_has_developer_account, 'has Apple Developer account')}`,
    '',
    '--------------------------------------------------------------------------------',
    'GOAL — Paste into Cursor',
    '--------------------------------------------------------------------------------',
    `Prepare and publish ${appName} to the Apple App Store.`,
    'Follow the Bzole / NurseXPro professional flow:',
    '1. Audit Flutter project → fix iOS identifiers',
    '2. Build IPA (flutter build ipa --release)',
    '3. Register Explicit App ID in Apple Developer (if missing)',
    '4. Create New App in App Store Connect',
    '5. Upload IPA via Transporter',
    '6. Screenshots + listing + App Privacy Publish',
    '7. App Review demo login + Submit',
    'Do NOT touch unrelated sibling apps on the same Apple account.',
    '',
    '--------------------------------------------------------------------------------',
    'APP INFORMATION',
    '--------------------------------------------------------------------------------',
    `App name: ${appName}`,
    `Subtitle (≤30): ${fill(form.app_subtitle, 'subtitle ≤30 chars')}`,
    '',
    'Promotional text (≤170):',
    fill(extras.ios_promotional_text, 'promotional text ≤170 chars'),
    '',
    'Description:',
    description || '[FILL — App Store description from product features]',
    '',
    'Keywords (≤100 chars, comma-separated):',
    keywords || '[FILL — keywords ≤100 chars]',
    '',
    `What's New (${version.split('+')[0] || '1.0.0'}):`,
    whatsNew,
    '',
    sharedUrlsBlock(form, extras),
    '',
    reviewNotesSkeleton(form, appName, extras),
    '',
    '--------------------------------------------------------------------------------',
    'ASC CHECKLIST (Bzole / NurseXPro pattern)',
    '--------------------------------------------------------------------------------',
    `[ ] Apple Developer → Identifiers → Explicit App ID ${bundleId}`,
    `      Name: ${appName}`,
    `      Push Notifications: ${extras.push_enabled.trim().toLowerCase() === 'yes' ? 'ON' : 'OFF'} unless implemented`,
    '      Do not enable unused capabilities',
    '[ ] App Store Connect → My Apps → (+) New App',
    '      Platforms: iOS',
    `      Name: ${appName}`,
    `      Primary Language: ${fill(form.ios_primary_language, 'language')}`,
    `      Bundle ID: ${bundleId}`,
    `      SKU: ${sku}`,
    '      User Access: Full Access',
    '[ ] Build IPA: flutter build ipa --release → build/ios/ipa/*.ipa',
    '[ ] Upload IPA with Transporter (same Mac / Apple ID as other apps on this team)',
    '[ ] Wait for processing; select build on version 1.0 Prepare for Submission',
    '[ ] Screenshots — iPhone 6.5" / Dynamic Island medium (min 3)',
    '[ ] Screenshots — iPad 13" if universal',
    '[ ] App Privacy → complete labels → Publish (required before Add for Review)',
    `[ ] Pricing: ${price}`,
    '[ ] Age rating questionnaire completed',
    `[ ] Copyright: ${year} ${company}`,
    '[ ] Content Rights: Yes if brand/portal UI owned by publisher',
    '[ ] Export Compliance: Uses non-exempt encryption? NO (ITSAppUsesNonExemptEncryption=false)',
    '[ ] Advertising Identifier (IDFA): No (unless ads SDK added)',
    '[ ] Regulated Medical Device: No (unless truly a medical device)',
    '[ ] Support URL is NOT a bare login page',
    '[ ] Privacy Policy URL set',
    '[ ] Review demo credentials filled',
    '[ ] Add for Review → Submit',
    '[ ] Target status: Waiting for Review',
    '',
    '--------------------------------------------------------------------------------',
    'APP PRIVACY LABELS (honest — no tracking unless real)',
    '--------------------------------------------------------------------------------',
    'Tracking: No — Do NOT mark Used for Tracking unless ads/ATT SDKs exist.',
    'Declare only data actually collected (Linked to user, App Functionality):',
    '• Contact Info — Name, Email, Phone (if collected)',
    '• Identifiers — User ID (if collected)',
    '• User Content — Photos / documents (ONLY if used)',
    '• Location — ONLY if used',
    '• Payment / Purchase Info — ONLY if collected in-app (not Apple IAP alone)',
    'Publish App Privacy after Privacy Policy URL is saved.',
    '',
    '--------------------------------------------------------------------------------',
    'PHASE 1 — PROJECT FIXES (iOS)',
    '--------------------------------------------------------------------------------',
    `- Bundle ID: ${bundleId} — NEVER com.example.*`,
    `- DEVELOPMENT_TEAM = ${teamId} (Debug/Release/Profile)`,
    '- CODE_SIGN_STYLE = Automatic',
    `- Display name: ${appName}`,
    '- ITSAppUsesNonExemptEncryption = false',
    '- Add PrivacyInfo.xcprivacy if missing',
    '- TARGETED_DEVICE_FAMILY = 1,2 unless iPhone-only',
    '- Opaque 1024×1024 App Store icon (no alpha)',
    '- Honest Info.plist usage strings ONLY for APIs used',
    `- Do NOT enable Push unless APNs/FCM is implemented (extras: ${fill(extras.push_enabled, 'push')})`,
    '- debugShowCheckedModeBanner: false; offline handling on login/main path',
    `- Version for store release: ${version}`,
    '',
    '--------------------------------------------------------------------------------',
    'SCREENSHOTS',
    '--------------------------------------------------------------------------------',
    'iPhone 6.5" / Dynamic Island medium — min 3, ideal 5–7',
    'Capture: splash/login → home → detail → key flow → profile/more',
    'Save under store_screenshots/ (or project publishing_phone_screenshots / tablet)',
    `Promotional video URL: ${form.promotional_video_url.trim() || '[FILL — optional promo video URL]'}`,
    '',
    '--------------------------------------------------------------------------------',
    'TRANSPORTER / SUBMIT STEPS',
    '--------------------------------------------------------------------------------',
    `1. App ID: ${bundleId} — register if missing; keep Push OFF unless used.`,
    `2. Create New App in ASC (SKU ${sku}).`,
    `3. Sign into Transporter as ${fill(form.ios_apple_id_email, 'Apple ID')}.`,
    '4. Deliver: build/ios/ipa/<generated>.ipa',
    '5. ASC → version 1.0 → Build → select processed build.',
    '6. Fill listing, URLs, screenshots, copyright, medical device = No.',
    '7. App Privacy → Publish.',
    '8. App Review Information → demo login + notes.',
    '9. Add for Review → Submit → confirm Waiting for Review.',
    '',
    clientNotesBlock(form),
    '',
    '================================================================================',
    'END',
    '================================================================================',
    '',
  ].join('\n');
}

export function buildAndroidStoreListingPrompt(
  form: AppPublishingFormData,
  project?: StoreListingProject,
  extrasInput?: Partial<StoreListingPromptExtras> | null
): string {
  const extras = {
    ...emptyStoreListingPromptExtras(),
    ...extrasInput,
  };
  const appName = fill(form.app_name || project?.name, 'Play Store display name');
  const company = fill(form.company_name, 'legal / company name');
  const packageName = pick(
    extras.android_package_name,
    form.android_package_name,
    'Android applicationId / package name'
  );
  const price = pricingLabel(form.android_pricing);
  const year = yearStamp();
  const description =
    form.android_store_description.trim() ||
    form.app_description.trim() ||
    '';
  const isUpdate = form.app_release_type === 'update';
  const version = fill(extras.version, 'e.g. 1.0.0+1');
  const shortDesc = pick(
    extras.android_short_description,
    form.app_subtitle,
    'short description ≤80 chars'
  );
  const whatsNew =
    extras.android_whats_new.trim() ||
    (appName.startsWith('[FILL')
      ? '[FILL — app name]'
      : `Initial release of ${appName}.`);
  const demoEmail = fill(extras.demo_email, 'demo email');
  const demoPassword = fill(extras.demo_password, 'demo password');

  return [
    '================================================================================',
    `${appName} — Google Play listing (paste-ready for Cursor)`,
    '================================================================================',
    `Version: ${version}`,
    `Play Console email: ${fill(form.android_console_email, 'Play Console email')}`,
    `Package name / applicationId: ${packageName}`,
    `Price: ${price}`,
    `Category: ${fill(form.android_category, 'Play category')}`,
    `Contains ads: ${yesNoLabel(form.android_contains_ads, 'contains ads')}`,
    `Target audience: ${audienceLabel(form.android_target_audience)}`,
    `Has Play account: ${yesNoLabel(form.android_has_play_account, 'has Play Console account')}`,
    `Copyright / developer: ${year} ${company}`,
    `Release type: ${isUpdate ? 'Existing app update' : form.app_release_type === 'new' ? 'New app' : '[FILL — new or update]'}`,
    '',
    '--------------------------------------------------------------------------------',
    'GOAL — Paste into Cursor',
    '--------------------------------------------------------------------------------',
    `Prepare and publish ${appName} to Google Play.`,
    'Follow the same professional flow used for sibling apps:',
    '1. Audit Flutter project → fix Android identifiers + signing',
    '2. Build AAB (flutter build appbundle --release)',
    '3. Create / update app in Play Console',
    '4. Upload AAB, complete store listing + content rating + Data safety',
    '5. Screenshots + feature graphic + icon',
    '6. Demo login for review + Submit for review',
    isUpdate
      ? 'CRITICAL: App already on Play — DO NOT change the live applicationId / package name.'
      : 'New listing: set production applicationId once; never use com.example.*.',
    '',
    '--------------------------------------------------------------------------------',
    'STORE LISTING',
    '--------------------------------------------------------------------------------',
    `App name: ${appName}`,
    `Short description (≤80): ${shortDesc}`,
    '',
    'Full description:',
    description || '[FILL — Play Store full description]',
    '',
    `Keywords / ASO notes: ${form.android_keywords.trim() || '[FILL — keywords / ASO notes]'}`,
    '',
    `What's New (${version.split('+')[0] || '1.0.0'}):`,
    whatsNew,
    '',
    sharedUrlsBlock(form, extras),
    '',
    '--------------------------------------------------------------------------------',
    'APP ACCESS / REVIEW',
    '--------------------------------------------------------------------------------',
    `Sign-in required: ${fill(extras.sign_in_required, 'Yes/No')}`,
    `Demo email: ${demoEmail}`,
    `Demo password: ${demoPassword}`,
    `Contact phone: ${fill(form.phone_number, 'review contact phone')}`,
    `Contact person: ${fill(form.contact_person, 'review contact name')}`,
    `Instructions: ${fill(extras.review_steps, 'Launch → Login → key flows')}`,
    `Accounts created by: ${fill(extras.accounts_created_by, 'who creates accounts')}`,
    `IAP / subscriptions: ${fill(extras.has_iap, 'None / list')}`,
    '',
    '--------------------------------------------------------------------------------',
    'PLAY CONSOLE CHECKLIST',
    '--------------------------------------------------------------------------------',
    `[ ] Create / open app for package ${packageName}`,
    '[ ] Upload release AAB (Production or Internal testing first)',
    '[ ] Store listing: title, short + full description, icon, feature graphic',
    '[ ] Phone screenshots (min required) + tablet if applicable',
    `[ ] Category: ${fill(form.android_category, 'category')}`,
    `[ ] Pricing: ${price}`,
    `[ ] Ads declaration: ${yesNoLabel(form.android_contains_ads, 'contains ads')}`,
    '[ ] Content rating questionnaire completed',
    '[ ] Target audience / News apps / COVID declarations as applicable',
    '[ ] Data safety form completed (honest; match Privacy Policy)',
    '[ ] Privacy Policy URL set',
    '[ ] App access / demo credentials if sign-in required',
    '[ ] Submit for review → target: In review / Pending publication',
    '',
    '--------------------------------------------------------------------------------',
    'DATA SAFETY (honest)',
    '--------------------------------------------------------------------------------',
    'Declare only data collected. No tracking unless ads/analytics SDKs require it.',
    'Typical: name/email/phone/user ID for App functionality, linked to user.',
    'Photos/files/location/payments ONLY if truly used.',
    '',
    '--------------------------------------------------------------------------------',
    'PHASE 1 — PROJECT FIXES (Android)',
    '--------------------------------------------------------------------------------',
    `- applicationId / namespace: ${packageName}`,
    '- Align MainActivity package with applicationId',
    `- App label: ${appName}`,
    '- Release signing via android/key.properties + upload-keystore.jks',
    '- Add android/key.properties.example (no secrets)',
    '- Gitignore: key.properties, *.jks, *.keystore',
    fill(extras.android_keystore_note, 'key.properties path and keystore path on this machine'),
    isUpdate
      ? `- Live package must remain ${packageName} — do not rename`
      : '- Confirm package is final before first Play upload',
    '- debugShowCheckedModeBanner: false; offline handling on login/main path',
    `- Version: ${version}`,
    '',
    '--------------------------------------------------------------------------------',
    'BUILD / UPLOAD',
    '--------------------------------------------------------------------------------',
    '1. flutter pub get',
    '2. flutter analyze lib',
    '3. flutter build appbundle --release',
    '4. Output: build/app/outputs/bundle/release/app-release.aab',
    '5. Play Console → Production (or testing track) → upload AAB',
    '6. Complete listing + Data safety + content rating',
    '7. Submit for review',
    '',
    '--------------------------------------------------------------------------------',
    'SCREENSHOTS / ASSETS',
    '--------------------------------------------------------------------------------',
    'Phone screenshots from publishing_phone_screenshots (or capture)',
    'Tablet screenshots if required',
    'Icon: publishing_icon; Feature graphic: publishing_feature_graphic',
    `Promotional video URL: ${form.promotional_video_url.trim() || '[FILL — optional promo video URL]'}`,
    '',
    clientNotesBlock(form),
    '',
    '================================================================================',
    'END',
    '================================================================================',
    '',
  ].join('\n');
}

export function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function storeListingPlatformFlags(form: AppPublishingFormData): {
  showIos: boolean;
  showAndroid: boolean;
} {
  return {
    showIos: needsIosSection(form.publish_platforms),
    showAndroid: needsAndroidSection(form.publish_platforms),
  };
}

export function extrasAreDirty(
  current: StoreListingPromptExtras,
  initial: StoreListingPromptExtras
): boolean {
  return (Object.keys(current) as (keyof StoreListingPromptExtras)[]).some(
    (key) => current[key] !== initial[key]
  );
}
