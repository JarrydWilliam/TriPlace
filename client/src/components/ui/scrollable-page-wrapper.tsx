import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ScrollablePageWrapperProps {
  children: React.ReactNode;
  className?: string;
  enableAutoScroll?: boolean;
}

export function ScrollablePageWrapper({ 
  children, 
  className,
  enableAutoScroll = true 
}: ScrollablePageWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [needsScrolling, setNeedsScrolling] = useState(false);

  useEffect(() => {
    if (!enableAutoScroll) return;

    const checkOverflow = () => {
      if (containerRef.current && contentRef.current) {
        const containerHeight = containerRef.current.clientHeight;
        const contentHeight = contentRef.current.scrollHeight;
        const windowHeight = window.innerHeight;
        
        // Check if content exceeds container or window height
        const hasOverflow = contentHeight > containerHeight || contentHeight > windowHeight;
        setNeedsScrolling(hasOverflow);
        
        // Apply scrolling class if needed
        if (hasOverflow && containerRef.current) {
          containerRef.current.classList.add('overflow-y-auto');
          containerRef.current.classList.remove('overflow-hidden');
        } else if (containerRef.current) {
          containerRef.current.classList.remove('overflow-y-auto');
          containerRef.current.classList.add('overflow-hidden');
        }
      }
    };

    // Check on mount
    checkOverflow();

    // Check on resize
    const handleResize = () => {
      setTimeout(checkOverflow, 100); // Debounce for performance
    };

    window.addEventListener('resize', handleResize);
    
    // Check when content changes (using ResizeObserver for content)
    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
    });

    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [enableAutoScroll]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "adaptive-page-container",
        needsScrolling && "scrolling-enabled",
        className
      )}
    >
      <div
        ref={contentRef}
        className="adaptive-content"
      >
        {children}
      </div>
    </div>
  );
}