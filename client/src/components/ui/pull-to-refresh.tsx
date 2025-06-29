import { useState, useRef, useCallback, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  threshold?: number;
  className?: string;
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  threshold = 80,
  className = ""
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    if (scrollTop > 0) return; // Only trigger at top of scroll
    
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || !containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    if (scrollTop > 0) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }
    
    currentY.current = e.touches[0].clientY;
    const distance = Math.max(0, currentY.current - startY.current);
    
    if (distance > 0) {
      e.preventDefault(); // Prevent default scroll behavior
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  }, [isPulling, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, onRefresh]);

  const shouldShowIndicator = isPulling && pullDistance > 20;
  const shouldTriggerRefresh = pullDistance >= threshold;

  return (
    <div 
      ref={containerRef}
      className={`pull-to-refresh mobile-scroll-wrapper ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: isPulling ? `translateY(${Math.min(pullDistance * 0.5, 40)}px)` : undefined,
        transition: isPulling ? 'none' : 'transform 0.3s ease'
      }}
    >
      <div 
        className={`pull-to-refresh-indicator ${shouldShowIndicator ? 'visible' : ''} ${isRefreshing ? 'refreshing' : ''}`}
        style={{
          opacity: shouldShowIndicator ? Math.min(pullDistance / threshold, 1) : 0,
          backgroundColor: shouldTriggerRefresh ? 'hsl(var(--primary))' : 'hsl(var(--background))',
          color: shouldTriggerRefresh ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))'
        }}
      >
        <RefreshCw 
          className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
          style={{
            transform: !isRefreshing ? `rotate(${Math.min(pullDistance * 2, 180)}deg)` : undefined
          }}
        />
      </div>
      
      {children}
    </div>
  );
}