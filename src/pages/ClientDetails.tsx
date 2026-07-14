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
import { cn, getEffectiveRole } from '@/lib/utils';
import { clientService } from '@/services/clientService';
import { Client } from '@/types';
import {
  ArrowLeft,
  Building2,
  Edit,
  ExternalLink,
  FileText,
  FolderKanban,
  Mail,
  MapPin,
  Phone,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}

const statusColors: Record<string, string> = {
  lead: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  ended: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
};

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

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Client not found.{' '}
        <Link to={`/${role}/clients`} className="text-blue-600 hover:underline">
          Back to clients
        </Link>
      </div>
    );
  }

  const formatDate = (d?: string | null) => (d ? format(new Date(d), 'MMM d, yyyy') : null);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/${role}/clients`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold truncate">{client.corporate_name}</h1>
                <Badge className={cn('text-xs', statusColors[client.commercial_status || 'lead'])}>
                  {getCommercialStatusLabel(client.commercial_status)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {getMarketIndustryLabel(client.market_industry)}
                {client.hq_location ? ` · ${client.hq_location}` : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to={`/${role}/projects?client_id=${client.id}&tab=all-projects`}>
                <FolderKanban className="h-4 w-4 mr-2" />
                View Projects ({client.project_count ?? 0})
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/${role}/clients/${client.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Entity Definition
              </h3>
              <DetailRow label="Corporate Name" value={client.corporate_name} />
              <DetailRow label="Website" value={client.website} />
              <DetailRow label="Industry" value={getMarketIndustryLabel(client.market_industry)} />
              <DetailRow label="GST / Tax ID" value={client.gst_tax_id} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Communication Matrix
              </h3>
              <DetailRow label="Primary Contact" value={client.primary_contact_name} />
              <DetailRow label="Position" value={client.position} />
              {client.direct_email ? (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <a href={`mailto:${client.direct_email}`} className="hover:underline">
                    {client.direct_email}
                  </a>
                </div>
              ) : null}
              {client.direct_phone ? (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-blue-600" />
                  <span>{client.direct_phone}</span>
                </div>
              ) : null}
              {client.hq_location ? (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span>{client.hq_location}</span>
                </div>
              ) : null}
              <DetailRow label="Birthday" value={formatDate(client.birthday)} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Lifecycle & Acquisition
              </h3>
              <DetailRow label="Date of Joining" value={formatDate(client.date_of_joining)} />
              <DetailRow label="Date of Ending" value={formatDate(client.date_of_ending)} />
              <DetailRow
                label="Referral Source"
                value={getReferralSourceLabel(client.referral_source)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Internal Notes
              </h3>
              <p className="text-sm whitespace-pre-wrap">{client.notes || 'No notes added.'}</p>
            </CardContent>
          </Card>
        </div>

        {(client.attachments?.length ?? 0) > 0 && (
          <Card>
            <CardContent className="p-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Documents
              </h3>
              {client.attachments?.map((att) => (
                <Link
                  key={att.id}
                  to={buildDocumentPreviewPagePath(att.file_path)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  {att.file_name}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-blue-600" />
                Linked Projects
              </h3>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/${role}/projects?client_id=${client.id}&tab=all-projects`}>
                  View all on Projects page
                </Link>
              </Button>
            </div>
            {(client.projects?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No projects linked to this client yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.projects?.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{project.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/${role}/projects/${project.id}`}>Open</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
      </section>
    </main>
  );
};

export default ClientDetails;
