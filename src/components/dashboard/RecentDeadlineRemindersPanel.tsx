import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  deadlineReminderService,
  type DeadlineReminderItem,
} from '@/services/deadlineReminderService';
import { BellRing, Mail, MessageCircle, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';

function formatSentAt(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || '—';
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ReminderRow({ item, role }: { item: DeadlineReminderItem; role: string }) {
  return (
    <Link
      to={`/${role}/projects/${item.project_id}`}
      className="grid grid-cols-12 gap-2 rounded-xl border border-border/60 bg-background/60 p-3 transition-colors hover:bg-muted/40"
    >
      <div className="col-span-12 sm:col-span-6 min-w-0">
        <p className="text-sm font-medium truncate">{item.project_name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {item.milestone_label} · {item.offset_label}
        </p>
      </div>
      <div className="col-span-6 sm:col-span-3 flex flex-wrap items-center gap-1">
        <Badge variant="outline" className="rounded-xl gap-1 text-[10px]">
          <Mail className="h-3 w-3" />
          {item.email_count}
        </Badge>
        <Badge variant="outline" className="rounded-xl gap-1 text-[10px]">
          <MessageCircle className="h-3 w-3" />
          {item.whatsapp_count}
        </Badge>
        <Badge
          variant="outline"
          className={cn('rounded-xl gap-1 text-[10px]', !item.push_ok && 'opacity-50')}
        >
          <Smartphone className="h-3 w-3" />
        </Badge>
      </div>
      <div className="col-span-6 sm:col-span-3 flex flex-col items-end gap-1">
        <Badge
          variant="outline"
          className={cn(
            'rounded-xl text-[10px] uppercase',
            item.status === 'sent' && 'text-emerald-700 dark:text-emerald-300',
            item.status === 'partial' && 'text-amber-700 dark:text-amber-300'
          )}
        >
          {item.status}
        </Badge>
        <span className="text-[11px] text-muted-foreground">{formatSentAt(item.sent_at)}</span>
      </div>
    </Link>
  );
}

export function RecentDeadlineRemindersPanel({ role }: { role: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['deadline-reminders-recent'],
    queryFn: () => deadlineReminderService.getHistory({ limit: 8 }),
    staleTime: 60_000,
  });

  const items = data?.items ?? [];

  return (
    <div className={cn('rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6 space-y-4')}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <BellRing className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">Recent deadline reminders</h3>
          <p className="text-xs text-muted-foreground">
            Email, WhatsApp, and push sends across all projects
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-muted-foreground">Unable to load reminder history.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No deadline reminders have been sent yet. Cron runs daily at ~08:00 IST.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <ReminderRow key={item.id} item={item} role={role} />
          ))}
        </div>
      )}
    </div>
  );
}
