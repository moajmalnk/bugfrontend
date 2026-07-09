import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Announcement,
  AnnouncementPayload,
  announcementService,
} from '@/services/announcementService';
import {
  TaskFormActions,
  TaskFormDialogShell,
  TaskFormField,
  TaskFormSection,
  taskFieldControlClass,
  taskTextareaClass,
} from '@/components/tasks/TaskFormDialogShell';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import {
  Bell,
  CalendarIcon,
  CheckCircle2,
  Code,
  Megaphone,
  Shield,
  TestTube,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from '../ui/use-toast';
import { userService } from '@/services/userService';
import { User } from '@/types';

interface AnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: Announcement | null;
  onSave: () => void;
}

const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  is_active: z.boolean(),
  expiry_date: z.date().nullable(),
  role: z.string().optional(),
});

const ROLE_OPTIONS = [
  {
    value: 'all',
    label: 'All Users',
    icon: Users,
    color: 'text-green-600 dark:text-green-400',
    chip: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  },
  {
    value: 'admins',
    label: 'Admins Only',
    icon: Shield,
    color: 'text-purple-600 dark:text-purple-400',
    chip: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
  },
  {
    value: 'developers',
    label: 'Developers Only',
    icon: Code,
    color: 'text-blue-600 dark:text-blue-400',
    chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  },
  {
    value: 'testers',
    label: 'Testers Only',
    icon: TestTube,
    color: 'text-pink-600 dark:text-pink-400',
    chip: 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300',
  },
] as const;

export const AnnouncementDialog = ({
  open,
  onOpenChange,
  announcement,
  onSave,
}: AnnouncementDialogProps) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['all']);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientRoleFilter, setRecipientRoleFilter] = useState<'all' | 'admin' | 'developer' | 'tester'>('all');

  const form = useForm<z.infer<typeof announcementSchema>>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      content: '',
      is_active: false,
      expiry_date: null,
      role: 'all',
    },
  });

  useEffect(() => {
    if (announcement) {
      const role = announcement.role || 'all';
      const rolesArray = role === 'all' ? ['all'] : role.split(',').map((r) => r.trim());
      setSelectedRoles(rolesArray);

      form.reset({
        title: announcement.title,
        content: announcement.content,
        is_active: !!announcement.is_active,
        expiry_date: announcement.expiry_date ? parseISO(announcement.expiry_date) : null,
        role,
      });
      setSelectedRecipients([]);
    } else {
      setSelectedRoles(['all']);
      form.reset({
        title: '',
        content: '',
        is_active: false,
        expiry_date: null,
        role: 'all',
      });
      setSelectedRecipients([]);
    }
  }, [announcement, form, open]);

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const allUsers = await userService.getUsers();
        if (!isMounted) return;
        setUsers(allUsers.filter((user) => Number(user.account_active ?? 1) === 1));
      } catch {
        if (!isMounted) return;
        setUsers([]);
        toast({
          title: 'Could not load users',
          description: 'Recipient list is unavailable right now.',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) {
          setLoadingUsers(false);
        }
      }
    };

    loadUsers();
    return () => {
      isMounted = false;
    };
  }, [open]);

  const onSubmit = async (values: z.infer<typeof announcementSchema>) => {
    try {
      const roleValue =
        selectedRoles.length === 1 && selectedRoles[0] === 'all'
          ? 'all'
          : selectedRoles.filter((r) => r !== 'all').join(',');

      const payload: AnnouncementPayload = {
        title: values.title,
        content: values.content,
        is_active: values.is_active ? 1 : 0,
        expiry_date: values.expiry_date
          ? format(values.expiry_date, 'yyyy-MM-dd HH:mm:ss')
          : null,
        role: roleValue,
        recipient_user_ids: selectedRecipients,
      };

      if (announcement) {
        await announcementService.update(announcement.id, payload);
        toast({
          title: 'Success',
          description: 'Announcement updated successfully.',
        });
      } else {
        await announcementService.create(payload);
        toast({
          title: 'Success',
          description: 'Announcement created successfully.',
        });
      }
      onSave();
      onOpenChange(false);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save announcement.',
        variant: 'destructive',
      });
    }
  };

  const isEditing = !!announcement;
  const filteredUsers = users.filter((user) => {
    const userRole = String(user.role || '').toLowerCase();
    const byRole = recipientRoleFilter === 'all' || userRole === recipientRoleFilter;
    const query = recipientSearch.trim().toLowerCase();
    const bySearch =
      query === '' ||
      String(user.name || user.username || '')
        .toLowerCase()
        .includes(query) ||
      String(user.username || '')
        .toLowerCase()
        .includes(query) ||
      String(user.email || '')
        .toLowerCase()
        .includes(query);

    return byRole && bySearch;
  });

  const roleBadgeClass = (role: string) => {
    const normalized = role.toLowerCase();
    if (normalized === 'admin') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    if (normalized === 'developer') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    if (normalized === 'tester') return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  return (
    <TaskFormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Edit Announcement' : 'Create Announcement'}
      description={
        isEditing
          ? 'Update the announcement details and who can see it.'
          : 'Create a new announcement for your team.'
      }
      icon={<Megaphone className="h-6 w-6" />}
      headerClassName="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600"
      maxWidthClassName="max-w-4xl"
      footer={
        <TaskFormActions
          onCancel={() => onOpenChange(false)}
          onSubmit={form.handleSubmit(onSubmit)}
          submitting={form.formState.isSubmitting}
          submitLabel={isEditing ? 'Save Changes' : 'Create Announcement'}
          disabled={selectedRoles.length === 0}
        />
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 md:space-y-6">
          <TaskFormSection
            title="Announcement Details"
            subtitle="Title and message shown to users"
            icon={<Bell className="h-4 w-4" />}
            accent="indigo"
          >
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <TaskFormField label="Title" required htmlFor="announcement-title">
                      <FormControl>
                        <Input
                          id="announcement-title"
                          {...field}
                          className={taskFieldControlClass}
                          placeholder="Enter announcement title"
                        />
                      </FormControl>
                    </TaskFormField>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <TaskFormField label="Content" required htmlFor="announcement-content">
                      <FormControl>
                        <Textarea
                          id="announcement-content"
                          {...field}
                          rows={5}
                          className={taskTextareaClass}
                          placeholder="Write the announcement message…"
                        />
                      </FormControl>
                    </TaskFormField>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TaskFormSection>

          <TaskFormSection
            title="Publish Settings"
            subtitle="Visibility and expiry"
            icon={<CalendarIcon className="h-4 w-4" />}
            accent="amber"
          >
            <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem>
                    <TaskFormField label="Active">
                      <div className="flex h-11 items-center justify-between rounded-lg border-2 border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-900">
                        <span className="text-sm text-muted-foreground">Visible to users</span>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </div>
                    </TaskFormField>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiry_date"
                render={({ field }) => (
                  <FormItem>
                    <TaskFormField label="Expiry Date (Optional)">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                taskFieldControlClass,
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                              {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </TaskFormField>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TaskFormSection>

          <TaskFormSection
            title="Audience"
            subtitle="Who can see this announcement"
            icon={<Shield className="h-4 w-4" />}
            accent="purple"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Accessible to Roles <span className="text-red-500">*</span>
                </p>
                {selectedRoles.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedRoles.length} selected
                  </Badge>
                )}
              </div>

              {selectedRoles.length > 0 && (
                <div className="flex flex-wrap gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/40">
                  {selectedRoles.map((roleValue) => {
                    const role = ROLE_OPTIONS.find((r) => r.value === roleValue);
                    if (!role) return null;
                    const Icon = role.icon;
                    return (
                      <Badge
                        key={roleValue}
                        variant="outline"
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium',
                          role.chip
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {role.label}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedRoles((prev) => prev.filter((r) => r !== roleValue))
                          }
                          className="ml-1 rounded-full p-0.5 transition-colors hover:bg-destructive/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2 rounded-lg border-2 border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                {ROLE_OPTIONS.map((role) => {
                  const Icon = role.icon;
                  const isSelected = selectedRoles.includes(role.value);
                  return (
                    <div
                      key={role.value}
                      className={cn(
                        'flex items-center space-x-3 rounded-md border p-2.5 transition-colors',
                        isSelected
                          ? 'border-indigo-200 bg-indigo-50/80 dark:border-indigo-800 dark:bg-indigo-950/30'
                          : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60'
                      )}
                    >
                      <Checkbox
                        id={`announcement-role-${role.value}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (role.value === 'all') {
                            setSelectedRoles(checked ? ['all'] : []);
                          } else if (checked) {
                            setSelectedRoles((prev) =>
                              prev.filter((r) => r !== 'all').concat(role.value)
                            );
                          } else {
                            setSelectedRoles((prev) => prev.filter((r) => r !== role.value));
                          }
                        }}
                      />
                      <label
                        htmlFor={`announcement-role-${role.value}`}
                        className="flex flex-1 cursor-pointer items-center gap-2 text-sm font-medium leading-none"
                      >
                        <Icon className={cn('h-4 w-4', role.color)} />
                        {role.label}
                        {isSelected && <CheckCircle2 className="ml-auto h-4 w-4 text-indigo-600" />}
                      </label>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
                <span className="mt-0.5 text-blue-600 dark:text-blue-400">💡</span>
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  <strong>Tip:</strong> Selecting &quot;All Users&quot; overrides other roles. Uncheck
                  it to target specific teams.
                </p>
              </div>
            </div>
          </TaskFormSection>

          <TaskFormSection
            title="Delivery Recipients"
            subtitle="Users who will receive push and email on create"
            icon={<Users className="h-4 w-4" />}
            accent="emerald"
          >
            <div className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <Input
                  value={recipientSearch}
                  onChange={(event) => setRecipientSearch(event.target.value)}
                  placeholder="Search by name, username, or email"
                  className={taskFieldControlClass}
                />
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {[
                    { value: 'all', label: 'All Roles' },
                    { value: 'admin', label: 'Admins' },
                    { value: 'developer', label: 'Developers' },
                    { value: 'tester', label: 'Testers' },
                  ].map((roleOption) => (
                    <Button
                      key={roleOption.value}
                      type="button"
                      variant={recipientRoleFilter === roleOption.value ? 'default' : 'outline'}
                      size="sm"
                      className="h-9 min-w-[90px] rounded-md"
                      onClick={() =>
                        setRecipientRoleFilter(
                          roleOption.value as 'all' | 'admin' | 'developer' | 'tester'
                        )
                      }
                    >
                      {roleOption.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Selected Users
                </p>
                <Badge variant="secondary" className="text-xs">
                  {selectedRecipients.length} selected
                </Badge>
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border-2 border-gray-200 bg-white/90 p-3.5 shadow-sm dark:border-gray-700 dark:bg-gray-900/90">
                {loadingUsers ? (
                  <p className="text-sm text-muted-foreground">Loading users...</p>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active users available.</p>
                ) : (
                  filteredUsers.map((user) => {
                    const userId = String(user.id);
                    const isSelected = selectedRecipients.includes(userId);
                    const userRole = String(user.role || 'user');
                    return (
                      <div
                        key={userId}
                        className={cn(
                          'flex items-center space-x-3 rounded-lg border p-3 transition-all',
                          isSelected
                            ? 'border-emerald-200 bg-emerald-50/80 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/30'
                            : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60'
                        )}
                      >
                        <Checkbox
                          id={`announcement-recipient-${userId}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedRecipients((prev) => Array.from(new Set([...prev, userId])));
                            } else {
                              setSelectedRecipients((prev) => prev.filter((id) => id !== userId));
                            }
                          }}
                        />
                        <label
                          htmlFor={`announcement-recipient-${userId}`}
                          className="flex flex-1 cursor-pointer items-center justify-between gap-3 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-medium">{user.name || user.username}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                          <Badge variant="secondary" className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] uppercase ${roleBadgeClass(userRole)}`}>
                            {userRole}
                          </Badge>
                        </label>
                      </div>
                    );
                  })
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                If none are selected, notifications go to the role-based audience.
              </p>
            </div>
          </TaskFormSection>
        </form>
      </Form>
    </TaskFormDialogShell>
  );
};
