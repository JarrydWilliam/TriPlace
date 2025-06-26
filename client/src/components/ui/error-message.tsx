import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function ErrorMessage({ 
  title = "Something went wrong", 
  message, 
  onRetry, 
  showRetry = true 
}: ErrorMessageProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <CardTitle className="text-red-900 dark:text-red-100">{title}</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      {showRetry && onRetry && (
        <CardContent>
          <Button onClick={onRetry} variant="outline" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

export function InlineErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div className="flex items-center space-x-2">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
        <p className="text-sm text-red-800 dark:text-red-200">{message}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="ghost" size="sm">
          <RefreshCw className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}