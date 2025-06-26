import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
  hasBottomNav?: boolean;
  hasHeader?: boolean;
  fullHeight?: boolean;
}

export function MobileLayout({ 
  children, 
  className, 
  hasBottomNav = false, 
  hasHeader = true,
  fullHeight = true 
}: MobileLayoutProps) {
  return (
    <div className={cn(
      "w-full mx-auto",
      "safe-area-top safe-area-bottom safe-area-left safe-area-right",
      fullHeight && "min-h-screen",
      // Mobile-first responsive widths
      "max-w-full", // Mobile: full width
      "sm:max-w-md sm:mx-auto", // Small tablets: centered with max width
      "md:max-w-2xl", // Medium screens
      "lg:max-w-4xl", // Large screens
      "xl:max-w-6xl", // Extra large screens
      className
    )}>
      <div className={cn(
        "flex flex-col",
        fullHeight && "min-h-screen",
        hasHeader && "pwa-header",
        hasBottomNav && "pb-16" // Space for bottom navigation
      )}>
        {children}
      </div>
    </div>
  );
}

interface MobileHeaderProps {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
}

export function MobileHeader({ children, className, sticky = true }: MobileHeaderProps) {
  return (
    <header className={cn(
      "w-full bg-background/95 backdrop-blur-sm border-b border-border",
      "px-4 py-3",
      "flex items-center justify-between",
      "min-h-[56px]", // Standard mobile header height
      sticky && "sticky top-0 z-40",
      "touch-target",
      className
    )}>
      {children}
    </header>
  );
}

interface MobileContentProps {
  children: ReactNode;
  className?: string;
  scrollable?: boolean;
  padding?: boolean;
}

export function MobileContent({ 
  children, 
  className, 
  scrollable = true, 
  padding = true 
}: MobileContentProps) {
  return (
    <main className={cn(
      "flex-1 w-full",
      scrollable && "mobile-scroll overflow-y-auto",
      padding && "px-4 py-2",
      "focus-visible:outline-none",
      className
    )}>
      {children}
    </main>
  );
}

interface MobileBottomNavProps {
  children: ReactNode;
  className?: string;
}

export function MobileBottomNav({ children, className }: MobileBottomNavProps) {
  return (
    <nav className={cn(
      "mobile-nav",
      "flex items-center justify-around",
      "px-4",
      className
    )}>
      {children}
    </nav>
  );
}

interface MobileCardProps {
  children: ReactNode;
  className?: string;
  clickable?: boolean;
  padding?: boolean;
}

export function MobileCard({ 
  children, 
  className, 
  clickable = false, 
  padding = true 
}: MobileCardProps) {
  return (
    <div className={cn(
      "bg-card border border-border rounded-lg",
      "shadow-sm",
      padding && "p-4",
      clickable && [
        "cursor-pointer",
        "transition-all duration-200",
        "hover:shadow-md",
        "active:scale-[0.98]",
        "touch-target"
      ],
      className
    )}>
      {children}
    </div>
  );
}

interface MobileButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function MobileButton({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className,
  onClick,
  disabled = false,
  fullWidth = false
}: MobileButtonProps) {
  const baseClasses = "button-mobile inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70 border border-border",
    ghost: "bg-transparent text-foreground hover:bg-accent/50 active:bg-accent/70"
  };

  const sizes = {
    sm: "text-sm px-3 py-2 min-h-[40px]",
    md: "text-base px-6 py-3 min-h-[48px]",
    lg: "text-lg px-8 py-4 min-h-[56px]"
  };

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

interface MobileInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
  className?: string;
  disabled?: boolean;
}

export function MobileInput({ 
  placeholder, 
  value, 
  onChange, 
  type = "text",
  className,
  disabled = false
}: MobileInputProps) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      className={cn(
        "mobile-input",
        "w-full",
        "bg-background border border-border",
        "text-foreground placeholder:text-muted-foreground",
        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    />
  );
}