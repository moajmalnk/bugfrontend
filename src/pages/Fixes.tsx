import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { bugService, Bug as BugType } from "@/services/bugService";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Bug, CheckCircle, Search, Plus, Filter, Lock, Code, User, Calendar, UserCheck } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Table row skeleton component for loading state
const TableRowSkeleton = () => (
  <TableRow>
    <TableCell className="w-[250px]"><Skeleton className="h-5 w-4/5" /></TableCell>
    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
    <TableCell className="text-right"><Skeleton className="h-9 w-24 ml-auto" /></TableCell>
  </TableRow>
);

// Card skeleton for mobile view
const CardSkeleton = () => (
  <div className="rounded-xl border bg-card text-card-foreground shadow p-4 space-y-3">
    <div className="flex justify-between items-start">
      <Skeleton className="h-5 w-3/5" />
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
    <div className="space-y-2 text-sm text-muted-foreground">
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-4 w-1/2" />
    </div>
    <div className="flex justify-end pt-2">
      <Skeleton className="h-9 w-24" />
    </div>
  </div>
);

// Header skeleton
const PageHeaderSkeleton = () => (
  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
    <Skeleton className="h-10 w-48" />
    <div className="flex items-center gap-4 w-full sm:w-auto">
      <Skeleton className="h-10 w-full sm:w-52" />
      <Skeleton className="h-10 w-24 hidden md:block" />
    </div>
  </div>
);

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getPriorityBadgeVariant = (priority: string): "destructive" | "warning" | "success" | "default" => {
  switch (priority) {
    case "high": return "destructive";
    case "medium": return "warning";
    case "low": return "success";
    default: return "default";
  }
};

const BugCard = ({ bug }: { bug: BugType }) => (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
        <div className="p-4">
            <div className="flex justify-between items-start mb-2">
                <p className="font-bold text-base break-words pr-2">{bug.title}</p>
                <Badge variant={getPriorityBadgeVariant(bug.priority)} className="capitalize shrink-0">
                    {bug.priority}
                </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                Bug ID: <span className="font-mono text-xs">{bug.id}</span>
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <User className="h-4 w-4 shrink-0" />
                    <span>Reported by: <span className="font-medium text-foreground">{bug.reporter_name || 'N/A'}</span></span>
                </div>
                <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 shrink-0" />
                    <span>Fixed by: <span className="font-medium text-foreground">{bug.updated_by_name || 'N/A'}</span></span>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>Fixed on: <span className="font-medium text-foreground">{formatDate(bug.updated_at)}</span></span>
                </div>
            </div>
            <div className="flex justify-end pt-4">
                <Button variant="secondary" size="sm" asChild>
                    <Link to={`/bugs/${bug.id}`}>View Details</Link>
                </Button>
            </div>
        </div>
    </div>
);

const Fixes = () => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all-fixes");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const { data: bugs = [], isLoading, error } = useQuery<BugType[]>({
    queryKey: ["bugs"],
    queryFn: () => bugService.getBugs(),
  });

  const filteredBugs = useMemo(() => {
    const fixedBugs = bugs.filter((bug) => bug.status === "fixed");

    let tabFilteredBugs = fixedBugs;
    if (currentUser?.role === "admin" || currentUser?.role === "developer") {
      if (activeTab === "my-fixes") {
        tabFilteredBugs = fixedBugs.filter(bug => String(bug.updated_by) === String(currentUser?.id));
      }
    }

    return tabFilteredBugs.filter(
      (bug) =>
        (bug.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bug.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (priorityFilter === "all" || bug.priority === priorityFilter)
    );
  }, [bugs, activeTab, currentUser?.id, searchTerm, priorityFilter]);

  const showTabs = currentUser?.role === "admin" || currentUser?.role === "developer";

  const FilterControls = () => (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-background/50 pl-10"
        />
      </div>
      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
        <SelectTrigger className="w-full sm:w-[180px] shrink-0">
          <SelectValue placeholder="Filter by priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <>
          {/* Desktop Table Skeleton */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="hidden md:table-cell">Reported By</TableHead>
                  <TableHead className="hidden lg:table-cell">Fixed By</TableHead>
                  <TableHead className="hidden lg:table-cell">Fixed Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => <TableRowSkeleton key={i} />)}
              </TableBody>
            </Table>
          </div>
          {/* Mobile Card Skeleton */}
          <div className="grid md:hidden grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
        </>
      );
    }
    
    if (error) {
        return (
            <div className="text-center py-10 px-4 rounded-lg border border-dashed border-destructive/50 bg-destructive/5">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                <h3 className="mt-4 text-lg font-medium text-destructive">Failed to load fixes</h3>
                <p className="mt-2 text-sm text-muted-foreground">There was an error fetching the data. Please try again later.</p>
            </div>
        )
    }

    if (filteredBugs.length === 0) {
      return (
        <div className="text-center py-10 px-4 rounded-lg border border-dashed">
            <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">All Clear!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
                {searchTerm || priorityFilter !== 'all' ? "No fixes match your current filters." : "There are no fixed bugs to display."}
            </p>
            {(searchTerm || priorityFilter !== 'all') && (
                <Button variant="ghost" className="mt-4" onClick={() => { setSearchTerm(''); setPriorityFilter('all'); }}>
                    Clear Filters
                </Button>
            )}
        </div>
      );
    }

    return (
      <>
        {/* Desktop & Tablet View */}
        <div className="hidden md:block rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Fixed By</TableHead>
                <TableHead>Fixed Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBugs.map((bug) => (
                <TableRow key={bug.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium max-w-[250px]">
                      <p className="truncate font-semibold">{bug.title}</p>
                      <p className="text-xs text-muted-foreground font-mono">{bug.id}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityBadgeVariant(bug.priority)} className="capitalize">{bug.priority}</Badge>
                  </TableCell>
                  <TableCell>{bug.reporter_name || 'N/A'}</TableCell>
                  <TableCell>{bug.updated_by_name || 'N/A'}</TableCell>
                  <TableCell>{formatDate(bug.updated_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/bugs/${bug.id}`}>View Details</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Mobile View */}
        <div className="grid md:hidden grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredBugs.map((bug) => <BugCard key={bug.id} bug={bug} />)}
        </div>
      </>
    );
  };
  
  const myFixesCount = useMemo(() => bugs.filter(b => b.status === 'fixed' && String(b.updated_by) === String(currentUser?.id)).length, [bugs, currentUser?.id]);
  const allFixesCount = useMemo(() => bugs.filter(b => b.status === 'fixed').length, [bugs]);

  return (
    <main className="min-h-screen bg-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fixed Bugs</h1>
            <p className="text-muted-foreground">Review all completed and resolved issues.</p>
          </div>
          <div className="flex items-center gap-2">
            {showTabs && (
                <Link to="/bugs" className="w-full md:w-auto">
                    <Button variant="default" className="w-full md:w-auto">
                        <Plus className="mr-2 h-4 w-4" />
                        Fix a Bug
                    </Button>
                </Link>
            )}
            <div className="hidden sm:flex items-center border rounded-md px-3 py-2 bg-background">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm font-medium text-muted-foreground">
                {filteredBugs.length} <span className="hidden lg:inline">Issues Fixed</span>
              </span>
            </div>
          </div>
        </div>

        {showTabs ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
              <TabsTrigger value="all-fixes">
                <Code className="h-4 w-4 mr-2" />
                All Fixes ({allFixesCount})
              </TabsTrigger>
              <TabsTrigger value="my-fixes">
                <User className="h-4 w-4 mr-2" />
                My Fixes ({myFixesCount})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all-fixes" className="mt-4">
              <div className="space-y-4">
                <div className="hidden md:flex"><FilterControls /></div>
                {/* Mobile Filter Sheet Trigger */}
                <div className="md:hidden">
                    <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="w-full"><Filter className="mr-2 h-4 w-4" />Filters</Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="rounded-t-lg">
                            <SheetHeader className="text-left mb-4"><SheetTitle>Filter Fixes</SheetTitle></SheetHeader>
                            <div className="space-y-4"><FilterControls/></div>
                        </SheetContent>
                    </Sheet>
                </div>
                {renderContent()}
              </div>
            </TabsContent>
            <TabsContent value="my-fixes" className="mt-4">
              <div className="space-y-4">
                <div className="hidden md:flex"><FilterControls /></div>
                <div className="md:hidden">
                    <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="w-full"><Filter className="mr-2 h-4 w-4" />Filters</Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="rounded-t-lg">
                            <SheetHeader className="text-left mb-4"><SheetTitle>Filter My Fixes</SheetTitle></SheetHeader>
                            <div className="space-y-4"><FilterControls/></div>
                        </SheetContent>
                    </Sheet>
                </div>
                {renderContent()}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <div className="hidden md:flex"><FilterControls /></div>
            <div className="md:hidden">
                <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" className="w-full"><Filter className="mr-2 h-4 w-4" />Filters</Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="rounded-t-lg">
                        <SheetHeader className="text-left mb-4"><SheetTitle>Filter Fixes</SheetTitle></SheetHeader>
                        <div className="space-y-4"><FilterControls/></div>
                    </SheetContent>
                </Sheet>
            </div>
            {renderContent()}
          </div>
        )}
      </div>
    </main>
  );
};

export default Fixes;
