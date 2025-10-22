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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">BugDocs</h1>
          <p className="text-muted-foreground mt-1">
            Manage your Google Docs documents
          </p>
        </div>
        {isConnected && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Document
            </Button>
          </div>
        )}
      </div>

      {/* Statistics */}
      {isConnected && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documents.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Templates Available</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templates.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {documents.length > 0
                  ? formatDistanceToNow(new Date(documents[0].created_at), {
                      addSuffix: true,
                    })
                  : "No activity"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

       {/* Connection Status */}
       {!isConnected && !isCheckingConnection && (
         <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
           <CardHeader>
             <CardTitle className="text-orange-800 dark:text-orange-200">Google Docs Not Connected</CardTitle>
             <CardDescription className="text-orange-700 dark:text-orange-300">
               Connect your Google account to create and manage documents
             </CardDescription>
           </CardHeader>
           <CardContent>
             <div className="flex flex-col items-center justify-center py-8 text-center">
               <div className="relative mb-6">
                 <LinkIcon className="h-16 w-16 text-orange-500" />
                 <div className="absolute -top-2 -right-2 h-6 w-6 bg-orange-400 rounded-full border-2 border-white animate-pulse"></div>
               </div>
               <h3 className="text-xl font-semibold mb-2 text-orange-800 dark:text-orange-200">
                 Connect Google Docs
               </h3>
               <p className="text-orange-700 dark:text-orange-300 mb-6 max-w-md">
                 Link your Google account to create, manage, and collaborate on documents directly from BugRicer.
               </p>
               <div className="flex flex-col gap-3">
                 <Button
                   onClick={handleConnectGoogleDocs}
                   className="
                     h-12 px-8 py-3 rounded-xl font-semibold text-sm
                     bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 
                     hover:from-orange-600 hover:via-orange-700 hover:to-orange-800 
                     text-white border-0 shadow-lg hover:shadow-xl
                     transition-all duration-300 ease-in-out
                     transform hover:scale-[1.02] active:scale-[0.98]
                     relative overflow-hidden
                   "
                 >
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                   <div className="relative flex items-center space-x-3">
                     <LinkIcon className="h-5 w-5" />
                     <span>Connect Google Account</span>
                     <ExternalLink className="h-4 w-4" />
                   </div>
                 </Button>
                 
                 {/* Debug buttons */}
                 <div className="flex gap-2 mt-4">
                   <Button 
                     variant="outline" 
                     size="sm"
                     onClick={async () => {
                       try {
                         console.log('🔍 Debug: Checking current user...');
                         const response = await fetch('http://localhost/BugRicer/backend/debug-current-user-tokens.php', {
                           headers: {
                             'Authorization': `Bearer ${localStorage.getItem('token')}`
                           }
                         });
                         const data = await response.json();
                         console.log('🔍 Current user data:', data);
                       } catch (error) {
                         console.error('🔍 Debug error:', error);
                       }
                     }}
                   >
                     Check User
                   </Button>
                   <Button 
                     variant="outline" 
                     size="sm"
                     onClick={async () => {
                       try {
                         console.log('🔍 Debug: Checking connection status...');
                         const response = await fetch('http://localhost/BugRicer/backend/debug-connection-status.php', {
                           headers: {
                             'Authorization': `Bearer ${localStorage.getItem('token')}`
                           }
                         });
                         const data = await response.json();
                         console.log('🔍 Connection status:', data);
                       } catch (error) {
                         console.error('🔍 Debug error:', error);
                       }
                     }}
                   >
                     Check Connection
                   </Button>
                   <Button 
                     variant="outline" 
                     size="sm"
                     onClick={async () => {
                       try {
                         console.log('🔧 Manual Fix: Linking Google account...');
                         const response = await fetch('http://localhost/BugRicer/backend/manual-link-google.php', {
                           method: 'POST',
                           headers: {
                             'Authorization': `Bearer ${localStorage.getItem('token')}`,
                             'Content-Type': 'application/json'
                           },
                           body: JSON.stringify({
                             google_user_id: '110481653354659898559', // From the debug output
                             email: 'ajmalnk04@gmail.com'
                           })
                         });
                         const data = await response.json();
                         console.log('🔧 Manual link result:', data);
                         if (data.success) {
                           // Refresh the page to check connection
                           window.location.reload();
                         }
                       } catch (error) {
                         console.error('🔧 Manual link error:', error);
                       }
                     }}
                   >
                     Fix Connection
                   </Button>
                 </div>
               </div>
             </div>
           </CardContent>
         </Card>
       )}

      {/* Documents List */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Your Documents</CardTitle>
            <CardDescription>
              Click on a document to view and edit it in Google Docs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading documents...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No documents yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first document to get started
                </p>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Document
                </Button>
              </div>
            ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="text-2xl">{getDocTypeIcon(doc.doc_type)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{doc.doc_title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {doc.template_name && (
                          <span className="flex items-center">
                            <FileText className="h-3 w-3 mr-1" />
                            {doc.template_name}
                          </span>
                        )}
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Created {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDocument(doc)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(doc)}
                      disabled={isDeleting === doc.id}
                    >
                      {isDeleting === doc.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
    </div>
  );
};

export default BugDocsPage;

