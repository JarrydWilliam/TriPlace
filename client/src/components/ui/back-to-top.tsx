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
  threshold = 200, 
  smooth = true, 
  className,
  containerSelector 
}: BackToTopProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  const getScrollContainer = useCallback(() => {
    if (containerSelector) {
      const container = document.querySelector(containerSelector);
      if (container) return container;
    }
    // Always use window/document for global scrolling
    return window;
  }, [containerSelector]);

  const getScrollPosition = useCallback(() => {
    const container = getScrollContainer();
    if (container === window) {
      return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    }
    return (container as Element)?.scrollTop || 0;
  }, [getScrollContainer]);

  const checkVisibility = useCallback(() => {
    const scrollPosition = getScrollPosition();
    setIsVisible(scrollPosition > threshold);
  }, [getScrollPosition, threshold]);

  useEffect(() => {
    const container = getScrollContainer();
    let debounceTimeout: NodeJS.Timeout;
    
    const debouncedCheckVisibility = () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(checkVisibility, 10); // Debounce for performance
    };

    // Add scroll listener to the detected container
    if (container) {
      container.addEventListener('scroll', debouncedCheckVisibility, { passive: true });
    }
    
    // Initial check
    checkVisibility();

    return () => {
      if (container) {
        container.removeEventListener('scroll', debouncedCheckVisibility);
      }
      clearTimeout(debounceTimeout);
    };
  }, [getScrollContainer, checkVisibility]);

  const scrollToTop = useCallback(() => {
    if (isScrolling) return; // Prevent multiple scrolls
    
    const container = getScrollContainer();
    setIsScrolling(true);
    
    if (container === window) {
      if (smooth) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo(0, 0);
      }
    } else {
      const element = container as Element;
      if (element) {
        if (smooth) {
          element.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          element.scrollTop = 0;
        }
      }
    }
    
    // Reset scrolling state after animation completes
    setTimeout(() => setIsScrolling(false), smooth ? 800 : 100);
  }, [getScrollContainer, smooth, isScrolling]);

  if (!isVisible) {
    return null;
  }

  return (
    <Button
      onClick={scrollToTop}
      disabled={isScrolling}
      size="icon"
      className={cn(
        "fixed bottom-6 right-6 z-[99999] rounded-full shadow-2xl",
        "bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-600",
        "transition-all duration-300 ease-in-out",
        "h-14 w-14 hover:scale-110 active:scale-95",
        "disabled:opacity-50 disabled:scale-100",
        "border-2 border-white/30 backdrop-blur-sm",
        "drop-shadow-lg hover:drop-shadow-xl",
        "safe-area-inset-bottom safe-area-inset-right",
        // Ensure visibility in production
        "block opacity-100 pointer-events-auto",
        className
      )}
      style={{
        // Force visibility with important styles
        display: 'flex',
        visibility: 'visible',
        opacity: 1,
        zIndex: 99999
      }}
      aria-label="Back to top"
    >
      <ChevronUp className={cn(
        "h-6 w-6 text-white transition-transform duration-200 drop-shadow-sm",
        isScrolling && "animate-pulse"
      )} />
    </Button>
  );
}