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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Announcement,
  announcementService,
} from "@/services/announcementService";
import { format } from "date-fns";
import {
  BellRing,
  Edit,
  MoreHorizontal,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "../ui/use-toast";
import { AnnouncementDialog } from "./AnnouncementDialog";

export const AnnouncementManager = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] =
    useState<Announcement | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await announcementService.getAll();
      setAnnouncements(data);
    } catch (error) {
      toast({
        title: "Error fetching announcements",
        description: "Could not retrieve announcement data.",
        variant: "destructive",
      });
      // console.error('Failed to fetch announcements:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleBroadcast = async (announcement: Announcement) => {
    try {
      await announcementService.broadcast(announcement.id);
      toast({
        title: "Announcement Broadcast",
        description: `"${announcement.title}" will be shown to all users.`,
      });
      fetchAnnouncements();
    } catch (error) {
      toast({
        title: "Error broadcasting announcement",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedAnnouncement(null);
    setDialogOpen(true);
  };

  const handleDelete = (announcement: Announcement) => {
    setAnnouncementToDelete(announcement);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!announcementToDelete) return;
    try {
      await announcementService.delete(announcementToDelete.id);
      toast({
        title: "Announcement Deleted",
        description: `"${announcementToDelete.title}" has been successfully deleted.`,
      });
      fetchAnnouncements();
    } catch (error) {
      toast({
        title: "Error deleting announcement",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setAnnouncementToDelete(null);
    }
  };

  return (
    <Card className="w-full max-w-full shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4 w-full">
          <div className="min-w-0">
            <CardTitle className="text-lg sm:text-xl lg:text-2xl">
              Manage Announcements
            </CardTitle>
            <CardDescription className="text-sm sm:text-base lg:text-lg">
              Create, edit, and manage pop-up announcements for users.
            </CardDescription>
          </div>
          <Button
            onClick={handleAddNew}
            className="w-full sm:w-auto mt-2 sm:mt-0 h-10 sm:h-11 text-sm sm:text-base"
          >
            <PlusCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Add New
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 lg:p-8">
        <div className="w-full min-w-0 overflow-x-auto custom-scrollbar">
          <Table className="w-full min-w-[400px] sm:min-w-[700px] text-xs sm:text-sm">
            <TableHeader className="bg-muted/30">
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold text-sm sm:text-base">
                  Title
                </TableHead>
                <TableHead className="font-semibold text-sm sm:text-base">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-sm sm:text-base">
                  Created At
                </TableHead>
                <TableHead className="font-semibold text-sm sm:text-base">
                  Expires At
                </TableHead>
                <TableHead className="text-right font-semibold text-sm sm:text-base">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : announcements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No announcements found.
                  </TableCell>
                </TableRow>
              ) : (
                announcements.map((announcement) => (
                  <TableRow
                    key={announcement.id}
                    className="hover:bg-muted/20 transition-colors duration-200"
                  >
                    <TableCell className="font-medium truncate max-w-[100px] sm:max-w-none text-sm sm:text-base">
                      {announcement.title}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          announcement.is_active ? "default" : "secondary"
                        }
                        className="text-xs sm:text-sm px-2 py-1"
                      >
                        {announcement.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm sm:text-base">
                      {format(new Date(announcement.created_at), "PPP")}
                    </TableCell>
                    <TableCell className="text-sm sm:text-base">
                      {announcement.expiry_date
                        ? format(new Date(announcement.expiry_date), "PPP")
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleBroadcast(announcement)}
                            className="text-sm sm:text-base"
                          >
                            <BellRing className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            Notify
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEdit(announcement)}
                            className="text-sm sm:text-base"
                          >
                            <Edit className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(announcement)}
                            className="text-red-600 text-sm sm:text-base"
                          >
                            <Trash2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <AnnouncementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        announcement={selectedAnnouncement}
        onSave={fetchAnnouncements}
      />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              announcement "{announcementToDelete?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
