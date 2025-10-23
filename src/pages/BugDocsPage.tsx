import { useState, useEffect } from "react";
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
                      variant="outline"
                      size="lg"
                      onClick={loadData}
                      disabled={isLoading}
                      className="h-12 px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-700 text-gray-700 dark:text-gray-300 hover:text-orange-700 dark:hover:text-orange-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      <RefreshCw className={`h-5 w-5 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
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

        {/* Statistics */}
        {isConnected && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-gray-800 dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-gray-700 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-400 dark:text-gray-500 truncate">Total Documents</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white dark:text-white">{documents.length}</p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-500 rounded-xl flex-shrink-0">
                  <FolderOpen className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-gray-800 dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-gray-700 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-400 dark:text-gray-500 truncate">Templates Available</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white dark:text-white">{templates.length}</p>
                </div>
                <div className="p-2 sm:p-3 bg-green-500 rounded-xl flex-shrink-0">
                  <FileText className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-gray-800 dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-gray-700 dark:border-gray-600 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-400 dark:text-gray-500 truncate">Recent Activity</p>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-white dark:text-white truncate">
                    {documents.length > 0
                      ? formatDistanceToNow(new Date(documents[0].created_at), {
                          addSuffix: true,
                        })
                      : "No activity"}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-orange-500 rounded-xl flex-shrink-0">
                  <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

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
                Connect Google Account
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Documents List */}
        {isConnected && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-orange-50/30 dark:from-gray-800/30 dark:to-orange-900/30 rounded-2xl"></div>
            <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 bg-orange-500 rounded-lg">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Documents</h3>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading documents...</span>
                </div>
              ) : documents.length === 0 ? (
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
                  <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                      <FileText className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Documents Yet</h3>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                      Create your first document to get started with BugDocs
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
                  {documents.map((doc) => (
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
          </div>
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

