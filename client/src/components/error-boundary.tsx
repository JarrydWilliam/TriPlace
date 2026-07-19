import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Priority 1: Minimal Fatal-Error Interaction Recovery
 * Safely clears orphaned Radix pointer-events traps if a component crashes while a modal is open.
 */
export function resetFatalInteractionState() {
  if (typeof document === 'undefined') return;
  
  try {
    // 1. Remove inline locks
    document.body.style.removeProperty("pointer-events");
    document.documentElement.style.removeProperty("pointer-events");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
    
    // 2. Remove Radix data locks
    document.body.removeAttribute("data-scroll-locked");
    document.documentElement.removeAttribute("data-scroll-locked");

    // Note: We no longer forcefully remove [data-radix-portal] DOM nodes.
    // We allow React to retain ownership of the DOM and rely exclusively 
    // on z-index (9999) and pointer-events (auto) on the fallback root 
    // to ensure interaction, preserving standard React/Radix unmount safety.
  } catch (e) {
    console.error("[SameVibe] Failed to execute fatal interaction cleanup:", e);
  }
}

/**
 * Wrapper to ensure cleanup runs deterministically when the fallback UI mounts
 */
function FatalFallbackCleanup() {
  useEffect(() => {
    resetFatalInteractionState();
    const frameId = requestAnimationFrame(() => resetFatalInteractionState());
    return () => cancelAnimationFrame(frameId);
  }, []);
  return null;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Priority 1: Synchronous cleanup immediately upon capture
    resetFatalInteractionState();

    // Priority 1: Privacy-safe diagnostic logging
    const diagnostics = {
      timestamp: new Date().toISOString(),
      route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      exception: error.name || 'UnknownError',
      message: error.message,
      componentStack: errorInfo.componentStack?.substring(0, 500),
      bodyPointerEvents: typeof document !== 'undefined' ? document.body.style.pointerEvents : 'unknown',
      bodyLocked: typeof document !== 'undefined' ? !!document.body.getAttribute('data-scroll-locked') : false,
      platform: navigator?.userAgent,
      openPortals: typeof document !== 'undefined' ? document.querySelectorAll('[data-radix-portal]').length : 0
    };
    
    console.error("[SameVibe Fatal Diagnostics]", diagnostics);

    this.setState({
      error,
      errorInfo,
    });
  }

  retry = () => {
    resetFatalInteractionState();
    window.location.reload();
  };

  goHome = () => {
    resetFatalInteractionState();
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <>
            <FatalFallbackCleanup />
            <FallbackComponent error={this.state.error!} retry={this.retry} />
          </>
        );
      }

      // Priority 1: Independent interactive fallback root
      return (
        <div className="fixed inset-0 z-[9999] pointer-events-auto overflow-auto bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 sm:p-safe">
          <FatalFallbackCleanup />
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-red-900 dark:text-red-100">Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={this.retry} 
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button 
                onClick={this.goHome}
                className="w-full"
                variant="ghost"
              >
                Go Home
              </Button>
              {this.state.error && import.meta.env.DEV && (
                <details className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <summary className="cursor-pointer text-sm font-medium">
                    Error Details
                  </summary>
                  <pre className="mt-2 text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap break-words">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}