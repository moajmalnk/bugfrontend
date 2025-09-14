import { getTimezoneInfo } from "@/lib/dateUtils";
import {
  getCurrentLocalDate,
  getCurrentLocalTime,
} from "@/lib/utils/dateUtils";
import React from "react";

export const TimezoneDebug: React.FC = () => {
  // Allow showing in production via localStorage flag
  const showInProduction = localStorage.getItem("showTimezoneDebug") === "true";

  if (process.env.NODE_ENV !== "development" && !showInProduction) return null;

  const timezoneInfo = getTimezoneInfo();
  const now = new Date();

  return (
    <div className="fixed bottom-20 left-2 z-50 bg-black/90 text-white p-3 rounded text-xs max-w-sm">
      <div className="font-bold mb-2">🕒 Timezone Debug</div>
      <div>Environment: {process.env.NODE_ENV}</div>
      <div>Local Time: {getCurrentLocalTime()}</div>
      <div>Local Date: {getCurrentLocalDate()}</div>
      <div>UTC Time: {now.toISOString()}</div>
      <div>Timezone: {timezoneInfo.timezone}</div>
      <div>Offset: {timezoneInfo.offsetHours}h</div>
      <div>Timestamp: {now.getTime()}</div>
      <button
        onClick={() => {
          localStorage.removeItem("showTimezoneDebug");
          window.location.reload();
        }}
        className="mt-2 text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-700"
      >
        Hide Debug
      </button>
    </div>
  );
};
