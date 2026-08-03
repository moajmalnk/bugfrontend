import { getCurrentLocalTime } from "@/lib/utils/dateUtils";
import { useErrorBoundary } from "./ErrorBoundaryManager";

export const DebugInfo = () => {
  const { isOnline, lastActivity } = useErrorBoundary();

  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-2 left-2 z-50 rounded-xl bg-black/80 p-2 text-xs text-white">
      <div>Online: {isOnline ? "yes" : "no"}</div>
      <div>Activity: {Math.floor((Date.now() - lastActivity) / 1000)}s ago</div>
      <div>Time: {getCurrentLocalTime()}</div>
    </div>
  );
};
