import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Badge } from '@/components/ui/badge';
import { ENV } from '@/lib/env';
import {
  computeProjectDurationDays,
  formatProjectDate,
  getProjectStatusLabel,
  Project,
  ProjectAttachment,
  ProjectFormValues,
} from '@/lib/utils/projectUtils';
import { User } from '@/types';
import {
  Building2,
  Calendar,
  Clock,
  File,
  Paperclip,
  Users,
  X,
  Layers,
  UserCircle,
} from 'lucide-react';
import { ChangeEvent, FormEvent, useRef, useState } from 'react';

interface FileWithPreview extends File {
  preview?: string;
}

interface ProjectFormProps {
  mode: 'create' | 'edit';
  values: ProjectFormValues;
  onChange: (values: ProjectFormValues) => void;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
  users: User[];
  existingAttachments?: ProjectAttachment[];
  projectMeta?: Pick<Project, 'created_at' | 'created_by' | 'status' | 'start_date' | 'deadline_date'>;
  createdByName?: string;
  attachmentFiles: FileWithPreview[];
  onAttachmentFilesChange: (files: FileWithPreview[]) => void;
  error?: string | null;
}

function MultiUserSelect({
  label,
  users,
  selectedIds,
  onChange,
  roleFilter,
  placeholder,
}: {
  label: string;
  users: User[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  roleFilter?: string[];
  placeholder: string;
}) {
  const filtered = roleFilter?.length
    ? users.filter((u) => roleFilter.includes(u.role))
    : users;

  const toggleUser = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 rounded-lg border border-border bg-muted/20">
        {selectedIds.length === 0 && (
          <span className="text-sm text-muted-foreground">{placeholder}</span>
        )}
        {selectedIds.map((id) => {
          const user = users.find((u) => u.id === id);
          if (!user) return null;
          return (
            <Badge key={id} variant="secondary" className="gap-1 pr-1">
              {user.username || user.name}
              <button
                type="button"
                onClick={() => toggleUser(id)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
      </div>
      <Select
        value=""
        onValueChange={(value) => {
          if (value && !selectedIds.includes(value)) {
            onChange([...selectedIds, value]);
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={`Add ${label.toLowerCase()}...`} />
        </SelectTrigger>
        <SelectContent>
          {filtered
            .filter((u) => !selectedIds.includes(u.id))
            .map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.username || user.name} ({user.role})
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ProjectForm({
  mode,
  values,
  onChange,
  onSubmit,
  isSubmitting,
  users,
  existingAttachments = [],
  projectMeta,
  createdByName,
  attachmentFiles,
  onAttachmentFilesChange,
  error,
}: ProjectFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [techInput, setTechInput] = useState('');

  const setField = <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => {
    onChange({ ...values, [key]: value });
  };

  const durationDays = projectMeta
    ? computeProjectDurationDays({
        start_date: values.start_date || projectMeta.start_date,
        created_at: projectMeta.created_at,
        deadline_date: values.deadline_date || projectMeta.deadline_date,
        status: values.status,
      })
    : computeProjectDurationDays({
        start_date: values.start_date,
        created_at: new Date().toISOString(),
        deadline_date: values.deadline_date,
        status: values.status,
      });

  const techStackItems = values.technology_stack
    ? values.technology_stack.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const addTechItem = () => {
    const item = techInput.trim();
    if (!item) return;
    const next = [...techStackItems, item].join(', ');
    setField('technology_stack', next);
    setTechInput('');
  };

  const removeTechItem = (index: number) => {
    const next = techStackItems.filter((_, i) => i !== index).join(', ');
    setField('technology_stack', next);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onAttachmentFilesChange([...attachmentFiles, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeNewFile = (index: number) => {
    onAttachmentFilesChange(attachmentFiles.filter((_, i) => i !== index));
  };

  const adminsAndDevs = users.filter((u) => ['admin', 'developer'].includes(u.role));

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Summary strip (edit mode) */}
      {mode === 'edit' && projectMeta && (
        <Card className="border-blue-500/20 bg-blue-950/10">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Duration</p>
                <p className="font-medium">{durationDays} days</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">{getProjectStatusLabel(values.status)}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Created</p>
                <p className="font-medium">{formatProjectDate(projectMeta.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1"><UserCircle className="h-3.5 w-3.5" /> Created By</p>
                <p className="font-medium">{createdByName || 'System'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>Name, description, and status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="Project name"
              value={values.name}
              onChange={(e) => setField('name', e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Project Description *</Label>
            <Textarea
              id="description"
              placeholder="Project description"
              value={values.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={4}
              required
            />
          </div>
          <div className="grid gap-2 max-w-xs">
            <Label htmlFor="status">Status</Label>
            <Select value={values.status} onValueChange={(v) => setField('status', v as ProjectFormValues['status'])}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Client Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Client Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="client_name">Client Name</Label>
            <Input
              id="client_name"
              placeholder="e.g. CODO AI Innovations"
              value={values.client_name}
              onChange={(e) => setField('client_name', e.target.value)}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="client_location">Location</Label>
            <Input
              id="client_location"
              placeholder="City, Country"
              value={values.client_location}
              onChange={(e) => setField('client_location', e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="client_contact_name">Primary Contact</Label>
            <Input
              id="client_contact_name"
              placeholder="Contact name"
              value={values.client_contact_name}
              onChange={(e) => setField('client_contact_name', e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="client_account_status">Account Status</Label>
            <Select
              value={values.client_account_status}
              onValueChange={(v) => setField('client_account_status', v as ProjectFormValues['client_account_status'])}
            >
              <SelectTrigger id="client_account_status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="client_email">Email</Label>
            <Input
              id="client_email"
              type="email"
              placeholder="client@example.com"
              value={values.client_email}
              onChange={(e) => setField('client_email', e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="client_phone">Phone</Label>
            <Input
              id="client_phone"
              placeholder="+91 ..."
              value={values.client_phone}
              onChange={(e) => setField('client_phone', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Team Allocation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Team Allocation
          </CardTitle>
          <CardDescription>Project Lead, Developer, QA &amp; Testing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Project Lead</Label>
            <Select
              value={values.project_lead_id || 'none'}
              onValueChange={(v) => setField('project_lead_id', v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not assigned</SelectItem>
                {adminsAndDevs.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.username || user.name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <MultiUserSelect
            label="Developers"
            users={users}
            selectedIds={values.developer_ids}
            onChange={(ids) => setField('developer_ids', ids)}
            roleFilter={['developer', 'admin']}
            placeholder="No developers assigned"
          />
          <MultiUserSelect
            label="QA & Testing"
            users={users}
            selectedIds={values.tester_ids}
            onChange={(ids) => setField('tester_ids', ids)}
            roleFilter={['tester']}
            placeholder="No QA assigned"
          />
        </CardContent>
      </Card>

      {/* Technology Stack */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" /> Technology Stack
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            {techStackItems.length === 0 && (
              <span className="text-sm text-muted-foreground">No technologies added</span>
            )}
            {techStackItems.map((item, index) => (
              <Badge key={`${item}-${index}`} variant="outline" className="gap-1 pr-1">
                {item}
                <button type="button" onClick={() => removeTechItem(index)} className="ml-1 hover:bg-muted rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. React, Node.js, MySQL"
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTechItem();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addTechItem}>
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Project Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Project Timeline
          </CardTitle>
          {mode === 'create' && (
            <CardDescription>
              Duration: {durationDays} days (calculated from start date)
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-2">
            <Label>Start Date</Label>
            <DatePicker value={values.start_date} onChange={(v) => setField('start_date', v)} placeholder="Not set" />
          </div>
          <div className="grid gap-2">
            <Label>Deadline Date</Label>
            <DatePicker value={values.deadline_date} onChange={(v) => setField('deadline_date', v)} placeholder="Not set" />
          </div>
          <div className="grid gap-2">
            <Label>Expected Publish</Label>
            <DatePicker value={values.expected_publish_date} onChange={(v) => setField('expected_publish_date', v)} placeholder="Not set" />
          </div>
          <div className="grid gap-2">
            <Label>Testing Start</Label>
            <DatePicker value={values.testing_start_date} onChange={(v) => setField('testing_start_date', v)} placeholder="Not set" />
          </div>
          <div className="grid gap-2">
            <Label>Testing End</Label>
            <DatePicker value={values.testing_end_date} onChange={(v) => setField('testing_end_date', v)} placeholder="Not set" />
          </div>
          <div className="grid gap-2">
            <Label>Frontend Finish</Label>
            <DatePicker value={values.frontend_finish_date} onChange={(v) => setField('frontend_finish_date', v)} placeholder="Not set" />
          </div>
          <div className="grid gap-2">
            <Label>Backend Finish</Label>
            <DatePicker value={values.backend_finish_date} onChange={(v) => setField('backend_finish_date', v)} placeholder="Not set" />
          </div>
          <div className="grid gap-2">
            <Label>Duration</Label>
            <div className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm">
              {durationDays} days
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" /> Attachment Docs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {existingAttachments.length > 0 && (
            <div className="space-y-2">
              <Label>Existing attachments</Label>
              <div className="space-y-2">
                {existingAttachments.map((att) => (
                  <a
                    key={att.id}
                    href={`${ENV.API_URL.replace('/api', '')}/${att.file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 text-sm"
                  >
                    <File className="h-4 w-4 shrink-0" />
                    <span className="truncate">{att.file_name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>New attachments</Label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="mr-2 h-4 w-4" /> Choose files
            </Button>
            {attachmentFiles.length > 0 && (
              <div className="space-y-2 mt-2">
                {attachmentFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                    <span className="flex items-center gap-2 truncate">
                      <File className="h-4 w-4 shrink-0" />
                      {file.name}
                    </span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeNewFile(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm font-medium text-red-500">{error}</p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pb-8">
        <Button type="submit" disabled={isSubmitting || !values.name.trim() || !values.description.trim()} className="sm:min-w-[140px]">
          {isSubmitting ? (mode === 'create' ? 'Creating...' : 'Saving...') : (mode === 'create' ? 'Create Project' : 'Save Changes')}
        </Button>
      </div>
    </form>
  );
}
