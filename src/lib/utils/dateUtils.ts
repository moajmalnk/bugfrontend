/**
 * Date utility functions for consistent date formatting across the application
 * Converts UTC dates to local time and provides consistent formatting
 */

/**
 * Converts a UTC date string to local time and formats it for display
 * @param dateString - UTC date string from API
 * @param format - Format type: 'date', 'time', 'datetime', 'relative'
 * @returns Formatted date string in local time
 */
export const formatLocalDate = (
  dateString: string | Date,
  format: 'date' | 'time' | 'datetime' | 'relative' = 'datetime'
): string => {
  try {
    let date: Date;
    
    // Handle date strings that are in IST format (YYYY-MM-DD HH:MM:SS without timezone)
    if (typeof dateString === 'string' && !dateString.includes('T') && !dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
      // Parse as IST time by appending timezone info
      const dateWithTz = dateString.replace(' ', 'T') + '+05:30';
      date = new Date(dateWithTz);
    } else {
      date = new Date(dateString);
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    // Use the date directly since it's already parsed with IST timezone
    const calcuttaTime = date;

    switch (format) {
      case 'date':
        return calcuttaTime.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Kolkata',
        });

      case 'time':
        return calcuttaTime.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata',
        });

      case 'datetime':
        return calcuttaTime.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Kolkata',
        }) + ', ' + calcuttaTime.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata',
        });

      case 'relative':
        const now = new Date();
        const diffInMs = now.getTime() - calcuttaTime.getTime();
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        
        return calcuttaTime.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Kolkata',
        });

      default:
        return calcuttaTime.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Kolkata',
        });
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Gets the current local time in a formatted string
 * @returns Current local time string
 */
export const getCurrentLocalTime = (): string => {
  const now = new Date();
  // Convert to Asia/Calcutta timezone
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const calcuttaTime = new Date(utcTime + (5.5 * 60 * 60000));
  
  return calcuttaTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
};

/**
 * Gets the current local date in a formatted string
 * @returns Current local date string
 */
export const getCurrentLocalDate = (): string => {
  const now = new Date();
  // Convert to Asia/Calcutta timezone
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const calcuttaTime = new Date(utcTime + (5.5 * 60 * 60000));
  
  return calcuttaTime.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
};

/**
 * Converts a UTC timestamp to local time
 * @param timestamp - UTC timestamp
 * @returns Local Date object
 */
export const utcToLocal = (timestamp: string | number | Date): Date => {
  const date = new Date(timestamp);
  // Convert to Asia/Calcutta timezone (UTC+5:30)
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utcTime + (5.5 * 60 * 60000));
};

/**
 * Formats a date for input fields (YYYY-MM-DD format)
 * @param dateString - Date string
 * @returns Formatted date string for input fields
 */
export const formatDateForInput = (dateString: string | Date): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  // Convert to Asia/Calcutta timezone for input fields
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  const calcuttaTime = new Date(utcTime + (5.5 * 60 * 60000));
  return calcuttaTime.toISOString().split('T')[0];
};

/**
 * Converts any date to Asia/Calcutta timezone
 * @param dateString - Date string or Date object
 * @returns Date object in Asia/Calcutta timezone
 */
export const toCalcuttaTime = (dateString: string | Date): Date => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return new Date();
  
  // Convert to Asia/Calcutta timezone (UTC+5:30)
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utcTime + (5.5 * 60 * 60000));
};

/**
 * Gets the current time in Asia/Calcutta timezone
 * @returns Current time in Asia/Calcutta
 */
export const getCurrentCalcuttaTime = (): Date => {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcTime + (5.5 * 60 * 60000));
};
