import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useState, useEffect } from "react";

interface ApiErrorHandlerProps {
  error: Error | null;
  onRetry: () => void;
  showNetworkCheck?: boolean;
}

export function ApiErrorHandler({ error, onRetry, showNetworkCheck = true }: ApiErrorHandlerProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!error) return null;

  const isNetworkError = error.message.includes('fetch') || error.message.includes('network') || !isOnline;

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          {isNetworkError ? (
            <WifiOff className="w-5 h-5 text-destructive" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-destructive" />
          )}
          <CardTitle className="text-sm">
            {isNetworkError ? 'Connection Problem' : 'Something went wrong'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {isNetworkError 
            ? 'Check your internet connection and try again.' 
            : 'An unexpected error occurred. Please try again.'}
        </p>
        
        {showNetworkCheck && (
          <div className="flex items-center space-x-2 text-xs">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
              {isOnline ? 'Connected' : 'Offline'}
            </span>
          </div>
        )}
        
        <Button onClick={onRetry} size="sm" className="w-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs bg-muted p-2 rounded mt-2">
            <summary className="cursor-pointer">Error Details</summary>
            <pre className="mt-1 whitespace-pre-wrap">{error.message}</pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}