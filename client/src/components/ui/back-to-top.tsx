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
      return document.querySelector(containerSelector);
    }
    // Try to find scroll-container first, then fallback to window
    const scrollContainer = document.querySelector('.scroll-container');
    if (scrollContainer) {
      return scrollContainer;
    }
    return window;
  }, [containerSelector]);

  const getScrollPosition = useCallback(() => {
    const container = getScrollContainer();
    if (container === window) {
      return window.scrollY || document.documentElement.scrollTop;
    }
    return (container as Element)?.scrollTop || 0;
  }, [getScrollContainer]);

  const toggleVisibility = useCallback(() => {
    const scrollPosition = getScrollPosition();
    setIsVisible(scrollPosition > threshold);
  }, [getScrollPosition, threshold]);

  useEffect(() => {
    const container = getScrollContainer();
    
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      toggleVisibility();
      
      // Prevent scroll getting stuck by clearing any pending scroll operations
      setIsScrolling(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      
      // Initial check
      toggleVisibility();
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      clearTimeout(scrollTimeout);
    };
  }, [getScrollContainer, toggleVisibility]);

  const scrollToTop = useCallback(() => {
    const container = getScrollContainer();
    
    // Prevent multiple scroll operations
    if (isScrolling) return;
    
    setIsScrolling(true);
    
    if (container === window) {
      if (smooth) {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      } else {
        window.scrollTo(0, 0);
      }
    } else {
      const element = container as Element;
      if (element) {
        if (smooth) {
          element.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        } else {
          element.scrollTop = 0;
        }
      }
    }

    // Reset scrolling state after smooth scroll completes
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
        "fixed bottom-4 right-4 z-50 rounded-full shadow-lg",
        "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
        "transition-all duration-300 ease-in-out",
        "h-12 w-12 hover:scale-110 active:scale-95",
        "disabled:opacity-50 disabled:scale-100",
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