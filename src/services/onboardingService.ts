import { apiClient } from "@/lib/axios";

export interface UserOnboardingDetails {
  id?: number;
  user_id: string;
  emergency_contact?: string | null;
  emergency_contact_verified_at?: string | null;
  contact_email?: string | null;
  contact_email_verified_at?: string | null;
  date_of_birth?: string | null;
  gender?: "male" | "female" | "other" | "prefer_not_to_say" | string | null;
  marital_status?: "single" | "married" | "divorced" | "widowed" | "other" | string | null;
  git_username?: string | null;
  git_email?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  house_name_number?: string | null;
  landmark?: string | null;
  city?: string | null;
  post_office?: string | null;
  pin_code?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string | null;
  wfh_latitude?: number | string | null;
  wfh_longitude?: number | string | null;
  aadhaar_number?: string | null;
  aadhaar_file_path?: string | null;
  pan_number?: string | null;
  pan_file_path?: string | null;
  offer_letter_path?: string | null;
  nda_path?: string | null;
  account_holder_name?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  branch_name?: string | null;
  account_type?: string | null;
  upi_id?: string | null;
  upi_linked_phone?: string | null;
  has_aadhaar_file?: boolean;
  has_pan_file?: boolean;
  has_offer_letter?: boolean;
  has_nda?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OnboardingPayload {
  emergency_contact: string;
  contact_email: string;
  emergency_contact_verified_at?: string | null;
  contact_email_verified_at?: string | null;
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
  wfh_latitude?: number | null;
  wfh_longitude?: number | null;
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
  terms_accepted: boolean;
  privacy_accepted: boolean;
  terms_accepted_at?: string | null;
  privacy_accepted_at?: string | null;
  /** Required when user.must_set_password = 1 (new hires only) */
  password?: string;
  confirm_password?: string;
  /** Optional on edit when an Aadhaar scan is already on file */
  aadhaar_file?: File | null;
  pan_file?: File | null;
  /** Optional on edit when a profile photo is already on file */
  profile_photo?: File | null;
}

export interface GetOnboardingResponse {
  user: {
    id: string;
    username: string;
    email: string;
    phone?: string | null;
    avatar?: string | null;
    joining_date?: string | null;
    employee_code?: string | null;
    job_title?: string | null;
    job_level?: string | null;
    department?: string | null;
    reports_to_user_id?: string | null;
    reports_to_username?: string | null;
    contract_type?: string | null;
    offer_letter_issued?: number | boolean | null;
    offer_letter_shared_date?: string | null;
    probation_end_date?: string | null;
    employment_status?: string | null;
    role?: string;
    onboarding_completed?: number;
    must_set_password?: number;
    onboarding_completed_at?: string | null;
    onboarding_verification_status?: string;
    onboarding_verified_at?: string | null;
    onboarding_rejection_reason?: string | null;
    onboarding_rejection_note?: string | null;
    onboarding_rejection_action?: string | null;
    terms_accepted_at?: string | null;
    privacy_accepted_at?: string | null;
  };
  details: UserOnboardingDetails | null;
  onboarding_completed: number;
  must_set_password?: number;
  onboarding_completed_at?: string | null;
  onboarding_verification_status?: string;
  onboarding_verified_at?: string | null;
  onboarding_rejection_reason?: string | null;
  onboarding_rejection_note?: string | null;
  onboarding_rejection_action?: string | null;
  terms_accepted_at?: string | null;
  privacy_accepted_at?: string | null;
}

function buildFormData(
  payload: OnboardingPayload,
  options?: { forUserId?: string }
): FormData {
  const fd = new FormData();
  const textKeys: (keyof OnboardingPayload)[] = [
    "emergency_contact",
    "contact_email",
    "date_of_birth",
    "gender",
    "marital_status",
    "github_url",
    "linkedin_url",
    "house_name_number",
    "landmark",
    "city",
    "post_office",
    "pin_code",
    "district",
    "state",
    "country",
    "aadhaar_number",
    "pan_number",
    "account_holder_name",
    "bank_name",
    "account_number",
    "ifsc_code",
    "branch_name",
    "account_type",
    "upi_id",
    "upi_linked_phone",
  ];

  for (const key of textKeys) {
    const value = payload[key];
    fd.append(key, value == null ? "" : String(value));
  }

  if (payload.wfh_latitude != null) {
    fd.append("wfh_latitude", String(payload.wfh_latitude));
  }
  if (payload.wfh_longitude != null) {
    fd.append("wfh_longitude", String(payload.wfh_longitude));
  }

  fd.append("terms_accepted", payload.terms_accepted ? "1" : "0");
  fd.append("privacy_accepted", payload.privacy_accepted ? "1" : "0");
  if (payload.terms_accepted_at) {
    fd.append("terms_accepted_at", payload.terms_accepted_at);
  }
  if (payload.privacy_accepted_at) {
    fd.append("privacy_accepted_at", payload.privacy_accepted_at);
  }
  if (payload.emergency_contact_verified_at) {
    fd.append("emergency_contact_verified_at", payload.emergency_contact_verified_at);
  }
  if (payload.contact_email_verified_at) {
    fd.append("contact_email_verified_at", payload.contact_email_verified_at);
  }
  if (payload.password) {
    fd.append("password", payload.password);
  }
  if (payload.confirm_password) {
    fd.append("confirm_password", payload.confirm_password);
  }
  if (payload.aadhaar_file) {
    fd.append("aadhaar_file", payload.aadhaar_file);
  }
  if (payload.profile_photo) {
    fd.append("profile_photo", payload.profile_photo);
  }
  if (payload.pan_file) {
    fd.append("pan_file", payload.pan_file);
  }
  if (options?.forUserId) {
    fd.append("for_user_id", options.forUserId);
  }

  return fd;
}

export const onboardingService = {
  async submit(
    payload: OnboardingPayload,
    options?: { timeoutMs?: number; forUserId?: string }
  ) {
    const hasFiles = !!(payload.aadhaar_file || payload.pan_file || payload.profile_photo);
    // Why: Text-only edits should not wait for the 120s file-upload budget.
    const timeout = options?.timeoutMs ?? (hasFiles ? 120_000 : 25_000);
    const response = await apiClient.post(
      "/users/submit_onboarding.php",
      buildFormData(payload, { forUserId: options?.forUserId }),
      { timeout }
    );
    return response.data;
  },

  async sendEmergencyOtp(phone: string) {
    const response = await apiClient.post("/users/send_emergency_otp.php", { phone });
    return response.data;
  },

  async verifyEmergencyOtp(phone: string, otp: string) {
    const response = await apiClient.post("/users/verify_emergency_otp.php", { phone, otp });
    return response.data;
  },

  async sendContactEmailOtp(email: string) {
    const response = await apiClient.post("/users/send_contact_email_otp.php", { email });
    return response.data;
  },

  async verifyContactEmailOtp(email: string, otp: string) {
    const response = await apiClient.post("/users/verify_contact_email_otp.php", { email, otp });
    return response.data;
  },

  async get(userId?: string): Promise<GetOnboardingResponse> {
    const params = userId ? { user_id: userId } : undefined;
    const response = await apiClient.get("/users/get_onboarding.php", { params });
    return response.data?.data as GetOnboardingResponse;
  },

  async verify(
    userId: string,
    action: "verify" | "reject" = "verify",
    options?: {
      rejectionReasons?: string[];
      /** @deprecated Prefer rejectionReasons multi-select */
      rejectionReason?: string;
      rejectionNote?: string;
    }
  ) {
    const reasons =
      options?.rejectionReasons?.filter(Boolean) ??
      (options?.rejectionReason ? [options.rejectionReason] : []);
    const response = await apiClient.post("/users/verify_onboarding.php", {
      user_id: userId,
      action,
      ...(action === "reject"
        ? {
            rejection_reasons: reasons,
            rejection_reason: reasons.join(","),
            rejection_note: options?.rejectionNote || undefined,
          }
        : {}),
    });
    return response.data;
  },

  downloadUrl(userId: string, file: "aadhaar_file_path" | "pan_file_path" | "offer_letter_path" | "nda_path") {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token") || "";
    const base = apiClient.defaults.baseURL?.replace(/\/$/, "") || "";
    return `${base}/users/download_statutory.php?user_id=${encodeURIComponent(userId)}&file=${encodeURIComponent(file)}&token=${encodeURIComponent(token)}`;
  },

  async downloadFile(
    userId: string,
    file: "aadhaar_file_path" | "pan_file_path" | "offer_letter_path" | "nda_path",
    options?: { preview?: boolean }
  ) {
    const response = await apiClient.get("/users/download_statutory.php", {
      params: {
        user_id: userId,
        file,
        ...(options?.preview ? { preview: "1" } : {}),
      },
      responseType: "blob",
    });
    const blob = response.data as Blob;
    const headerType = String(response.headers?.["content-type"] || "").split(";")[0].trim();
    if (headerType && (!blob.type || blob.type === "application/octet-stream")) {
      return new Blob([blob], { type: headerType });
    }
    return blob;
  },
};
