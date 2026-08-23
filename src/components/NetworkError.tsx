import { BrandStatusVideoScreen } from "@/components/status/BrandStatusVideoScreen";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NetworkError = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  return (
    <BrandStatusVideoScreen variant="offline">
      <p className="text-sm font-medium uppercase tracking-wide text-amber-400 mb-2">
        Offline
      </p>
      <h2 className="text-2xl font-bold text-white mb-3">Connection lost</h2>
      <p className="text-sm text-slate-300 mb-6 leading-relaxed">
        We&apos;re having trouble connecting to the server. Check your internet connection
        or try again in a moment.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl h-11 border-white/20 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
          onClick={() => navigate(`/${currentUser?.role || "tester"}/projects`)}
        >
          Back to Home
        </Button>
        <Button
          type="button"
          className="rounded-xl h-11"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Page
        </Button>
      </div>
    </BrandStatusVideoScreen>
  );
};

export default NetworkError;
