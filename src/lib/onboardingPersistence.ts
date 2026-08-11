/**
 * Why: Onboarding is multi-step; refresh must not wipe address/banking progress.
 * Text fields live in sessionStorage; file blobs in IndexedDB (File can't JSON).
 */

export const ONBOARDING_STEP_SLUGS = [
  "address",
  "statutory",
  "banking",
  "permissions",
  "legal",
] as const;

export type OnboardingStepSlug = (typeof ONBOARDING_STEP_SLUGS)[number];

/** Why: Employee self-setup / Profile "Edit profile" wizard (?onboarding=address). */
export const ONBOARDING_URL_PARAM = "onboarding";

/**
 * Why: Admin fill/edit on User Details must not reuse ?onboarding= —
 * that key drives Profile self-edit and would collide on shared routes.
 */
export const ADMIN_ONBOARDING_URL_PARAM = "employee_onboarding";

export function isOnboardingStepSlug(
  value: string | null | undefined
): value is OnboardingStepSlug {
  return !!value && (ONBOARDING_STEP_SLUGS as readonly string[]).includes(value);
}

const FILE_KEYS = ["aadhaar_file", "pan_file", "profile_photo"] as const;
type FileField = (typeof FILE_KEYS)[number];

export type OnboardingDraftForm = {
  emergency_contact: string;
  emergency_contact_verified: boolean;
  emergency_contact_verified_at: string | null;
  contact_email: string;
  contact_email_verified: boolean;
  contact_email_verified_at: string | null;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  github_url: string;
  linkedin_url: string;
  house_name_number: string;
  landmark: string;
  city: string;
  post_office: string;
  pin_code: string;
  district: string;
  state: string;
  country: string;
  wfh_latitude: number | null;
  wfh_longitude: number | null;
  aadhaar_number: string;
  pan_number: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name: string;
  account_type: string;
  upi_id: string;
  upi_linked_phone: string;
  aadhaar_file: File | null;
  pan_file: File | null;
  profile_photo: File | null;
  terms_accepted: boolean;
  privacy_accepted: boolean;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
};

type DraftText = Omit<
  OnboardingDraftForm,
  "aadhaar_file" | "pan_file" | "profile_photo"
> & {
  step: number;
  fileNames: Partial<Record<FileField, string>>;
};

function draftKey(userId: string) {
  return `bugricer_onboarding_draft_v1_${userId}`;
}

function idbName(userId: string) {
  return `bugricer_onboarding_files_${userId}`;
}

export function stepToSlug(step: number): OnboardingStepSlug {
  return ONBOARDING_STEP_SLUGS[Math.min(Math.max(step, 0), 4)] ?? "address";
}

export function slugToStep(slug: string | null | undefined): number {
  if (!slug) return 0;
  const idx = ONBOARDING_STEP_SLUGS.indexOf(slug as OnboardingStepSlug);
  return idx >= 0 ? idx : 0;
}

function openDb(userId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(idbName(userId), 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

async function putFile(userId: string, key: FileField, file: File | null) {
  const db = await openDb(userId);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    const store = tx.objectStore("files");
    if (file) {
      store.put({ name: file.name, type: file.type, blob: file }, key);
    } else {
      store.delete(key);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
  });
  db.close();
}

async function getFile(userId: string, key: FileField): Promise<File | null> {
  try {
    const db = await openDb(userId);
    const row = await new Promise<{ name: string; type: string; blob: Blob } | undefined>(
      (resolve, reject) => {
        const tx = db.transaction("files", "readonly");
        const req = tx.objectStore("files").get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
      }
    );
    db.close();
    if (!row?.blob) return null;
    return new File([row.blob], row.name || key, {
      type: row.type || row.blob.type || "application/octet-stream",
    });
  } catch {
    return null;
  }
}

export async function saveOnboardingDraft(
  userId: string,
  step: number,
  form: OnboardingDraftForm
): Promise<void> {
  if (!userId) return;

  const fileNames: DraftText["fileNames"] = {};
  for (const key of FILE_KEYS) {
    const file = form[key];
    if (file) fileNames[key] = file.name;
    await putFile(userId, key, file);
  }

  const payload: DraftText = {
    step,
    emergency_contact: form.emergency_contact,
    emergency_contact_verified: !!form.emergency_contact_verified,
    emergency_contact_verified_at: form.emergency_contact_verified_at,
    contact_email: form.contact_email,
    contact_email_verified: !!form.contact_email_verified,
    contact_email_verified_at: form.contact_email_verified_at,
    house_name_number: form.house_name_number,
    landmark: form.landmark,
    city: form.city,
    post_office: form.post_office,
    pin_code: form.pin_code,
    district: form.district,
    state: form.state,
    country: form.country,
    wfh_latitude: form.wfh_latitude,
    wfh_longitude: form.wfh_longitude,
    aadhaar_number: form.aadhaar_number,
    pan_number: form.pan_number,
    account_holder_name: form.account_holder_name,
    bank_name: form.bank_name,
    account_number: form.account_number,
    ifsc_code: form.ifsc_code,
    branch_name: form.branch_name,
    account_type: form.account_type,
    upi_id: form.upi_id,
    upi_linked_phone: form.upi_linked_phone,
    terms_accepted: form.terms_accepted,
    privacy_accepted: form.privacy_accepted,
    terms_accepted_at: form.terms_accepted_at,
    privacy_accepted_at: form.privacy_accepted_at,
    fileNames,
  };

  sessionStorage.setItem(draftKey(userId), JSON.stringify(payload));
}

export async function loadOnboardingDraft(
  userId: string,
  initial: OnboardingDraftForm
): Promise<{ step: number; form: OnboardingDraftForm } | null> {
  if (!userId) return null;
  const raw = sessionStorage.getItem(draftKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as DraftText;
    const form: OnboardingDraftForm = {
      ...initial,
      emergency_contact: parsed.emergency_contact ?? "",
      emergency_contact_verified: !!parsed.emergency_contact_verified,
      emergency_contact_verified_at: parsed.emergency_contact_verified_at ?? null,
      contact_email: parsed.contact_email ?? "",
      contact_email_verified: !!parsed.contact_email_verified,
      contact_email_verified_at: parsed.contact_email_verified_at ?? null,
      date_of_birth: parsed.date_of_birth ?? "",
      gender: parsed.gender ?? "",
      marital_status: parsed.marital_status ?? "",
      github_url: parsed.github_url ?? "",
      linkedin_url: parsed.linkedin_url ?? "",
      house_name_number: parsed.house_name_number ?? "",
      landmark: parsed.landmark ?? "",
      city: parsed.city ?? "",
      post_office: parsed.post_office ?? "",
      pin_code: parsed.pin_code ?? "",
      district: parsed.district ?? "",
      state: parsed.state || "Kerala",
      country: parsed.country || "India",
      wfh_latitude: parsed.wfh_latitude ?? null,
      wfh_longitude: parsed.wfh_longitude ?? null,
      aadhaar_number: parsed.aadhaar_number ?? "",
      pan_number: parsed.pan_number ?? "",
      account_holder_name: parsed.account_holder_name ?? "",
      bank_name: parsed.bank_name ?? "",
      account_number: parsed.account_number ?? "",
      ifsc_code: parsed.ifsc_code ?? "",
      branch_name: parsed.branch_name ?? "",
      account_type: parsed.account_type ?? "salary",
      upi_id: parsed.upi_id ?? "",
      upi_linked_phone: parsed.upi_linked_phone ?? "",
      terms_accepted: !!parsed.terms_accepted,
      privacy_accepted: !!parsed.privacy_accepted,
      terms_accepted_at: parsed.terms_accepted_at ?? null,
      privacy_accepted_at: parsed.privacy_accepted_at ?? null,
      aadhaar_file: null,
      pan_file: null,
      profile_photo: null,
    };

    form.aadhaar_file = await getFile(userId, "aadhaar_file");
    form.pan_file = await getFile(userId, "pan_file");
    form.profile_photo = await getFile(userId, "profile_photo");

    return {
      step: Math.min(Math.max(Number(parsed.step) || 0, 0), 4),
      form,
    };
  } catch {
    return null;
  }
}

export async function clearOnboardingDraft(userId: string): Promise<void> {
  if (!userId) return;
  sessionStorage.removeItem(draftKey(userId));
  try {
    const db = await openDb(userId);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB clear failed"));
    });
    db.close();
    indexedDB.deleteDatabase(idbName(userId));
  } catch {
    // ignore cleanup errors
  }
}
