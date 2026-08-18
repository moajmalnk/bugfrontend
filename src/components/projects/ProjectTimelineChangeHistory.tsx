import { useState } from 'react';
import { History, ArrowRight } from 'lucide-react';
import { UserAvatar } from '@/components/users/UserAvatar';
import { cn } from '@/lib/utils';
import {
  formatProjectDateTime,
  type ProjectTimelineHistoryEntry,
} from '@/lib/utils/projectUtils';

const PREVIEW_COUNT = 6;

function roleLabel(role?: string | null): string | null {
  if (!role) return null;
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function HistoryRow({ entry }: { entry: ProjectTimelineHistoryEntry }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/15 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{entry.field_label}</p>
        <p className="text-[11px] sm:text-xs text-muted-foreground whitespace-nowrap">
          {formatProjectDateTime(entry.changed_at)}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 min-w-0 text-sm">
        <span className="text-muted-foreground italic truncate max-w-full">
          {formatProjectDateTime(entry.old_value)}
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="font-medium text-foreground truncate max-w-full">
          {formatProjectDateTime(entry.new_value)}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 min-w-0">
        <UserAvatar
          name={entry.changed_by_username}
          avatar={entry.changed_by_avatar}
          size="sm"
          alt={`${entry.changed_by_username} profile photo`}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {entry.changed_by_username}
          </p>
          {roleLabel(entry.changed_by_role) ? (
            <p className="text-[11px] text-muted-foreground">
              {roleLabel(entry.changed_by_role)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ProjectTimelineChangeHistory({
  history,
}: {
  history?: ProjectTimelineHistoryEntry[];
}) {
  const [expanded, setExpanded] = useState(false);
  const entries = history || [];

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          No timeline changes yet. When a date is rescheduled, the previous value, new value, who
          changed it, and the exact time are recorded here.
        </p>
      </div>
    );
  }

  const visible = expanded ? entries : entries.slice(0, PREVIEW_COUNT);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 min-w-0">
        <History className="h-4 w-4 shrink-0 text-blue-500" aria-hidden />
        <p className="text-sm font-semibold text-foreground">Change history</p>
        <span className="text-xs text-muted-foreground">
          {entries.length} {entries.length === 1 ? 'update' : 'updates'}
        </span>
      </div>
      <div
        className={cn(
          'flex flex-col gap-3',
          expanded && entries.length > 8
            ? 'max-h-[28rem] overflow-y-auto pr-1 [scrollbar-width:thin]'
            : ''
        )}
      >
        {visible.map((entry) => (
          <HistoryRow key={entry.id} entry={entry} />
        ))}
      </div>
      {entries.length > PREVIEW_COUNT ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="h-10 rounded-xl border border-border/60 px-4 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
        >
          {expanded ? 'Show recent only' : `Show all ${entries.length} changes`}
        </button>
      ) : null}
    </div>
  );
}
