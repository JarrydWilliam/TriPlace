import { ReactNode, useEffect } from 'react';
import { BackToTop } from './back-to-top';

interface GlobalScrollWrapperProps {
  children: ReactNode;
}

export function GlobalScrollWrapper({ children }: GlobalScrollWrapperProps) {
  useEffect(() => {
    // Ensure document scrolling is enabled globally
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    
    // Remove any fixed positioning that might prevent scrolling
    document.body.style.position = 'static';
    document.body.style.height = 'auto';
    document.body.style.minHeight = '100vh';
    
    // Force scroll behavior to be smooth
    document.documentElement.style.scrollBehavior = 'smooth';
    
    return () => {
      // Cleanup if needed
    };
  }, []);

  return (
    <div className="min-h-screen w-full">
      {children}
      <BackToTop />
    </div>
  );
}