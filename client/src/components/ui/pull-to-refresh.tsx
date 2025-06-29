import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  pullDistance?: number;
  triggerDistance?: number;
  resistance?: number;
  className?: string;
}

export function PullToRefresh({
  onRefresh,
  children,
  pullDistance = 80,
  triggerDistance = 60,
  resistance = 2.5,
  className = ''
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullOffset, setPullOffset] = useState(0);
  const [startY, setStartY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault();
      const offset = Math.min(diff / resistance, pullDistance);
      setPullOffset(offset);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;

    setIsPulling(false);

    if (pullOffset >= triggerDistance) {
      setIsRefreshing(true);
      setPullOffset(triggerDistance);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullOffset(0);
      }
    } else {
      setPullOffset(0);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullOffset, startY, isRefreshing]);

  const getRefreshIndicator = () => {
    if (isRefreshing) {
      return (
        <div className="flex items-center justify-center py-2">
          <svg className="animate-spin h-5 w-5 text-blue-500 dark:text-cyan-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8z" />
          </svg>
        </div>
      );
    }

    if (pullOffset > 0) {
      const progress = Math.min(pullOffset / triggerDistance, 1);
      return (
        <div className="flex flex-col items-center justify-center py-2">
          <div 
            className="h-8 w-8 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center transition-transform duration-150"
            style={{ transform: `rotate(${progress * 180}deg)` }}
          >
            <div className="h-2 w-2 bg-blue-500 dark:bg-cyan-400 rounded-full" />
          </div>
          {pullOffset >= triggerDistance && (
            <div className="text-xs text-blue-500 dark:text-cyan-400 mt-1">Release to refresh</div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div 
      ref={containerRef}
      className={`mobile-page-container overflow-y-auto overscroll-contain ${className}`}
      style={{
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        paddingTop: pullOffset > 0 ? `${pullOffset}px` : '0px',
        transition: isPulling ? 'none' : 'padding-top 0.3s ease-out'
      }}
    >
      {pullOffset > 0 && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-10"
          style={{ 
            height: `${pullOffset}px`,
            marginTop: `-${pullOffset}px`
          }}
        >
          {getRefreshIndicator()}
        </div>
      )}
      {children}
    </div>
  );
}