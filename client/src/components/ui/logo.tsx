import logoPath from "@assets/image(notext)_1750965200121.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "md", className = "" }: LogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-16 h-16"
  };

  return (
    <img 
      src={logoPath} 
      alt="TriPlace Logo" 
      className={`${sizeClasses[size]} rounded-lg ${className}`}
    />
  );
}