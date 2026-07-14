import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/DatePicker';
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
import {
  COMMERCIAL_STATUS_OPTIONS,
  ClientFormValues,
  MARKET_INDUSTRY_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
} from '@/lib/utils/clientUtils';
import { ClientAttachment } from '@/types';
import { buildDocumentPreviewPagePath } from '@/lib/attachmentUtils';
import { cn } from '@/lib/utils';
import { FileText, Paperclip, X } from 'lucide-react';
import { ChangeEvent, FormEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface FileWithPreview extends File {
  preview?: string;
}

interface ClientFormProps {
  mode: 'create' | 'edit';
  values: ClientFormValues;
  onChange: (values: ClientFormValues) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  attachmentFiles: FileWithPreview[];
  onAttachmentFilesChange: (files: FileWithPreview[]) => void;
  existingAttachments?: ClientAttachment[];
  onDeleteAttachment?: (attachmentId: string) => void;
  error?: string | null;
}

const inputClass =
  'h-11 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl shadow-sm';

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-gray-200/70 dark:border-gray-700/70 pb-3 mb-6">
      <h3 className="text-xs font-bold tracking-widest uppercase text-muted-foreground">{title}</h3>
    </div>
  );
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
      {children}
      {required ? <span className="text-red-500 ml-0.5">*</span> : null}
    </Label>
  );
}

export function ClientForm({
  mode,
  values,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting,
  attachmentFiles,
  onAttachmentFilesChange,
  existingAttachments = [],
  onDeleteAttachment,
  error,
}: ClientFormProps) {
  const setField = <K extends keyof ClientFormValues>(key: K, value: ClientFormValues[K]) => {
    onChange({ ...values, [key]: value });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onAttachmentFilesChange([...attachmentFiles, ...files]);
    }
    e.target.value = '';
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-900/80 p-6 sm:p-8 space-y-8">
        <SectionHeader title="Entity Definition" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <FieldLabel required>Corporate Name</FieldLabel>
            <Input
              value={values.corporate_name}
              onChange={(e) => setField('corporate_name', e.target.value)}
              placeholder="Nexus Digital Solutions P Ltd"
              className={inputClass}
              required
            />
          </div>
          <div>
            <FieldLabel>Website / Digital ID</FieldLabel>
            <Input
              value={values.website}
              onChange={(e) => setField('website', e.target.value)}
              placeholder="nexus.digital or https://nexus.digital"
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel>Market Industry</FieldLabel>
            <Select value={values.market_industry || ''} onValueChange={(v) => setField('market_industry', v)}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {MARKET_INDUSTRY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>GST / Tax ID</FieldLabel>
            <Input
              value={values.gst_tax_id}
              onChange={(e) => setField('gst_tax_id', e.target.value)}
              placeholder="GSTIN / VAT ID..."
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel>Commercial Status</FieldLabel>
            <Select
              value={values.commercial_status}
              onValueChange={(v) => setField('commercial_status', v as ClientFormValues['commercial_status'])}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {COMMERCIAL_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SectionHeader title="Communication Matrix" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <FieldLabel required>Primary Contact Person</FieldLabel>
            <Input
              value={values.primary_contact_name}
              onChange={(e) => setField('primary_contact_name', e.target.value)}
              placeholder="Full Name of Lead Contact"
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel>Position</FieldLabel>
            <Input
              value={values.position}
              onChange={(e) => setField('position', e.target.value)}
              placeholder="e.g. CTO, Manager"
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel>HQ Location</FieldLabel>
            <Input
              value={values.hq_location}
              onChange={(e) => setField('hq_location', e.target.value)}
              placeholder="City, Country"
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel>Direct Email</FieldLabel>
            <Input
              type="email"
              value={values.direct_email}
              onChange={(e) => setField('direct_email', e.target.value)}
              placeholder="contact@company.com"
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel>Direct Phone</FieldLabel>
            <Input
              value={values.direct_phone}
              onChange={(e) => setField('direct_phone', e.target.value)}
              placeholder="+91 XXXXX XXXXX"
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel>Birthday</FieldLabel>
            <DatePicker
              value={values.birthday || ''}
              onChange={(v) => setField('birthday', v)}
              placeholder="Select date"
            />
          </div>
        </div>

        <SectionHeader title="Lifecycle & Acquisition" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <FieldLabel>Date of Joining</FieldLabel>
            <DatePicker
              value={values.date_of_joining || ''}
              onChange={(v) => setField('date_of_joining', v)}
              placeholder="Select date"
            />
          </div>
          <div>
            <FieldLabel>Date of Ending</FieldLabel>
            <DatePicker
              value={values.date_of_ending || ''}
              onChange={(v) => setField('date_of_ending', v)}
              placeholder="Select date"
            />
          </div>
          <div>
            <FieldLabel>Referral Source</FieldLabel>
            <Select value={values.referral_source || ''} onValueChange={(v) => setField('referral_source', v)}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Select.." />
              </SelectTrigger>
              <SelectContent>
                {REFERRAL_SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SectionHeader title="Internal Strategic Notes" />
        <Textarea
          value={values.notes}
          onChange={(e) => setField('notes', e.target.value)}
          placeholder="Describe commercial history, strategic value, or technical dependencies.."
          className="min-h-[120px] rounded-xl border-gray-200 dark:border-gray-700"
        />

        <SectionHeader title="Document Attachments (optional)" />
        <label
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed',
            'border-gray-300 dark:border-gray-600 px-6 py-10 cursor-pointer',
            'hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors'
          )}
        >
          <Paperclip className="h-8 w-8 text-muted-foreground" />
          <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
            Upload Client Documents
          </span>
          <span className="text-sm text-muted-foreground text-center">
            Contracts, proposals, IDs, or any supporting files.
          </span>
          <input type="file" multiple className="hidden" onChange={handleFileChange} />
        </label>

        {(existingAttachments.length > 0 || attachmentFiles.length > 0) && (
          <div className="space-y-2">
            {existingAttachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                  <Link
                    to={buildDocumentPreviewPagePath(att.file_path)}
                    className="truncate hover:underline text-blue-600"
                  >
                    {att.file_name}
                  </Link>
                </div>
                {onDeleteAttachment ? (
                  <Button type="button" variant="ghost" size="icon" onClick={() => onDeleteAttachment(att.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            {attachmentFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm"
              >
                <span className="truncate">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onAttachmentFilesChange(attachmentFiles.filter((_, i) => i !== idx))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Client' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
