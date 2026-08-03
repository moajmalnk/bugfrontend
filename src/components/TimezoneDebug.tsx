import { getTimezoneInfo } from "@/lib/dateUtils";
import {
  getCurrentLocalDate,
  getCurrentLocalTime,
} from "@/lib/utils/dateUtils";

export const TimezoneDebug = () => {
  // Allow showing in production via localStorage flag
  const showInProduction =
    typeof localStorage !== "undefined" &&
    localStorage.getItem("showTimezoneDebug") === "true";

  const isDev = import.meta.env.DEV;
  if (!isDev && !showInProduction) return null;

  const timezoneInfo = getTimezoneInfo();
  const now = new Date();

  return (
    <div></div>
  );
};
