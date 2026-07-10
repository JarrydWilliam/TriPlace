import { ReactNode, useEffect } from 'react';

interface GlobalScrollWrapperProps {
  children: ReactNode;
}

export function GlobalScrollWrapper({ children }: GlobalScrollWrapperProps) {
  useEffect(() => {
    // Let iOS Safari handle natural scrolling on the body level
    // Remove the hardcoded overflow-y overrides that cause double-scrolling
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Cleanup any lingering inline styles that might conflict with index.css
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen w-full relative">
      {children}
    </div>
  );
}
