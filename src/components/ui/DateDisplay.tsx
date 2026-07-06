import React, { useState } from 'react';
import { 
  formatBugDate, 
  formatRelativeTime, 
  formatAbsoluteDate, 
  formatFullTimestamp,
  formatActivityDate,
  formatDetailedDateMalayalam,
} from '@/lib/dateUtils';
import { useMalayalamToggle } from '@/hooks/useMalayalamToggle';
import { cn } from '@/lib/utils';

interface DateDisplayProps {
  date: string | Date;
  format?: 'relative' | 'absolute' | 'smart' | 'activity';
  showTooltip?: boolean;
  className?: string;
  prefix?: string;
}

/**
 * Professional date display component with consistent formatting
 * Features:
 * - Timezone-aware formatting
 * - Multiple display formats
 * - Hover tooltips with full timestamp
 * - Professional appearance like GitHub, Slack, etc.
 */
export const DateDisplay: React.FC<DateDisplayProps> = ({
  date,
  format = 'smart',
  showTooltip = true,
  className = '',
  prefix = ''
}) => {
  const getFormattedDate = () => {
    switch (format) {
      case 'relative':
        return formatRelativeTime(date);
      case 'absolute':
        return formatAbsoluteDate(date);
      case 'activity':
        return formatActivityDate(date);
      case 'smart':
      default:
        return formatBugDate(date);
    }
  };

  const displayText = `${prefix}${getFormattedDate()}`;

  if (showTooltip) {
    return (
      <time 
        dateTime={typeof date === 'string' ? date : date.toISOString()}
        className={`cursor-help ${className}`}
        title={formatFullTimestamp(date)}
      >
        {displayText}
      </time>
    );
  }

  return (
    <time 
      dateTime={typeof date === 'string' ? date : date.toISOString()}
      className={className}
    >
      {displayText}
    </time>
  );
};

/**
 * Specialized components for different use cases
 */
export const BugCreatedDate: React.FC<{ date: string | Date; className?: string }> = ({ 
  date, 
  className = "text-xs sm:text-sm text-muted-foreground" 
}) => (
  <DateDisplay 
    date={date} 
    format="smart" 
    prefix="Created " 
    className={className}
  />
);

export const ActivityDate: React.FC<{ date: string | Date; className?: string }> = ({ 
  date, 
  className = "text-xs text-muted-foreground" 
}) => (
  <DateDisplay 
    date={date} 
    format="activity" 
    className={className}
  />
);

export const RelativeDate: React.FC<{ date: string | Date; className?: string }> = ({ 
  date, 
  className = "text-sm text-muted-foreground" 
}) => (
  <DateDisplay 
    date={date} 
    format="relative" 
    className={className}
  />
);

export const AbsoluteDate: React.FC<{ date: string | Date; className?: string }> = ({ 
  date, 
  className = "text-sm" 
}) => (
  <DateDisplay 
    date={date} 
    format="absolute" 
    className={className}
  />
);

interface MalayalamBadgeProps {
  className?: string;
}

/** Malayalam letter "ma" (മ) badge. */
export const MalayalamBadge: React.FC<MalayalamBadgeProps> = ({ className }) => (
  <span
    className={cn(
      'text-[11px] font-bold leading-none text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded px-1 py-0.5',
      className
    )}
    aria-hidden="true"
  >
    മ
  </span>
);

interface MalayalamTextToggleProps {
  text: string;
  className?: string;
  badgeOnly?: boolean;
}

/**
 * Clickable text with a Malayalam "മ" badge — translates to Malayalam on click.
 */
export const MalayalamTextToggle: React.FC<MalayalamTextToggleProps> = ({
  text,
  className = '',
  badgeOnly = false,
}) => {
  const { displayText, loading, toggle, showMalayalam } = useMalayalamToggle(text);

  if (badgeOnly) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className={cn(
          'inline-flex items-center rounded-sm transition-colors hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50',
          className
        )}
        title={showMalayalam ? 'Show in English' : 'മലയാളത്തിൽ കാണിക്കുക'}
        aria-label={showMalayalam ? 'Show in English' : 'Show in Malayalam'}
      >
        <MalayalamBadge />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm text-left transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50',
        className
      )}
      title={showMalayalam ? 'Show in English' : 'മലയാളത്തിൽ കാണിക്കുക'}
      aria-label={showMalayalam ? 'Show in English' : 'Show in Malayalam'}
    >
      <span>{displayText}</span>
      <MalayalamBadge />
    </button>
  );
};

interface MalayalamDateToggleProps {
  date: string | Date;
  englishText: string;
  className?: string;
}

/**
 * Clickable date with a Malayalam "മ" badge — toggles English/Malayalam on click.
 */
export const MalayalamDateToggle: React.FC<MalayalamDateToggleProps> = ({
  date,
  englishText,
  className = '',
}) => {
  const [showMalayalam, setShowMalayalam] = useState(false);
  const dateIso = typeof date === 'string' ? date : date.toISOString();
  const malayalamText = formatDetailedDateMalayalam(dateIso);

  return (
    <button
      type="button"
      onClick={() => setShowMalayalam((prev) => !prev)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        className
      )}
      title={showMalayalam ? 'Show in English' : 'മലയാളത്തിൽ കാണിക്കുക'}
      aria-label={showMalayalam ? 'Show date in English' : 'Show date in Malayalam'}
    >
      <time dateTime={dateIso}>{showMalayalam ? malayalamText : englishText}</time>
      <MalayalamBadge />
    </button>
  );
};