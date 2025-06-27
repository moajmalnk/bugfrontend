import { formatDistanceToNow, format, isToday, isYesterday, isThisYear, parseISO, isValid, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';

/**
 * Professional date formatting utility that provides consistent date displays
 * following modern platform conventions (GitHub, Linear, Slack style)
 */

export interface DateDisplayOptions {
  includeTime?: boolean;
  relative?: boolean;
  short?: boolean;
}

/**
 * Safely parse a date string and convert to local timezone
 */
export function safeParseDate(dateString: string | Date): Date {
  if (dateString instanceof Date) return dateString;
  if (!dateString) return new Date();
  try {
    const parsed = parseISO(dateString);
    return isValid(parsed) ? parsed : new Date(dateString);
  } catch {
    return new Date();
  }
}

/**
 * Professional relative time formatting like GitHub, Slack, etc.
 */
export function formatRelativeTime(dateString: string | Date): string {
  const date = safeParseDate(dateString);
  const now = new Date();
  
  const minutes = Math.abs(differenceInMinutes(now, date));
  const hours = Math.abs(differenceInHours(now, date));
  const days = Math.abs(differenceInDays(now, date));

  // Just now (0-1 minute)
  if (minutes < 1) {
    return 'just now';
  }
  
  // Minutes (1-59 minutes)
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  
  // Hours (1-23 hours)
  if (hours < 24) {
    return `${hours}h ago`;
  }
  
  // Days (1-7 days)
  if (days < 7) {
    return `${days}d ago`;
  }
  
  // Weeks (1-4 weeks)
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  }
  
  // Months (1-12 months)
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }
  
  // Years
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

/**
 * Professional absolute date formatting
 */
export function formatAbsoluteDate(dateString: string | Date): string {
  const date = safeParseDate(dateString);
  const now = new Date();
  
  const days = Math.abs(differenceInDays(now, date));
  
  // Today: "Today at 2:30 PM"
  if (days === 0) {
    return `Today at ${format(date, 'h:mm a')}`;
  }
  
  // Yesterday: "Yesterday at 2:30 PM"
  if (days === 1) {
    return `Yesterday at ${format(date, 'h:mm a')}`;
  }
  
  // This year: "Mar 15 at 2:30 PM"
  if (date.getFullYear() === now.getFullYear()) {
    return format(date, 'MMM d \'at\' h:mm a');
  }
  
  // Previous years: "Mar 15, 2023 at 2:30 PM"
  return format(date, 'MMM d, yyyy \'at\' h:mm a');
}

/**
 * Smart date formatting - shows relative for recent, absolute for older
 */
export function formatSmartDate(dateString: string | Date, showTime: boolean = false): string {
  const date = safeParseDate(dateString);
  const now = new Date();
  
  const minutes = Math.abs(differenceInMinutes(now, date));
  const hours = Math.abs(differenceInHours(now, date));
  const days = Math.abs(differenceInDays(now, date));

  // Recent (less than 7 days): use relative time
  if (days < 7) {
    return formatRelativeTime(dateString);
  }
  
  // Older: use absolute date
  if (showTime) {
    return formatAbsoluteDate(dateString);
  }
  
  // Date only for older dates when time not needed
  if (date.getFullYear() === now.getFullYear()) {
    return format(date, 'MMM d');
  }
  
  return format(date, 'MMM d, yyyy');
}

/**
 * Bug-specific date formatting for consistent UX
 */
export function formatBugDate(dateString: string | Date): string {
  return formatSmartDate(dateString, false);
}

/**
 * Full timestamp for tooltips and detailed views
 */
export function formatFullTimestamp(dateString: string | Date): string {
  const date = safeParseDate(dateString);
  return format(date, 'EEEE, MMMM do, yyyy \'at\' h:mm:ss a');
}

/**
 * ISO date for API calls
 */
export function formatISODate(date: Date): string {
  return date.toISOString();
}

/**
 * Simple date for forms
 */
export function formatSimpleDate(dateString: string | Date): string {
  const date = safeParseDate(dateString);
  return format(date, 'yyyy-MM-dd');
}

/**
 * Professional activity feed formatting
 */
export function formatActivityDate(dateString: string | Date): string {
  const date = safeParseDate(dateString);
  const now = new Date();
  const hours = Math.abs(differenceInHours(now, date));
  
  // Less than 24 hours: use relative
  if (hours < 24) {
    return formatRelativeTime(dateString);
  }
  
  // More than 24 hours: use absolute
  return formatAbsoluteDate(dateString);
}

/**
 * Get timezone info for debugging
 */
export function getTimezoneInfo() {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    offset: new Date().getTimezoneOffset(),
    offsetHours: new Date().getTimezoneOffset() / 60,
  };
}

/**
 * Format a date string for professional display
 * @param dateString - ISO date string or Date object
 * @param options - Formatting options
 */
export function formatDateProfessional(
  dateString: string | Date, 
  options: DateDisplayOptions = {}
): string {
  const { includeTime = false, relative = true, short = false } = options;
  
  let date: Date;
  try {
    date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  } catch {
    return 'Invalid date';
  }

  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);

  // For relative formatting
  if (relative) {
    // Just now (< 1 minute)
    if (diffInMinutes < 1) {
      return 'Just now';
    }
    
    // Minutes ago (< 1 hour)
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }
    
    // Hours ago (< 24 hours and same day)
    if (diffInHours < 24 && isToday(date)) {
      return `${diffInHours}h ago`;
    }
    
    // Yesterday
    if (isYesterday(date)) {
      return includeTime 
        ? `Yesterday at ${format(date, 'HH:mm')}`
        : 'Yesterday';
    }
    
    // This year
    if (isThisYear(date)) {
      return includeTime
        ? format(date, 'MMM d \'at\' HH:mm')
        : format(date, 'MMM d');
    }
    
    // Previous years
    return includeTime
      ? format(date, 'MMM d, yyyy \'at\' HH:mm')
      : format(date, 'MMM d, yyyy');
  }

  // For absolute formatting
  if (short) {
    return format(date, 'MMM d');
  }

  return includeTime
    ? format(date, 'MMM d, yyyy \'at\' HH:mm')
    : format(date, 'MMM d, yyyy');
}

/**
 * Format for detailed views - shows more context
 */
export function formatDetailedDate(dateString: string): string {
  return formatDateProfessional(dateString, { 
    relative: true, 
    includeTime: true 
  });
}

/**
 * Format for tooltips and hover states
 */
export function formatTooltipDate(dateString: string): string {
  const date = parseISO(dateString);
  return format(date, 'EEEE, MMMM d, yyyy \'at\' h:mm a');
}

/**
 * Get a short time representation for compact displays
 */
export function formatCompactTime(dateString: string): string {
  const date = parseISO(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d`;
  }
  
  return format(date, 'MMM d');
}

const date = parseISO('2024-06-27T12:56:00Z');
console.log(format(date, 'PPpp')); // Local time 