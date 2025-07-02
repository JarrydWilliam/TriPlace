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
    // Try multiple container selectors in order of preference
    const selectors = ['.scroll-container', '.mobile-page-container', 'main', 'body'];
    for (const selector of selectors) {
      const container = document.querySelector(selector);
      if (container && container.scrollHeight > container.clientHeight) {
        return container;
      }
    }
    return window;
  }, [containerSelector]);

  const getScrollPosition = useCallback(() => {
    const container = getScrollContainer();
    if (container === window) {
      return Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop);
    }
    return (container as Element)?.scrollTop || 0;
  }, [getScrollContainer]);

  const toggleVisibility = useCallback(() => {
    const scrollPosition = getScrollPosition();
    const shouldShow = scrollPosition > threshold;
    setIsVisible(shouldShow);
  }, [getScrollPosition, threshold]);

  useEffect(() => {
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

    // Add scroll listeners to multiple containers to ensure detection works everywhere
    const containers = [
      window,
      document.body,
      document.documentElement,
      document.querySelector('.mobile-page-container'),
      document.querySelector('.scroll-container'),
      document.querySelector('.mobile-scroll-wrapper'),
      getScrollContainer()
    ].filter(Boolean).filter((container, index, array) => 
      array.indexOf(container) === index // Remove duplicates
    );

    containers.forEach(container => {
      if (container) {
        container.addEventListener('scroll', handleScroll, { passive: true });
      }
    });
    
    // Initial check
    toggleVisibility();
    
    // Additional checks with interval to catch any missed scroll events
    const checkInterval = setInterval(toggleVisibility, 1000);

    return () => {
      containers.forEach(container => {
        if (container) {
          container.removeEventListener('scroll', handleScroll);
        }
      });
      clearTimeout(scrollTimeout);
      clearInterval(checkInterval);
    };
  }, [getScrollContainer, toggleVisibility]);

  const scrollToTop = useCallback(() => {
    // Prevent multiple scroll operations
    if (isScrolling) return;
    
    setIsScrolling(true);
    
    // Try to scroll all possible containers to ensure we reach the top
    const allContainers = [
      window,
      document.body,
      document.documentElement,
      document.querySelector('.mobile-page-container'),
      document.querySelector('.scroll-container'),
      document.querySelector('.mobile-scroll-wrapper')
    ].filter(Boolean);
    
    allContainers.forEach(container => {
      try {
        if (container === window) {
          if (smooth) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            window.scrollTo(0, 0);
          }
        } else {
          const element = container as Element;
          if (element && element.scrollTop > 0) {
            if (smooth) {
              element.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              element.scrollTop = 0;
            }
          }
        }
      } catch (error) {
        // Silently continue if a container doesn't support scrollTo
      }
    });

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
        "fixed bottom-6 right-6 z-[9999] rounded-full shadow-xl",
        "bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-600",
        "transition-all duration-300 ease-in-out",
        "h-14 w-14 hover:scale-110 active:scale-95",
        "disabled:opacity-50 disabled:scale-100",
        "border-2 border-white/20 backdrop-blur-sm",
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