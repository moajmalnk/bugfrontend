import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { WhatsAppContact, whatsappService } from "@/services/whatsappService";
import { MessageCircle, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export function WhatsAppContactsManager() {
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contactToDelete, setContactToDelete] =
    useState<WhatsAppContact | null>(null);
  const [newContact, setNewContact] = useState<WhatsAppContact>({
    name: "",
    phone: "",
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = () => {
    const savedContacts = whatsappService.getContacts();
    setContacts(savedContacts);
  };

  const handleAddContact = () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      toast({
        title: "Invalid contact",
        description: "Please enter both name and phone number.",
        variant: "destructive",
      });
      return;
    }

    // Basic phone validation
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(newContact.phone)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      return;
    }

    whatsappService.saveContact(newContact);
    loadContacts();
    setNewContact({ name: "", phone: "" });
    setShowAddDialog(false);

    toast({
      title: "Contact added",
      description: `${newContact.name} has been added to your WhatsApp contacts.`,
    });
  };

  const handleDeleteContact = (contact: WhatsAppContact) => {
    setContactToDelete(contact);
    setShowDeleteDialog(true);
  };

  const confirmDeleteContact = () => {
    if (contactToDelete) {
      whatsappService.deleteContact(contactToDelete.phone);
      loadContacts();
      setContactToDelete(null);
      setShowDeleteDialog(false);

      toast({
        title: "Contact deleted",
        description: `${contactToDelete.name} has been removed from your contacts.`,
      });
    }
  };

  const handleTestMessage = (contact: WhatsAppContact) => {
    whatsappService.shareNewBug(
      {
        bugTitle: "Test Message",
        bugId: "test-123",
        priority: "medium",
        description: "This is a test message to verify WhatsApp integration.",
        reportedBy: "Test User",
        projectName: "Test Project",
      },
      contact.phone
    );

    toast({
      title: "Test message sent",
      description: `WhatsApp should open with a pre-filled message for ${contact.name}.`,
    });
  };

  const handleBulkShare = () => {
    if (contacts.length === 0) {
      toast({
        title: "No contacts",
        description: "Add some contacts first before bulk sharing.",
        variant: "destructive",
      });
      return;
    }

    whatsappService.scheduleAutoShare(
      {
        bugTitle: "Bulk Test Message",
        bugId: "bulk-test",
        priority: "medium",
        description: "This is a bulk test message sent to multiple contacts.",
        reportedBy: "Bulk Test",
        projectName: "Test Project",
      },
      "new_bug",
      contacts,
      2000 // 2 second delay between messages
    );

    toast({
      title: "Bulk sharing started",
      description: `WhatsApp will open for each of your ${contacts.length} contacts with 2-second intervals.`,
    });
  };

  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="space-y-2 p-4 sm:p-5 lg:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
          <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
          WhatsApp Contacts
        </CardTitle>
        <CardDescription className="text-sm sm:text-base lg:text-lg">
          Manage your frequently contacted WhatsApp users for quick bug sharing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-5 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
        {/* Add Contact Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {contacts.length} contact{contacts.length !== 1 ? "s" : ""} saved
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {contacts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkShare}
                className="flex-1 sm:flex-none"
              >
                Bulk Test
              </Button>
            )}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex-1 sm:flex-none">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Add Contact</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md mx-4">
                <DialogHeader>
                  <DialogTitle>Add WhatsApp Contact</DialogTitle>
                  <DialogDescription className="text-sm">
                    Add a contact for quick WhatsApp sharing. Include country
                    code (e.g., +1234567890)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="contact-name">Name</Label>
                    <Input
                      id="contact-name"
                      placeholder="Contact name"
                      value={newContact.name}
                      onChange={(e) =>
                        setNewContact((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-phone">Phone Number</Label>
                    <Input
                      id="contact-phone"
                      placeholder="+1234567890"
                      value={newContact.phone}
                      onChange={(e) =>
                        setNewContact((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Include country code for international numbers
                    </p>
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddContact}
                    className="w-full sm:w-auto"
                  >
                    Add Contact
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Contacts List */}
        {contacts.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              No WhatsApp contacts added yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add contacts to quickly share bug notifications
            </p>
            <Button
              onClick={() => setShowAddDialog(true)}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Contact
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base lg:text-lg truncate">
                      {contact.name}
                    </p>
                    <p className="text-xs sm:text-sm lg:text-base text-muted-foreground break-all">
                      {contact.phone}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 self-start sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestMessage(contact)}
                    className="flex-1 sm:flex-none h-9 sm:h-10 text-sm sm:text-base"
                  >
                    Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteContact(contact)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex-1 sm:flex-none h-9 sm:h-10 text-sm sm:text-base"
                  >
                    <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="sr-only">Delete {contact.name}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tips */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            💡 Tips for Better WhatsApp Sharing
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
              <span>Always include country code in phone numbers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
              <span>Use "Test" button to verify contacts work correctly</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
              <span>Bulk sharing opens multiple WhatsApp tabs with delays</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
              <span>
                Messages are pre-filled - just select contact and send
              </span>
            </li>
          </ul>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete {contactToDelete?.name}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteContact}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
            >
              Delete Contact
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
