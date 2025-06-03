import React from 'react';
import { 
  formatBugDate, 
  formatRelativeTime, 
  formatAbsoluteDate, 
  formatFullTimestamp,
  formatActivityDate 
} from '@/lib/dateUtils';

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