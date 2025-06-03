import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/context/AuthContext';
import { BugProvider } from '@/context/BugContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';

interface AppProvidersProps {
  children: ReactNode;
  queryClient: QueryClient;
}

// Providers that don't need router context
export const CoreProviders = ({ children, queryClient }: AppProvidersProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <Toaster />
          <Sonner />
          {children}
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

// Providers that need router context
export const RouterProviders = ({ children }: { children: ReactNode }) => {
  return (
    <AuthProvider>
      <BugProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </BugProvider>
    </AuthProvider>
  );
};

// Legacy export for backward compatibility
const AppProviders = ({ children, queryClient }: AppProvidersProps) => {
  return (
    <CoreProviders queryClient={queryClient}>
      <RouterProviders>
        {children}
      </RouterProviders>
    </CoreProviders>
  );
};

export default AppProviders;
