import { useState, useEffect } from 'react';
import { Button } from './button';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackToTopProps {
  threshold?: number;
  smooth?: boolean;
  className?: string;
}

export function BackToTop({ 
  threshold = 300, 
  smooth = true, 
  className 
}: BackToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, [threshold]);

  const scrollToTop = () => {
    if (smooth) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } else {
      window.scrollTo(0, 0);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={cn(
        "fixed bottom-4 right-4 z-50 rounded-full shadow-lg",
        "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
        "transition-all duration-300 ease-in-out",
        "h-12 w-12 hover:scale-110",
        className
      )}
      aria-label="Back to top"
    >
      <ChevronUp className="h-5 w-5 text-white" />
    </Button>
  );
}