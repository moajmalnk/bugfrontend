import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { buildAttachmentUrl } from '@/lib/attachmentUtils';
import { cn } from '@/lib/utils';
import type {
  RecruitmentApplicant,
  RecruitmentApplicantPayload,
  RecruitmentStatus,
} from '@/services/recruitmentService';
import {
  RECRUITMENT_STATUS_LABELS,
  createApplicant,
  getApplicant,
  updateApplicant,
  uploadApplicantFile,
} from '@/services/recruitmentService';
import { toast } from '@/components/ui/use-toast';
import {
  Briefcase,
  FileText,
  IndianRupee,
  Loader2,
  Save,
  StickyNote,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type SectionId = 'profile' | 'role' | 'compensation' | 'documents' | 'notes';

type FormState = {
  full_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  department: string;
  role_applied: string;
  experience: string;
  education: string;
  status: RecruitmentStatus;
  current_ctc: string;
  expected_ctc: string;
  resume_drive_link: string;
  notes: string;
};

const INITIAL_FORM: FormState = {
  full_name: '',
  email: '',
  phone: '',
  whatsapp: '',
  department: '',
  role_applied: '',
  experience: '',
  education: '',
  status: 'applied',
  current_ctc: '',
  expected_ctc: '',
  resume_drive_link: '',
  notes: '',
};

const SECTIONS: {
  id: SectionId;
  label: string;
  hint: string;
  icon: typeof UserRound;
}[] = [
  { id: 'profile', label: 'Profile', hint: 'Name & contact details', icon: UserRound },
  { id: 'role', label: 'Role', hint: 'Position & pipeline stage', icon: Briefcase },
  { id: 'compensation', label: 'Compensation', hint: 'Current & expected CTC', icon: IndianRupee },
  { id: 'documents', label: 'Documents', hint: 'Resume & attachments', icon: FileText },
  { id: 'notes', label: 'Notes', hint: 'Remarks & references', icon: StickyNote },
];

function digitsOnly(value: string, max = 10): string {
  return value.replace(/\D/g, '').slice(0, max);
}

function toForm(applicant?: RecruitmentApplicant | null): FormState {
  if (!applicant) return { ...INITIAL_FORM };
  return {
    full_name: applicant.full_name || '',
    email: applicant.email || '',
    phone: applicant.phone || '',
    whatsapp: applicant.whatsapp || '',
    department: applicant.department || '',
    role_applied: applicant.role_applied || '',
    experience: applicant.experience || '',
    education: applicant.education || '',
    status: applicant.status || 'applied',
    current_ctc:
      applicant.current_ctc != null && !Number.isNaN(applicant.current_ctc)
        ? String(applicant.current_ctc)
        : '',
    expected_ctc:
      applicant.expected_ctc != null && !Number.isNaN(applicant.expected_ctc)
        ? String(applicant.expected_ctc)
        : '',
    resume_drive_link: applicant.resume_drive_link || '',
    notes: applicant.notes || '',
  };
}

function parseCtc(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

type ApplicantFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantId?: string | null;
  departmentSuggestions?: string[];
  roleSuggestions?: string[];
  onDirtyChange?: (dirty: boolean) => void;
  onSaved: (applicant: RecruitmentApplicant) => void;
};

export function ApplicantFormModal({
  open,
  onOpenChange,
  applicantId,
  departmentSuggestions = [],
  roleSuggestions = [],
  onDirtyChange,
  onSaved,
}: ApplicantFormModalProps) {
  const [section, setSection] = useState<SectionId>('profile');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [baseline, setBaseline] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [existingResumeName, setExistingResumeName] = useState<string | null>(null);
  const [existingResumePath, setExistingResumePath] = useState<string | null>(null);
  const [existingSupporting, setExistingSupporting] = useState<
    { id: string; file_name: string; file_path: string }[]
  >([]);
  const [emailError, setEmailError] = useState('');
  const [driveError, setDriveError] = useState('');
  const [fieldsLocked, setFieldsLocked] = useState(true);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const supportInputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(applicantId);

  const isDirty = useMemo(() => {
    if (JSON.stringify(form) !== JSON.stringify(baseline)) return true;
    if (resumeFile) return true;
    if (supportingFiles.length > 0) return true;
    return false;
  }, [form, baseline, resumeFile, supportingFiles]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const isValid = useMemo(() => {
    if (!form.full_name.trim()) return false;
    if (emailError || driveError) return false;
    const hasContact =
      Boolean(form.email.trim()) ||
      Boolean(form.phone.trim()) ||
      Boolean(form.resume_drive_link.trim()) ||
      Boolean(resumeFile) ||
      Boolean(existingResumePath);
    return hasContact;
  }, [form, emailError, driveError, resumeFile, existingResumePath]);

  const resetLocal = () => {
    setForm({ ...INITIAL_FORM });
    setBaseline({ ...INITIAL_FORM });
    setSection('profile');
    setResumeFile(null);
    setSupportingFiles([]);
    setExistingResumeName(null);
    setExistingResumePath(null);
    setExistingSupporting([]);
    setEmailError('');
    setDriveError('');
    setLoading(false);
    setSaving(false);
    setFieldsLocked(true);
    setUnsavedOpen(false);
  };

  useEffect(() => {
    if (!open) {
      resetLocal();
      onDirtyChange?.(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      if (!applicantId) {
        resetLocal();
        return;
      }
      setLoading(true);
      try {
        const data = await getApplicant(applicantId);
        if (cancelled) return;
        const next = toForm(data);
        setForm(next);
        setBaseline(next);
        const resume = (data.attachments ?? []).find((a) => a.kind === 'resume');
        setExistingResumeName(resume?.file_name ?? null);
        setExistingResumePath(resume?.file_path ?? null);
        setExistingSupporting(
          (data.attachments ?? [])
            .filter((a) => a.kind === 'supporting')
            .map((a) => ({
              id: a.id,
              file_name: a.file_name,
              file_path: a.file_path,
            }))
        );
        setFieldsLocked(false);
      } catch (e) {
        toast({
          title: 'Failed to load applicant',
          description: e instanceof Error ? e.message : 'Please try again',
          variant: 'destructive',
        });
        onOpenChange(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, applicantId]);

  const requestClose = () => {
    if (saving) return;
    if (isDirty) {
      setUnsavedOpen(true);
      return;
    }
    onOpenChange(false);
  };

  const confirmDiscard = () => {
    setUnsavedOpen(false);
    onDirtyChange?.(false);
    onOpenChange(false);
  };

  const patch = (partial: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  const validateEmail = (value: string) => {
    if (!value.trim()) {
      setEmailError('');
      return;
    }
    setEmailError(
      value.includes('@') && value.includes('.') ? '' : 'Invalid email'
    );
  };

  const validateDrive = (value: string) => {
    if (!value.trim()) {
      setDriveError('');
      return;
    }
    try {
      const u = new URL(value.trim());
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        setDriveError('Link must start with http:// or https://');
        return;
      }
      setDriveError('');
    } catch {
      setDriveError('Enter a valid Drive / URL link');
    }
  };

  const acceptResume = (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Resume must be 5MB or less',
        variant: 'destructive',
      });
      return;
    }
    setResumeFile(file);
  };

  const acceptSupporting = (files: FileList | null) => {
    if (!files?.length) return;
    const next: File[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) continue;
      next.push(file);
    }
    if (next.length === 0) {
      toast({
        title: 'No valid files',
        description: 'Supporting docs must be 5MB or less',
        variant: 'destructive',
      });
      return;
    }
    setSupportingFiles((prev) => [...prev, ...next].slice(0, 5));
  };

  const handleSubmit = async () => {
    if (saving || !isValid) return;
    setSaving(true);
    try {
      const payload: RecruitmentApplicantPayload = {
        full_name: form.full_name.trim().slice(0, 150),
        email: form.email.trim().slice(0, 150) || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        department: form.department.trim().slice(0, 100) || null,
        role_applied: form.role_applied.trim().slice(0, 150) || null,
        experience: form.experience.trim().slice(0, 255) || null,
        education: form.education.trim().slice(0, 255) || null,
        status: form.status,
        current_ctc: parseCtc(form.current_ctc),
        expected_ctc: parseCtc(form.expected_ctc),
        resume_drive_link: form.resume_drive_link.trim() || null,
        notes: form.notes.trim().slice(0, 5000) || null,
      };

      let saved: RecruitmentApplicant;
      if (isEdit && applicantId) {
        saved = await updateApplicant({ ...payload, id: applicantId });
      } else {
        saved = await createApplicant(payload);
      }

      if (resumeFile) {
        const up = await uploadApplicantFile(saved.id, resumeFile, 'resume');
        saved = up.applicant;
      }
      for (const file of supportingFiles) {
        const up = await uploadApplicantFile(saved.id, file, 'supporting');
        saved = up.applicant;
      }

      toast({
        title: isEdit ? 'Applicant updated' : 'Applicant added',
        description: saved.full_name,
      });
      setBaseline({ ...form });
      setResumeFile(null);
      setSupportingFiles([]);
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'Could not save applicant',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const activeMeta = SECTIONS.find((s) => s.id === section)!;
  const ActiveIcon = activeMeta.icon;

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
        showCloseButton={false}
        className="flex max-h-[92vh] w-[95vw] max-w-[980px] flex-col gap-0 overflow-hidden rounded-2xl p-0"
      >
        <div className="relative border-b border-border bg-card px-5 py-5 sm:px-6">
          <button
            type="button"
            onClick={requestClose}
            className="absolute right-4 top-4 rounded-xl border border-border p-2 hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <DialogHeader className="space-y-1 pr-12 text-left">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {isEdit ? 'Edit Applicant' : 'New Applicant'}
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Add a new candidate to the recruitment pipeline
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-12 overflow-hidden">
          <aside className="col-span-12 border-b border-border bg-muted/30 p-4 md:col-span-4 md:border-b-0 md:border-r lg:col-span-3">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Candidate Details
            </p>
            <nav className="flex flex-row gap-2 overflow-x-auto md:flex-col md:overflow-visible [scrollbar-width:thin]">
              {SECTIONS.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={cn(
                      'flex min-w-[160px] items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-colors md:min-w-0',
                      active
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-transparent hover:bg-muted'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        active
                          ? 'bg-emerald-600 text-white'
                          : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          'block text-sm font-semibold',
                          active ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'
                        )}
                      >
                        {item.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {item.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="col-span-12 min-h-0 overflow-y-auto p-5 sm:p-6 md:col-span-8 lg:col-span-9 [scrollbar-width:thin]">
            {loading ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading applicant…
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/15 text-emerald-600 dark:text-emerald-400">
                    <ActiveIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
                      {section === 'profile' && 'Personal Information'}
                      {section === 'role' && 'Role & Experience'}
                      {section === 'compensation' && 'Compensation'}
                      {section === 'documents' && 'Documents'}
                      {section === 'notes' && 'Notes'}
                    </h2>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {section === 'profile' &&
                        'Core identity and contact channels for this candidate.'}
                      {section === 'role' &&
                        'Position applied for, background, and current pipeline stage.'}
                      {section === 'compensation' &&
                        'Annual CTC figures for offer evaluation.'}
                      {section === 'documents' &&
                        'Resume and supporting attachments for this candidate.'}
                      {section === 'notes' &&
                        'Portfolio links, referral source, interview remarks, and other context.'}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
                  {/* Why: Browsers inject saved profile/login data into the first
                      name/email/tel fields in a modal — block that for candidate entry. */}
                  <form
                    autoComplete="off"
                    onSubmit={(e) => e.preventDefault()}
                    className="contents"
                  >
                  {section === 'profile' && (
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-12 space-y-2">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Full Name
                        </Label>
                        <Input
                          name="br_applicant_full_name"
                          autoComplete="off"
                          data-1p-ignore
                          data-lpignore="true"
                          data-form-type="other"
                          readOnly={fieldsLocked}
                          onFocus={() => setFieldsLocked(false)}
                          value={form.full_name}
                          maxLength={150}
                          onChange={(e) =>
                            patch({ full_name: e.target.value.slice(0, 150) })
                          }
                          placeholder="Candidate full name"
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="col-span-12 space-y-2">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Email
                        </Label>
                        <Input
                          type="text"
                          inputMode="email"
                          name="br_applicant_email"
                          autoComplete="off"
                          data-1p-ignore
                          data-lpignore="true"
                          data-form-type="other"
                          readOnly={fieldsLocked}
                          onFocus={() => setFieldsLocked(false)}
                          value={form.email}
                          maxLength={150}
                          onChange={(e) => {
                            const v = e.target.value.slice(0, 150);
                            patch({ email: v });
                            validateEmail(v);
                          }}
                          placeholder="name@example.com"
                          className="h-11 rounded-xl"
                        />
                        {emailError ? (
                          <span className="text-xs text-red-500">{emailError}</span>
                        ) : null}
                      </div>
                      <div className="col-span-12 sm:col-span-6 space-y-2">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Contact Number
                        </Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          name="br_applicant_phone"
                          autoComplete="off"
                          data-1p-ignore
                          data-lpignore="true"
                          data-form-type="other"
                          readOnly={fieldsLocked}
                          onFocus={() => setFieldsLocked(false)}
                          value={form.phone}
                          onChange={(e) =>
                            patch({ phone: digitsOnly(e.target.value, 10) })
                          }
                          placeholder="10-digit mobile"
                          className="h-11 rounded-xl"
                          maxLength={10}
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-6 space-y-2">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          WhatsApp Number
                        </Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          name="br_applicant_whatsapp"
                          autoComplete="off"
                          data-1p-ignore
                          data-lpignore="true"
                          data-form-type="other"
                          readOnly={fieldsLocked}
                          onFocus={() => setFieldsLocked(false)}
                          value={form.whatsapp}
                          onChange={(e) =>
                            patch({ whatsapp: digitsOnly(e.target.value, 10) })
                          }
                          placeholder="10-digit WhatsApp"
                          className="h-11 rounded-xl"
                          maxLength={10}
                        />
                      </div>
                    </div>
                  )}

                  {section === 'role' && (
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-12 space-y-2">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Department
                        </Label>
                        <Input
                          list="recruitment-departments"
                          name="br_applicant_department"
                          autoComplete="off"
                          data-1p-ignore
                          data-lpignore="true"
                          value={form.department}
                          maxLength={100}
                          onChange={(e) =>
                            patch({ department: e.target.value.slice(0, 100) })
                          }
                          placeholder="e.g. Engineering"
                          className="h-11 rounded-xl"
                        />
                        <datalist id="recruitment-departments">
                          {departmentSuggestions.map((d) => (
                            <option key={d} value={d} />
                          ))}
                        </datalist>
                      </div>
                      <div className="col-span-12 space-y-2">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Role Applied For
                        </Label>
                        <Input
                          list="recruitment-roles"
                          name="br_applicant_role"
                          autoComplete="off"
                          data-1p-ignore
                          data-lpignore="true"
                          value={form.role_applied}
                          maxLength={150}
                          onChange={(e) =>
                            patch({ role_applied: e.target.value.slice(0, 150) })
                          }
                          placeholder="e.g. Senior Frontend Developer"
                          className="h-11 rounded-xl"
                        />
                        <datalist id="recruitment-roles">
                          {roleSuggestions.map((r) => (
                            <option key={r} value={r} />
                          ))}
                        </datalist>
                      </div>
                      <div className="col-span-12 sm:col-span-6 space-y-2">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Experience
                        </Label>
                        <Input
                          name="br_applicant_experience"
                          autoComplete="off"
                          data-1p-ignore
                          value={form.experience}
                          maxLength={255}
                          onChange={(e) =>
                            patch({ experience: e.target.value.slice(0, 255) })
                          }
                          placeholder="e.g. 4 years in React"
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-6 space-y-2">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Education
                        </Label>
                        <Input
                          name="br_applicant_education"
                          autoComplete="off"
                          data-1p-ignore
                          value={form.education}
                          maxLength={255}
                          onChange={(e) =>
                            patch({ education: e.target.value.slice(0, 255) })
                          }
                          placeholder="e.g. B.Tech Computer Science"
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="col-span-12 space-y-2">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Current Status
                        </Label>
                        <Select
                          value={form.status}
                          onValueChange={(v) =>
                            patch({ status: v as RecruitmentStatus })
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {(
                              Object.keys(
                                RECRUITMENT_STATUS_LABELS
                              ) as RecruitmentStatus[]
                            ).map((key) => (
                              <SelectItem key={key} value={key}>
                                {RECRUITMENT_STATUS_LABELS[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {section === 'compensation' && (
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-12 sm:col-span-6 space-y-2">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Current Salary (INR)
                        </Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          value={form.current_ctc}
                          onChange={(e) =>
                            patch({ current_ctc: e.target.value.slice(0, 14) })
                          }
                          placeholder="Annual CTC"
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-6 space-y-2">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Expected Salary (INR)
                        </Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          value={form.expected_ctc}
                          onChange={(e) =>
                            patch({ expected_ctc: e.target.value.slice(0, 14) })
                          }
                          placeholder="Expected CTC"
                          className="h-11 rounded-xl"
                        />
                      </div>
                    </div>
                  )}

                  {section === 'documents' && (
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-12 space-y-2">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Drive / Cloud Resume Link
                        </Label>
                        <Input
                          value={form.resume_drive_link}
                          maxLength={2000}
                          onChange={(e) => {
                            const v = e.target.value.slice(0, 2000);
                            patch({ resume_drive_link: v });
                            validateDrive(v);
                          }}
                          placeholder="https://drive.google.com/..."
                          className="h-11 rounded-xl"
                        />
                        {driveError ? (
                          <span className="text-xs text-red-500">{driveError}</span>
                        ) : null}
                      </div>

                      <div className="col-span-12 space-y-2">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Resume / CV Upload
                        </Label>
                        <button
                          type="button"
                          onClick={() => resumeInputRef.current?.click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            acceptResume(e.dataTransfer.files?.[0] ?? null);
                          }}
                          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center hover:bg-muted/50"
                        >
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {resumeFile
                              ? resumeFile.name
                              : existingResumeName
                                ? existingResumeName
                                : 'Drop file or click'}
                          </span>
                          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            PDF, DOC, JPG, PNG, HEIC (max 5MB)
                          </span>
                        </button>
                        <input
                          ref={resumeInputRef}
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.webp"
                          onChange={(e) => {
                            acceptResume(e.target.files?.[0] ?? null);
                            e.target.value = '';
                          }}
                        />
                        {existingResumePath && !resumeFile ? (
                          <a
                            href={buildAttachmentUrl(
                              existingResumePath,
                              existingResumeName || undefined
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
                          >
                            Open current resume
                          </a>
                        ) : null}
                      </div>

                      <div className="col-span-12 space-y-2">
                        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Supporting Documents
                        </Label>
                        <button
                          type="button"
                          onClick={() => supportInputRef.current?.click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            acceptSupporting(e.dataTransfer.files);
                          }}
                          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center hover:bg-muted/50"
                        >
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm font-medium">Drop file or click</span>
                          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            PDF, DOC, JPG (max 5MB)
                          </span>
                        </button>
                        <input
                          ref={supportInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            acceptSupporting(e.target.files);
                            e.target.value = '';
                          }}
                        />
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          {existingSupporting.map((f) => (
                            <a
                              key={f.id}
                              href={buildAttachmentUrl(f.file_path, f.file_name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-emerald-600 hover:underline dark:text-emerald-400"
                            >
                              {f.file_name}
                            </a>
                          ))}
                          {supportingFiles.map((f) => (
                            <span key={f.name + f.size}>New: {f.name}</span>
                          ))}
                          {existingSupporting.length === 0 &&
                          supportingFiles.length === 0 ? (
                            <span>No supporting documents uploaded yet.</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}

                  {section === 'notes' && (
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Internal Notes
                      </Label>
                      <Textarea
                        name="br_applicant_notes"
                        autoComplete="off"
                        value={form.notes}
                        maxLength={5000}
                        onChange={(e) =>
                          patch({ notes: e.target.value.slice(0, 5000) })
                        }
                        placeholder="Portfolio links, referral source, remarks..."
                        className="min-h-[180px] rounded-xl"
                      />
                    </div>
                  )}
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 border-t border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-muted-foreground sm:max-w-md sm:text-left">
            Candidate records are visible across the recruitment pipeline. Changes
            are saved when you submit the form.
          </p>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={requestClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={!isValid || saving || loading}
              onClick={handleSubmit}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEdit ? 'Save Changes' : 'Add Applicant'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={unsavedOpen} onOpenChange={setUnsavedOpen}>
      <AlertDialogContent className="max-w-[400px] rounded-2xl">
        <AlertDialogHeader className="space-y-2 text-left">
          <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Discard them and close this dialog?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel className="mt-0 rounded-xl">
            Keep editing
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={confirmDiscard}
          >
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
