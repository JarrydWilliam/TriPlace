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
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track all props and state in a ref to avoid stale closures in listeners
  const latestProps = useRef({
    onRefresh,
    resistance,
    pullDistance,
    triggerDistance,
    isRefreshing
  });

  useEffect(() => {
    latestProps.current = {
      onRefresh,
      resistance,
      pullDistance,
      triggerDistance,
      isRefreshing
    };
  }, [onRefresh, resistance, pullDistance, triggerDistance, isRefreshing]);

  // Use refs for gesture tracking to prevent listener rebinding mid-drag
  const state = useRef({
    isPulling: false,
    startY: 0,
    startX: 0,
    active: false,
    ignoreGesture: false
  });

  const PULL_START_THRESHOLD_PX = 8;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let mounted = true;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        state.current.ignoreGesture = true;
        return;
      }

      if (window.scrollY > 0 || latestProps.current.isRefreshing) return;

      const target = e.target;
      if (!(target instanceof Element)) return;

      const isInteractive = !!target.closest(
        'button, a, input, textarea, select, option, label, [role="button"], [role="link"], [role="menuitem"], [role="checkbox"], [role="radio"], [role="switch"], [data-radix-dropdown-menu-trigger], [data-radix-dialog-trigger], [data-radix-popover-trigger], [data-radix-select-trigger], [data-no-pull-to-refresh]'
      );

      if (isInteractive) {
        state.current.ignoreGesture = true;
        return;
      }

      state.current.ignoreGesture = false;
      state.current.startY = e.touches[0].clientY;
      state.current.startX = e.touches[0].clientX;
      state.current.isPulling = true;
      state.current.active = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) return;
      if (!state.current.isPulling || state.current.ignoreGesture || latestProps.current.isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = currentY - state.current.startY;
      const diffX = Math.abs(currentX - state.current.startX);

      if (!state.current.active && diffX > diffY) {
        state.current.isPulling = false;
        return;
      }

      if (diffY > 0 && window.scrollY <= 0) {
        if (diffY > PULL_START_THRESHOLD_PX) {
          state.current.active = true;
          e.preventDefault();
          const offset = Math.min((diffY - PULL_START_THRESHOLD_PX) / latestProps.current.resistance, latestProps.current.pullDistance);
          setPullOffset(offset);
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!state.current.isPulling) return;

      const wasActive = state.current.active;
      state.current.isPulling = false;
      state.current.active = false;
      state.current.ignoreGesture = false;

      if (wasActive && pullOffset >= latestProps.current.triggerDistance) {
        setIsRefreshing(true);
        setPullOffset(latestProps.current.triggerDistance);
        
        try {
          await latestProps.current.onRefresh();
        } catch (error) {
          console.error('Pull to refresh failed:', error);
        } finally {
          if (mounted) {
            setIsRefreshing(false);
            setPullOffset(0);
          }
        }
      } else {
        if (mounted) {
          setPullOffset(0);
        }
      }
    };

    // Bind once without dependencies changing mid-gesture
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      mounted = false;
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []); // Empty dependency array ensures exact same listener functions throughout component lifecycle

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
      className={`relative w-full ${className}`}
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
