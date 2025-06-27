import { ErrorBoundary } from "@/components/error-boundary";
import { OfflineFallback } from "@/components/ui/offline-fallback";
import { ApiErrorHandler } from "@/components/ui/api-error-handler";
import { useEffect, useState } from "react";

interface ProductionWrapperProps {
  children: React.ReactNode;
}

export function ProductionWrapper({ children }: ProductionWrapperProps) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Global error handler for unhandled promises
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      setError(new Error(event.reason?.message || 'Unhandled error occurred'));
      setHasError(true);
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      setError(event.error);
      setHasError(true);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  const resetError = () => {
    setHasError(false);
    setError(null);
  };

  if (hasError && error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ApiErrorHandler error={error} onRetry={resetError} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <OfflineFallback />
      {children}
    </ErrorBoundary>
  );
}