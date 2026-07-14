import { Button } from '@/components/ui/button';
import { ItemsPerPageSelect } from '@/components/pagination/ItemsPerPageSelect';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  getCommercialStatusLabel,
  getMarketIndustryLabel,
} from '@/lib/utils/clientUtils';
import { cn, getEffectiveRole } from '@/lib/utils';
import { clientService } from '@/services/clientService';
import { Client, CommercialStatus } from '@/types';
import {
  Building2,
  CircleDot,
  FolderKanban,
  Plus,
  UserRound,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

type ClientTab = 'all' | CommercialStatus;

const TAB_ITEMS: { value: ClientTab; label: string; icon: typeof Building2 }[] = [
  { value: 'all', label: 'All', icon: Users },
  { value: 'lead', label: 'Leads', icon: CircleDot },
  { value: 'active', label: 'Active', icon: Building2 },
  { value: 'inactive', label: 'Inactive', icon: UserRound },
  { value: 'ended', label: 'Ended', icon: CircleDot },
];

const statusColors: Record<string, string> = {
  lead: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  ended: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
};

const Clients = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const role = getEffectiveRole(currentUser || {});
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = (searchParams.get('tab') || 'all') as ClientTab;

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const data = await clientService.getClients();
      setClients(data);
    } catch (err) {
      toast({
        title: 'Failed to load clients',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchClients();
    }
  }, [currentUser?.role]);

  const tabCounts = useMemo(() => {
    const counts: Record<ClientTab, number> = {
      all: clients.length,
      lead: 0,
      active: 0,
      inactive: 0,
      ended: 0,
    };
    clients.forEach((c) => {
      const status = (c.commercial_status || 'lead') as CommercialStatus;
      if (counts[status] !== undefined) counts[status]++;
    });
    return counts;
  }, [clients]);

  const visibleTabs = TAB_ITEMS.filter((tab) => tab.value === 'all' || tabCounts[tab.value] > 0);

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((t) => t.value === tabFromUrl)) {
      setSearchParams({ tab: visibleTabs[0].value }, { replace: true });
    }
  }, [visibleTabs, tabFromUrl, setSearchParams]);

  useEffect(() => {
    let filtered = clients;
    const query = searchTerm.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (c) =>
          c.corporate_name?.toLowerCase().includes(query) ||
          c.primary_contact_name?.toLowerCase().includes(query) ||
          c.direct_email?.toLowerCase().includes(query) ||
          c.website?.toLowerCase().includes(query)
      );
    } else if (tabFromUrl !== 'all') {
      filtered = filtered.filter((c) => (c.commercial_status || 'lead') === tabFromUrl);
    }
    setFilteredClients(
      [...filtered].sort((a, b) =>
        (a.corporate_name || '').localeCompare(b.corporate_name || '', undefined, {
          sensitivity: 'base',
        })
      )
    );
    setCurrentPage(1);
  }, [clients, searchTerm, tabFromUrl]);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage));
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        You do not have permission to view clients.
      </div>
    );
  }

  const renderClientRow = (client: Client) => (
    <TableRow key={client.id} className="hover:bg-muted/40">
      <TableCell>
        <div>
          <p className="font-semibold">{client.corporate_name}</p>
          <p className="text-xs text-muted-foreground">
            {getMarketIndustryLabel(client.market_industry)}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          {client.primary_contact_name && <p>{client.primary_contact_name}</p>}
          {client.direct_email && (
            <p className="text-muted-foreground text-xs">{client.direct_email}</p>
          )}
          {client.direct_phone && (
            <p className="text-muted-foreground text-xs">{client.direct_phone}</p>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge className={cn('text-xs', statusColors[client.commercial_status || 'lead'])}>
          {getCommercialStatusLabel(client.commercial_status)}
        </Badge>
      </TableCell>
      <TableCell>
        {(client.project_count ?? 0) > 0 ? (
          <Link
            to={`/${role}/projects?client_id=${client.id}&tab=all-projects`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
          >
            <FolderKanban className="h-4 w-4" />
            {client.project_count}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">0</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/${role}/clients/${client.id}`)}
        >
          View
        </Button>
      </TableCell>
    </TableRow>
  );

  const renderClientCard = (client: Client) => (
    <Card key={client.id} className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{client.corporate_name}</h3>
            <p className="text-xs text-muted-foreground">
              {getMarketIndustryLabel(client.market_industry)}
            </p>
          </div>
          <Badge className={cn('text-xs shrink-0', statusColors[client.commercial_status || 'lead'])}>
            {getCommercialStatusLabel(client.commercial_status)}
          </Badge>
        </div>
        {client.primary_contact_name && (
          <p className="text-sm text-muted-foreground">{client.primary_contact_name}</p>
        )}
        <div className="flex items-center justify-between pt-2">
          <Link
            to={`/${role}/projects?client_id=${client.id}&tab=all-projects`}
            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            <FolderKanban className="h-4 w-4" />
            {client.project_count ?? 0} projects
          </Link>
          <Button size="sm" onClick={() => navigate(`/${role}/clients/${client.id}`)}>
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderContent = () => (
    <>
      {!isLoading && (
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/40 dark:border-gray-700/40 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Search Clients</h3>
          </div>
          <input
            type="text"
            placeholder="Search by corporate name, contact, email, or website..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          Showing {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
        </p>
        <ItemsPerPageSelect value={itemsPerPage} onChange={setItemsPerPage} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No clients found.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden 2xl:block rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{paginatedClients.map(renderClientRow)}</TableBody>
            </Table>
          </div>
          <div className="2xl:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paginatedClients.map(renderClientCard)}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm self-center px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                      Clients
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-muted-foreground text-base max-w-2xl">
                  Manage client profiles, contact details, and project history
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Button asChild>
                  <Link to={`/${role}/clients/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Client
                  </Link>
                </Button>
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="p-1.5 bg-blue-600 rounded-lg">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {clients.length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={tabFromUrl} onValueChange={handleTabChange} className="w-full">
          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
            <TabsList className="grid w-full h-auto bg-transparent gap-1 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {visibleTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 rounded-xl py-2.5"
                >
                  <tab.icon className="h-4 w-4 mr-2 hidden sm:inline" />
                  {tab.label}
                  <span className="ml-2 text-xs font-bold bg-muted px-2 py-0.5 rounded-full">
                    {tabCounts[tab.value]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {visibleTabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="space-y-6 mt-6">
              {renderContent()}
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </main>
  );
};

export default Clients;
