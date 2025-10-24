import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const BugDocsPage = () => {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  
  // Delete confirmation state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<UserDocument | null>(null);

  // Form state
  const [docTitle, setDocTitle] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("0");

  // Tab and filter state
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "all-docs";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

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

  // Debug document count changes
  useEffect(() => {
    console.log('📊 Document count changed:', documents.length);
  }, [documents.length]);

  const loadData = async () => {
    console.log('🔄 Starting loadData...');
    setIsLoading(true);
    setIsCheckingConnection(true);
    try {
      // Check connection first
      const connected = await checkConnection();
      console.log('🔗 Connection result:', connected);
      // Load documents and templates if connected
      if (connected) {
        console.log('📄 Loading documents and templates...');
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
      const connected = await googleDocsService.checkConnection();
      console.log('Connection status:', connected);
      setIsConnected(connected);
      return connected;
    } catch (error) {
      console.error('Failed to check Google Docs connection:', error);
      setIsConnected(false);
      return false;
    }
  };

  const handleConnectGoogleDocs = () => {
    // Get JWT token to pass as state parameter
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    // Navigate to Google OAuth with JWT token as state
    const authUrl = googleDocsService.getAuthUrl(token);
    window.location.href = authUrl;
  };

  const loadDocuments = async () => {
    try {
      const docs = await googleDocsService.listGeneralDocuments();
      setDocuments(docs);
      console.log(`Loaded ${docs.length} documents`);
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

    setIsCreating(true);
    try {
      // Convert selectedTemplateId to number, treat "0" as undefined (no template)
      const templateId = selectedTemplateId && selectedTemplateId !== "0" 
        ? parseInt(selectedTemplateId) 
        : undefined;
      const result = await googleDocsService.createGeneralDocument(
        docTitle.trim(),
        templateId
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
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.doc_title.toLowerCase().includes(searchLower) ||
        doc.template_name?.toLowerCase().includes(searchLower) ||
        doc.doc_type.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(doc => doc.doc_type === typeFilter);
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
    
    // Sort by latest first (newest documents at the top)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB.getTime() - dateA.getTime(); // Descending order (latest first)
    });
  }, [documents, activeTab, searchTerm, typeFilter, dateFilter]);

  // Get unique document types for filter
  const uniqueTypes = useMemo(() => {
    const types = documents
      .map(doc => doc.doc_type)
      .filter(Boolean)
      .filter((type, index, arr) => arr.indexOf(type) === index);
    return types.sort();
  }, [documents]);

  // Get tab counts
  const getTabCount = (tabType: string) => {
    const allCount = documents?.length || 0;
    const myCount = documents?.length || 0; // For now, same as all
    
    switch (tabType) {
      case "all-docs":
        return allCount;
      case "my-docs":
        return myCount;
      default:
        return 0;
    }
  };

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
                  Manage your Google Docs documents and templates
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                {isConnected && (
                  <>
                    <Button 
                      onClick={() => setIsCreateModalOpen(true)} 
                      size="lg"
                      className="h-12 px-6 bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      New Doc
                    </Button>
                  </>
                )}
                
                {isConnected && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border border-orange-200 dark:border-orange-800 rounded-xl shadow-sm">
                      <div className="p-1.5 bg-orange-500 rounded-lg">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
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


        {/* Connection Status */}
        {!isConnected && !isCheckingConnection && (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-yellow-50/30 to-red-50/50 dark:from-orange-950/20 dark:via-yellow-950/10 dark:to-red-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <LinkIcon className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Google Docs Not Connected</h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Connect your Google account to create, manage, and collaborate on documents directly from BugRicer.
              </p>
              <Button
                onClick={handleConnectGoogleDocs}
                className="h-12 px-8 bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <LinkIcon className="h-5 w-5 mr-2" />
                Connect Google
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Documents Tabs */}
        {isConnected && (
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
                <TabsList className="grid w-full grid-cols-2 h-14 bg-transparent p-1">
                  <TabsTrigger
                    value="all-docs"
                    className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                  >
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span className="hidden sm:inline">All Docs</span>
                    <span className="sm:hidden">All</span>
                    <span className="ml-2 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-bold">
                      {getTabCount("all-docs")}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="my-docs"
                    className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                  >
                    <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span className="hidden sm:inline">My Docs</span>
                    <span className="sm:hidden">My</span>
                    <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">
                      {getTabCount("my-docs")}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
            
            <TabsContent value={activeTab} className="space-y-6 sm:space-y-8">
              {/* Search and Filter Controls */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-orange-50/30 dark:from-gray-800/30 dark:to-orange-900/30 rounded-2xl"></div>
                <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-orange-500 rounded-lg">
                      <Search className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Search & Filter</h3>
                  </div>
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search Bar */}
                    <div className="flex-1 relative group">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                      <input
                        type="text"
                        placeholder="Search documents by title, template, or type..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                      />
                    </div>
                    
                    {/* Filter Controls */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Type Filter */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 bg-purple-500 rounded-lg shrink-0">
                          <Filter className="h-4 w-4 text-white" />
                        </div>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                          <SelectTrigger className="w-full sm:w-[140px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[60]">
                            <SelectItem value="all">All Types</SelectItem>
                            {uniqueTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Date Filter */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 bg-orange-500 rounded-lg shrink-0">
                          <Calendar className="h-4 w-4 text-white" />
                        </div>
                        <Select value={dateFilter} onValueChange={setDateFilter}>
                          <SelectTrigger className="w-full sm:w-[140px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
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
                      
                      {/* Clear Filters Button */}
                      {(searchTerm || typeFilter !== "all" || dateFilter !== "all") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchTerm("");
                            setTypeFilter("all");
                            setDateFilter("all");
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

              {/* Documents Content */}
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
                        {activeTab === "all-docs" ? "No documents found" : "No documents found"}
                      </h3>
                      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                        {activeTab === "all-docs"
                          ? "No documents available. Create your first document to get started."
                          : "No documents available. Create your first document to get started."}
                      </p>
                      <Button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="h-12 px-6 bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Create Document
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300"
                      >
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-50/40 via-transparent to-red-50/40 dark:from-orange-950/15 dark:via-transparent dark:to-red-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                              <div className="text-2xl sm:text-3xl flex-shrink-0">{getDocTypeIcon(doc.doc_type)}</div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors truncate">
                                  {doc.doc_title}
                                </h3>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                                  {doc.template_name && (
                                    <span className="flex items-center">
                                      <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                                      <span className="truncate">{doc.template_name}</span>
                                    </span>
                                  )}
                                  <span className="flex items-center">
                                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                                    <span className="truncate">Created {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-2 flex-shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDocument(doc)}
                                className="h-9 sm:h-10 px-3 sm:px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-700 text-gray-700 dark:text-gray-300 hover:text-orange-700 dark:hover:text-orange-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300 text-xs sm:text-sm"
                              >
                                <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                <span className="hidden sm:inline">View</span>
                                <span className="sm:hidden">View</span>
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteClick(doc)}
                                disabled={isDeleting === doc.id}
                                className="h-9 sm:h-10 w-9 sm:w-auto px-2 sm:px-4 bg-red-500 hover:bg-red-600 text-white font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                              >
                                {isDeleting === doc.id ? (
                                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                )}
                                <span className="hidden sm:inline ml-1">Delete</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

      {/* Create Document Modal */}
      {isConnected && (
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
            <DialogDescription>
              Create a new Google Doc from a template or start from scratch
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="doc-title">Document Title *</Label>
              <Input
                id="doc-title"
                placeholder="Enter document title..."
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template">Template (Optional)</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
                disabled={isCreating}
              >
                <SelectTrigger id="template">
                  <SelectValue placeholder="Blank document (no template)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Blank document (no template)</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.template_name}
                      {!template.is_configured && (
                        <span className="text-orange-500 text-xs ml-2">
                          (not configured)
                        </span>
                      )}
                      {template.is_configured && template.description && (
                        <span className="text-muted-foreground text-xs ml-2">
                          ({template.category})
                        </span>
                      )}
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateDocument} disabled={isCreating}>
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

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete Document</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{documentToDelete?.doc_title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-start space-x-3">
                  <div className="rounded-full bg-destructive/20 p-2">
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">Warning</h4>
                    <p className="text-sm text-muted-foreground">
                      This will permanently delete the document from both BugRicer and Google Drive. 
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                disabled={isDeleting !== null}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting !== null}
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

