import { DeleteClientDialog } from '@/components/clients/DeleteClientDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { buildDocumentPreviewPagePath } from '@/lib/attachmentUtils';
import {
  getCommercialStatusLabel,
  getMarketIndustryLabel,
  getReferralSourceLabel,
} from '@/lib/utils/clientUtils';
import { getProjectStatusLabel } from '@/lib/utils/projectUtils';
import { cn, getEffectiveRole } from '@/lib/utils';
import { clientService } from '@/services/clientService';
import { Client } from '@/types';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  FolderKanban,
  Globe,
  IdCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

const statusColors: Record<string, string> = {
  lead: 'bg-amber-500 text-white',
  active: 'bg-emerald-500 text-white',
  inactive: 'bg-gray-500 text-white',
  ended: 'bg-red-500 text-white',
};

const statusSoft: Record<string, string> = {
  lead: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  ended: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800',
};

function SectionCard({
  title,
  icon: Icon,
  iconClass,
  children,
}: {
  title: string;
  icon: typeof Building2;
  iconClass: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-xl shadow-md text-white', iconClass)}>
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            {title}
          </h3>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function DetailField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  icon?: typeof Mail;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 min-w-0">
      {Icon ? (
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-semibold text-sm text-gray-900 dark:text-white break-words mt-0.5">
          {value}
        </div>
      </div>
    </div>
  );
}

function InfoChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 min-w-0">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}

const ClientDetails = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const role = getEffectiveRole(currentUser || {});
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const loadClient = async () => {
    if (!clientId) return;
    setIsLoading(true);
    try {
      const data = await clientService.getClient(clientId);
      setClient(data);
    } catch (err) {
      toast({
        title: 'Failed to load client',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClient();
  }, [clientId]);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        You do not have permission to view clients.
      </div>
    );
  }

  const formatDate = (d?: string | null) => (d ? format(new Date(d), 'MMM d, yyyy') : null);
  const industryLabel = client?.market_industry
    ? getMarketIndustryLabel(client.market_industry)
    : null;
  const referralLabel = client?.referral_source
    ? getReferralSourceLabel(client.referral_source)
    : null;
  const status = client?.commercial_status || 'lead';

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight truncate">
                      Client Details
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Profile, contacts, documents, and linked project history.
                </p>
              </div>
              <Button
                variant="outline"
                className="h-11 rounded-xl border-gray-200/60 dark:border-gray-700/60 bg-white/60 dark:bg-gray-900/40 backdrop-blur hover:bg-white/80 dark:hover:bg-gray-900/60"
                onClick={() => navigate(`/${role}/clients`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-4 w-72" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
              <Skeleton className="h-64 w-full rounded-2xl" />
            </CardContent>
          </Card>
        ) : !client ? (
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardContent className="p-10 text-center space-y-3">
              <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="text-lg font-semibold">Client not found</p>
              <p className="text-sm text-muted-foreground">
                The requested client doesn’t exist or you don’t have access.
              </p>
              <Button onClick={() => navigate(`/${role}/clients`)}>Go back</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Profile header card */}
            <Card className="overflow-hidden border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-emerald-50/40 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20" />
                <CardContent className="relative p-5 sm:p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="relative shrink-0 self-start">
                      <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-600 text-white shadow-xl ring-4 ring-primary/10">
                        <Building2 className="h-10 w-10 sm:h-12 sm:w-12" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-bold break-words text-gray-900 dark:text-white">
                          {client.corporate_name}
                        </h2>
                        <span
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold shrink-0',
                            statusColors[status]
                          )}
                        >
                          {getCommercialStatusLabel(status)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {industryLabel ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/50 border border-border/40 text-sm font-semibold">
                            {industryLabel}
                          </span>
                        ) : null}
                        {client.hq_location ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted/50 border border-border/40 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {client.hq_location}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted/50 border border-border/40 text-sm text-muted-foreground">
                          <FolderKanban className="h-3.5 w-3.5" />
                          {client.project_count ?? 0} project
                          {(client.project_count ?? 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick contact chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 w-full">
                    {client.primary_contact_name ? (
                      <InfoChip
                        icon={UserRound}
                        label="Primary contact"
                        value={client.primary_contact_name}
                      />
                    ) : null}
                    {client.direct_email ? (
                      <a href={`mailto:${client.direct_email}`} className="block min-w-0">
                        <InfoChip icon={Mail} label="Email" value={client.direct_email} />
                      </a>
                    ) : null}
                    {client.direct_phone ? (
                      <InfoChip icon={Phone} label="Phone" value={client.direct_phone} />
                    ) : null}
                    {client.website ? (
                      <a
                        href={
                          client.website.startsWith('http')
                            ? client.website
                            : `https://${client.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block min-w-0"
                      >
                        <InfoChip icon={Globe} label="Website" value={client.website} />
                      </a>
                    ) : null}
                    {!client.primary_contact_name &&
                      !client.direct_email &&
                      !client.direct_phone &&
                      !client.website && (
                        <div className="sm:col-span-2 text-sm text-muted-foreground p-3 rounded-xl bg-muted/20 border border-dashed border-border/50">
                          No contact details added yet.
                        </div>
                      )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-1">
                    <Button
                      asChild
                      className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold shadow-lg"
                    >
                      <Link to={`/${role}/projects?client_id=${client.id}&tab=all-projects`}>
                        <FolderKanban className="h-4 w-4 mr-2" />
                        View Projects ({client.project_count ?? 0})
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      asChild
                      className="h-11 rounded-xl border-gray-200 dark:border-gray-700"
                    >
                      <Link to={`/${role}/clients/${client.id}/edit`}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      className="h-11 rounded-xl"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>

            {/* Detail sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard
                title="Entity Definition"
                icon={Building2}
                iconClass="bg-gradient-to-br from-blue-500 to-indigo-600"
              >
                <div className="space-y-3">
                  <DetailField label="Corporate Name" value={client.corporate_name} icon={Building2} />
                  <DetailField label="Website" value={client.website} icon={Globe} />
                  <DetailField label="Industry" value={industryLabel} icon={IdCard} />
                  <DetailField label="GST / Tax ID" value={client.gst_tax_id} icon={IdCard} />
                  {!client.website && !industryLabel && !client.gst_tax_id && (
                    <p className="text-sm text-muted-foreground">Only corporate name is set.</p>
                  )}
                </div>
              </SectionCard>

              <SectionCard
                title="Communication Matrix"
                icon={UserRound}
                iconClass="bg-gradient-to-br from-emerald-500 to-teal-600"
              >
                <div className="space-y-3">
                  <DetailField
                    label="Primary Contact"
                    value={client.primary_contact_name}
                    icon={UserRound}
                  />
                  <DetailField label="Position" value={client.position} icon={IdCard} />
                  <DetailField label="HQ Location" value={client.hq_location} icon={MapPin} />
                  {client.direct_email ? (
                    <a href={`mailto:${client.direct_email}`} className="block">
                      <DetailField label="Email" value={client.direct_email} icon={Mail} />
                    </a>
                  ) : null}
                  <DetailField label="Phone" value={client.direct_phone} icon={Phone} />
                  <DetailField label="Birthday" value={formatDate(client.birthday)} icon={Calendar} />
                  {!client.primary_contact_name &&
                    !client.position &&
                    !client.hq_location &&
                    !client.direct_email &&
                    !client.direct_phone &&
                    !client.birthday && (
                      <p className="text-sm text-muted-foreground">No communication details yet.</p>
                    )}
                </div>
              </SectionCard>

              <SectionCard
                title="Lifecycle & Acquisition"
                icon={Calendar}
                iconClass="bg-gradient-to-br from-amber-500 to-orange-600"
              >
                <div className="space-y-3">
                  <DetailField
                    label="Date of Joining"
                    value={formatDate(client.date_of_joining)}
                    icon={Calendar}
                  />
                  <DetailField
                    label="Date of Ending"
                    value={formatDate(client.date_of_ending)}
                    icon={Calendar}
                  />
                  <DetailField label="Referral Source" value={referralLabel} icon={IdCard} />
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Commercial Status</div>
                      <Badge
                        variant="outline"
                        className={cn('mt-1 text-xs font-semibold rounded-full', statusSoft[status])}
                      >
                        {getCommercialStatusLabel(status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Internal Notes"
                icon={FileText}
                iconClass="bg-gradient-to-br from-violet-500 to-purple-600"
              >
                <div className="rounded-xl bg-muted/30 border border-border/40 p-4 min-h-[100px]">
                  <p className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                    {client.notes || 'No notes added.'}
                  </p>
                </div>
              </SectionCard>
            </div>

            {/* Documents */}
            {(client.attachments?.length ?? 0) > 0 && (
              <Card className="overflow-hidden border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
                <CardContent className="p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl shadow-md text-white bg-gradient-to-br from-sky-500 to-blue-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Documents
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {client.attachments?.map((att) => (
                      <Link
                        key={att.id}
                        to={buildDocumentPreviewPagePath(att.file_path)}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                      >
                        <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium truncate flex-1">{att.file_name}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Linked projects */}
            <Card className="overflow-hidden border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl shadow-md text-white bg-gradient-to-br from-blue-500 to-emerald-600">
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Linked Projects
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {client.project_count ?? 0} project
                        {(client.project_count ?? 0) !== 1 ? 's' : ''} connected to this client
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl" asChild>
                    <Link to={`/${role}/projects?client_id=${client.id}&tab=all-projects`}>
                      View all on Projects page
                    </Link>
                  </Button>
                </div>

                {(client.projects?.length ?? 0) === 0 ? (
                  <div className="p-8 text-center">
                    <FolderKanban className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      No projects linked yet
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Assign this client when creating or editing a project.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-gradient-to-r from-gray-50/80 to-blue-50/80 dark:from-gray-800/80 dark:to-blue-900/80">
                          <TableRow className="hover:bg-transparent border-b border-gray-200/60 dark:border-gray-700/60">
                            <TableHead className="px-6 py-4 font-semibold">Project</TableHead>
                            <TableHead className="px-6 py-4 font-semibold">Status</TableHead>
                            <TableHead className="px-6 py-4 text-right font-semibold">
                              Action
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {client.projects?.map((project, index) => (
                            <TableRow
                              key={project.id}
                              className={cn(
                                'border-b border-gray-100/50 dark:border-gray-800/50 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-emerald-50/30 dark:hover:from-blue-900/10 dark:hover:to-emerald-900/10',
                                index % 2 === 0
                                  ? 'bg-white/30 dark:bg-gray-900/30'
                                  : 'bg-gray-50/20 dark:bg-gray-800/20'
                              )}
                            >
                              <TableCell className="px-6 py-4 font-semibold">
                                {project.name}
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                <Badge variant="outline" className="rounded-full capitalize">
                                  {getProjectStatusLabel(
                                    (project.status as 'active' | 'completed' | 'archived' | 'release_ready') ||
                                      'active'
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-6 py-4 text-right">
                                <button
                                  className="h-9 px-4 rounded-lg text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 transition-all font-medium shadow-sm"
                                  onClick={() => navigate(`/${role}/projects/${project.id}`)}
                                >
                                  Open
                                </button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="md:hidden p-4 space-y-3">
                      {client.projects?.map((project) => (
                        <div
                          key={project.id}
                          className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/90 dark:bg-gray-900/90 p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-sm">{project.name}</p>
                            <Badge variant="outline" className="rounded-full capitalize shrink-0">
                              {getProjectStatusLabel(
                                (project.status as 'active' | 'completed' | 'archived' | 'release_ready') ||
                                  'active'
                              )}
                            </Badge>
                          </div>
                          <button
                            className="w-full h-10 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium"
                            onClick={() => navigate(`/${role}/projects/${project.id}`)}
                          >
                            Open Project
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <DeleteClientDialog
              clientId={client.id}
              clientName={client.corporate_name}
              projectCount={client.project_count}
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              onDeleted={() => navigate(`/${role}/clients`)}
            />
          </div>
        )}
      </section>
    </main>
  );
};

export default ClientDetails;
