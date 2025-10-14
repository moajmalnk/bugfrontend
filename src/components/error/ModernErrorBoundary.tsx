import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  fallbackRender?: (props: {
    error: Error | null;
    resetError: () => void;
    retry: () => void;
  }) => ReactNode;
}

export class ModernErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId || `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({
      error,
      errorInfo,
      errorId,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Error ID:', errorId);
      console.groupEnd();
    }

    // Report error to monitoring service
    this.reportError(error, errorInfo, errorId);

    // Call custom error handler
    this.props.onError?.(error, errorInfo, errorId);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.children !== this.props.children) {
      if (resetOnPropsChange) {
        this.resetError();
      }
    }

    if (hasError && resetKeys && prevProps.resetKeys) {
      if (resetKeys.some((key, index) => key !== prevProps.resetKeys?.[index])) {
        this.resetError();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    // In a real app, you would send this to your error reporting service
    const errorReport = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId(),
      retryCount: this.state.retryCount,
    };

    // Send to error reporting service (e.g., Sentry, LogRocket, etc.)
    this.sendErrorReport(errorReport);
  };

  private sendErrorReport = (errorReport: any) => {
    // Placeholder for error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport),
      // }).catch(console.error);
    }
  };

  private getCurrentUserId = (): string | null => {
    // Get current user ID from your auth context
    // This is a placeholder - implement based on your auth system
    return localStorage.getItem('userId') || null;
  };

  private resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  private retry = () => {
    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1,
    }));
    this.resetError();
  };

  private handleRetry = () => {
    this.retry();
  };

  private handleReset = () => {
    this.resetError();
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback, fallbackRender } = this.props;

    if (hasError) {
      // Use custom fallback render if provided
      if (fallbackRender) {
        return fallbackRender({
          error,
          resetError: this.handleReset,
          retry: this.handleRetry,
        });
      }

      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-6 text-center">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-destructive"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Something went wrong
              </h1>
              <p className="text-muted-foreground mb-4">
                We're sorry, but something unexpected happened. Please try again.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground mb-2">
                  Error Details
                </summary>
                <div className="bg-muted p-3 rounded text-xs font-mono overflow-auto max-h-32">
                  <div className="text-destructive font-semibold mb-1">
                    {error.name}: {error.message}
                  </div>
                  <pre className="whitespace-pre-wrap text-xs">
                    {error.stack}
                  </pre>
                </div>
              </details>
            )}

            <div className="space-y-2">
              <button
                onClick={this.handleRetry}
                className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                Try Again {retryCount > 0 && `(${retryCount})`}
              </button>
              
              <button
                onClick={this.handleReset}
                className="w-full bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors"
              >
                Reset
              </button>
              
              <button
                onClick={this.handleReload}
                className="w-full bg-muted text-muted-foreground px-4 py-2 rounded-md hover:bg-muted/90 transition-colors"
              >
                Reload Page
              </button>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              Error ID: {this.state.errorId}
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Hook for error boundary functionality
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};

// Higher-order component for error boundaries
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ModernErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ModernErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

export default ModernErrorBoundary;
