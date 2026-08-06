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
    <div className="min-h-[100dvh] bg-[#050d1a] flex items-center justify-center relative overflow-hidden text-center px-4">
      {/* Subtle Ambient Background Tint */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] max-w-[350px] max-h-[350px] rounded-full opacity-15 blur-[100px] bg-cyan-500/30 pointer-events-none" />

      {/* Refined Dark Glassmorphic Card */}
      <div className="bg-[#0a1526]/80 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-8 max-w-xs w-full flex flex-col items-center gap-5 relative z-10 shadow-lg">
        <div className="relative flex items-center justify-center">
          {/* Subtle Logo Container */}
          <div className="w-20 h-20 rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 flex items-center justify-center overflow-hidden">
            <Logo size="lg" className="w-full h-full object-contain" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <h1 className="text-xl font-bold tracking-tight text-white font-display">
            SameVibe
          </h1>
          <p className="text-xs font-medium text-cyan-400/80 tracking-wide">
            Find your people, Find your Vibe
          </p>

          <div className="flex items-center gap-1.5 mt-3">
            <div
              className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          {text && text !== "Loading..." && (
            <p className="text-xs text-slate-400 mt-2">{text}</p>
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
      <p className="text-xs text-cyan-400/90 font-medium tracking-wide">
        Find your people, Find your Vibe
      </p>
    </div>
  );
}