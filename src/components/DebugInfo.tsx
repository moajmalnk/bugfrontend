import { getCurrentLocalTime } from "@/lib/utils/dateUtils";
import { useErrorBoundary } from "./ErrorBoundaryManager";

export const DebugInfo = () => {
  const { isOnline, lastActivity } = useErrorBoundary();

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="fixed bottom-2 left-2 z-50 bg-black/80 text-white p-2 rounded text-xs">
      <div>Online: {isOnline ? "✅" : "❌"}</div>
      <div>Activity: {Math.floor((Date.now() - lastActivity) / 1000)}s ago</div>
      <div>Time: {getCurrentLocalTime()}</div>
    </div>
  );
};
