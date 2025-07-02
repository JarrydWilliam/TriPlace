import { useState, useEffect, useCallback } from 'react';
import { Button } from './button';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackToTopProps {
  threshold?: number;
  smooth?: boolean;
  className?: string;
  containerSelector?: string;
}

export function BackToTop({ 
  threshold = 100, 
  smooth = true, 
  className 
}: BackToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  const checkVisibility = useCallback(() => {
    // Simple check - use window scroll position
    const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    setIsVisible(scrollY > threshold);
  }, [threshold]);

  useEffect(() => {
    // Single scroll listener on window for simplicity
    window.addEventListener('scroll', checkVisibility, { passive: true });
    
    // Initial check
    checkVisibility();
    
    // Periodic check to ensure visibility is accurate
    const interval = setInterval(checkVisibility, 500);

    return () => {
      window.removeEventListener('scroll', checkVisibility);
      clearInterval(interval);
    };
  }, [checkVisibility]);

  const scrollToTop = useCallback(() => {
    // Simple scroll to top - use window scroll
    if (smooth) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo(0, 0);
    }
  }, [smooth]);

  if (!isVisible) {
    return null;
  }

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={cn(
        "fixed bottom-6 right-6 z-[9999] rounded-full shadow-xl",
        "bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-600",
        "transition-all duration-300 ease-in-out",
        "h-14 w-14 hover:scale-110 active:scale-95",
        "border-2 border-white/20 backdrop-blur-sm",
        className
      )}
      aria-label="Back to top"
    >
      <ChevronUp className="h-5 w-5 text-white" />
    </Button>
  );
}