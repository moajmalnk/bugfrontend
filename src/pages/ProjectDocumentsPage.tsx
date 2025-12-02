import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getEffectiveRole } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { googleDocsService, UserDocument, Template } from "@/services/googleDocsService";
import { projectService } from "@/services/projectService";
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
import {
  FileText,
  ExternalLink,
  Trash2,
  RefreshCw,
  Clock,
  FolderOpen,
  Search,
  Filter,
  Calendar,
  ArrowLeft,
  ChevronRight,
  User,
  Edit,
  Copy,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ProjectDocumentsPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const userRole = currentUser ? getEffectiveRole(currentUser) : null;
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<UserDocument | null>(null);
  
  // Edit document state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<UserDocument | null>(null);
  const [editDocTitle, setEditDocTitle] = useState("");
  const [editSelectedProjectId, setEditSelectedProjectId] = useState<string>("");
  const [editSelectedTemplateId, setEditSelectedTemplateId] = useState<string>("0");
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Templates and projects for edit dialog
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadProjectDocuments();
    }
    // Load templates and projects for edit dialog
    loadTemplatesAndProjects();
  }, [projectId]);

  const loadTemplatesAndProjects = async () => {
    try {
      const [temps, projs] = await Promise.all([
        googleDocsService.listTemplates(),
        projectService.getProjects()
      ]);
      setTemplates(temps);
      setProjects(projs);
    } catch (error) {
      console.error("Error loading templates and projects:", error);
    }
  };

  const loadProjectDocuments = async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    setAccessDenied(false);
    try {
      const result = await googleDocsService.getDocumentsByProject(projectId);
      setDocuments(result.documents);
      setProjectName(result.project_name);
    } catch (error: any) {
      console.error("Error loading project documents:", error);
      if (error.message?.includes('Access denied') || error.message?.includes('403')) {
        setAccessDenied(true);
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to load project documents",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
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
      await loadProjectDocuments();
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

  const handleEditClick = (doc: UserDocument) => {
    setDocumentToEdit(doc);
    setEditDocTitle(doc.doc_title);
    setEditSelectedProjectId(doc.project_id || "none");
    // Note: template_id might not be in UserDocument interface, use null check
    setEditSelectedTemplateId((doc as any).template_id ? (doc as any).template_id.toString() : "0");
    setIsEditDialogOpen(true);
  };

  const handleEditCancel = () => {
    setIsEditDialogOpen(false);
    setDocumentToEdit(null);
    setEditDocTitle("");
    setEditSelectedProjectId("");
    setEditSelectedTemplateId("0");
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

    setIsUpdating(true);
    try {
      // Convert selected values
      const projectId = editSelectedProjectId && editSelectedProjectId !== "none" ? editSelectedProjectId : null;
      const templateId = editSelectedTemplateId && editSelectedTemplateId !== "0" ? parseInt(editSelectedTemplateId) : null;
      
      await googleDocsService.updateDocument(
        documentToEdit.id, 
        editDocTitle.trim(),
        projectId,
        templateId
      );

      toast({
        title: "Success",
        description: `Document updated successfully.`,
      });

      // Reload documents list
      await loadProjectDocuments();

      // Close dialog and reset state
      setIsEditDialogOpen(false);
      setDocumentToEdit(null);
      setEditDocTitle("");
      setEditSelectedProjectId("");
      setEditSelectedTemplateId("0");
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

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    let filtered = [...documents];
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.doc_title.toLowerCase().includes(searchLower) ||
        doc.template_name?.toLowerCase().includes(searchLower) ||
        doc.doc_type.toLowerCase().includes(searchLower) ||
        doc.creator_name?.toLowerCase().includes(searchLower)
      );
    }
    
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
    
    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB.getTime() - dateA.getTime();
    });
  }, [documents, searchTerm, dateFilter]);

  if (accessDenied) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 via-orange-50/30 to-yellow-50/50 dark:from-red-950/20 dark:via-orange-950/10 dark:to-yellow-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <FolderOpen className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Access Denied
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                You don't have permission to access documents for this project.
              </p>
              <Button
                onClick={() => {
                  const rolePrefix = userRole ? `/${userRole}` : '';
                  navigate(`${rolePrefix}/bugdocs`);
                }}
                className="h-12 px-6 bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Projects
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <button
            onClick={() => {
              const rolePrefix = userRole ? `/${userRole}` : '';
              navigate(`${rolePrefix}/bugdocs`);
            }}
            className="hover:text-foreground transition-colors"
          >
            BugDocs
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">
            {projectName || 'Project Documents'}
          </span>
        </div>

        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-50/50 via-transparent to-red-50/50 dark:from-orange-950/20 dark:via-transparent dark:to-red-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <FolderOpen className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      {projectName || 'Project Documents'}
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium">
                  {documents.length} {documents.length === 1 ? 'document' : 'documents'} in this project
                </p>
              </div>
              
              <Button
                onClick={() => {
                  const rolePrefix = userRole ? `/${userRole}` : '';
                  navigate(`${rolePrefix}/bugdocs`);
                }}
                variant="outline"
                size="lg"
                className="h-12 px-6"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Projects
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
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
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
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
                  
                  {/* Clear Filters Button */}
                  {(searchTerm || dateFilter !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
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
                  No documents found
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                  No documents available in this project.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 mt-4 grid-cols-1">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-50/40 via-transparent to-red-50/40 dark:from-orange-950/15 dark:via-transparent dark:to-red-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute top-4 right-4 w-3 h-3 bg-orange-500 rounded-full shadow-lg"></div>
                  
                  <div className="relative p-4 sm:p-5 md:p-6">
                    <div className="flex flex-col gap-3 sm:gap-4">
                      <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                        <div className="text-xl sm:text-2xl md:text-3xl flex-shrink-0">{getDocTypeIcon(doc.doc_type)}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors break-words">
                            {doc.doc_title}
                          </h3>
                          <div className="flex flex-col gap-2 sm:gap-3 mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            {doc.template_name && (
                              <span className="flex items-center min-w-0">
                                <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                                <span className="truncate">{doc.template_name}</span>
                              </span>
                            )}
                            {doc.creator_name && (
                              <span className="flex items-center min-w-0">
                                <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                                <span className="truncate">By {doc.creator_name}</span>
                              </span>
                            )}
                            <span className="flex items-center min-w-0">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                              <span className="truncate">Created {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 justify-end sm:justify-start">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDocument(doc)}
                          className="flex-1 sm:flex-initial h-9 sm:h-10 px-3 sm:px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-700 text-gray-700 dark:text-gray-300 hover:text-orange-700 dark:hover:text-orange-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300 text-xs sm:text-sm"
                        >
                          <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                          <span className="sm:inline">View</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(doc)}
                          className="flex-1 sm:flex-initial h-9 sm:h-10 px-3 sm:px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300 text-xs sm:text-sm"
                        >
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                          <span className="sm:inline">Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyDocumentUrl(doc)}
                          className="flex-1 sm:flex-initial h-9 sm:h-10 px-3 sm:px-4 bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-600 text-purple-700 dark:text-purple-300 hover:text-purple-700 dark:hover:text-purple-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300 text-xs sm:text-sm"
                        >
                          <Copy className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                          <span className="sm:inline">Copy URL</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(doc)}
                          disabled={isDeleting === doc.id}
                          className="flex-1 sm:flex-initial h-9 sm:h-10 w-auto px-3 sm:px-4 bg-red-500 hover:bg-red-600 text-white font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                        >
                          {isDeleting === doc.id ? (
                            <>
                              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin sm:mr-1" />
                              <span className="hidden sm:inline">Delete</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                              <span className="sm:inline">Delete</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
              <div className="space-y-2">
                <Label htmlFor="edit-project" className="text-sm font-medium">Project (Optional)</Label>
                <Select
                  value={editSelectedProjectId || "none"}
                  onValueChange={(value) => setEditSelectedProjectId(value === "none" ? "" : value)}
                  disabled={isUpdating}
                >
                  <SelectTrigger id="edit-project" className="w-full">
                    <SelectValue placeholder="No project (general document)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    <SelectItem value="none">No project (general document)</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDocumentToDelete(null);
                }}
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

export default ProjectDocumentsPage;

