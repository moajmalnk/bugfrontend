import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Announcement,
  AnnouncementPayload,
  announcementService,
} from "@/services/announcementService";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "../ui/use-toast";

interface AnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: Announcement | null;
  onSave: () => void;
}

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  is_active: z.boolean(),
  expiry_date: z.date().nullable(),
});

export const AnnouncementDialog = ({
  open,
  onOpenChange,
  announcement,
  onSave,
}: AnnouncementDialogProps) => {
  const form = useForm<z.infer<typeof announcementSchema>>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "",
      content: "",
      is_active: false,
      expiry_date: null,
    },
  });

  useEffect(() => {
    if (announcement) {
      form.reset({
        title: announcement.title,
        content: announcement.content,
        is_active: !!announcement.is_active,
        expiry_date: announcement.expiry_date
          ? parseISO(announcement.expiry_date)
          : null,
      });
    } else {
      form.reset({
        title: "",
        content: "",
        is_active: false,
        expiry_date: null,
      });
    }
  }, [announcement, form, open]);

  const onSubmit = async (values: z.infer<typeof announcementSchema>) => {
    try {
      const payload: AnnouncementPayload = {
        title: values.title,
        content: values.content,
        is_active: values.is_active ? 1 : 0,
        expiry_date: values.expiry_date
          ? format(values.expiry_date, "yyyy-MM-dd HH:mm:ss")
          : null,
      };

      if (announcement) {
        // Update
        await announcementService.update(announcement.id, payload);
        toast({
          title: "Success",
          description: "Announcement updated successfully.",
        });
      } else {
        // Create
        await announcementService.create(payload);
        toast({
          title: "Success",
          description: "Announcement created successfully.",
        });
      }
      onSave();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save announcement.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] sm:max-w-[600px] max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader className="p-4 sm:p-5 lg:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg sm:text-xl lg:text-2xl">
                {announcement ? "Edit Announcement" : "Create Announcement"}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base lg:text-lg mt-1 sm:mt-2">
                {announcement
                  ? "Make changes to your announcement."
                  : "Create a new announcement for all users."}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 sm:h-9 sm:w-9 p-0 flex-shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 sm:space-y-6 p-4 sm:p-5 lg:p-6 pt-0 sm:pt-0 lg:pt-0"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base font-medium">
                    Title
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="h-10 sm:h-11 text-sm sm:text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base font-medium">
                    Content
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      className="min-h-[100px] sm:min-h-[120px] lg:min-h-[140px] custom-scrollbar text-sm sm:text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4 lg:p-5 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm sm:text-base lg:text-lg font-medium">
                      Active
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="scale-110 sm:scale-125"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiry_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-sm sm:text-base font-medium">
                    Expiry Date (Optional)
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal h-10 sm:h-11 text-sm sm:text-base",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base"
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
