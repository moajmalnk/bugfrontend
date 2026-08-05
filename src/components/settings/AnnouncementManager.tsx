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
import { useCallback, useEffect, forwardRef, useImperativeHandle, useState } from "react";
import { toast } from "../ui/use-toast";
import { AnnouncementDialog } from "./AnnouncementDialog";

export type AnnouncementManagerHandle = {
  openCreate: () => void;
};

export const AnnouncementManager = forwardRef<AnnouncementManagerHandle>(
  function AnnouncementManager(_props, ref) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] =
    useState<Announcement | null>(null);

  useImperativeHandle(ref, () => ({
    openCreate: () => {
      setSelectedAnnouncement(null);
      setDialogOpen(true);
    },
  }));

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
    <div className="space-y-4 sm:space-y-6 min-w-0 w-full">

      {/* Content Section */}
      <div className="relative min-w-0 w-full overflow-x-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-2xl pointer-events-none" />
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-x-auto shadow-xl min-w-0">
          {/* Desktop Table View */}
          <div className="hidden lg:block w-full overflow-x-auto">
            <Table className="w-full table-fixed">
              <TableHeader className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900">
                <TableRow className="border-b border-gray-200/50 dark:border-gray-700/50">
                  <TableHead className="w-[35%] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                    Title
                  </TableHead>
                  <TableHead className="w-[15%] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                    Status
                  </TableHead>
                  <TableHead className="w-[20%] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                    Created At
                  </TableHead>
                  <TableHead className="w-[20%] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                    Expires At
                  </TableHead>
                  <TableHead className="w-[10%] pr-4 text-right font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-600 dark:text-gray-400">Loading announcements...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : announcements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                          <BellRing className="h-6 w-6 text-gray-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No announcements found</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">Create your first announcement to get started</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  announcements.map((announcement, index) => (
                    <TableRow
                      key={announcement.id}
                      className={`group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 transition-all duration-300 border-b border-gray-100/50 dark:border-gray-800/50 ${
                        index % 2 === 0 ? 'bg-white/50 dark:bg-gray-900/50' : 'bg-gray-50/30 dark:bg-gray-800/30'
                      }`}
                    >
                      <TableCell className="w-[35%] px-4 font-semibold text-sm sm:text-base text-gray-900 dark:text-white py-4 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="truncate">{announcement.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="w-[15%] px-4 py-4">
                        <Badge
                          variant={announcement.is_active ? "default" : "secondary"}
                          className={`text-xs sm:text-sm px-3 py-1 font-semibold ${
                            announcement.is_active 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {announcement.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-[20%] px-4 text-sm sm:text-base text-gray-700 dark:text-gray-300 py-4 font-medium">
                        {format(new Date(announcement.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="w-[20%] px-4 text-sm sm:text-base text-gray-700 dark:text-gray-300 py-4 font-medium">
                        {announcement.expiry_date
                          ? format(new Date(announcement.expiry_date), "MMM dd, yyyy")
                          : "Never"}
                      </TableCell>
                      <TableCell className="w-[10%] pr-4 text-right py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-9 w-9 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => handleBroadcast(announcement)}
                              className="text-sm cursor-pointer"
                            >
                              <BellRing className="mr-2 h-4 w-4" />
                              Broadcast
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEdit(announcement)}
                              className="text-sm cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(announcement)}
                              className="text-red-600 text-sm cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
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

          {/* Mobile & Tablet Card View */}
          <div className="lg:hidden p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-600 dark:text-gray-400">Loading announcements...</span>
                </div>
              </div>
            ) : announcements.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <BellRing className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No announcements found</h3>
                  <p className="text-gray-600 dark:text-gray-400">Create your first announcement to get started</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {announcements.map((announcement) => (
                  <Card key={announcement.id} className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-purple-50/40 dark:from-blue-950/15 dark:via-transparent dark:to-purple-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <CardHeader className="relative p-4 sm:p-5">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base sm:text-lg font-bold leading-tight break-words">
                            {announcement.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant={announcement.is_active ? "default" : "secondary"}
                              className={`text-xs px-2 py-1 font-semibold ${
                                announcement.is_active 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                              }`}
                            >
                              {announcement.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => handleBroadcast(announcement)}
                              className="text-sm cursor-pointer"
                            >
                              <BellRing className="mr-2 h-4 w-4" />
                              Broadcast
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEdit(announcement)}
                              className="text-sm cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(announcement)}
                              className="text-red-600 text-sm cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="relative space-y-3 p-4 sm:p-5 pt-0">
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Created:</span>
                          <span>{format(new Date(announcement.created_at), "MMM dd, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Expires:</span>
                          <span>
                            {announcement.expiry_date
                              ? format(new Date(announcement.expiry_date), "MMM dd, yyyy")
                              : "Never"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
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
    </div>
  );
});
