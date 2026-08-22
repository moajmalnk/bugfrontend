import { ENV } from '@/lib/env';

export type RecruitmentStatus =
  | 'applied'
  | 'hr_screening'
  | 'staff_interview'
  | 'final_round'
  | 'offered'
  | 'rejected';

export type RecruitmentAttachment = {
  id: string;
  applicant_id: string;
  kind: 'resume' | 'supporting';
  file_path: string;
  file_name: string;
  file_type?: string | null;
  file_size?: number | null;
  created_at?: string | null;
};

export type RecruitmentApplicant = {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  department?: string | null;
  role_applied?: string | null;
  experience?: string | null;
  education?: string | null;
  status: RecruitmentStatus;
  current_ctc?: number | null;
  expected_ctc?: number | null;
  resume_drive_link?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  has_resume?: boolean;
  has_resume_file?: boolean;
  has_drive_link?: boolean;
  attachments?: RecruitmentAttachment[] | null;
};

export type RecruitmentListParams = {
  q?: string;
  status?: RecruitmentStatus | 'all' | '';
  department?: string;
  role?: string;
  has_resume?: 'any' | 'yes' | 'no' | '';
  sort?: 'newest' | 'oldest' | 'name';
  page?: number;
  limit?: number;
};

export type RecruitmentListResult = {
  items: RecruitmentApplicant[];
  total: number;
  page: number;
  limit: number;
  facets: {
    departments: string[];
    roles: string[];
  };
};

export type RecruitmentApplicantPayload = {
  id?: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  department?: string | null;
  role_applied?: string | null;
  experience?: string | null;
  education?: string | null;
  status?: RecruitmentStatus;
  current_ctc?: number | null;
  expected_ctc?: number | null;
  resume_drive_link?: string | null;
  notes?: string | null;
};

export const RECRUITMENT_STATUS_LABELS: Record<RecruitmentStatus, string> = {
  applied: 'Applied',
  hr_screening: 'HR Screening',
  staff_interview: 'Staff Interview',
  final_round: 'Final Round',
  offered: 'Offered',
  rejected: 'Rejected',
};

export const PIPELINE_COLUMNS: RecruitmentStatus[] = [
  'applied',
  'hr_screening',
  'staff_interview',
  'final_round',
];

function authHeaders(json = true): HeadersInit {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
}

export async function listApplicants(
  params: RecruitmentListParams = {}
): Promise<RecruitmentListResult> {
  const qs = new URLSearchParams();
  if (params.q?.trim()) qs.set('q', params.q.trim());
  if (params.status && params.status !== 'all') qs.set('status', params.status);
  if (params.department && params.department !== 'all') {
    qs.set('department', params.department);
  }
  if (params.role && params.role !== 'all') qs.set('role', params.role);
  if (params.has_resume === 'yes') qs.set('has_resume', 'yes');
  if (params.has_resume === 'no') qs.set('has_resume', 'no');
  if (params.sort) qs.set('sort', params.sort);
  qs.set('page', String(params.page ?? 1));
  qs.set('limit', String(params.limit ?? 100));

  const res = await fetch(`${ENV.API_URL}/recruitment/list.php?${qs}`, {
    headers: authHeaders(),
  });
  const data = await parseJson(res);
  return {
    items: data.data?.items ?? [],
    total: data.data?.total ?? 0,
    page: data.data?.page ?? 1,
    limit: data.data?.limit ?? 100,
    facets: {
      departments: data.data?.facets?.departments ?? [],
      roles: data.data?.facets?.roles ?? [],
    },
  };
}

export async function getApplicant(id: string): Promise<RecruitmentApplicant> {
  const res = await fetch(
    `${ENV.API_URL}/recruitment/get.php?id=${encodeURIComponent(id)}`,
    { headers: authHeaders() }
  );
  const data = await parseJson(res);
  return data.data as RecruitmentApplicant;
}

export async function createApplicant(
  payload: RecruitmentApplicantPayload
): Promise<RecruitmentApplicant> {
  const res = await fetch(`${ENV.API_URL}/recruitment/create.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.data as RecruitmentApplicant;
}

export async function updateApplicant(
  payload: RecruitmentApplicantPayload & { id: string }
): Promise<RecruitmentApplicant> {
  const res = await fetch(`${ENV.API_URL}/recruitment/update.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.data as RecruitmentApplicant;
}

export async function updateApplicantStatus(
  id: string,
  status: RecruitmentStatus
): Promise<RecruitmentApplicant> {
  const res = await fetch(`${ENV.API_URL}/recruitment/update.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ id, status }),
  });
  const data = await parseJson(res);
  return data.data as RecruitmentApplicant;
}

export async function deleteApplicant(id: string): Promise<void> {
  const res = await fetch(`${ENV.API_URL}/recruitment/delete.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ id }),
  });
  await parseJson(res);
}

export async function uploadApplicantFile(
  applicantId: string,
  file: File,
  kind: 'resume' | 'supporting' = 'resume'
): Promise<{ attachments: RecruitmentAttachment[]; applicant: RecruitmentApplicant }> {
  const form = new FormData();
  form.append('applicant_id', applicantId);
  form.append('kind', kind);
  form.append('file', file);

  const res = await fetch(`${ENV.API_URL}/recruitment/upload.php`, {
    method: 'POST',
    headers: authHeaders(false),
    body: form,
  });
  const data = await parseJson(res);
  return {
    attachments: data.data?.attachments ?? [],
    applicant: data.data?.applicant as RecruitmentApplicant,
  };
}
