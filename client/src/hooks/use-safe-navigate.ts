import { useLocation } from "wouter";
import { useCallback, useEffect, useRef } from "react";

/**
 * Checks the real DOM for explicitly open overlay elements.
 * Returns true if ANY confirmed dialog, sheet, or popover is open.
 */
export function hasActiveOverlay(): boolean {
  const activeModals = document.querySelectorAll(`
    [role="dialog"][data-state="open"],
    [role="alertdialog"][data-state="open"],
    [data-state="open"][data-radix-dialog-content],
    [data-state="open"][data-radix-alert-dialog-content],
    [data-state="open"][data-radix-popover-content],
    [data-state="open"][data-radix-menu-content]
  `);
  return activeModals.length > 0;
}

export function useSafeNavigate() {
  const [, setLocation] = useLocation();
  const pendingNavigationRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const navigateAfterClose = useCallback((
    closeFn: () => void,
    destination: string
  ) => {
    if (pendingNavigationRef.current !== null) return;
    
    pendingNavigationRef.current = destination;
    
    // Call the controlled close state
    closeFn();

    const attemptNavigation = () => {
      if (!pendingNavigationRef.current) return;
      
      if (!hasActiveOverlay()) {
        const dest = pendingNavigationRef.current;
        pendingNavigationRef.current = null;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        requestAnimationFrame(() => setLocation(dest));
      } else {
        // If still open, try again on next frame
        requestAnimationFrame(attemptNavigation);
      }
    };

    requestAnimationFrame(attemptNavigation);
    
    // Defensive fallback: If the overlay gets stuck in closing state, navigate anyway after 250ms
    timeoutRef.current = setTimeout(() => {
      if (pendingNavigationRef.current) {
        const dest = pendingNavigationRef.current;
        pendingNavigationRef.current = null;
        setLocation(dest);
      }
    }, 250);
  }, [setLocation]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      pendingNavigationRef.current = null;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return navigateAfterClose;
}
