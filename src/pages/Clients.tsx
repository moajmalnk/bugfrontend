import { Button } from '@/components/ui/button';
import { ItemsPerPageSelect } from '@/components/pagination/ItemsPerPageSelect';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
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
  Check,
  ChevronDown,
  CircleDot,
  FolderKanban,
  Mail,
  Phone,
  Plus,
  Search,
  UserRound,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

type ClientTab = 'all' | CommercialStatus;

const statusColors: Record<string, string> = {
  lead: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  ended: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800',
};

const ClientCardSkeleton = () => (
  <div className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/90 dark:bg-gray-900/90 p-4 sm:p-5 space-y-4 animate-pulse">
    <div className="flex items-center gap-3">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
    <Skeleton className="h-16 w-full rounded-lg" />
    <Skeleton className="h-10 w-full rounded-lg" />
  </div>
);

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
  const [isMobileTabSelectorOpen, setIsMobileTabSelectorOpen] = useState(false);
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

  const statusTabs = [
    {
      value: 'all' as ClientTab,
      label: 'All',
      shortLabel: 'All',
      icon: Users,
      count: tabCounts.all,
      countClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    },
    ...(tabCounts.lead > 0
      ? [{
          value: 'lead' as ClientTab,
          label: 'Leads',
          shortLabel: 'Leads',
          icon: CircleDot,
          count: tabCounts.lead,
          countClass: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
        }]
      : []),
    ...(tabCounts.active > 0
      ? [{
          value: 'active' as ClientTab,
          label: 'Active',
          shortLabel: 'Active',
          icon: Building2,
          count: tabCounts.active,
          countClass: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
        }]
      : []),
    ...(tabCounts.inactive > 0
      ? [{
          value: 'inactive' as ClientTab,
          label: 'Inactive',
          shortLabel: 'Inactive',
          icon: UserRound,
          count: tabCounts.inactive,
          countClass: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
        }]
      : []),
    ...(tabCounts.ended > 0
      ? [{
          value: 'ended' as ClientTab,
          label: 'Ended',
          shortLabel: 'Ended',
          icon: CircleDot,
          count: tabCounts.ended,
          countClass: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
        }]
      : []),
  ];

  const isValidTab = statusTabs.some((tab) => tab.value === tabFromUrl);
  const activeTab = isValidTab ? tabFromUrl : statusTabs[0]?.value || 'all';
  const activeStatusTab = statusTabs.find((tab) => tab.value === activeTab) ?? statusTabs[0];

  const tabGridClass =
    statusTabs.length <= 1
      ? 'grid-cols-1'
      : statusTabs.length === 2
        ? 'grid-cols-2'
        : statusTabs.length === 3
          ? 'grid-cols-3'
          : statusTabs.length === 4
            ? 'grid-cols-2 lg:grid-cols-4'
            : 'grid-cols-2 lg:grid-cols-5';

  useEffect(() => {
    if (statusTabs.length > 0 && !statusTabs.some((t) => t.value === tabFromUrl)) {
      setSearchParams({ tab: statusTabs[0].value }, { replace: true });
    }
  }, [statusTabs, tabFromUrl, setSearchParams]);

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
    } else if (activeTab !== 'all') {
      filtered = filtered.filter((c) => (c.commercial_status || 'lead') === activeTab);
    }
    setFilteredClients(
      [...filtered].sort((a, b) =>
        (a.corporate_name || '').localeCompare(b.corporate_name || '', undefined, {
          sensitivity: 'base',
        })
      )
    );
    setCurrentPage(1);
  }, [clients, searchTerm, activeTab]);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const totalFiltered = filteredClients.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / itemsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedClients = filteredClients.slice(
    (activePage - 1) * itemsPerPage,
    activePage * itemsPerPage
  );

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        You do not have permission to view clients.
      </div>
    );
  }

  const renderTabsList = (listClassName: string) => (
    <TabsList className={listClassName}>
      {statusTabs.map((tab) => (
        <TabsTrigger
          key={tab.value}
          value={tab.value}
          className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
        >
          <tab.icon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 shrink-0" />
          <span className="hidden sm:inline">{tab.label}</span>
          <span className="sm:hidden">{tab.shortLabel}</span>
          <span className={cn('ml-1 sm:ml-2 px-2 py-0.5 rounded-full text-xs font-bold', tab.countClass)}>
            {tab.count}
          </span>
        </TabsTrigger>
      ))}
    </TabsList>
  );

  const renderClientsContent = () => (
    <>
      {!isLoading && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-xl" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/40 dark:border-gray-700/40 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4 w-full">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Search className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Search Clients</h3>
              {searchTerm.trim() ? (
                <span className="text-xs text-muted-foreground ml-auto">Searching all statuses</span>
              ) : null}
            </div>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Search by corporate name, contact, email, or website..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
              />
            </div>
          </div>
        </div>
      )}

      {!isLoading && totalFiltered > 0 && totalPages > 1 && (
        <div className="flex flex-col gap-4 sm:gap-5 mb-6 w-full bg-gradient-to-r from-background via-background to-muted/10 rounded-xl shadow-sm border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse" />
              <span className="text-sm sm:text-base text-foreground font-semibold">
                Showing{' '}
                <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {(activePage - 1) * itemsPerPage + 1}
                </span>
                -
                <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {Math.min(activePage * itemsPerPage, totalFiltered)}
                </span>{' '}
                of{' '}
                <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {totalFiltered}
                </span>{' '}
                clients
              </span>
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-3">
              <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
                Items per page:
              </span>
              <ItemsPerPageSelect
                id="clients-items-per-page"
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 pt-0 border-t border-border/30">
            <div className="sm:hidden flex items-center gap-2 text-sm text-muted-foreground font-medium w-full justify-center">
              Page{' '}
              <span className="text-primary font-semibold">{activePage}</span> of{' '}
              <span className="text-primary font-semibold">{totalPages}</span>
            </div>
            <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={activePage === 1}
                className="h-10 px-3 sm:px-4 min-w-[80px] sm:min-w-[90px] font-medium transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border border-border/60 hover:border-primary/50 hover:bg-primary/5 rounded-lg bg-background/80"
              >
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden text-lg">‹</span>
              </button>
              <div className="hidden md:flex items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => page === 1 || page === totalPages || Math.abs(page - activePage) <= 1)
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev != null && page - prev > 1;
                    return (
                      <span key={page} className="flex items-center gap-1.5">
                        {showEllipsis && (
                          <span className="h-10 w-10 flex items-center justify-center text-sm text-muted-foreground/60">
                            •••
                          </span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            'h-10 w-10 flex items-center justify-center font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border border-border/60 rounded-lg',
                            activePage === page
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background/80 hover:bg-background/90 hover:border-primary/50'
                          )}
                        >
                          {page}
                        </button>
                      </span>
                    );
                  })}
              </div>
              <div className="md:hidden flex items-center gap-3 bg-muted/20 rounded-lg px-3 py-2 border border-border/30">
                <select
                  value={activePage}
                  onChange={(e) => setCurrentPage(Number(e.target.value))}
                  className="border-0 bg-transparent text-sm font-semibold text-primary focus:outline-none min-w-[50px]"
                  aria-label="Go to page"
                >
                  {Array.from({ length: totalPages }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-muted-foreground">/ {totalPages}</span>
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={activePage === totalPages}
                className="h-10 px-3 sm:px-4 min-w-[80px] sm:min-w-[90px] font-medium transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border border-border/60 hover:border-primary/50 hover:bg-primary/5 rounded-lg bg-background/80"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden text-lg">›</span>
              </button>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground font-medium">
              Page <span className="text-primary font-semibold">{activePage}</span> of{' '}
              <span className="text-primary font-semibold">{totalPages}</span>
            </div>
          </div>
        </div>
      )}

      {!isLoading && totalFiltered > 0 && totalPages <= 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 p-4 sm:p-5 bg-gradient-to-r from-background via-background to-muted/10 rounded-xl border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse" />
            <span className="text-sm sm:text-base text-foreground font-semibold">
              Showing{' '}
              <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {totalFiltered}
              </span>{' '}
              client{totalFiltered !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center justify-center sm:justify-end gap-3">
            <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
              Items per page:
            </span>
            <ItemsPerPageSelect
              id="clients-items-per-page-simple"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
            />
          </div>
        </div>
      )}

      {!isLoading && totalFiltered === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300/80 bg-gray-50/40 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-800/20">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {searchTerm.trim()
              ? 'No clients match your current search.'
              : 'No clients found for this status.'}
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link to={`/${role}/clients/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Link>
          </Button>
        </div>
      )}

      {(isLoading || totalFiltered > 0) && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-2xl" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
            <div className="hidden 2xl:block w-full overflow-x-auto">
              <Table className="w-full">
                <TableHeader className="bg-gradient-to-r from-gray-50/80 to-blue-50/80 dark:from-gray-800/80 dark:to-blue-900/80 backdrop-blur-sm">
                  <TableRow className="border-b border-gray-200/60 dark:border-gray-700/60 hover:bg-transparent">
                    <TableHead className="w-[28%] px-6 font-semibold text-sm text-gray-700 dark:text-gray-300 py-5">
                      Client
                    </TableHead>
                    <TableHead className="w-[28%] px-6 font-semibold text-sm text-gray-700 dark:text-gray-300 py-5">
                      Contact
                    </TableHead>
                    <TableHead className="w-[14%] px-6 font-semibold text-sm text-gray-700 dark:text-gray-300 py-5">
                      Status
                    </TableHead>
                    <TableHead className="w-[14%] px-6 font-semibold text-sm text-gray-700 dark:text-gray-300 py-5">
                      Projects
                    </TableHead>
                    <TableHead className="w-[16%] px-6 text-right font-semibold text-sm text-gray-700 dark:text-gray-300 py-5">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array(5)
                        .fill(0)
                        .map((_, index) => (
                          <TableRow key={index} className="animate-pulse border-b border-gray-100/50 dark:border-gray-800/50">
                            <TableCell className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-xl" />
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-20" />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-5">
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-28" />
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-5">
                              <Skeleton className="h-6 w-16 rounded-full" />
                            </TableCell>
                            <TableCell className="px-6 py-5">
                              <Skeleton className="h-6 w-12 rounded-md" />
                            </TableCell>
                            <TableCell className="px-6 py-5 text-right">
                              <Skeleton className="h-9 w-20 ml-auto rounded-lg" />
                            </TableCell>
                          </TableRow>
                        ))
                    : paginatedClients.map((client, index) => (
                        <TableRow
                          key={client.id}
                          className={cn(
                            'group hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-emerald-50/30 dark:hover:from-blue-900/10 dark:hover:to-emerald-900/10 transition-all duration-200 border-b border-gray-100/50 dark:border-gray-800/50',
                            index % 2 === 0
                              ? 'bg-white/30 dark:bg-gray-900/30'
                              : 'bg-gray-50/20 dark:bg-gray-800/20'
                          )}
                        >
                          <TableCell className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-emerald-600 text-white shadow-md">
                                <Building2 className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors truncate">
                                  {client.corporate_name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {getMarketIndustryLabel(client.market_industry)}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-5">
                            <div className="space-y-1">
                              {client.primary_contact_name && (
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {client.primary_contact_name}
                                </p>
                              )}
                              {client.direct_email && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 truncate">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  {client.direct_email}
                                </p>
                              )}
                              {client.direct_phone && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                  <Phone className="h-3 w-3 shrink-0" />
                                  {client.direct_phone}
                                </p>
                              )}
                              {!client.primary_contact_name && !client.direct_email && !client.direct_phone && (
                                <p className="text-xs text-muted-foreground">No contact info</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-5">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs font-semibold rounded-full',
                                statusColors[client.commercial_status || 'lead']
                              )}
                            >
                              {getCommercialStatusLabel(client.commercial_status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-5">
                            {(client.project_count ?? 0) > 0 ? (
                              <Link
                                to={`/${role}/projects?client_id=${client.id}&tab=all-projects`}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <FolderKanban className="h-4 w-4" />
                                {client.project_count}
                              </Link>
                            ) : (
                              <span className="text-sm text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-5 text-right">
                            <button
                              className="h-9 px-4 py-2 rounded-lg text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                              onClick={() => navigate(`/${role}/clients/${client.id}`)}
                            >
                              View
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:hidden gap-4 sm:gap-6 p-4 sm:p-6">
              {isLoading
                ? Array(6)
                    .fill(0)
                    .map((_, index) => <ClientCardSkeleton key={index} />)
                : paginatedClients.map((client) => (
                    <div
                      key={client.id}
                      className="group relative overflow-hidden rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-200 p-4 sm:p-5 flex flex-col gap-4 w-full"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-emerald-600 text-white shadow-md">
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                            {client.corporate_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {getMarketIndustryLabel(client.market_industry)}
                          </p>
                          <div className="mt-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-semibold rounded-full',
                                statusColors[client.commercial_status || 'lead']
                              )}
                            >
                              {getCommercialStatusLabel(client.commercial_status)}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-lg p-3 space-y-1.5">
                        {client.primary_contact_name && (
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {client.primary_contact_name}
                          </p>
                        )}
                        {client.direct_email && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 truncate">
                            <Mail className="h-3 w-3 shrink-0" />
                            {client.direct_email}
                          </p>
                        )}
                        {client.direct_phone && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <Phone className="h-3 w-3 shrink-0" />
                            {client.direct_phone}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <Link
                          to={`/${role}/projects?client_id=${client.id}&tab=all-projects`}
                          className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          <FolderKanban className="h-4 w-4" />
                          {client.project_count ?? 0} projects
                        </Link>
                      </div>

                      <button
                        className="w-full h-10 px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200"
                        onClick={() => navigate(`/${role}/clients/${client.id}`)}
                      >
                        View
                      </button>
                    </div>
                  ))}
            </div>
          </div>
        </div>
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
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight truncate">
                      Clients
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Manage client profiles, contact details, and project history
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Link to={`/${role}/clients/new`} className="group shrink-0">
                  <Button
                    size="lg"
                    className="h-11 sm:h-12 px-6 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Add Client
                  </Button>
                </Link>
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
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

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 rounded-2xl" />
            <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
              {statusTabs.length > 2 ? (
                <>
                  <div className="lg:hidden p-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 rounded-2xl justify-between border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70"
                      onClick={() => setIsMobileTabSelectorOpen(true)}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {activeStatusTab?.icon && <activeStatusTab.icon className="h-4 w-4" />}
                        {activeStatusTab?.label}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-70" />
                    </Button>
                  </div>
                  {renderTabsList(cn('hidden lg:grid w-full h-14 bg-transparent p-1', tabGridClass))}
                </>
              ) : (
                renderTabsList(cn('grid w-full h-14 bg-transparent p-1', tabGridClass))
              )}
            </div>
          </div>

          {statusTabs.length > 2 && (
            <Drawer open={isMobileTabSelectorOpen} onOpenChange={setIsMobileTabSelectorOpen}>
              <DrawerContent className="lg:hidden rounded-t-3xl border-gray-200/70 dark:border-gray-800/70 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
                <DrawerHeader className="text-left pb-2">
                  <DrawerTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                    Select Section
                  </DrawerTitle>
                  <DrawerDescription>Filter clients by commercial status</DrawerDescription>
                </DrawerHeader>
                <div className="px-4 pb-6 space-y-3 max-h-[65vh] overflow-y-auto">
                  {statusTabs.map((tab) => {
                    const isActive = activeTab === tab.value;
                    return (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => {
                          handleTabChange(tab.value);
                          setIsMobileTabSelectorOpen(false);
                        }}
                        className={cn(
                          'w-full min-h-20 rounded-3xl px-4 py-4 flex items-center justify-between transition-colors',
                          isActive
                            ? 'bg-lime-400 text-gray-950'
                            : 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100'
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={cn(
                              'inline-flex h-10 w-10 items-center justify-center rounded-full',
                              isActive ? 'bg-lime-500/80' : 'bg-gray-200 dark:bg-gray-700'
                            )}
                          >
                            <tab.icon className="h-5 w-5" />
                          </span>
                          <span className="text-lg font-semibold">{tab.label}</span>
                        </span>
                        <span
                          className={cn(
                            'inline-flex h-10 min-w-10 px-2 items-center justify-center rounded-full',
                            isActive ? 'bg-gray-950 text-white' : 'bg-gray-200 dark:bg-gray-700'
                          )}
                        >
                          {isActive ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <span className="text-sm font-bold">{tab.count}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </DrawerContent>
            </Drawer>
          )}

          {statusTabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="space-y-6 sm:space-y-8">
              {renderClientsContent()}
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </main>
  );
};

export default Clients;
