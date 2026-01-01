import { useState, useEffect, useMemo } from "react";
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
import { googleDocsService, UserDocument, Template } from "@/services/googleDocsService";
import { projectService } from "@/services/projectService";
import { ProjectCardsGrid, ProjectWithCount } from "@/components/docs/ProjectCardsGrid";
import {
  FileText,
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const BugDocsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const userRole = currentUser ? getEffectiveRole(currentUser) : 'user';
  const isAdmin = userRole === 'admin';
  const isDevOrTester = userRole === 'developer' || userRole === 'tester';

  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [allDocumentsGrouped, setAllDocumentsGrouped] = useState<Array<{
    project_id: string | null;
    project_name: string;
    documents: UserDocument[];
  }>>([]);
  // Separate counts for each tab to fix tab count display
  const [myDocsCount, setMyDocsCount] = useState<number>(0);
  const [allDocsCount, setAllDocsCount] = useState<number>(0);
  const [sharedDocsCount, setSharedDocsCount] = useState<number>(0);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<ProjectWithCount[]>([]);
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
  const [documentToDelete, setDocumentToDelete] = useState<UserDocument | null>(null);

  // Edit document state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<UserDocument | null>(null);
  const [editDocTitle, setEditDocTitle] = useState("");
  const [editSelectedProjectIds, setEditSelectedProjectIds] = useState<string[]>([]);
  const [editSelectedTemplateId, setEditSelectedTemplateId] = useState<string>("0");
  const [editSelectedRoles, setEditSelectedRoles] = useState<string[]>(["all"]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Disconnect confirmation state
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Form state
  const [docTitle, setDocTitle] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("0");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["all"]);
  const [projectSearchTerm, setProjectSearchTerm] = useState("");
  const [editProjectSearchTerm, setEditProjectSearchTerm] = useState("");

  // Tab and filter state
  const [searchParams, setSearchParams] = useSearchParams();
  // Set default tab based on role
  const getDefaultTab = () => {
    if (isAdmin) return "all-docs";
    if (isDevOrTester) return "shared-docs";
    return "my-docs";
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

  // Load documents when connection status changes to true
  useEffect(() => {
    if (isConnected && documents.length === 0 && !isLoading) {
      console.log('🔄 Connection became true, refreshing documents...');
      refreshDocuments();
    }
  }, [isConnected]);

  // Reload documents when tab changes
  useEffect(() => {
    if (isConnected && !isCheckingConnection) {
      loadDocuments();
    }
  }, [activeTab, isConnected]);

  // Debug document count changes
  useEffect(() => {
    console.log('📊 Document count changed:', documents.length);
  }, [documents.length]);

  const loadProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const projsWithCounts = await googleDocsService.getProjectsWithDocumentCounts();
      setProjects(projsWithCounts);
    } catch (error: any) {
      console.error("Error loading projects:", error);
      // Fallback to regular project service
      try {
        const projs = await projectService.getProjects();
        setProjects(projs.map(p => ({ ...p, document_count: 0 })));
      } catch (fallbackError) {
        console.error("Error loading projects fallback:", fallbackError);
      }
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const loadData = async () => {
    console.log('🔄 Starting loadData...');
    setIsLoading(true);
    setIsCheckingConnection(true);
    try {
      // Load projects (always load, doesn't require Google connection)
      await loadProjects();

      // Check connection first
      const connected = await checkConnection();
      console.log('🔗 Connection result:', connected);
      // Load documents and templates if connected
      if (connected) {
        console.log('📄 Loading documents and templates...');
        // Preload all tab counts first for accurate badge numbers
        await preloadAllTabCounts();
        // Then load documents for the active tab
        await Promise.all([loadDocuments(), loadTemplates()]);
        console.log('✅ Documents and templates loaded');
      } else {
        console.log('❌ Not connected, skipping document load');
      }
    } catch (error) {
      console.error("❌ Error loading data:", error);
    } finally {
      setIsLoading(false);
      setIsCheckingConnection(false);
      console.log('🏁 loadData completed');
    }
  };

  const checkConnection = async () => {
    try {
      console.log('Checking Google Docs connection...');
      const result = await googleDocsService.checkConnection();
      console.log('Connection status:', result);
      setIsConnected(result.connected);
      setConnectedEmail(result.email || null);
      return result.connected;
    } catch (error) {
      console.error('Failed to check Google Docs connection:', error);
      setIsConnected(false);
      setConnectedEmail(null);
      return false;
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await googleDocsService.disconnect();
      setIsConnected(false);
      setConnectedEmail(null);
      setShowDisconnectDialog(false);
      toast({
        title: "Disconnected",
        description: "Google account has been disconnected successfully.",
      });
      // Refresh documents list to clear any cached data
      await loadDocuments();
    } catch (error: any) {
      console.error('Failed to disconnect:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect Google account",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleConnectGoogleDocs = () => {
    // Get JWT token to pass as state parameter (check sessionStorage first for impersonation tokens)
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');

    // Build return URL based on current environment
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const returnUrl = isLocal
      ? `http://localhost:8080${window.location.pathname}`
      : `https://bugs.bugricer.com${window.location.pathname}`;

    // Navigate to Google OAuth with JWT token and return URL as state
    // In impersonation mode, the token's user_id is the impersonated user's ID
    const authUrl = googleDocsService.getAuthUrl(token, returnUrl);
    window.location.href = authUrl;
  };

  // Preload all tab counts for accurate tab badge numbers
  const preloadAllTabCounts = async () => {
    try {
      // Load My Docs count
      const myDocs = await googleDocsService.listGeneralDocuments();
      setMyDocsCount(myDocs.length);

      // Load All Docs count (admin only)
      if (isAdmin) {
        const allDocsResult = await googleDocsService.getAllDocuments();
        const allDocs = allDocsResult.documents.flatMap(group => group.documents);
        setAllDocsCount(allDocs.length);
        setAllDocumentsGrouped(allDocsResult.documents);
      }

      // Load Shared Docs count (developer/tester only)
      if (isDevOrTester) {
        const sharedDocs = await googleDocsService.getSharedDocuments();
        setSharedDocsCount(sharedDocs.length);
      }
    } catch (error: any) {
      console.error("Error preloading tab counts:", error);
      // Don't show toast for preload errors, just log them
    }
  };

  const loadDocuments = async () => {
    try {
      let docs: UserDocument[] = [];

      if (activeTab === "my-docs") {
        // Load user's own documents
        docs = await googleDocsService.listGeneralDocuments();
        setMyDocsCount(docs.length);
      } else if (activeTab === "all-docs" && isAdmin) {
        // Load all documents from all users (admins, developers, testers, and others) grouped by project
        const result = await googleDocsService.getAllDocuments();
        setAllDocumentsGrouped(result.documents);
        // Flatten for display
        docs = result.documents.flatMap(group => group.documents);
        setAllDocsCount(docs.length);
      } else if (activeTab === "shared-docs" && isDevOrTester) {
        // Load shared documents (from projects user is member of)
        docs = await googleDocsService.getSharedDocuments();
        setSharedDocsCount(docs.length);
      }

      setDocuments(docs);
      console.log(`Loaded ${docs.length} documents for tab: ${activeTab}`);
    } catch (error: any) {
      console.error("Error loading documents:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load documents",
        variant: "destructive",
      });
    }
  };

  const loadTemplates = async () => {
    try {
      const temps = await googleDocsService.listTemplates();
      setTemplates(temps);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load templates",
        variant: "destructive",
      });
    }
  };

  const refreshDocuments = async () => {
    console.log('🔄 Refreshing documents, isConnected:', isConnected);
    if (isConnected) {
      // Refresh all tab counts and then load current tab
      await preloadAllTabCounts();
      await loadDocuments();
    } else {
      console.log('❌ Not connected, cannot refresh documents');
    }
  };

  const handleCreateDocument = async () => {
    if (!docTitle.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a document title",
        variant: "destructive",
      });
      return;
    }

    if (selectedRoles.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one role",
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
      const roleValue = selectedRoles.length === 1 && selectedRoles[0] === 'all' 
        ? 'all' 
        : selectedRoles.filter(r => r !== 'all').join(',');

      const result = await googleDocsService.createGeneralDocument(
        docTitle.trim(),
        templateId,
        'general',
        projectIdValue,
        roleValue
      );

      toast({
        title: "Success!",
        description: `Document "${result.document_title}" created successfully.`,
      });

      // Open the document in a new tab
      googleDocsService.openDocument(result.document_url);

      // Reload documents list
      await refreshDocuments();

      // Reset form and close modal
      setDocTitle("");
      setSelectedTemplateId("0");
      setSelectedProjectIds([]);
      setSelectedRoles(["all"]);
      setProjectSearchTerm("");
      setIsCreateModalOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create document",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteClick = (doc: UserDocument) => {
    setDocumentToDelete(doc);
    setIsDeleteDialogOpen(true);
  };

  const handleEditClick = (doc: UserDocument) => {
    setDocumentToEdit(doc);
    setEditDocTitle(doc.doc_title);
    // Parse comma-separated project IDs into array, or empty array if null/empty
    const projectIdValue = doc.project_id || "";
    const projectIdsArray = projectIdValue ? projectIdValue.split(",").map((p: string) => p.trim()) : [];
    setEditSelectedProjectIds(projectIdsArray);
    // template_id might not be in the interface but exists in database
    setEditSelectedTemplateId((doc as any).template_id ? (doc as any).template_id.toString() : "0");
    // Parse comma-separated roles into array, or default to ['all']
    const roleValue = (doc as any).role || "all";
    let rolesArray: string[];
    if (!roleValue || roleValue === "all") {
      rolesArray = ["all"];
    } else {
      // Split by comma and filter out empty strings
      rolesArray = roleValue.split(",").map((r: string) => r.trim()).filter((r: string) => r.length > 0);
      // If no valid roles after parsing, default to ['all']
      if (rolesArray.length === 0) {
        rolesArray = ["all"];
      }
    }
    setEditSelectedRoles(rolesArray);
    setIsEditDialogOpen(true);
  };

  const handleEditCancel = () => {
    setIsEditDialogOpen(false);
    setDocumentToEdit(null);
    setEditDocTitle("");
    setEditSelectedProjectIds([]);
    setEditSelectedTemplateId("0");
    setEditSelectedRoles(["all"]);
    setEditProjectSearchTerm("");
  };

  const handleEditConfirm = async () => {
    if (!documentToEdit || !editDocTitle.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a document title",
        variant: "destructive",
      });
      return;
    }

    if (editSelectedRoles.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one role",
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
      const roleValue = editSelectedRoles.length === 1 && editSelectedRoles[0] === 'all' 
        ? 'all' 
        : editSelectedRoles.filter(r => r !== 'all').join(',');

      await googleDocsService.updateDocument(
        documentToEdit.id,
        editDocTitle.trim(),
        projectIdValue,
        templateId,
        roleValue
      );

      toast({
        title: "Success",
        description: `Document updated successfully.`,
      });

      // Reload documents list
      await refreshDocuments();

      // Close dialog and reset state
      setIsEditDialogOpen(false);
      setDocumentToEdit(null);
      setEditDocTitle("");
      setEditSelectedProjectIds([]);
      setEditSelectedTemplateId("0");
      setEditSelectedRoles(["all"]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update document",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    setIsDeleting(documentToDelete.id);
    try {
      await googleDocsService.deleteDocument(documentToDelete.id);

      toast({
        title: "Success",
        description: `Document "${documentToDelete.doc_title}" deleted successfully.`,
      });

      // Reload documents list
      await refreshDocuments();

      // Close dialog
      setIsDeleteDialogOpen(false);
      setDocumentToDelete(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const handleViewDocument = (doc: UserDocument) => {
    googleDocsService.openDocument(doc.google_doc_url);
  };

  const handleCopyDocumentUrl = async (doc: UserDocument) => {
    try {
      await navigator.clipboard.writeText(doc.google_doc_url);
      toast({
        title: "Link copied",
        description: "Document URL has been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const getDocTypeIcon = (docType: string) => {
    switch (docType) {
      case "meeting":
        return "📋";
      case "technical":
        return "⚙️";
      case "general":
      default:
        return "📄";
    }
  };

  const getRoleBadge = (role: string | undefined) => {
    const roleValue = role || "all";

    switch (roleValue) {
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

  // Get project names for comma-separated project IDs
  const getProjectNames = (projectId: string | null | undefined): string[] => {
    if (!projectId) {
      return [];
    }
    
    const projectIds = projectId.split(",").map(id => id.trim()).filter(id => id);
    return projectIds.map(id => {
      const project = projects.find(p => p.id === id);
      return project ? project.name : id;
    });
  };

  // Filtered documents with useMemo - sorted by latest first
  const filteredDocuments = useMemo(() => {
    let filtered = [...documents];

    // Filter by tab
    if (activeTab === "my-docs") {
      // For now, show all documents in both tabs
      // In the future, this could filter by user ownership
      filtered = documents;
    } else if (activeTab === "all-docs") {
      filtered = documents;
    }

    // Apply search filter (use localSearchTerm for immediate filtering)
    const searchValue = localSearchTerm.toLowerCase();
    if (searchValue) {
      filtered = filtered.filter(doc =>
        doc.doc_title.toLowerCase().includes(searchValue) ||
        doc.template_name?.toLowerCase().includes(searchValue) ||
        doc.doc_type.toLowerCase().includes(searchValue) ||
        doc.creator_name?.toLowerCase().includes(searchValue) ||
        doc.project_name?.toLowerCase().includes(searchValue)
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

      filtered = filtered.filter(doc => {
        const docDate = new Date(doc.created_at);
        switch (dateFilter) {
          case "today":
            return docDate >= today;
          case "yesterday":
            return docDate >= yesterday && docDate < today;
          case "this-week":
            return docDate >= thisWeek;
          case "this-month":
            return docDate >= thisMonth;
          default:
            return true;
        }
      });
    }

    // Apply project filter (support comma-separated project IDs)
    if (projectFilter !== "all") {
      filtered = filtered.filter(doc => {
        if (projectFilter === "none") {
          return !doc.project_id || doc.project_id === null || doc.project_id === "";
        }
        // Check if the project ID is in the comma-separated list
        if (!doc.project_id) return false;
        const projectIds = doc.project_id.split(",").map(id => id.trim());
        return projectIds.includes(String(projectFilter));
      });
    }

    // Sort by latest first (newest documents at the top)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB.getTime() - dateA.getTime(); // Descending order (latest first)
    });
  }, [documents, activeTab, localSearchTerm, dateFilter, projectFilter]);


  // Get tab counts - use separate state variables for accurate counts
  const getTabCount = (tabType: string) => {
    switch (tabType) {
      case "all-docs":
        return isAdmin ? allDocsCount : 0;
      case "shared-docs":
        return isDevOrTester ? sharedDocsCount : 0;
      case "my-docs":
        return myDocsCount;
      default:
        return 0;
    }
  };

  // Check if should show project cards
  const shouldShowProjectCards = () => {
    // Disabled: Show document list instead of project cards for better visibility
    // Admins can see all documents directly in the "All Docs" tab
    return false;
  };

  // Filter projects to only show those with documents
  const projectsWithDocuments = useMemo(() => {
    return projects.filter(project => (project.document_count || 0) > 0);
  }, [projects]);

  // Keep tab in sync with URL changes (back/forward navigation)
  useEffect(() => {
    const urlTab = searchParams.get("tab") || "all-docs";
    if (urlTab !== activeTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-50/50 via-transparent to-red-50/50 dark:from-orange-950/20 dark:via-transparent dark:to-red-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      BugDocs
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-orange-500 to-red-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Manage your Documents and templates
                </p>
              </div>

              <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-3 sm:gap-4">
                {/* Google Connection Status Indicator */}
                <div className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border transition-all duration-300"
                  style={{
                    backgroundColor: isConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    borderColor: isConnected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className={`text-sm font-semibold ${isConnected ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    {isConnected ? 'Google Connected' : 'Not Connected'}
                  </span>
                  {!isConnected && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => navigate(`/${userRole}/profile`)}
                      className="h-auto p-0 text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline ml-1"
                    >
                      Connect
                    </Button>
                  )}
                </div>

                {isConnected && (
                  <>
                    <Button
                      onClick={() => setIsCreateModalOpen(true)}
                      size="lg"
                      className="w-full xs:w-auto h-11 sm:h-12 px-4 sm:px-6 bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
                    >
                      <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      <span className="whitespace-nowrap">New Doc</span>
                    </Button>
                  </>
                )}

                {isConnected && (
                  <div className="flex items-center justify-center xs:justify-start gap-4">
                    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border border-orange-200 dark:border-orange-800 rounded-xl shadow-sm">
                      <div className="p-1 sm:p-1.5 bg-orange-500 rounded-lg shrink-0">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-xl sm:text-2xl font-bold text-orange-700 dark:text-orange-300">
                          {documents.length}
                        </div>
                      </div>
                    </div>
                  </div>
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
                Are you sure you want to disconnect your Google account? This will revoke access to Google Docs and you won't be able to create or manage documents until you reconnect.
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

        {/* Documents Tabs */}
        {!isCheckingConnection && (
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
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-orange-50/50 dark:from-gray-800/50 dark:to-orange-900/50 rounded-2xl"></div>
              <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
                <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-2' : 'grid-cols-2'} h-12 sm:h-14 bg-transparent p-1 gap-1`}>
                  {isAdmin ? (
                    <>
                      <TabsTrigger
                        value="all-docs"
                        className="text-xs sm:text-sm md:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300 px-2 sm:px-4"
                      >
                        <FileText className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">All Docs</span>
                        <span className="xs:hidden">All</span>
                        <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-[10px] sm:text-xs font-bold">
                          {getTabCount("all-docs")}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="my-docs"
                        className="text-xs sm:text-sm md:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300 px-2 sm:px-4"
                      >
                        <User className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">My Docs</span>
                        <span className="xs:hidden">My</span>
                        <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-[10px] sm:text-xs font-bold">
                          {getTabCount("my-docs")}
                        </span>
                      </TabsTrigger>
                    </>
                  ) : (
                    <>
                      <TabsTrigger
                        value="shared-docs"
                        className="text-xs sm:text-sm md:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300 px-2 sm:px-4"
                      >
                        <FolderOpen className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">Shared Docs</span>
                        <span className="xs:hidden">Shared</span>
                        <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-[10px] sm:text-xs font-bold">
                          {getTabCount("shared-docs")}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="my-docs"
                        className="text-xs sm:text-sm md:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300 px-2 sm:px-4"
                      >
                        <User className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">My Docs</span>
                        <span className="xs:hidden">My</span>
                        <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-[10px] sm:text-xs font-bold">
                          {getTabCount("my-docs")}
                        </span>
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>
              </div>
            </div>

            <TabsContent value={activeTab} className="space-y-6 sm:space-y-8">
              {/* Project Cards View (Admin - All Docs) */}
              {shouldShowProjectCards() && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Projects
                    </h2>
                  </div>
                  <ProjectCardsGrid
                    projects={projectsWithDocuments}
                    isLoading={isLoadingProjects}
                    onProjectClick={(projectId) => {
                      navigate(`/${userRole}/bugdocs/project/${projectId}`);
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
                            placeholder="Search documents..."
                            value={localSearchTerm}
                            onChange={(e) => setLocalSearchTerm(e.target.value)}
                            className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
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

              {/* Documents Content - only show when not showing project cards */}
              {!shouldShowProjectCards() && (
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Loading documents...</span>
                    </div>
                  ) : filteredDocuments.length === 0 ? (
                    <div className="relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
                      <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
                        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                          <FileText className="h-10 w-10 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                          {!isConnected ? "Google Account Not Connected" : activeTab === "all-docs" ? "No documents found" : "No documents found"}
                        </h3>
                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                          {!isConnected
                            ? "Please connect your Google account first to view and manage documents."
                            : activeTab === "all-docs"
                              ? "No documents available. Create your first document to get started."
                              : "No documents available. Create your first document to get started."}
                        </p>
                        {!isConnected ? (
                          <Button
                            onClick={() => navigate(`/${userRole}/profile`)}
                            className="h-12 px-6 bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                          >
                            <LinkIcon className="h-5 w-5 mr-2" />
                            Connect Google Account
                          </Button>
                        ) : (
                          <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="h-12 px-6 bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                          >
                            <Plus className="h-5 w-5 mr-2" />
                            Create Document
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:gap-5 md:gap-6 mt-4 grid-cols-1 lg:grid-cols-2" style={{ minHeight: 200 }} aria-label="Document list">
                      {filteredDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-2xl hover:border-orange-300 dark:hover:border-orange-600 transition-all duration-300"
                        >
                          {/* Top accent bar */}
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-600"></div>

                          <div className="p-5 sm:p-6">
                            {/* Header with title and role badge */}
                            <div className="flex items-start justify-between gap-3 mb-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="text-2xl sm:text-3xl flex-shrink-0 mt-1">
                                  {getDocTypeIcon(doc.doc_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors break-words line-clamp-2">
                                    {doc.doc_title}
                                  </h3>
                                </div>
                              </div>

                              {/* Role Badges - Top Right */}
                              <div className="flex flex-wrap gap-1.5 justify-end">
                                {getRoleBadges((doc as any).role).map((roleBadge, index) => (
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

                            {/* Document Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm">
                              {/* Projects */}
                              <div className="flex items-start gap-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex-shrink-0 mt-0.5">
                                  <FolderOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-500 dark:text-gray-500 font-medium mb-1">Projects</div>
                                  {(() => {
                                    const projectNames = getProjectNames(doc.project_id);
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
                              {doc.creator_name && activeTab !== "my-docs" && (
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex-shrink-0">
                                    <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-gray-500 dark:text-gray-500 font-medium">Creator</div>
                                    <div className="font-semibold text-gray-900 dark:text-white truncate">{doc.creator_name}</div>
                                  </div>
                                </div>
                              )}

                              {/* Template */}
                              {doc.template_name && (
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex-shrink-0">
                                    <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-gray-500 dark:text-gray-500 font-medium">Template</div>
                                    <div className="font-semibold text-gray-900 dark:text-white truncate">{doc.template_name}</div>
                                  </div>
                                </div>
                              )}

                              {/* Created Time */}
                              <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex-shrink-0">
                                  <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-500 dark:text-gray-500 font-medium">Created</div>
                                  <div className="font-semibold text-gray-900 dark:text-white truncate">
                                    {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDocument(doc)}
                                className="flex-1 h-9 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800 hover:from-orange-100 hover:to-red-100 dark:hover:from-orange-900/30 dark:hover:to-red-900/30 text-orange-700 dark:text-orange-300 font-semibold"
                              >
                                <ExternalLink className="h-4 w-4 mr-1.5" />
                                <span className="hidden sm:inline">View</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditClick(doc)}
                                className="flex-1 h-9 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold"
                              >
                                <Edit className="h-4 w-4 mr-1.5" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyDocumentUrl(doc)}
                                className="h-9 px-3 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteClick(doc)}
                                disabled={isDeleting === doc.id}
                                className="h-9 px-3"
                              >
                                {isDeleting === doc.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
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

        {/* Create Document Modal */}
        {isConnected && (
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Create New Document</DialogTitle>
                <DialogDescription className="text-sm sm:text-base">
                  Create a new Google Doc from a template or start from scratch
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-title" className="text-sm font-medium">Document Title *</Label>
                  <Input
                    id="doc-title"
                    placeholder="Enter document title..."
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    disabled={isCreating}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template" className="text-sm font-medium">Template (Optional)</Label>
                  <Select
                    value={selectedTemplateId}
                    onValueChange={setSelectedTemplateId}
                    disabled={isCreating}
                  >
                    <SelectTrigger id="template" className="w-full">
                      <SelectValue placeholder="Blank document (no template)" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      <SelectItem value="0">Blank document (no template)</SelectItem>
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
                      Templates provide pre-formatted structures for your documents
                    </p>
                    {templates.some(t => !t.is_configured) && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>Templates marked "not configured" will create blank documents</span>
                      </p>
                    )}
                  </div>
                </div>
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
                  
                  {/* Selected Projects Chips */}
                  {selectedProjectIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border border-dashed">
                      {selectedProjectIds.map((projectId) => {
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
                              onClick={() => setSelectedProjectIds(prev => prev.filter(id => id !== projectId))}
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

                  {/* Search Projects */}
                  {projects.length > 3 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search projects..."
                        value={projectSearchTerm}
                        onChange={(e) => setProjectSearchTerm(e.target.value)}
                        className="pl-9 h-9"
                        disabled={isCreating}
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
                        const filteredProjects = projectSearchTerm
                          ? projects.filter(p => p.name.toLowerCase().includes(projectSearchTerm.toLowerCase()))
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
                                  setSelectedProjectIds((prev) => prev.filter(id => id !== project.id));
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
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>💡</span>
                    <span>Select one or more projects to associate this document with</span>
                  </p>
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

                  {/* Selected Roles Chips */}
                  {selectedRoles.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border border-dashed">
                      {selectedRoles.map((roleValue) => {
                        const roleMap: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
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
                              onClick={() => setSelectedRoles(prev => prev.filter(r => r !== roleValue))}
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

                  {/* Roles List */}
                  <div className="space-y-2 p-4 border rounded-lg bg-background">
                    {[
                      { value: "all", label: "All Users", icon: <Users className="h-4 w-4" />, color: "text-green-600 dark:text-green-400" },
                      { value: "admins", label: "Admins Only", icon: <Shield className="h-4 w-4" />, color: "text-purple-600 dark:text-purple-400" },
                      { value: "developers", label: "Developers Only", icon: <Code className="h-4 w-4" />, color: "text-blue-600 dark:text-blue-400" },
                      { value: "testers", label: "Testers Only", icon: <TestTube className="h-4 w-4" />, color: "text-pink-600 dark:text-pink-400" },
                    ].map((role) => (
                      <div
                        key={role.value}
                        className={`flex items-center space-x-3 p-2.5 rounded-md transition-colors ${
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
                              // If "All Users" is selected, clear other selections
                              setSelectedRoles(checked ? ["all"] : []);
                            } else {
                              // If a specific role is selected, remove "all" and toggle the role
                              if (checked) {
                                setSelectedRoles((prev) => 
                                  prev.filter(r => r !== "all").concat(role.value)
                                );
                              } else {
                                setSelectedRoles((prev) => prev.filter(r => r !== role.value));
                              }
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
                  <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <span className="text-blue-600 dark:text-blue-400 mt-0.5">💡</span>
                    <p className="text-xs text-blue-900 dark:text-blue-100">
                      <strong>Tip:</strong> Selecting "All Users" will automatically override other role selections. 
                      For specific access, uncheck "All Users" and select individual roles.
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreating}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateDocument}
                  disabled={isCreating}
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Document
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Document Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Edit Document</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Update the document title, project, and template
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-doc-title" className="text-sm font-medium">Document Title *</Label>
                <Input
                  id="edit-doc-title"
                  placeholder="Enter document title..."
                  value={editDocTitle}
                  onChange={(e) => setEditDocTitle(e.target.value)}
                  disabled={isUpdating}
                  className="w-full"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isUpdating && editDocTitle.trim()) {
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
                  <span>Select one or more projects to associate this document with</span>
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
                          } else {
                            // If a specific role is selected, remove "all" and toggle the role
                            if (checked) {
                              setEditSelectedRoles((prev) => 
                                prev.filter(r => r !== "all").concat(role.value)
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
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">💡</span>
                  <p className="text-xs text-blue-900 dark:text-blue-100">
                    <strong>Tip:</strong> Selecting "All Users" will automatically override other role selections. 
                    For specific access, uncheck "All Users" and select individual roles.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={handleEditCancel}
                disabled={isUpdating}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditConfirm}
                disabled={isUpdating || !editDocTitle.trim()}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Document
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
              <DialogTitle className="text-lg sm:text-xl">Delete Document</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Are you sure you want to delete "{documentToDelete?.doc_title}"? This action cannot be undone.
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
                      This will permanently delete the document from both BugRicer and Google Drive.
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
                    Delete Document
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </main>
  );
};

export default BugDocsPage;

