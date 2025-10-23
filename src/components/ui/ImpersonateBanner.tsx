import { Button } from "@/components/ui/button";
import { X, Shield, AlertTriangle, User, Mail, UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function ImpersonateBanner() {
  const { currentUser, exitImpersonateMode } = useAuth();

  // Check if we're in impersonate mode by looking for admin_id in the token payload
  const isImpersonating = currentUser?.admin_id && currentUser.admin_id !== currentUser.id;

  if (!isImpersonating) {
    return null;
  }

  const handleExitImpersonate = () => {
    if (exitImpersonateMode) {
      exitImpersonateMode();
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'developer':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'tester':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 text-white border-b border-orange-500/30 shadow-lg fixed top-0 left-0 right-0 z-30 animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Mobile Layout - Center aligned, single row */}
        <div className="flex flex-col sm:hidden items-center justify-center gap-4">
          <div className="flex items-center justify-center gap-4 w-full">
            {/* Warning badge */}
            <div className="flex items-center gap-2 bg-white text-orange-600 px-3 py-2 rounded-lg font-semibold shadow-sm border border-orange-200">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-bold">IMPERSONATE MODE</span>
            </div>
            
            {/* Exit button */}
            <Button
              onClick={handleExitImpersonate}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              <X className="h-4 w-4 mr-2" />
              Exit
            </Button>
          </div>
        </div>

        {/* Desktop Layout - Full details */}
        <div className="hidden sm:flex lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Left side - Warning and user info */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 w-full lg:w-auto">
            {/* Warning badge */}
            <div className="flex items-center gap-2 bg-white text-orange-600 px-3 py-2 rounded-lg font-semibold shadow-sm border border-orange-200 flex-shrink-0">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-bold whitespace-nowrap">IMPERSONATE MODE</span>
            </div>
            
            {/* User information */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                {/* User avatar and name */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center shadow-sm flex-shrink-0 border-2 border-white/20">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-white truncate">
                      {currentUser?.name || currentUser?.username}
                    </span>
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3 text-orange-100 flex-shrink-0" />
                      <span className="text-xs text-orange-100 truncate">
                        {currentUser?.email}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Role badge */}
                <Badge 
                  variant="outline" 
                  className={`${getRoleColor(currentUser?.role || '')} border text-xs font-medium flex-shrink-0`}
                >
                  <UserCheck className="h-3 w-3 mr-1" />
                  {currentUser?.role?.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Right side - Exit button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleExitImpersonate}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  <X className="h-4 w-4 mr-2" />
                  Exit
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Return to your admin dashboard</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
