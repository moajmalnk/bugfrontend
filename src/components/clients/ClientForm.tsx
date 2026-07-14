import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
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
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Globe,
  NotebookPen,
  Paperclip,
  Plus,
  Save,
  UserRound,
  X,
} from 'lucide-react';
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
  'h-12 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md';

const textareaClass =
  'min-h-[140px] border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md';

const selectTriggerClass =
  'h-12 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md';

function FieldLabel({
  htmlFor,
  dotClass,
  children,
  required,
  hint,
}: {
  htmlFor?: string;
  dotClass: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <Label
        htmlFor={htmlFor}
        className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2"
      >
        <div className={cn('w-2 h-2 shrink-0 rounded-full bg-gradient-to-r', dotClass)} />
        {children}
        {required ? <span className="text-red-500 text-sm">*</span> : null}
      </Label>
      {hint ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium pl-4">{hint}</p>
      ) : null}
    </div>
  );
}

function SectionBlock({
  title,
  description,
  icon: Icon,
  iconClass,
  children,
}: {
  title: string;
  description?: string;
  icon: typeof Building2;
  iconClass: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-gradient-to-br from-gray-50/40 to-white/40 dark:from-gray-800/20 dark:to-gray-900/20 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg shrink-0', iconClass)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
          {description ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
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
    <div className="relative">
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl" />
      <div className="relative">
        <Card className="border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl overflow-hidden">
          <form onSubmit={onSubmit}>
            <CardContent className="p-6 sm:p-8 space-y-6">
              <SectionBlock
                title="Entity Definition"
                description="Corporate identity, industry, and commercial status"
                icon={Building2}
                iconClass="bg-gradient-to-br from-blue-500 to-indigo-600"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3 sm:col-span-2">
                    <FieldLabel htmlFor="corporate_name" dotClass="from-blue-500 to-indigo-600" required>
                      Corporate Name
                    </FieldLabel>
                    <Input
                      id="corporate_name"
                      value={values.corporate_name}
                      onChange={(e) => setField('corporate_name', e.target.value)}
                      placeholder="e.g. CODO AI Innovations"
                      className={cn(inputClass, 'focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500')}
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <FieldLabel htmlFor="website" dotClass="from-sky-500 to-cyan-600">
                      Website / Digital ID
                    </FieldLabel>
                    <Input
                      id="website"
                      value={values.website}
                      onChange={(e) => setField('website', e.target.value)}
                      placeholder="nexus.digital or https://nexus.digital"
                      className={cn(inputClass, 'focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500')}
                    />
                  </div>
                  <div className="space-y-3">
                    <FieldLabel htmlFor="market_industry" dotClass="from-violet-500 to-purple-600">
                      Market Industry
                    </FieldLabel>
                    <Select
                      value={values.market_industry || undefined}
                      onValueChange={(v) => setField('market_industry', v)}
                    >
                      <SelectTrigger
                        id="market_industry"
                        className={cn(selectTriggerClass, 'focus:ring-2 focus:ring-violet-500/50')}
                      >
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
                  <div className="space-y-3">
                    <FieldLabel htmlFor="gst_tax_id" dotClass="from-amber-500 to-orange-600">
                      GST / Tax ID
                    </FieldLabel>
                    <Input
                      id="gst_tax_id"
                      value={values.gst_tax_id}
                      onChange={(e) => setField('gst_tax_id', e.target.value)}
                      placeholder="GSTIN / VAT ID..."
                      className={cn(inputClass, 'focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500')}
                    />
                  </div>
                  <div className="space-y-3">
                    <FieldLabel htmlFor="commercial_status" dotClass="from-emerald-500 to-teal-600">
                      Commercial Status
                    </FieldLabel>
                    <Select
                      value={values.commercial_status}
                      onValueChange={(v) =>
                        setField('commercial_status', v as ClientFormValues['commercial_status'])
                      }
                    >
                      <SelectTrigger
                        id="commercial_status"
                        className={cn(selectTriggerClass, 'focus:ring-2 focus:ring-emerald-500/50')}
                      >
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
              </SectionBlock>

              <SectionBlock
                title="Communication Matrix"
                description="Primary contact and location details"
                icon={UserRound}
                iconClass="bg-gradient-to-br from-emerald-500 to-teal-600"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <FieldLabel
                      htmlFor="primary_contact_name"
                      dotClass="from-emerald-500 to-teal-600"
                      required
                    >
                      Primary Contact Person
                    </FieldLabel>
                    <Input
                      id="primary_contact_name"
                      value={values.primary_contact_name}
                      onChange={(e) => setField('primary_contact_name', e.target.value)}
                      placeholder="Full name of lead contact"
                      className={cn(inputClass, 'focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500')}
                    />
                  </div>
                  <div className="space-y-3">
                    <FieldLabel htmlFor="position" dotClass="from-lime-500 to-green-600">
                      Position
                    </FieldLabel>
                    <Input
                      id="position"
                      value={values.position}
                      onChange={(e) => setField('position', e.target.value)}
                      placeholder="e.g. CTO, Manager"
                      className={cn(inputClass, 'focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500')}
                    />
                  </div>
                  <div className="space-y-3">
                    <FieldLabel htmlFor="hq_location" dotClass="from-orange-500 to-red-600">
                      HQ Location
                    </FieldLabel>
                    <Input
                      id="hq_location"
                      value={values.hq_location}
                      onChange={(e) => setField('hq_location', e.target.value)}
                      placeholder="City, Country"
                      className={cn(inputClass, 'focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500')}
                    />
                  </div>
                  <div className="space-y-3">
                    <FieldLabel htmlFor="direct_email" dotClass="from-blue-500 to-cyan-600">
                      Direct Email
                    </FieldLabel>
                    <Input
                      id="direct_email"
                      type="email"
                      value={values.direct_email}
                      onChange={(e) => setField('direct_email', e.target.value)}
                      placeholder="contact@company.com"
                      className={cn(inputClass, 'focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500')}
                    />
                  </div>
                  <div className="space-y-3">
                    <FieldLabel htmlFor="direct_phone" dotClass="from-indigo-500 to-purple-600">
                      Direct Phone
                    </FieldLabel>
                    <Input
                      id="direct_phone"
                      value={values.direct_phone}
                      onChange={(e) => setField('direct_phone', e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                      className={cn(inputClass, 'focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500')}
                    />
                  </div>
                  <div className="space-y-3">
                    <FieldLabel htmlFor="birthday" dotClass="from-pink-500 to-rose-600">
                      Birthday
                    </FieldLabel>
                    <DatePicker
                      value={values.birthday || ''}
                      onChange={(v) => setField('birthday', v)}
                      placeholder="Select date"
                    />
                  </div>
                </div>
              </SectionBlock>

              <SectionBlock
                title="Lifecycle & Acquisition"
                description="Engagement timeline and referral source"
                icon={Calendar}
                iconClass="bg-gradient-to-br from-amber-500 to-orange-600"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <FieldLabel htmlFor="date_of_joining" dotClass="from-amber-500 to-orange-600">
                      Date of Joining
                    </FieldLabel>
                    <DatePicker
                      value={values.date_of_joining || ''}
                      onChange={(v) => setField('date_of_joining', v)}
                      placeholder="Select date"
                    />
                  </div>
                  <div className="space-y-3">
                    <FieldLabel htmlFor="date_of_ending" dotClass="from-rose-500 to-red-600">
                      Date of Ending
                    </FieldLabel>
                    <DatePicker
                      value={values.date_of_ending || ''}
                      onChange={(v) => setField('date_of_ending', v)}
                      placeholder="Select date"
                    />
                  </div>
                  <div className="space-y-3 sm:col-span-2">
                    <FieldLabel htmlFor="referral_source" dotClass="from-yellow-500 to-amber-600">
                      Referral Source
                    </FieldLabel>
                    <Select
                      value={values.referral_source || undefined}
                      onValueChange={(v) => setField('referral_source', v)}
                    >
                      <SelectTrigger
                        id="referral_source"
                        className={cn(selectTriggerClass, 'focus:ring-2 focus:ring-amber-500/50')}
                      >
                        <SelectValue placeholder="Select source" />
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
              </SectionBlock>

              <SectionBlock
                title="Internal Strategic Notes"
                description="Commercial history, strategic value, or technical dependencies"
                icon={NotebookPen}
                iconClass="bg-gradient-to-br from-violet-500 to-purple-600"
              >
                <div className="space-y-3">
                  <FieldLabel htmlFor="notes" dotClass="from-violet-500 to-purple-600">
                    Notes
                  </FieldLabel>
                  <Textarea
                    id="notes"
                    value={values.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                    placeholder="Describe commercial history, strategic value, or technical dependencies..."
                    className={cn(textareaClass, 'focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500')}
                  />
                </div>
              </SectionBlock>

              <SectionBlock
                title="Document Attachments"
                description="Contracts, proposals, IDs, or supporting files"
                icon={Paperclip}
                iconClass="bg-gradient-to-br from-sky-500 to-blue-600"
              >
                <label
                  className={cn(
                    'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed',
                    'border-gray-300 dark:border-gray-600 px-6 py-10 cursor-pointer',
                    'bg-white/60 dark:bg-gray-800/40 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-all duration-300'
                  )}
                >
                  <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg">
                    <Paperclip className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Upload Client Documents
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Contracts, proposals, IDs, or any supporting files
                    </p>
                  </div>
                  <input type="file" multiple className="hidden" onChange={handleFileChange} />
                </label>

                {(existingAttachments.length > 0 || attachmentFiles.length > 0) && (
                  <div className="space-y-2">
                    {existingAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm shadow-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                          <Link
                            to={buildDocumentPreviewPagePath(att.file_path)}
                            className="truncate hover:underline text-blue-600 font-medium"
                          >
                            {att.file_name}
                          </Link>
                        </div>
                        {onDeleteAttachment ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteAttachment(att.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    ))}
                    {attachmentFiles.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm shadow-sm"
                      >
                        <span className="flex items-center gap-2 truncate font-medium">
                          <Globe className="h-4 w-4 shrink-0 text-indigo-500" />
                          {file.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            onAttachmentFilesChange(attachmentFiles.filter((_, i) => i !== idx))
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </SectionBlock>

              {error ? (
                <p className="text-sm font-medium text-red-500 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                  {error}
                </p>
              ) : null}
            </CardContent>

            <CardFooter className="p-6 sm:p-8 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
              <div className="flex flex-col sm:flex-row justify-between gap-4 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="h-12 px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !values.corporate_name.trim()}
                  className="h-12 px-8 bg-gradient-to-r from-blue-600 to-emerald-700 hover:from-blue-700 hover:to-emerald-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {mode === 'create' ? 'Creating...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      {mode === 'create' ? (
                        <Plus className="mr-2 h-4 w-4" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {mode === 'create' ? 'Create Client' : 'Save Changes'}
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
