import { isClosedProjectStatus, isCompliancePipelineSatisfied, getPipelineStageLabel } from '@/lib/codo/complianceRules';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { buildDocumentPreviewPagePath } from '@/lib/attachmentUtils';
import { cn, getEffectiveRole } from '@/lib/utils';
import {
  computeProjectDurationDays,
  formatProjectDate,
  getProjectStatusLabel,
  Project,
  ProjectAttachment,
  ProjectComplianceSummaryLite,
  ProjectFormValues,
} from '@/lib/utils/projectUtils';
import { User } from '@/types';
import type { Client } from '@/types';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  ChevronsUpDown,
  Clock,
  File,
  FileText,
  FolderKanban,
  Layers,
  Paperclip,
  Plus,
  ShieldCheck,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { ChangeEvent, FormEvent, ReactNode, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface FileWithPreview extends File {
  preview?: string;
}

interface ProjectFormProps {
  mode: 'create' | 'edit';
  values: ProjectFormValues;
  onChange: (values: ProjectFormValues) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  users: User[];
  clients?: Client[];
  existingAttachments?: ProjectAttachment[];
  projectMeta?: Pick<Project, 'created_at' | 'created_by' | 'status' | 'start_date' | 'deadline_date'>;
  createdByName?: string;
  attachmentFiles: FileWithPreview[];
  onAttachmentFilesChange: (files: FileWithPreview[]) => void;
  availableBugDocs?: Array<{
    id: number;
    title: string;
    creatorName?: string | null;
    projectId?: string | null;
    projectName?: string | null;
  }>;
  selectedBugDocIds?: number[];
  onSelectedBugDocIdsChange?: (ids: number[]) => void;
  availableBugSheets?: Array<{
    id: number;
    title: string;
    creatorName?: string | null;
    projectId?: string | null;
    projectName?: string | null;
  }>;
  selectedBugSheetIds?: number[];
  onSelectedBugSheetIdsChange?: (ids: number[]) => void;
  currentProjectId?: string;
  error?: string | null;
  complianceSummary?: ProjectComplianceSummaryLite | null;
}

const NAME_MAX = 100;
const DESCRIPTION_MAX = 2000;

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
  hint,
}: {
  htmlFor?: string;
  dotClass: string;
  children: ReactNode;
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
      </Label>
      {hint && <p className="text-xs text-gray-500 dark:text-gray-400 font-medium pl-4">{hint}</p>}
    </div>
  );
}

type SearchableOption = {
  value: string;
  label: string;
  searchValue?: string;
};

function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  triggerClassName,
  id,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  triggerClassName?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-12 w-full justify-between font-medium',
            selectTriggerClass,
            triggerClassName
          )}
        >
          <span className="truncate">{selected?.label || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[70]" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.searchValue || `${option.label} ${option.value}`}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
  icon: typeof FolderKanban;
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
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function MultiUserSelect({
  label,
  dotClass,
  users,
  selectedIds,
  onChange,
  roleFilter,
  placeholder,
}: {
  label: string;
  dotClass: string;
  users: User[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  roleFilter?: string[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);

  const filtered = roleFilter?.length
    ? users.filter((u) => roleFilter.includes(u.role))
    : users;

  const availableUsers = filtered.filter((u) => !selectedIds.includes(u.id));

  const toggleUser = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
  };

  return (
    <div className="space-y-3">
      <FieldLabel dotClass={dotClass}>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2 min-h-[2.75rem] p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        {selectedIds.length === 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">{placeholder}</span>
        )}
        {selectedIds.map((id) => {
          const user = users.find((u) => u.id === id);
          if (!user) return null;
          return (
            <Badge key={id} variant="secondary" className="gap-1 pr-1 text-sm">
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn('h-12 w-full justify-between font-medium', selectTriggerClass)}
          >
            <span className="truncate text-muted-foreground">{`Add ${label.toLowerCase()}...`}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[70]" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>
                {availableUsers.length === 0 ? 'All matching users are already assigned.' : 'No users found.'}
              </CommandEmpty>
              <CommandGroup>
                {availableUsers.map((user) => {
                  const displayName = user.username || user.name;
                  return (
                    <CommandItem
                      key={user.id}
                      value={`${displayName} ${user.email || ''} ${user.role} ${user.id}`}
                      onSelect={() => {
                        onChange([...selectedIds, user.id]);
                        setOpen(false);
                      }}
                    >
                      <Check className="mr-2 h-4 w-4 opacity-0" />
                      {displayName} ({user.role})
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ProjectForm({
  mode,
  values,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting,
  users,
  clients = [],
  existingAttachments = [],
  projectMeta,
  createdByName,
  attachmentFiles,
  onAttachmentFilesChange,
  availableBugDocs = [],
  selectedBugDocIds = [],
  onSelectedBugDocIdsChange,
  availableBugSheets = [],
  selectedBugSheetIds = [],
  onSelectedBugSheetIdsChange,
  currentProjectId,
  error,
  complianceSummary,
}: ProjectFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [techInput, setTechInput] = useState('');
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const effectiveRole = getEffectiveRole(currentUser || {});

  const setField = <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => {
    if (
      key === 'status' &&
      typeof value === 'string' &&
      isClosedProjectStatus(value) &&
      mode === 'edit' &&
      !isCompliancePipelineSatisfied(complianceSummary)
    ) {
      toast({
        title: 'Compliance required',
        description:
          'Complete the CODO Developer and QA checklists (or authorize emergency bypass) before changing to a closed status.',
        variant: 'destructive',
      });
      return;
    }
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
    setField('technology_stack', [...techStackItems, item].join(', '));
    setTechInput('');
  };

  const removeTechItem = (index: number) => {
    setField('technology_stack', techStackItems.filter((_, i) => i !== index).join(', '));
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onAttachmentFilesChange([...attachmentFiles, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeNewFile = (index: number) => {
    onAttachmentFilesChange(attachmentFiles.filter((_, i) => i !== index));
  };

  const toggleExistingDoc = (docId: number) => {
    if (!onSelectedBugDocIdsChange) return;
    if (selectedBugDocIds.includes(docId)) {
      onSelectedBugDocIdsChange(selectedBugDocIds.filter((id) => id !== docId));
      return;
    }
    onSelectedBugDocIdsChange([...selectedBugDocIds, docId]);
  };

  const toggleExistingSheet = (sheetId: number) => {
    if (!onSelectedBugSheetIdsChange) return;
    if (selectedBugSheetIds.includes(sheetId)) {
      onSelectedBugSheetIdsChange(selectedBugSheetIds.filter((id) => id !== sheetId));
      return;
    }
    onSelectedBugSheetIdsChange([...selectedBugSheetIds, sheetId]);
  };

  const adminsAndDevs = users.filter((u) => ['admin', 'developer'].includes(u.role));

  const showDocLinking =
    onSelectedBugDocIdsChange !== undefined || onSelectedBugSheetIdsChange !== undefined;

  const formatDocOptionLabel = (item: {
    title: string;
    creatorName?: string | null;
    projectId?: string | null;
    projectName?: string | null;
  }) => {
    const creator = item.creatorName ? ` · ${item.creatorName}` : '';
    if (!item.projectId || item.projectId.trim() === '') {
      return `${item.title}${creator} · Unassigned`;
    }
    if (currentProjectId && String(item.projectId) === String(currentProjectId)) {
      return `${item.title}${creator} · This project`;
    }
    return `${item.title}${creator} · ${item.projectName || 'Other project'}`;
  };

  return (
    <div className="relative">
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl" />
      <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="p-6 sm:p-8 pb-2">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shrink-0">
                <FileText className="h-5 w-5 text-white" />
              </div>
              {mode === 'create' ? 'Project Setup Form' : 'Edit Project Form'}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 text-base mt-2">
              {mode === 'create'
                ? 'Add client details, team allocation, timeline, and documentation'
                : 'Update project metadata, team, timeline, and attachments'}
            </CardDescription>
          </CardHeader>

          <form onSubmit={onSubmit}>
            <CardContent className="space-y-8 p-6 sm:p-8 pt-4">
              {mode === 'edit' && projectMeta && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl border border-blue-200/60 dark:border-blue-800/50 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/15 dark:to-indigo-950/10 p-4 shadow-sm">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Duration
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{durationDays} days</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                      {getProjectStatusLabel(values.status)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Created
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                      {formatProjectDate(projectMeta.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <UserCircle className="h-3.5 w-3.5" /> Created By
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                      {createdByName || 'System'}
                    </p>
                  </div>
                </div>
              )}

              <SectionBlock
                title="Project Details"
                description="Name, description, status, and compliance"
                icon={FolderKanban}
                iconClass="bg-gradient-to-br from-blue-500 to-indigo-600"
              >
                <div className="space-y-3">
                  <FieldLabel htmlFor="name" dotClass="from-blue-500 to-indigo-600">
                    Project Name
                  </FieldLabel>
                  <Input
                    id="name"
                    placeholder="Enter a descriptive project name"
                    value={values.name}
                    maxLength={NAME_MAX}
                    onChange={(e) => setField('name', e.target.value)}
                    required
                    className={cn(inputClass, 'focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500')}
                  />
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Keep it clear and recognizable</span>
                    <span className={cn('font-semibold', values.name.length > NAME_MAX * 0.9 && 'text-blue-600')}>
                      {values.name.length}/{NAME_MAX}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <FieldLabel htmlFor="description" dotClass="from-emerald-500 to-teal-600">
                    Project Description
                  </FieldLabel>
                  <Textarea
                    id="description"
                    placeholder="Describe the project scope, goals, and key deliverables..."
                    value={values.description}
                    maxLength={DESCRIPTION_MAX}
                    onChange={(e) => setField('description', e.target.value)}
                    required
                    className={cn(textareaClass, 'focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500')}
                  />
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Include scope, goals, and context</span>
                    <span
                      className={cn(
                        'font-semibold',
                        values.description.length > DESCRIPTION_MAX * 0.9 && 'text-emerald-600'
                      )}
                    >
                      {values.description.length}/{DESCRIPTION_MAX}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <FieldLabel htmlFor="status" dotClass="from-violet-500 to-purple-600">
                      Status
                    </FieldLabel>
                    <SearchableSelect
                      id="status"
                      value={values.status}
                      onValueChange={(v) => setField('status', v as ProjectFormValues['status'])}
                      placeholder="Select status"
                      searchPlaceholder="Search status..."
                      options={[
                        { value: 'active', label: 'Ongoing' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'release_ready', label: 'Release Ready' },
                        { value: 'archived', label: 'Archived' },
                      ]}
                      triggerClassName="focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                    />
                  </div>

                  {mode === 'edit' && complianceSummary && (
                    <div className="space-y-3">
                      <FieldLabel dotClass="from-indigo-500 to-violet-600">
                        Compliance Pipeline
                      </FieldLabel>
                      <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-900/80 p-4 shadow-sm space-y-3 min-h-[3rem]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 bg-indigo-500 rounded-lg shrink-0">
                              <ShieldCheck className="h-4 w-4 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {getPipelineStageLabel(
                                  complianceSummary.pipeline_stage as Parameters<
                                    typeof getPipelineStageLabel
                                  >[0]
                                )}
                              </p>
                              {complianceSummary.emergency_bypass && (
                                <Badge
                                  variant="outline"
                                  className="mt-1 border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                                >
                                  Emergency bypass
                                </Badge>
                              )}
                            </div>
                          </div>
                          {currentProjectId && (
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="shrink-0 rounded-lg h-9"
                            >
                              <Link to={`/${effectiveRole}/projects/${currentProjectId}/compliance`}>
                                Open
                              </Link>
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                          <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1">
                            Dev {complianceSummary.developer_verified}/{complianceSummary.developer_total}
                          </span>
                          <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1">
                            QA {complianceSummary.tester_verified}/{complianceSummary.tester_total}
                          </span>
                          <span className="rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-1">
                            Project {complianceSummary.project_verified}/{complianceSummary.project_total}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </SectionBlock>

              <SectionBlock
                title="Client Details"
                description="Link this project to a client profile"
                icon={Building2}
                iconClass="bg-gradient-to-br from-amber-500 to-orange-600"
              >
                <div className="space-y-4">
                  <div className="space-y-3">
                    <FieldLabel htmlFor="client_id" dotClass="from-amber-500 to-orange-600">
                      Client
                    </FieldLabel>
                    <SearchableSelect
                      id="client_id"
                      value={values.client_id}
                      onValueChange={(v) => {
                        const selected = clients.find((c) => c.id === v);
                        onChange({
                          ...values,
                          client_id: v,
                          client_name: selected?.corporate_name || '',
                        });
                      }}
                      placeholder="Select a client..."
                      searchPlaceholder="Search clients..."
                      emptyMessage="No clients found."
                      options={clients.map((client) => ({
                        value: client.id,
                        label: client.corporate_name,
                        searchValue: `${client.corporate_name} ${client.primary_contact_name || ''} ${client.direct_email || ''}`,
                      }))}
                      triggerClassName="focus:ring-2 focus:ring-amber-500/50"
                    />
                    <Link
                      to={`/${effectiveRole}/clients/new`}
                      className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create new client
                    </Link>
                  </div>
                  {values.client_id && !clients.some((c) => c.id === values.client_id) && values.client_name && (
                    <p className="text-sm text-muted-foreground">
                      Linked client: {values.client_name}
                    </p>
                  )}
                </div>
              </SectionBlock>

              <SectionBlock
                title="Team Allocation"
                description="Project Lead, Developer, QA & Testing"
                icon={Users}
                iconClass="bg-gradient-to-br from-purple-500 to-violet-600"
              >
                <div className="space-y-3">
                  <FieldLabel dotClass="from-purple-500 to-violet-600">Project Lead</FieldLabel>
                  <SearchableSelect
                    value={values.project_lead_id || 'none'}
                    onValueChange={(v) => setField('project_lead_id', v === 'none' ? '' : v)}
                    placeholder="Select project lead"
                    searchPlaceholder="Search project lead..."
                    emptyMessage="No users found."
                    options={[
                      { value: 'none', label: 'Not assigned' },
                      ...adminsAndDevs.map((user) => {
                        const displayName = user.username || user.name;
                        return {
                          value: user.id,
                          label: `${displayName} (${user.role})`,
                          searchValue: `${displayName} ${user.email || ''} ${user.role} ${user.id}`,
                        };
                      }),
                    ]}
                    triggerClassName="focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
                <MultiUserSelect
                  label="Developers"
                  dotClass="from-blue-500 to-indigo-600"
                  users={users}
                  selectedIds={values.developer_ids}
                  onChange={(ids) => setField('developer_ids', ids)}
                  roleFilter={['developer', 'admin']}
                  placeholder="No developers assigned"
                />
                <MultiUserSelect
                  label="QA & Testing"
                  dotClass="from-emerald-500 to-teal-600"
                  users={users}
                  selectedIds={values.tester_ids}
                  onChange={(ids) => setField('tester_ids', ids)}
                  roleFilter={['tester']}
                  placeholder="No QA assigned"
                />
              </SectionBlock>

              <SectionBlock
                title="Technology Stack"
                description="Languages, frameworks, tools, and design references"
                icon={Layers}
                iconClass="bg-gradient-to-br from-cyan-500 to-blue-600"
              >
                <div className="flex flex-wrap gap-2 min-h-[2rem]">
                  {techStackItems.length === 0 && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">No technologies added</span>
                  )}
                  {techStackItems.map((item, index) => (
                    <Badge key={`${item}-${index}`} variant="outline" className="gap-1 pr-1 text-sm">
                      {item}
                      <button
                        type="button"
                        onClick={() => removeTechItem(index)}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
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
                    className={cn(inputClass, 'focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500')}
                  />
                  <Button type="button" variant="outline" onClick={addTechItem} className="h-12 px-5 rounded-xl">
                    Add
                  </Button>
                </div>

                <div className="space-y-3">
                  <FieldLabel
                    htmlFor="reference_sites_or_themes"
                    dotClass="from-blue-500 to-indigo-600"
                    hint="Add inspiration links, UI theme notes, or reference websites."
                  >
                    Reference Sites / Themes
                  </FieldLabel>
                  <Textarea
                    id="reference_sites_or_themes"
                    placeholder="e.g. https://dribbble.com/shots/... or 'Use clean SaaS dashboard style'"
                    value={values.reference_sites_or_themes}
                    onChange={(e) => setField('reference_sites_or_themes', e.target.value)}
                    className={cn(textareaClass, 'min-h-[110px] focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500')}
                  />
                </div>
              </SectionBlock>

              <SectionBlock
                title="Project Timeline"
                description={`Duration: ${durationDays} days (from start date)`}
                icon={Calendar}
                iconClass="bg-gradient-to-br from-rose-500 to-pink-600"
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { key: 'start_date' as const, label: 'Start Date', dot: 'from-rose-500 to-pink-600' },
                    { key: 'deadline_date' as const, label: 'Deadline Date', dot: 'from-red-500 to-orange-600' },
                    { key: 'expected_publish_date' as const, label: 'Expected Publish', dot: 'from-orange-500 to-amber-600' },
                    { key: 'testing_start_date' as const, label: 'Testing Start', dot: 'from-yellow-500 to-lime-600' },
                    { key: 'testing_end_date' as const, label: 'Testing End', dot: 'from-lime-500 to-green-600' },
                    { key: 'frontend_finish_date' as const, label: 'Frontend Finish', dot: 'from-green-500 to-emerald-600' },
                    { key: 'backend_finish_date' as const, label: 'Backend Finish', dot: 'from-emerald-500 to-teal-600' },
                  ].map(({ key, label, dot }) => (
                    <div key={key} className="space-y-3">
                      <FieldLabel dotClass={dot}>{label}</FieldLabel>
                      <DatePicker
                        value={values[key]}
                        onChange={(v) => setField(key, v)}
                        placeholder="Not set"
                        className={cn(selectTriggerClass, 'focus:ring-2')}
                      />
                    </div>
                  ))}
                  <div className="space-y-3">
                    <FieldLabel dotClass="from-blue-500 to-indigo-600">Duration</FieldLabel>
                    <div className="flex h-12 items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-sm font-semibold text-gray-900 dark:text-white shadow-sm">
                      {durationDays} days
                    </div>
                  </div>
                </div>
              </SectionBlock>

              {showDocLinking && (
                <SectionBlock
                  title="Connect Existing Docs"
                  description="Link any BugDocs and BugSheets to this project"
                  icon={FileText}
                  iconClass="bg-gradient-to-br from-fuchsia-500 to-purple-600"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <FieldLabel dotClass="from-fuchsia-500 to-purple-600">
                        BugDocs ({availableBugDocs.length})
                      </FieldLabel>
                      <div className="flex flex-wrap gap-2 min-h-[2.75rem] p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                        {selectedBugDocIds.length === 0 && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            No BugDocs selected
                          </span>
                        )}
                        {selectedBugDocIds.map((id) => {
                          const doc = availableBugDocs.find((item) => item.id === id);
                          if (!doc) return null;
                          return (
                            <Badge key={id} variant="secondary" className="gap-1 pr-1 text-sm max-w-full">
                              <span className="truncate">{doc.title}</span>
                              <button
                                type="button"
                                onClick={() => toggleExistingDoc(id)}
                                className="ml-1 rounded-full hover:bg-muted p-0.5 shrink-0"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                      <SearchableSelect
                        value=""
                        onValueChange={(v) => toggleExistingDoc(Number(v))}
                        placeholder="Add BugDoc..."
                        searchPlaceholder="Search all BugDocs..."
                        emptyMessage="No BugDocs found."
                        options={availableBugDocs
                          .filter((doc) => !selectedBugDocIds.includes(doc.id))
                          .map((doc) => ({
                            value: String(doc.id),
                            label: formatDocOptionLabel(doc),
                            searchValue: `${doc.title} ${doc.creatorName || ''} ${doc.projectName || ''} ${doc.id}`,
                          }))}
                        triggerClassName="focus:ring-2 focus:ring-fuchsia-500/50"
                      />
                    </div>

                    <div className="space-y-3">
                      <FieldLabel dotClass="from-indigo-500 to-violet-600">
                        BugSheets ({availableBugSheets.length})
                      </FieldLabel>
                      <div className="flex flex-wrap gap-2 min-h-[2.75rem] p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                        {selectedBugSheetIds.length === 0 && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            No BugSheets selected
                          </span>
                        )}
                        {selectedBugSheetIds.map((id) => {
                          const sheet = availableBugSheets.find((item) => item.id === id);
                          if (!sheet) return null;
                          return (
                            <Badge key={id} variant="secondary" className="gap-1 pr-1 text-sm max-w-full">
                              <span className="truncate">{sheet.title}</span>
                              <button
                                type="button"
                                onClick={() => toggleExistingSheet(id)}
                                className="ml-1 rounded-full hover:bg-muted p-0.5 shrink-0"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                      <SearchableSelect
                        value=""
                        onValueChange={(v) => toggleExistingSheet(Number(v))}
                        placeholder="Add BugSheet..."
                        searchPlaceholder="Search all BugSheets..."
                        emptyMessage="No BugSheets found."
                        options={availableBugSheets
                          .filter((sheet) => !selectedBugSheetIds.includes(sheet.id))
                          .map((sheet) => ({
                            value: String(sheet.id),
                            label: formatDocOptionLabel(sheet),
                            searchValue: `${sheet.title} ${sheet.creatorName || ''} ${sheet.projectName || ''} ${sheet.id}`,
                          }))}
                        triggerClassName="focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                  </div>
                </SectionBlock>
              )}

              <div className="space-y-4">
                <FieldLabel dotClass="from-indigo-500 to-purple-600">Attachment Docs</FieldLabel>
                <div className="rounded-xl border border-indigo-200/60 dark:border-indigo-800/50 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/15 dark:to-purple-950/10 p-4 sm:p-5 space-y-4">
                  {existingAttachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Existing attachments</p>
                      {existingAttachments.map((att) => (
                        <button
                          key={att.id}
                          type="button"
                          onClick={() =>
                            navigate(
                              buildDocumentPreviewPagePath(effectiveRole, {
                                filePath: att.file_path,
                                fileName: att.file_name,
                                returnTo: currentProjectId
                                  ? `/${effectiveRole}/projects/${currentProjectId}/edit`
                                  : `/${effectiveRole}/projects`,
                              })
                            )
                          }
                          className="flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left text-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                        >
                          <File className="h-4 w-4 shrink-0 text-indigo-500" />
                          <span className="truncate font-medium">{att.file_name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-12 w-full sm:w-auto rounded-xl border-dashed border-2 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
                  >
                    <Paperclip className="mr-2 h-4 w-4" /> Choose documentation files
                  </Button>

                  {attachmentFiles.length > 0 && (
                    <div className="space-y-2">
                      {attachmentFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                        >
                          <span className="flex items-center gap-2 truncate font-medium">
                            <File className="h-4 w-4 shrink-0 text-indigo-500" />
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
              </div>

              {error && (
                <p className="text-sm font-medium text-red-500 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                  {error}
                </p>
              )}
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
                  disabled={isSubmitting || !values.name.trim() || !values.description.trim()}
                  className="h-12 px-8 bg-gradient-to-r from-blue-600 to-emerald-700 hover:from-blue-700 hover:to-emerald-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {mode === 'create' ? 'Creating...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      {mode === 'create' ? 'Create Project' : 'Save Changes'}
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
