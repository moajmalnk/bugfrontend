import React from 'react';
import { getTimezoneInfo } from '@/lib/dateUtils';

export const TimezoneDebug: React.FC = () => {
  if (process.env.NODE_ENV !== 'development') return null;
  
  const timezoneInfo = getTimezoneInfo();
  const now = new Date();
  
  return (
    <div className="fixed bottom-20 left-2 z-50 bg-black/90 text-white p-3 rounded text-xs max-w-sm">
      <div className="font-bold mb-2">🕒 Timezone Debug</div>
      <div>Local Time: {now.toLocaleString()}</div>
      <div>UTC Time: {now.toISOString()}</div>
      <div>Timezone: {timezoneInfo.timezone}</div>
      <div>Offset: {timezoneInfo.offsetHours}h</div>
      <div>Timestamp: {now.getTime()}</div>
    </div>
  );
}; 