import { ReactNode, useEffect } from 'react';

interface GlobalScrollWrapperProps {
  children: ReactNode;
}

export function GlobalScrollWrapper({ children }: GlobalScrollWrapperProps) {
  useEffect(() => {
    // Force scrolling to be enabled globally — critical for iOS WebKit
    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.height = '100%';
    document.body.style.overflowY = 'auto';
    document.body.style.position = 'static';
    document.body.style.height = 'auto';
    document.body.style.minHeight = '100dvh';
    document.documentElement.style.scrollBehavior = 'smooth';
  }, []);

  return (
    <div style={{ minHeight: '100dvh', width: '100%', overflowY: 'auto' }}>
      {children}
    </div>
  );
}
