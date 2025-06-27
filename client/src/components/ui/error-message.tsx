import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function InlineErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-destructive", className)}>
      <AlertTriangle className="w-4 h-4" />
      <span>{message}</span>
    </div>
  );
}