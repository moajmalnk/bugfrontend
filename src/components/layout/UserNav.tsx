import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserIcon, LogOut, Settings, User as UserAvatar, Shield, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function UserNav() {
  const { currentUser, logout } = useAuth();
  const role = currentUser?.role;

  const defaultAvatar = "https://codoacademy.com/uploads/system/e7c3fb5390c74909db1bb3559b24007a.png";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={cn(
            "relative h-10 w-10 rounded-xl transition-all duration-200",
            "hover:bg-accent/80 hover:scale-105 focus:ring-2 focus:ring-accent/20",
            "active:scale-95"
          )}
          aria-label="User menu"
        >
          <div className="relative">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt="User avatar"
                className="h-10 w-10 rounded-xl object-cover ring-2 ring-border/50 hover:ring-accent/50 transition-all duration-200"
              />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center ring-2 ring-border/50 hover:ring-accent/50 transition-all duration-200">
                <UserIcon className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            {/* Online status indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-64 p-2" 
        align="end" 
        forceMount
        sideOffset={8}
      >
        {/* User Info Header */}
        <DropdownMenuLabel className="p-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt="User avatar"
                  className="h-12 w-12 rounded-xl object-cover ring-2 ring-border/50"
                />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center ring-2 ring-border/50">
                  <UserIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {currentUser?.name || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {currentUser?.email || "No email"}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Shield className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground capitalize">
                  {role || "User"}
                </span>
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="my-2" />
        
        {/* Menu Items */}
        <div className="space-y-1">
          <DropdownMenuItem asChild>
            <Link 
              to={role ? `/${role}/profile` : '/profile'} 
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/80 transition-colors duration-200"
            >
              <UserAvatar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Profile</span>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link 
              to={role ? `/${role}/settings` : '/settings'}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/80 transition-colors duration-200"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Settings</span>
            </Link>
          </DropdownMenuItem>
        </div>
        
        <DropdownMenuSeparator className="my-2" />
        
        {/* Logout */}
        <DropdownMenuItem 
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors duration-200 focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span className="font-medium">Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
