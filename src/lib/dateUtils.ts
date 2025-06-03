import { formatDistanceToNow, format, isToday, isYesterday, isThisYear, parseISO } from 'date-fns';

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
 * Format for bug cards and lists - shows relative time with smart fallback
 */
export function formatBugDate(dateString: string): string {
  return formatDateProfessional(dateString, { 
    relative: true, 
    includeTime: false 
  });
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