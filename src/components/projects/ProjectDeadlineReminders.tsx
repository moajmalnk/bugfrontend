import { useCallback, useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  deadlineReminderService,
  type DeadlineReminderItem,
} from '@/services/deadlineReminderService';
import { BellRing, Loader2, Mail, MessageCircle, Smartphone } from 'lucide-react';

type ProjectDeadlineRemindersProps = {
  projectId: string;
  isAdmin: boolean;
};

function formatSentAt(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || '—';
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ChannelPills({ item }: { item: DeadlineReminderItem }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge
        variant="outline"
        className={cn(
          'rounded-xl gap-1 text-[10px] font-medium',
          item.email_count > 0
            ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
            : 'opacity-50'
        )}
      >
        <Mail className="h-3 w-3" />
        {item.email_count}
      </Badge>
      <Badge
        variant="outline"
        className={cn(
          'rounded-xl gap-1 text-[10px] font-medium',
          item.whatsapp_count > 0
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'opacity-50'
        )}
      >
        <MessageCircle className="h-3 w-3" />
        {item.whatsapp_count}
      </Badge>
      <Badge
        variant="outline"
        className={cn(
          'rounded-xl gap-1 text-[10px] font-medium',
          item.push_ok
            ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300'
            : 'opacity-50'
        )}
      >
        <Smartphone className="h-3 w-3" />
        {item.push_ok ? 'Push' : '—'}
      </Badge>
    </div>
  );
}

export function ProjectDeadlineReminders({ projectId, isAdmin }: ProjectDeadlineRemindersProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<DeadlineReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!isAdmin || !projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await deadlineReminderService.getHistory({
        projectId,
        limit: 10,
      });
      setItems(result.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleTestSend = async () => {
    if (sending) return;
    setSending(true);
    try {
      const result = await deadlineReminderService.sendTest(projectId, 'deadline_date');
      if (result.success) {
        toast({
          title: 'Test reminder sent',
          description:
            result.message ||
            'Check your email, WhatsApp, and in-app notifications.',
        });
        setConfirmOpen(false);
        await load();
      } else {
        toast({
          title: 'Test reminder failed',
          description: result.message || 'No channel delivered the message.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Test reminder failed',
        description: err instanceof Error ? err.message : 'Unable to send test reminder.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground max-w-xl">
          Automated Email, WhatsApp, and push reminders fire for timeline milestones
          (7 / 3 / 1 days before, due today, and 1 day overdue for the project deadline).
        </p>
        <Button
          type="button"
          size="sm"
          className="rounded-xl gap-2"
          onClick={() => setConfirmOpen(true)}
          disabled={sending}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
          Send test reminder
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-12 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="col-span-12 h-14 animate-pulse rounded-xl bg-muted/60"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300/80 bg-gray-50/30 py-8 px-4 text-center dark:border-gray-700 dark:bg-gray-800/20">
          <p className="text-sm text-muted-foreground">No deadline reminders sent yet for this project.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-12 gap-3 rounded-xl border border-gray-200/70 bg-white/60 p-3 dark:border-gray-700/70 dark:bg-gray-800/40 sm:p-4"
            >
              <div className="col-span-12 md:col-span-5 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.milestone_label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.offset_label} · {item.milestone_date}
                </p>
              </div>
              <div className="col-span-12 sm:col-span-6 md:col-span-4 flex items-center">
                <ChannelPills item={item} />
              </div>
              <div className="col-span-12 sm:col-span-6 md:col-span-3 flex flex-col sm:items-end gap-1">
                <Badge
                  variant="outline"
                  className={cn(
                    'rounded-xl w-fit text-[10px] uppercase tracking-wide',
                    item.status === 'sent' &&
                      'border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300',
                    item.status === 'partial' &&
                      'border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-300',
                    item.status === 'failed' &&
                      'border-red-200 text-red-700 dark:border-red-800 dark:text-red-300'
                  )}
                >
                  {item.status}
                </Badge>
                <p className="text-[11px] text-muted-foreground">{formatSentAt(item.sent_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!sending) setConfirmOpen(open);
        }}
      >
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Send test deadline reminder?</AlertDialogTitle>
            <AlertDialogDescription>
              This sends Email, WhatsApp, and an in-app notification to you only.
              It does not notify project members or mark the production reminder as sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={sending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl"
              disabled={sending}
              onClick={(e) => {
                e.preventDefault();
                void handleTestSend();
              }}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending…
                </>
              ) : (
                'Send test'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
