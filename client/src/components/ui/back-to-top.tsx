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
    // Check for .scroll-container before falling back to window
    const scrollContainer = document.querySelector('.scroll-container');
    if (scrollContainer) {
      return scrollContainer;
    }
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
        "fixed bottom-6 right-6 z-[9999] rounded-full shadow-xl",
        "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
        "transition-all duration-300 ease-in-out",
        "h-12 w-12 hover:scale-110 active:scale-95",
        "disabled:opacity-50 disabled:scale-100",
        "border border-blue-500/20 backdrop-blur-sm",
        className
      )}
      aria-label="Back to top"
    >
      <ChevronUp className={cn(
        "h-5 w-5 text-white transition-transform duration-200",
        isScrolling && "animate-pulse"
      )} />
    </Button>
  );
}