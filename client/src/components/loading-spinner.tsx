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
    <div className="min-h-[100dvh] bg-[#080612] flex items-center justify-center relative overflow-hidden text-center px-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full opacity-20 blur-[100px] bg-primary/40 pointer-events-none" />

      <div className="flex flex-col items-center gap-5 relative z-10">
        <div className="relative">
          <div className="absolute inset-0 rounded-full border border-primary/30 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]" />

          <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/40 rounded-full flex items-center justify-center backdrop-blur-xl shadow-[0_0_40px_rgba(255,107,53,0.3)] overflow-hidden">
            <Logo size="xl" className="w-full h-full object-cover rounded-full" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            SameVibe
          </h1>
          <p className="text-sm font-medium text-pink-400/90 tracking-wide">
            Find Your People, Find Your ThirdPlace
          </p>

          <div className="flex items-center gap-1 mt-2">
            <div
              className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          {text && text !== "Loading..." && (
            <p className="text-xs text-white/50 mt-1">{text}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ComponentLoadingSpinner({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3">
      <LoadingSpinner size="lg" text={text} useLogo={true} />
      <p className="text-xs text-muted-foreground font-medium">
        Find Your People, Find Your ThirdPlace
      </p>
    </div>
  );
}