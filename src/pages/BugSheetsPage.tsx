import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getEffectiveRole } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { googleSheetsService, UserSheet, Template } from "@/services/googleSheetsService";
import { projectService } from "@/services/projectService";
import { ProjectCardsGrid, ProjectWithCount } from "@/components/docs/ProjectCardsGrid";
import { resolveProjectLabels } from "@/lib/projectLabels";
import {
  AccessUsersPicker,
  parseAllowedUserIds,
} from "@/components/docs/AccessUsersPicker";
import {
  FileSpreadsheet,
  Plus,
  ExternalLink,
  Trash2,
  RefreshCw,
  Clock,
  FolderOpen,
  Link as LinkIcon,
  Search,
  Filter,
  Calendar,
  User,
  X,
  Edit,
  Copy,
  Shield,
  Code,
  TestTube,
  Users,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const BugSheetCardSkeleton = ({ index = 0 }: { index?: number }) => (
  <div
    className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
    style={{ animationDelay: `${index * 80}ms` }}
  >
    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-300/60 to-blue-400/60" />
    <div className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </div>
  </div>
);

const BugSheetsMainLayoutSkeleton = () => (
  <div className="w-full space-y-6 sm:space-y-8" aria-label="Loading bugsheets layout" aria-busy="true">
    {/* Tabs */}
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-green-50/50 dark:from-gray-800/50 dark:to-green-900/50 rounded-2xl" />
      <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
        <div className="grid grid-cols-2 h-12 sm:h-14 gap-1">
          <Skeleton className="rounded-xl" />
          <Skeleton className="rounded-xl" />
        </div>
      </div>
    </div>

    {/* Search & filter */}
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-green-50/30 dark:from-gray-800/30 dark:to-green-900/30 rounded-2xl" />
      <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-6 w-36" />
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <div className="flex flex-col sm:flex-row gap-3">
              <Skeleton className="h-11 w-full sm:w-[160px] rounded-xl" />
              <Skeleton className="h-11 w-full sm:w-[160px] rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Sheet cards */}
    <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 lg:grid-cols-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <BugSheetCardSkeleton key={`bugsheet-layout-skeleton-${index}`} index={index} />
      ))}
    </div>
  </div>
);

const BugSheetsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const userRole = currentUser ? getEffectiveRole(currentUser) : 'user';
  const isAdmin = userRole === 'admin';
  const isDevOrTester = userRole === 'developer' || userRole === 'tester';

  /** Edit/Delete: creator or admin only — never expose controls to other roles. */
  const canManageSheet = (sheet: UserSheet): boolean => {
    if (!currentUser?.id) return false;
    if (isAdmin) return true;
    if (activeTab === "my-sheets") return true;
    return String(sheet.creator_user_id ?? "") === String(currentUser.id);
  };

  const [sheets, setSheets] = useState<UserSheet[]>([]);
  const [allSheetsGrouped, setAllSheetsGrouped] = useState<Array<{
    project_id: string | null;
    project_name: string;
    sheets: UserSheet[];
  }>>([]);
  // Separate counts for each tab to fix tab count display
  const [mySheetsCount, setMySheetsCount] = useState<number>(0);
  const [allSheetsCount, setAllSheetsCount] = useState<number>(0);
  const [sharedSheetsCount, setSharedSheetsCount] = useState<number>(0);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<ProjectWithCount[]>([]);
  // Why: Full catalog is for card name badges only — pickers must stay membership-scoped.
  const [projectNameCatalog, setProjectNameCatalog] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);

  // Delete confirmation state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sheetToDelete, setSheetToDelete] = useState<UserSheet | null>(null);

  // Edit sheet state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [sheetToEdit, setSheetToEdit] = useState<UserSheet | null>(null);
  const [editSheetTitle, setEditSheetTitle] = useState("");
  const [editSelectedProjectIds, setEditSelectedProjectIds] = useState<string[]>([]);
  const [editSelectedTemplateId, setEditSelectedTemplateId] = useState<string>("0");
  const [editSelectedRoles, setEditSelectedRoles] = useState<string[]>(["all"]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Disconnect confirmation state
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Form state
  const [sheetTitle, setSheetTitle] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("0");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["all"]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [projectSearchTerm, setProjectSearchTerm] = useState("");
  const [editProjectSearchTerm, setEditProjectSearchTerm] = useState("");
  const [editSelectedUserIds, setEditSelectedUserIds] = useState<string[]>([]);

  // Tab and filter state
  const [searchParams, setSearchParams] = useSearchParams();
  // Set default tab based on role
  const getDefaultTab = () => {
    if (isAdmin) return "all-sheets";
    if (isDevOrTester) return "shared-sheets";
    return "my-sheets";
  };
  const initialTab = searchParams.get("tab") || getDefaultTab();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  
  // Sync local search term with persisted search term
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);
  
  // Debounced update to search term (prevents excessive re-renders)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchTerm !== searchTerm) {
        setSearchTerm(localSearchTerm);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [localSearchTerm, searchTerm]);

  useEffect(() => {
    loadData();
  }, []);

  // Load sheets when connection status changes to true
  useEffect(() => {
    if (isConnected && sheets.length === 0 && !isLoading) {
      refreshSheets();
    }
  }, [isConnected]);

  // Reload sheets when tab changes
  useEffect(() => {
    if (isConnected && !isCheckingConnection) {
      loadSheets();
    }
  }, [activeTab, isConnected]);

  const isInitialLoading = isCheckingConnection || (isLoading && sheets.length === 0);

  const loadProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const [projsWithCounts, allProjs] = await Promise.all([
        googleSheetsService.getProjectsWithSheetCounts().catch(() => [] as Array<{
          id: string;
          name: string;
          sheet_count?: number;
        }>),
        projectService.getProjects().catch(() => [] as Array<{ id: string; name: string }>),
      ]);

      // Create/Edit pickers: only projects the user is assigned to (counts API is membership-scoped for non-admins).
      const assignable = projsWithCounts
        .filter((p) => p.id && p.id !== "no-project")
        .map((p) => ({
          id: String(p.id),
          name: p.name || "Untitled",
          description: "",
          status: "active",
          document_count: (p as { sheet_count?: number }).sheet_count ?? 0,
        }));
      setProjects(assignable);

      // Why: Shared sheets may reference projects outside the assignable list — keep a name catalog for badges.
      const nameById = new Map<string, string>();
      for (const p of allProjs) {
        nameById.set(String(p.id), p.name);
      }
      for (const p of assignable) {
        if (p.name) nameById.set(p.id, p.name);
      }
      setProjectNameCatalog(
        Array.from(nameById.entries()).map(([id, name]) => ({ id, name }))
      );
    } catch {
      try {
        const projs = await googleSheetsService.getProjectsWithSheetCounts();
        setProjects(
          projs
            .filter((p) => p.id && p.id !== "no-project")
            .map((p) => ({
              id: String(p.id),
              name: p.name || "Untitled",
              description: "",
              status: "active",
              document_count: p.sheet_count ?? 0,
            }))
        );
      } catch {
        /* ignore fallback failure */
      }
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setIsCheckingConnection(true);
    try {
      await loadProjects();
      const connected = await checkConnection();
      if (connected) {
        await preloadAllTabCounts();
        await Promise.all([loadSheets(), loadTemplates()]);
      }
    } catch {
      /* errors surfaced via toasts in child loaders */
    } finally {
      setIsLoading(false);
      setIsCheckingConnection(false);
    }
  };

  const checkConnection = async () => {
    try {
      const result = await googleSheetsService.checkConnection();
      setIsConnected(result.connected);
      setConnectedEmail(result.email || null);
      return result.connected;
    } catch {
      setIsConnected(false);
      setConnectedEmail(null);
      return false;
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await googleSheetsService.disconnect();
      setIsConnected(false);
      setConnectedEmail(null);
      setShowDisconnectDialog(false);
      toast({
        title: "Disconnected",
        description: "Google account has been disconnected successfully.",
      });
      // Refresh sheets list to clear any cached data
      await loadSheets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect Google account",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleConnectGoogleSheets = () => {
    // Get JWT token to pass as state parameter (check sessionStorage first for impersonation tokens)
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');

    // Build return URL based on current environment
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const returnUrl = isLocal
      ? `http://localhost:8080${window.location.pathname}`
      : `https://bugs.bugricer.com${window.location.pathname}`;

    // Navigate to Google OAuth with JWT token and return URL as state
    // In impersonation mode, the token's user_id is the impersonated user's ID
    const authUrl = googleSheetsService.getAuthUrl(token, returnUrl);
    window.location.href = authUrl;
  };

  // Preload all tab counts for accurate tab badge numbers
  const preloadAllTabCounts = async () => {
    try {
      // Load My Sheets count
      const mySheets = await googleSheetsService.listGeneralSheets();
      setMySheetsCount(mySheets.length);

      // Load All Sheets count (admin only)
      if (isAdmin) {
        const allSheetsResult = await googleSheetsService.getAllSheets();
        const allSheets = allSheetsResult.sheets.flatMap(group => group.sheets);
        setAllSheetsCount(allSheets.length);
        setAllSheetsGrouped(allSheetsResult.sheets);
      }

      // Load Shared Sheets count (developer/tester only)
      if (isDevOrTester) {
        const sharedSheets = await googleSheetsService.getSharedSheets();
        setSharedSheetsCount(sharedSheets.length);
      }
    } catch {
      /* preload counts are best-effort */
    }
  };

  const loadSheets = async () => {
    try {
      let sheetsList: UserSheet[] = [];

      if (activeTab === "my-sheets") {
        // Load user's own sheets
        sheetsList = await googleSheetsService.listGeneralSheets();
        setMySheetsCount(sheetsList.length);
      } else if (activeTab === "all-sheets" && isAdmin) {
        // Load all sheets from all users (admins, developers, testers, and others) grouped by project
        const result = await googleSheetsService.getAllSheets();
        setAllSheetsGrouped(result.sheets);
        // Flatten for display
        sheetsList = result.sheets.flatMap(group => group.sheets);
        setAllSheetsCount(sheetsList.length);
      } else if (activeTab === "shared-sheets" && isDevOrTester) {
        // Load shared sheets (from projects user is member of)
        sheetsList = await googleSheetsService.getSharedSheets();
        setSharedSheetsCount(sheetsList.length);
      }

      setSheets(sheetsList);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load sheets",
        variant: "destructive",
      });
    }
  };

  const loadTemplates = async () => {
    try {
      const temps = await googleSheetsService.listTemplates();
      setTemplates(temps);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load templates",
        variant: "destructive",
      });
    }
  };

  const refreshSheets = async () => {
    if (isConnected) {
      await preloadAllTabCounts();
      await loadSheets();
    }
  };

  const handleCreateSheet = async () => {
    if (!sheetTitle.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a sheet title",
        variant: "destructive",
      });
      return;
    }

    if (selectedRoles.length === 0 && selectedUserIds.length === 0) {
      toast({
        title: "Validation Error",
        description: "Select at least one role or specific user",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Convert selectedTemplateId to number, treat "0" as undefined (no template)
      const templateId = selectedTemplateId && selectedTemplateId !== "0"
        ? parseInt(selectedTemplateId)
        : undefined;

      // Convert selectedProjectIds array to comma-separated string (or null if empty)
      const projectIdValue = selectedProjectIds.length > 0
        ? selectedProjectIds.join(',')
        : null;

      // Convert roles array to comma-separated string (or 'all' if only 'all' is selected)
      // Why: Users-only share uses for_me + allowed_user_ids so access stays private to invitees.
      let roleValue =
        selectedRoles.length === 1 && selectedRoles[0] === 'all'
          ? 'all'
          : selectedRoles.filter(r => r !== 'all').join(',');
      if (!roleValue && selectedUserIds.length > 0) {
        roleValue = 'for_me';
      }
      const allowedUsers =
        roleValue === 'all' ? [] : selectedUserIds;

      const result = await googleSheetsService.createGeneralSheet(
        sheetTitle.trim(),
        templateId,
        'general',
        projectIdValue,
        roleValue || 'for_me',
        allowedUsers
      );

      toast({
        title: "Success!",
        description: `Sheet "${result.sheet_title}" created successfully.`,
      });

      // Open the sheet in a new tab
      googleSheetsService.openSheet(result.sheet_url);

      // Reload sheets list
      await refreshSheets();

      closeCreateModal();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create sheet",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteClick = (sheet: UserSheet) => {
    if (!canManageSheet(sheet)) return;
    setSheetToDelete(sheet);
    setIsDeleteDialogOpen(true);
  };

  const clearEditParam = useCallback(() => {
    setSearchParams(
      (prev) => {
        if (!prev.has("edit")) return prev;
        const next = new URLSearchParams(prev);
        next.delete("edit");
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const clearCreateParam = useCallback(() => {
    setSearchParams(
      (prev) => {
        if (!prev.has("create")) return prev;
        const next = new URLSearchParams(prev);
        next.delete("create");
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const resetCreateForm = useCallback(() => {
    setSheetTitle("");
    setSelectedTemplateId("0");
    setSelectedProjectIds([]);
    setSelectedRoles(["all"]);
    setSelectedUserIds([]);
    setProjectSearchTerm("");
  }, []);

  const openCreateModal = useCallback(() => {
    setIsCreateModalOpen(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("edit");
        next.set("create", "1");
        return next;
      },
      { replace: false }
    );
  }, [setSearchParams]);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    resetCreateForm();
    clearCreateParam();
  }, [resetCreateForm, clearCreateParam]);

  const populateEditForm = useCallback((sheet: UserSheet) => {
    setSheetToEdit(sheet);
    setEditSheetTitle(sheet.sheet_title);
    const projectIdValue = sheet.project_id || "";
    const projectIdsArray = projectIdValue
      ? projectIdValue.split(",").map((p: string) => p.trim())
      : [];
    setEditSelectedProjectIds(projectIdsArray);
    setEditSelectedTemplateId(
      (sheet as any).template_id ? (sheet as any).template_id.toString() : "0"
    );
    const roleValue = (sheet as any).role || "all";
    let rolesArray: string[];
    if (!roleValue || roleValue === "all") {
      rolesArray = ["all"];
    } else {
      rolesArray = roleValue
        .split(",")
        .map((r: string) => r.trim())
        .filter((r: string) => r.length > 0);
      if (rolesArray.length === 0) {
        rolesArray = ["all"];
      }
    }
    setEditSelectedRoles(rolesArray);
    setEditSelectedUserIds(parseAllowedUserIds(sheet.allowed_user_ids));
    setEditProjectSearchTerm("");
    setIsEditDialogOpen(true);
  }, []);

  const handleEditClick = (sheet: UserSheet) => {
    if (!canManageSheet(sheet)) return;
    populateEditForm(sheet);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("create");
        next.set("edit", String(sheet.id));
        return next;
      },
      { replace: false }
    );
  };

  const handleEditCancel = () => {
    setIsEditDialogOpen(false);
    setSheetToEdit(null);
    setEditSheetTitle("");
    setEditSelectedProjectIds([]);
    setEditSelectedTemplateId("0");
    setEditSelectedRoles(["all"]);
    setEditSelectedUserIds([]);
    setEditProjectSearchTerm("");
    clearEditParam();
  };

  const handleEditConfirm = async () => {
    if (!sheetToEdit || !editSheetTitle.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a sheet title",
        variant: "destructive",
      });
      return;
    }

    if (editSelectedRoles.length === 0 && editSelectedUserIds.length === 0) {
      toast({
        title: "Validation Error",
        description: "Select at least one role or specific user",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      // Convert selected values
      const projectIdValue = editSelectedProjectIds.length > 0
        ? editSelectedProjectIds.join(',')
        : null;
      const templateId = editSelectedTemplateId && editSelectedTemplateId !== "0" ? parseInt(editSelectedTemplateId) : null;
      
      // Convert roles array to comma-separated string (or 'all' if only 'all' is selected)
      let roleValue = editSelectedRoles.length === 1 && editSelectedRoles[0] === 'all' 
        ? 'all' 
        : editSelectedRoles.filter(r => r !== 'all').join(',');
      if (!roleValue && editSelectedUserIds.length > 0) {
        roleValue = 'for_me';
      }
      const allowedUsers = roleValue === 'all' ? [] : editSelectedUserIds;

      await googleSheetsService.updateSheet(
        sheetToEdit.id,
        editSheetTitle.trim(),
        projectIdValue,
        templateId,
        roleValue || 'for_me',
        allowedUsers
      );

      toast({
        title: "Success",
        description: `Sheet updated successfully.`,
      });

      // Reload sheets list
      await refreshSheets();

      handleEditCancel();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update sheet",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!sheetToDelete) return;

    setIsDeleting(sheetToDelete.id);
    try {
      await googleSheetsService.deleteSheet(sheetToDelete.id);

      toast({
        title: "Success",
        description: `Sheet "${sheetToDelete.sheet_title}" deleted successfully.`,
      });

      // Reload sheets list
      await refreshSheets();

      // Close dialog
      setIsDeleteDialogOpen(false);
      setSheetToDelete(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete sheet",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
    setSheetToDelete(null);
  };

  const handleViewSheet = (sheet: UserSheet) => {
    googleSheetsService.openSheet(sheet.google_sheet_url);
  };

  const handleCopySheetUrl = async (sheet: UserSheet) => {
    try {
      await navigator.clipboard.writeText(sheet.google_sheet_url);
      toast({
        title: "Link copied",
        description: "Sheet URL has been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const getSheetTypeIcon = (sheetType: string) => {
    switch (sheetType) {
      case "meeting":
        return "📋";
      case "technical":
        return "⚙️";
      case "general":
      default:
        return "📊";
    }
  };

  const getRoleBadge = (role: string | undefined) => {
    const roleValue = role || "all";

    switch (roleValue) {
      case "for_me":
        return {
          label: "For Me",
          icon: <User className="h-3 w-3" />,
          className: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800"
        };
      case "admins":
        return {
          label: "Admins Only",
          icon: <Shield className="h-3 w-3" />,
          className: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
        };
      case "developers":
        return {
          label: "Developers Only",
          icon: <Code className="h-3 w-3" />,
          className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
        };
      case "testers":
        return {
          label: "Testers Only",
          icon: <TestTube className="h-3 w-3" />,
          className: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800"
        };
      case "all":
      default:
        return {
          label: "All Users",
          icon: <Users className="h-3 w-3" />,
          className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
        };
    }
  };

  // Get all role badges for comma-separated roles
  const getRoleBadges = (role: string | undefined) => {
    if (!role || role === "all") {
      return [getRoleBadge("all")];
    }
    
    const roles = role.split(",").map(r => r.trim()).filter(r => r);
    if (roles.length === 0) {
      return [getRoleBadge("all")];
    }
    
    return roles.map(r => getRoleBadge(r));
  };

  // Get project names for comma-separated project IDs (never show raw UUIDs)
  const getProjectNames = (
    projectId: string | null | undefined,
    projectName?: string | null
  ): string[] => resolveProjectLabels(projectId, projectNameCatalog, projectName);

  // Filtered sheets with useMemo - sorted by latest first
  const filteredSheets = useMemo(() => {
    let filtered = [...sheets];

    // Shared Sheets: never list the current user's own sheets (those live in My Sheets)
    if (activeTab === "shared-sheets" && currentUser?.id) {
      filtered = filtered.filter(
        (sheet) => String(sheet.creator_user_id ?? "") !== String(currentUser.id)
      );
    }

    // Apply search filter (use localSearchTerm for immediate filtering)
    const searchValue = localSearchTerm.toLowerCase();
    if (searchValue) {
      filtered = filtered.filter(sheet =>
        sheet.sheet_title.toLowerCase().includes(searchValue) ||
        sheet.template_name?.toLowerCase().includes(searchValue) ||
        sheet.sheet_type.toLowerCase().includes(searchValue) ||
        sheet.creator_name?.toLowerCase().includes(searchValue) ||
        sheet.project_name?.toLowerCase().includes(searchValue)
      );
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const thisWeek = new Date(today);
      thisWeek.setDate(thisWeek.getDate() - 7);
      const thisMonth = new Date(today);
      thisMonth.setMonth(thisMonth.getMonth() - 1);

      filtered = filtered.filter(sheet => {
        const sheetDate = new Date(sheet.created_at);
        switch (dateFilter) {
          case "today":
            return sheetDate >= today;
          case "yesterday":
            return sheetDate >= yesterday && sheetDate < today;
          case "this-week":
            return sheetDate >= thisWeek;
          case "this-month":
            return sheetDate >= thisMonth;
          default:
            return true;
        }
      });
    }

    // Apply project filter (support comma-separated project IDs)
    if (projectFilter !== "all") {
      filtered = filtered.filter(sheet => {
        if (projectFilter === "none") {
          return !sheet.project_id || sheet.project_id === null || sheet.project_id === "";
        }
        // Check if the project ID is in the comma-separated list
        if (!sheet.project_id) return false;
        const projectIds = sheet.project_id.split(",").map(id => id.trim());
        return projectIds.includes(String(projectFilter));
      });
    }

    // Sort by latest first (newest sheets at the top)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB.getTime() - dateA.getTime(); // Descending order (latest first)
    });
  }, [sheets, activeTab, localSearchTerm, dateFilter, projectFilter, currentUser?.id]);


  // Get tab counts - use separate state variables for accurate counts
  const getTabCount = (tabType: string) => {
    switch (tabType) {
      case "all-sheets":
        return isAdmin ? allSheetsCount : 0;
      case "shared-sheets":
        return isDevOrTester ? sharedSheetsCount : 0;
      case "my-sheets":
        return mySheetsCount;
      default:
        return 0;
    }
  };

  // Check if should show project cards
  const shouldShowProjectCards = () => {
    // Disabled: Show sheet list instead of project cards for better visibility
    // Admins can see all sheets directly in the "All Sheets" tab
    return false;
  };

  // Filter projects to only show those with sheets
  const projectsWithSheets = useMemo(() => {
    return projects.filter(project => (project.document_count || 0) > 0);
  }, [projects]);

  // Keep tab in sync with URL changes (back/forward navigation)
  useEffect(() => {
    const urlTab = searchParams.get("tab") || "all-sheets";
    if (urlTab !== activeTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Deep-link / browser Back: ?edit=<id> opens Edit Sheet; removing it closes
  useEffect(() => {
    const editIdRaw = searchParams.get("edit");
    if (!editIdRaw) {
      if (isEditDialogOpen) {
        setIsEditDialogOpen(false);
        setSheetToEdit(null);
        setEditSheetTitle("");
        setEditSelectedProjectIds([]);
        setEditSelectedTemplateId("0");
        setEditSelectedRoles(["all"]);
        setEditProjectSearchTerm("");
      }
      return;
    }

    const editId = Number(editIdRaw);
    if (!Number.isFinite(editId)) {
      clearEditParam();
      return;
    }

    if (isEditDialogOpen && sheetToEdit?.id === editId) return;

    const sheet =
      sheets.find((s) => s.id === editId) ||
      allSheetsGrouped.flatMap((g) => g.sheets).find((s) => s.id === editId);

    if (!sheet) return;

    const allowed =
      !!currentUser?.id &&
      (isAdmin ||
        activeTab === "my-sheets" ||
        String(sheet.creator_user_id ?? "") === String(currentUser.id));

    if (allowed) {
      populateEditForm(sheet);
    } else {
      clearEditParam();
    }
  }, [
    searchParams,
    sheets,
    allSheetsGrouped,
    isEditDialogOpen,
    sheetToEdit?.id,
    currentUser?.id,
    isAdmin,
    activeTab,
    clearEditParam,
    populateEditForm,
  ]);

  // Deep-link / browser Back: ?create=1 opens Create Sheet
  useEffect(() => {
    const wantsCreate = searchParams.get("create") === "1";
    if (wantsCreate) {
      if (!isCreateModalOpen) setIsCreateModalOpen(true);
      return;
    }
    if (isCreateModalOpen && !searchParams.has("edit")) {
      setIsCreateModalOpen(false);
      resetCreateForm();
    }
  }, [searchParams, isCreateModalOpen, resetCreateForm]);

  return (
    <div className="min-w-0 w-full space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-50/50 via-transparent to-red-50/50 dark:from-orange-950/20 dark:via-transparent dark:to-red-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl shadow-lg">
                    <FileSpreadsheet className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      BugSheets
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-green-500 to-blue-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Manage your Sheets and templates
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                {isInitialLoading ? (
                  <>
                    <Skeleton className="h-12 w-36 rounded-xl self-start" />
                    <Skeleton className="h-14 w-24 rounded-xl" />
                  </>
                ) : (
                  <>
                {isConnected && (
                  <Button
                    onClick={openCreateModal}
                    className="h-12 px-6 bg-gradient-to-r from-green-600 to-blue-700 hover:from-green-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 self-start"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    New Sheet
                  </Button>
                )}

                {isConnected && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 border border-green-200 dark:border-green-800 rounded-xl shadow-sm">
                      <div className="p-1.5 bg-green-500 rounded-lg shrink-0">
                        <FileSpreadsheet className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {sheets.length}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>



        {/* Disconnect Confirmation Dialog */}
        <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disconnect Google Account?</DialogTitle>
              <DialogDescription>
                Are you sure you want to disconnect your Google account? This will revoke access to Google Sheets and you won't be able to create or manage sheets until you reconnect.
              </DialogDescription>
            </DialogHeader>
            {connectedEmail && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Account: <span className="font-semibold text-gray-900 dark:text-white">{connectedEmail}</span></p>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDisconnectDialog(false)}
                disabled={isDisconnecting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Disconnect
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sheets Tabs */}
        {isInitialLoading ? (
          <BugSheetsMainLayoutSkeleton />
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val);
              setSearchParams((prev) => {
                const p = new URLSearchParams(prev);
                p.set("tab", val);
                return p as any;
              });
            }}
            className="w-full"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-green-50/50 dark:from-gray-800/50 dark:to-green-900/50 rounded-2xl"></div>
              <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
                <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-2' : 'grid-cols-2'} h-12 sm:h-14 bg-transparent p-1 gap-1`}>
                  {isAdmin ? (
                    <>
                      <TabsTrigger
                        value="all-sheets"
                        className="text-xs sm:text-sm md:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300 px-2 sm:px-4"
                      >
                        <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">All Sheets</span>
                        <span className="xs:hidden">All</span>
                        <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-[10px] sm:text-xs font-bold">
                          {getTabCount("all-sheets")}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="my-sheets"
                        className="text-xs sm:text-sm md:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300 px-2 sm:px-4"
                      >
                        <User className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">My Sheets</span>
                        <span className="xs:hidden">My</span>
                        <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-[10px] sm:text-xs font-bold">
                          {getTabCount("my-sheets")}
                        </span>
                      </TabsTrigger>
                    </>
                  ) : (
                    <>
                      <TabsTrigger
                        value="shared-sheets"
                        className="text-xs sm:text-sm md:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300 px-2 sm:px-4"
                      >
                        <FolderOpen className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">Shared Sheets</span>
                        <span className="xs:hidden">Shared</span>
                        <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-[10px] sm:text-xs font-bold">
                          {getTabCount("shared-sheets")}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="my-sheets"
                        className="text-xs sm:text-sm md:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300 px-2 sm:px-4"
                      >
                        <User className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">My Sheets</span>
                        <span className="xs:hidden">My</span>
                        <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-[10px] sm:text-xs font-bold">
                          {getTabCount("my-sheets")}
                        </span>
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>
              </div>
            </div>

            <TabsContent value={activeTab} className="space-y-6 sm:space-y-8">
              {/* Project Cards View (Admin - All Sheets) */}
              {shouldShowProjectCards() && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Projects
                    </h2>
                  </div>
                  <ProjectCardsGrid
                    projects={projectsWithSheets}
                    isLoading={isLoadingProjects}
                    onProjectClick={(projectId) => {
                      navigate(`/${userRole}/bugsheets/project/${projectId}`);
                    }}
                  />
                </div>
              )}

              {/* Search and Filter Controls - only show when not showing project cards */}
              {!shouldShowProjectCards() && (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-orange-50/30 dark:from-gray-800/30 dark:to-orange-900/30 rounded-2xl"></div>
                  <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-orange-500 rounded-lg">
                          <Search className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Search & Filter</h3>
                      </div>

                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Search Bar */}
                        <div className="flex-1 relative group">
                          <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                          <input
                            type="text"
                            placeholder="Search sheets..."
                            value={localSearchTerm}
                            onChange={(e) => setLocalSearchTerm(e.target.value)}
                            className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                            autoComplete="off"
                          />
                        </div>

                        {/* Filter Controls */}
                        <div className="flex flex-col sm:flex-row lg:flex-row gap-3">
                          {/* Date Filter */}
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 bg-orange-500 rounded-lg shrink-0">
                              <Calendar className="h-4 w-4 text-white" />
                            </div>
                            <Select value={dateFilter} onValueChange={setDateFilter}>
                              <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                                <SelectValue placeholder="Date" />
                              </SelectTrigger>
                              <SelectContent position="popper" className="z-[60]">
                                <SelectItem value="all">All Dates</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="yesterday">Yesterday</SelectItem>
                                <SelectItem value="this-week">This Week</SelectItem>
                                <SelectItem value="this-month">This Month</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Project Filter */}
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                              <FolderOpen className="h-4 w-4 text-white" />
                            </div>
                            <Select value={projectFilter} onValueChange={setProjectFilter}>
                              <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                                <SelectValue placeholder="Project" />
                              </SelectTrigger>
                              <SelectContent position="popper" className="z-[60]">
                                <SelectItem value="all">All Projects</SelectItem>
                                <SelectItem value="none">No Project</SelectItem>
                                {projects.map((project) => (
                                  <SelectItem key={project.id} value={project.id}>
                                    {project.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Clear Filters Button */}
                          {(localSearchTerm || dateFilter !== "all" || projectFilter !== "all") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setLocalSearchTerm("");
                                setSearchTerm("");
                                setDateFilter("all");
                                setProjectFilter("all");
                              }}
                              className="h-11 px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 font-medium"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sheets Content - only show when not showing project cards */}
              {!shouldShowProjectCards() && (
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="grid gap-4 sm:gap-5 md:gap-6 mt-4 grid-cols-1 xl:grid-cols-2" aria-label="Loading sheets">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <BugSheetCardSkeleton key={`bugsheet-skeleton-${index}`} index={index} />
                      ))}
                    </div>
                  ) : filteredSheets.length === 0 ? (
                    <div className="relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-blue-50/30 to-cyan-50/50 dark:from-green-950/20 dark:via-blue-950/10 dark:to-cyan-950/20 rounded-2xl"></div>
                      <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
                        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                          <FileSpreadsheet className="h-10 w-10 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                          {!isConnected ? "Google Account Not Connected" : activeTab === "all-sheets" ? "No sheets found" : "No sheets found"}
                        </h3>
                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                          {!isConnected
                            ? "Please connect your Google account first to view and manage sheets."
                            : activeTab === "all-sheets"
                              ? "No sheets available. Create your first sheet to get started."
                              : "No sheets available. Create your first sheet to get started."}
                        </p>
                        {!isConnected ? (
                          <Button
                            onClick={() => navigate(`/${userRole}/profile`)}
                            className="h-12 px-6 bg-gradient-to-r from-green-600 to-blue-700 hover:from-green-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                          >
                            <LinkIcon className="h-5 w-5 mr-2" />
                            Connect Google Account
                          </Button>
                        ) : (
                          <Button
                            onClick={openCreateModal}
                            className="h-12 px-6 bg-gradient-to-r from-green-600 to-blue-700 hover:from-green-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                          >
                            <Plus className="h-5 w-5 mr-2" />
                            Create Sheet
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:gap-5 md:gap-6 mt-4 grid-cols-1 xl:grid-cols-2" style={{ minHeight: 200 }} aria-label="Sheet list">
                      {filteredSheets.map((sheet) => (
                        <div
                          key={sheet.id}
                          className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-2xl hover:border-green-300 dark:hover:border-green-600 transition-all duration-300"
                        >
                          {/* Top accent bar */}
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-blue-600"></div>

                          <div className="p-5 sm:p-6">
                            {/* Header with title and role badge */}
                            <div className="flex items-start justify-between gap-3 mb-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="text-2xl sm:text-3xl flex-shrink-0 mt-1">
                                  {getSheetTypeIcon(sheet.sheet_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors break-words line-clamp-2">
                                    {sheet.sheet_title}
                                  </h3>
                                </div>
                              </div>

                              {/* Role Badges - Top Right */}
                              <div className="flex flex-wrap gap-1.5 justify-end">
                                {getRoleBadges((sheet as any).role).map((roleBadge, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold border shadow-sm ${roleBadge.className}`}
                                  >
                                    {roleBadge.icon}
                                    <span className="hidden sm:inline">{roleBadge.label}</span>
                                    <span className="sm:hidden">{roleBadge.label.split(' ')[0]}</span>
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            {/* Sheet Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm">
                              {/* Projects */}
                              <div className="flex items-start gap-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex-shrink-0 mt-0.5">
                                  <FolderOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-500 dark:text-gray-500 font-medium mb-1">Projects</div>
                                  {(() => {
                                    const projectNames = getProjectNames(
                                      sheet.project_id,
                                      sheet.project_name
                                    );
                                    if (projectNames.length === 0) {
                                      return (
                                        <span className="italic text-gray-400 text-sm">No Project</span>
                                      );
                                    }
                                    return (
                                      <div className="flex flex-wrap gap-1.5">
                                        {projectNames.map((name, index) => (
                                          <Badge
                                            key={index}
                                            variant="secondary"
                                            className="text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                          >
                                            <FolderOpen className="h-3 w-3 mr-1" />
                                            {name}
                                          </Badge>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Creator */}
                              {sheet.creator_name && activeTab !== "my-sheets" && (
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex-shrink-0">
                                    <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-gray-500 dark:text-gray-500 font-medium">Creator</div>
                                    <div className="font-semibold text-gray-900 dark:text-white truncate">{sheet.creator_name}</div>
                                  </div>
                                </div>
                              )}

                              {/* Template */}
                              {sheet.template_name && (
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex-shrink-0">
                                    <FileSpreadsheet className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-gray-500 dark:text-gray-500 font-medium">Template</div>
                                    <div className="font-semibold text-gray-900 dark:text-white truncate">{sheet.template_name}</div>
                                  </div>
                                </div>
                              )}

                              {/* Created Time */}
                              <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex-shrink-0">
                                  <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-500 dark:text-gray-500 font-medium">Created</div>
                                  <div className="font-semibold text-gray-900 dark:text-white truncate">
                                    {formatDistanceToNow(new Date(sheet.created_at), { addSuffix: true })}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons — View/Edit flex; Copy/Delete fixed icon size (no w-full stretch) */}
                            <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-700 min-w-0">
                              <Button
                                variant="outline"
                                size="sm"
                                title="View sheet"
                                onClick={() => handleViewSheet(sheet)}
                                className="h-9 min-w-0 flex-1 px-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800 hover:from-green-100 hover:to-blue-100 dark:hover:from-green-900/30 dark:hover:to-blue-900/30 text-green-700 dark:text-green-300 font-semibold"
                              >
                                <ExternalLink className="h-4 w-4 shrink-0" />
                                <span className="truncate text-xs sm:text-sm">View</span>
                              </Button>
                              {canManageSheet(sheet) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  title="Edit sheet"
                                  onClick={() => handleEditClick(sheet)}
                                  className="h-9 min-w-0 flex-1 px-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold"
                                >
                                  <Edit className="h-4 w-4 shrink-0" />
                                  <span className="truncate text-xs sm:text-sm">Edit</span>
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                title="Copy sheet URL"
                                onClick={() => handleCopySheetUrl(sheet)}
                                className="h-9 w-9 shrink-0 px-0 inline-flex items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                              >
                                <Copy className="h-4 w-4 shrink-0" />
                                <span className="sr-only">Copy</span>
                              </Button>
                              {canManageSheet(sheet) && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  title="Delete sheet"
                                  onClick={() => handleDeleteClick(sheet)}
                                  disabled={isDeleting === sheet.id}
                                  className="h-9 w-9 shrink-0 px-0 inline-flex items-center justify-center rounded-xl"
                                >
                                  {isDeleting === sheet.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                                  ) : (
                                    <Trash2 className="h-4 w-4 shrink-0" />
                                  )}
                                  <span className="sr-only">Delete</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Create Sheet Modal — large form; URL: ?create=1 */}
        {isConnected && (
          <Dialog
            open={isCreateModalOpen}
            onOpenChange={(open) => {
              if (!open) closeCreateModal();
            }}
          >
            <DialogContent className="flex h-[min(92vh,920px)] w-[min(96vw,56rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border border-border/60 p-0 shadow-2xl sm:max-w-none">
              <DialogHeader className="shrink-0 space-y-2 border-b border-border/50 bg-gradient-to-br from-muted/50 via-background to-background px-6 pb-5 pt-7 text-left sm:px-8 sm:pb-6 sm:pt-8 pr-14">
                <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Create New Sheet
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-muted-foreground sm:text-base max-w-2xl">
                  Create a new Google Sheet from a template or start from scratch
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="px-6 py-6 sm:px-8 sm:py-8">
                  <div className="grid gap-8 lg:grid-cols-2 lg:gap-10 lg:items-start">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="sheet-title" className="text-sm font-medium">Sheet Title *</Label>
                        <Input
                          id="sheet-title"
                          placeholder="Enter sheet title..."
                          value={sheetTitle}
                          onChange={(e) => setSheetTitle(e.target.value)}
                          disabled={isCreating}
                          className="w-full rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="template" className="text-sm font-medium">Template (Optional)</Label>
                        <Select
                          value={selectedTemplateId}
                          onValueChange={setSelectedTemplateId}
                          disabled={isCreating}
                        >
                          <SelectTrigger id="template" className="w-full rounded-xl">
                            <SelectValue placeholder="Blank sheet (no template)" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[min(280px,45vh)] overflow-y-auto z-[200]">
                            <SelectItem value="0">Blank sheet (no template)</SelectItem>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id.toString()}>
                                <div className="flex flex-col items-start">
                                  <span>{template.template_name}</span>
                                  {!template.is_configured && (
                                    <span className="text-orange-500 text-xs">
                                      (not configured)
                                    </span>
                                  )}
                                  {template.is_configured && template.description && (
                                    <span className="text-muted-foreground text-xs">
                                      ({template.category})
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Templates provide pre-formatted structures for your sheets
                          </p>
                          {templates.some((t) => !t.is_configured) && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 flex items-start gap-2 rounded-xl border border-orange-200/60 bg-orange-50/50 p-3 dark:border-orange-900/40 dark:bg-orange-950/20">
                              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                              <span>Templates marked &quot;not configured&quot; will create blank sheets</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="role" className="text-sm font-medium flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Accessible to Roles *
                          </Label>
                          {selectedRoles.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {selectedRoles.length} selected
                            </Badge>
                          )}
                        </div>

                        {selectedRoles.length > 0 && (
                          <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-xl border border-dashed">
                            {selectedRoles.map((roleValue) => {
                              const roleMap: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
                                for_me: { label: "For Me", icon: <User className="h-3 w-3" />, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300" },
                                all: { label: "All Users", icon: <Users className="h-3 w-3" />, color: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300" },
                                admins: { label: "Admins Only", icon: <Shield className="h-3 w-3" />, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300" },
                                developers: { label: "Developers Only", icon: <Code className="h-3 w-3" />, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300" },
                                testers: { label: "Testers Only", icon: <TestTube className="h-3 w-3" />, color: "bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300" },
                              };
                              const role = roleMap[roleValue];
                              if (!role) return null;
                              return (
                                <Badge
                                  key={roleValue}
                                  variant="outline"
                                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${role.color}`}
                                >
                                  {role.icon}
                                  {role.label}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRoles((prev) => prev.filter((r) => r !== roleValue))}
                                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                                    disabled={isCreating}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              );
                            })}
                          </div>
                        )}

                        <div className="space-y-2 p-4 border rounded-xl bg-background">
                          {[
                            { value: "for_me", label: "For Me", icon: <User className="h-4 w-4" />, color: "text-orange-600 dark:text-orange-400" },
                            { value: "all", label: "All Users", icon: <Users className="h-4 w-4" />, color: "text-green-600 dark:text-green-400" },
                            { value: "admins", label: "Admins Only", icon: <Shield className="h-4 w-4" />, color: "text-purple-600 dark:text-purple-400" },
                            { value: "developers", label: "Developers Only", icon: <Code className="h-4 w-4" />, color: "text-blue-600 dark:text-blue-400" },
                            { value: "testers", label: "Testers Only", icon: <TestTube className="h-4 w-4" />, color: "text-pink-600 dark:text-pink-400" },
                          ].map((role) => (
                            <div
                              key={role.value}
                              className={`flex items-center space-x-3 p-2.5 rounded-xl transition-colors ${
                                selectedRoles.includes(role.value)
                                  ? "bg-primary/10 border border-primary/20"
                                  : "hover:bg-muted/50 border border-transparent"
                              }`}
                            >
                              <Checkbox
                                id={`role-${role.value}`}
                                checked={selectedRoles.includes(role.value)}
                                onCheckedChange={(checked) => {
                                  if (role.value === "all") {
                                    setSelectedRoles(checked ? ["all"] : []);
                                    if (checked) setSelectedUserIds([]);
                                  } else if (role.value === "for_me") {
                                    setSelectedRoles(checked ? ["for_me"] : []);
                                  } else if (checked) {
                                    setSelectedRoles((prev) =>
                                      prev.filter((r) => r !== "all" && r !== "for_me").concat(role.value)
                                    );
                                  } else {
                                    setSelectedRoles((prev) => prev.filter((r) => r !== role.value));
                                  }
                                }}
                                disabled={isCreating}
                              />
                              <label
                                htmlFor={`role-${role.value}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 flex items-center gap-2"
                              >
                                <span className={role.color}>{role.icon}</span>
                                {role.label}
                                {selectedRoles.includes(role.value) && (
                                  <CheckCircle2 className="h-4 w-4 text-primary" />
                                )}
                              </label>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
                          <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-blue-900 dark:text-blue-100">
                            <strong>Tip:</strong> &quot;For Me&quot; is private to you (plus any specific users below). &quot;All Users&quot; overrides other roles and clears specific users.
                          </p>
                        </div>
                        <AccessUsersPicker
                          selectedUserIds={selectedUserIds}
                          onChange={setSelectedUserIds}
                          disabled={selectedRoles.includes("all")}
                          excludeUserId={currentUser?.id}
                          idPrefix="sheet-create-user"
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="project" className="text-sm font-medium flex items-center gap-2">
                            <FolderOpen className="h-4 w-4" />
                            Project (Optional)
                          </Label>
                          {selectedProjectIds.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {selectedProjectIds.length} selected
                            </Badge>
                          )}
                        </div>

                        {selectedProjectIds.length > 0 && (
                          <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-xl border border-dashed">
                            {selectedProjectIds.map((projectId) => {
                              const project = projects.find((p) => p.id === projectId);
                              if (!project) return null;
                              return (
                                <Badge
                                  key={projectId}
                                  variant="secondary"
                                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium"
                                >
                                  <FolderOpen className="h-3 w-3" />
                                  {project.name}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedProjectIds((prev) => prev.filter((id) => id !== projectId))
                                    }
                                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                                    disabled={isCreating}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              );
                            })}
                          </div>
                        )}

                        {projects.length > 3 && (
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="text"
                              placeholder="Search projects..."
                              value={projectSearchTerm}
                              onChange={(e) => setProjectSearchTerm(e.target.value)}
                              className="pl-9 h-9 rounded-xl"
                              disabled={isCreating}
                            />
                          </div>
                        )}

                        <div className="space-y-2 p-4 border rounded-xl bg-background max-h-[min(420px,45vh)] overflow-y-auto">
                          {projects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                              <FolderOpen className="h-8 w-8 text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">No projects available</p>
                            </div>
                          ) : (
                            (() => {
                              const filteredProjects = projectSearchTerm
                                ? projects.filter((p) =>
                                    p.name.toLowerCase().includes(projectSearchTerm.toLowerCase())
                                  )
                                : projects;

                              if (filteredProjects.length === 0) {
                                return (
                                  <div className="flex flex-col items-center justify-center py-6 text-center">
                                    <Search className="h-6 w-6 text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">No projects found</p>
                                  </div>
                                );
                              }

                              return filteredProjects.map((project) => (
                                <div
                                  key={project.id}
                                  className={`flex items-center space-x-3 p-2 rounded-xl transition-colors ${
                                    selectedProjectIds.includes(project.id)
                                      ? "bg-primary/10 border border-primary/20"
                                      : "hover:bg-muted/50 border border-transparent"
                                  }`}
                                >
                                  <Checkbox
                                    id={`project-${project.id}`}
                                    checked={selectedProjectIds.includes(project.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedProjectIds((prev) => [...prev, project.id]);
                                      } else {
                                        setSelectedProjectIds((prev) =>
                                          prev.filter((id) => id !== project.id)
                                        );
                                      }
                                    }}
                                    disabled={isCreating}
                                  />
                                  <label
                                    htmlFor={`project-${project.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 flex items-center gap-2"
                                  >
                                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                    {project.name}
                                    {selectedProjectIds.includes(project.id) && (
                                      <CheckCircle2 className="h-4 w-4 text-primary" />
                                    )}
                                  </label>
                                </div>
                              ));
                            })()
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Select one or more projects to associate this sheet with
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="shrink-0 flex flex-col-reverse gap-2 border-t border-border/50 bg-muted/20 px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
                <Button
                  variant="outline"
                  onClick={closeCreateModal}
                  disabled={isCreating}
                  className="w-full sm:w-auto rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSheet}
                  disabled={isCreating || !sheetTitle.trim()}
                  className="w-full sm:w-auto rounded-xl"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Sheet
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Sheet Dialog — large form; URL: ?edit=<id> */}
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            if (!open) handleEditCancel();
          }}
        >
          <DialogContent className="flex h-[min(92vh,920px)] w-[min(96vw,56rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border border-border/60 p-0 shadow-2xl sm:max-w-none">
            <DialogHeader className="shrink-0 space-y-2 border-b border-border/50 bg-gradient-to-br from-muted/50 via-background to-background px-6 pb-5 pt-7 text-left sm:px-8 sm:pb-6 sm:pt-8 pr-14">
              <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                Edit Sheet
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground sm:text-base max-w-2xl">
                Update the sheet title, project, template, and who can access it
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="space-y-4 px-6 py-6 sm:px-8 sm:py-8">
            <div className="space-y-4 py-0">
              <div className="space-y-2">
                <Label htmlFor="edit-sheet-title" className="text-sm font-medium">Sheet Title *</Label>
                <Input
                  id="edit-sheet-title"
                  placeholder="Enter sheet title..."
                  value={editSheetTitle}
                  onChange={(e) => setEditSheetTitle(e.target.value)}
                  disabled={isUpdating}
                  className="w-full"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isUpdating && editSheetTitle.trim()) {
                      handleEditConfirm();
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-template" className="text-sm font-medium">Template (Optional)</Label>
                <Select
                  value={editSelectedTemplateId}
                  onValueChange={setEditSelectedTemplateId}
                  disabled={isUpdating}
                >
                  <SelectTrigger id="edit-template" className="w-full">
                    <SelectValue placeholder="No template" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    <SelectItem value="0">No template</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        <div className="flex flex-col items-start">
                          <span>{template.template_name}</span>
                          {!template.is_configured && (
                            <span className="text-orange-500 text-xs">
                              (not configured)
                            </span>
                          )}
                          {template.is_configured && template.description && (
                            <span className="text-muted-foreground text-xs">
                              ({template.category})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-project" className="text-sm font-medium flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Project (Optional)
                  </Label>
                  {editSelectedProjectIds.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {editSelectedProjectIds.length} selected
                    </Badge>
                  )}
                </div>
                
                {/* Selected Projects Chips */}
                {editSelectedProjectIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border border-dashed">
                    {editSelectedProjectIds.map((projectId) => {
                      const project = projects.find(p => p.id === projectId);
                      if (!project) return null;
                      return (
                        <Badge
                          key={projectId}
                          variant="secondary"
                          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium"
                        >
                          <FolderOpen className="h-3 w-3" />
                          {project.name}
                          <button
                            type="button"
                            onClick={() => setEditSelectedProjectIds(prev => prev.filter(id => id !== projectId))}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                            disabled={isUpdating}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Search Projects */}
                {projects.length > 3 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search projects..."
                      value={editProjectSearchTerm}
                      onChange={(e) => setEditProjectSearchTerm(e.target.value)}
                      className="pl-9 h-9"
                      disabled={isUpdating}
                    />
                  </div>
                )}

                {/* Projects List */}
                <div className="space-y-2 p-4 border rounded-lg bg-background max-h-[200px] overflow-y-auto">
                  {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <FolderOpen className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No projects available</p>
                    </div>
                  ) : (
                    (() => {
                      const filteredProjects = editProjectSearchTerm
                        ? projects.filter(p => p.name.toLowerCase().includes(editProjectSearchTerm.toLowerCase()))
                        : projects;
                      
                      if (filteredProjects.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-6 text-center">
                            <Search className="h-6 w-6 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">No projects found</p>
                          </div>
                        );
                      }

                      return filteredProjects.map((project) => (
                        <div
                          key={project.id}
                          className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${
                            editSelectedProjectIds.includes(project.id)
                              ? "bg-primary/10 border border-primary/20"
                              : "hover:bg-muted/50 border border-transparent"
                          }`}
                        >
                          <Checkbox
                            id={`edit-project-${project.id}`}
                            checked={editSelectedProjectIds.includes(project.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setEditSelectedProjectIds((prev) => [...prev, project.id]);
                              } else {
                                setEditSelectedProjectIds((prev) => prev.filter(id => id !== project.id));
                              }
                            }}
                            disabled={isUpdating}
                          />
                          <label
                            htmlFor={`edit-project-${project.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 flex items-center gap-2"
                          >
                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                            {project.name}
                            {editSelectedProjectIds.includes(project.id) && (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            )}
                          </label>
                        </div>
                      ));
                    })()
                  )}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>💡</span>
                  <span>Select one or more projects to associate this sheet with</span>
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-role" className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Accessible to Roles *
                  </Label>
                  {editSelectedRoles.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {editSelectedRoles.length} selected
                    </Badge>
                  )}
                </div>

                {/* Selected Roles Chips */}
                {editSelectedRoles.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border border-dashed">
                    {editSelectedRoles.map((roleValue) => {
                      const roleMap: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
                        for_me: { label: "For Me", icon: <User className="h-3 w-3" />, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300" },
                        all: { label: "All Users", icon: <Users className="h-3 w-3" />, color: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300" },
                        admins: { label: "Admins Only", icon: <Shield className="h-3 w-3" />, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300" },
                        developers: { label: "Developers Only", icon: <Code className="h-3 w-3" />, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300" },
                        testers: { label: "Testers Only", icon: <TestTube className="h-3 w-3" />, color: "bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300" },
                      };
                      const role = roleMap[roleValue];
                      if (!role) return null;
                      return (
                        <Badge
                          key={roleValue}
                          variant="outline"
                          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${role.color}`}
                        >
                          {role.icon}
                          {role.label}
                          <button
                            type="button"
                            onClick={() => setEditSelectedRoles(prev => prev.filter(r => r !== roleValue))}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                            disabled={isUpdating}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Roles List */}
                <div className="space-y-2 p-4 border rounded-lg bg-background">
                  {[
                    { value: "for_me", label: "For Me", icon: <User className="h-4 w-4" />, color: "text-orange-600 dark:text-orange-400" },
                    { value: "all", label: "All Users", icon: <Users className="h-4 w-4" />, color: "text-green-600 dark:text-green-400" },
                    { value: "admins", label: "Admins Only", icon: <Shield className="h-4 w-4" />, color: "text-purple-600 dark:text-purple-400" },
                    { value: "developers", label: "Developers Only", icon: <Code className="h-4 w-4" />, color: "text-blue-600 dark:text-blue-400" },
                    { value: "testers", label: "Testers Only", icon: <TestTube className="h-4 w-4" />, color: "text-pink-600 dark:text-pink-400" },
                  ].map((role) => (
                    <div
                      key={role.value}
                      className={`flex items-center space-x-3 p-2.5 rounded-md transition-colors ${
                        editSelectedRoles.includes(role.value)
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted/50 border border-transparent"
                      }`}
                    >
                      <Checkbox
                        id={`edit-role-${role.value}`}
                        checked={editSelectedRoles.includes(role.value)}
                        onCheckedChange={(checked) => {
                          if (role.value === "all") {
                            // If "All Users" is selected, clear other selections
                            setEditSelectedRoles(checked ? ["all"] : []);
                            if (checked) setEditSelectedUserIds([]);
                          } else if (role.value === "for_me") {
                            // If "For Me" is selected, clear all other selections (exclusive)
                            setEditSelectedRoles(checked ? ["for_me"] : []);
                          } else {
                            // If a specific role is selected, remove "all" and "for_me" and toggle the role
                            if (checked) {
                              setEditSelectedRoles((prev) => 
                                prev.filter(r => r !== "all" && r !== "for_me").concat(role.value)
                              );
                            } else {
                              setEditSelectedRoles((prev) => prev.filter(r => r !== role.value));
                            }
                          }
                        }}
                        disabled={isUpdating}
                      />
                      <label
                        htmlFor={`edit-role-${role.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 flex items-center gap-2"
                      >
                        <span className={role.color}>{role.icon}</span>
                        {role.label}
                        {editSelectedRoles.includes(role.value) && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-900 dark:text-blue-100">
                    <strong>Tip:</strong> &quot;For Me&quot; is private to you (plus any specific users below). &quot;All Users&quot; overrides other roles and clears specific users.
                  </p>
                </div>
                <AccessUsersPicker
                  selectedUserIds={editSelectedUserIds}
                  onChange={setEditSelectedUserIds}
                  disabled={editSelectedRoles.includes("all") || isUpdating}
                  excludeUserId={currentUser?.id}
                  idPrefix="sheet-edit-user"
                />
              </div>
            </div>
              </div>
            </div>
            <DialogFooter className="shrink-0 flex flex-col-reverse gap-2 border-t border-border/50 bg-muted/20 px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
              <Button
                variant="outline"
                onClick={handleEditCancel}
                disabled={isUpdating}
                className="w-full sm:w-auto rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditConfirm}
                disabled={isUpdating || !editSheetTitle.trim()}
                className="w-full sm:w-auto rounded-xl"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Sheet
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Delete Sheet</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Are you sure you want to delete "{sheetToDelete?.sheet_title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-start space-x-3">
                  <div className="rounded-full bg-destructive/20 p-2 flex-shrink-0">
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm mb-1">Warning</h4>
                    <p className="text-sm text-muted-foreground">
                      This will permanently delete the sheet from both BugRicer and Google Drive.
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                disabled={isDeleting !== null}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting !== null}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                {isDeleting !== null ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Sheet
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default BugSheetsPage;

