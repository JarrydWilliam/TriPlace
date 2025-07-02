import { cn } from "@/lib/utils";
import { Logo } from "./ui/logo";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  text?: string;
  useLogo?: boolean;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-8 h-8", 
  lg: "w-12 h-12",
  xl: "w-16 h-16"
};

export function LoadingSpinner({ size = "md", className, text, useLogo = false }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      {useLogo ? (
        <div className="animate-pulse">
          <Logo size={size} className={className} />
        </div>
      ) : (
        <div
          className={cn(
            "animate-spin rounded-full border-4 border-gray-300 border-t-primary",
            sizeClasses[size],
            className
          )}
        />
      )}
      {text && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>
      )}
    </div>
  );
}

export function PageLoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <LoadingSpinner size="xl" text={text} useLogo={true} />
    </div>
  );
}

export function ComponentLoadingSpinner({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <LoadingSpinner size="lg" text={text} useLogo={true} />
    </div>
  );
}