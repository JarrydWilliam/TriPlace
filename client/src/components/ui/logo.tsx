import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12", 
  lg: "w-16 h-16",
  xl: "w-24 h-24"
};

export function Logo({ size = "md", className }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="TriPlace Logo"
      className={cn(
        "rounded-lg object-contain", 
        sizeClasses[size],
        className
      )}
    />
  );
}