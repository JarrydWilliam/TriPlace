import PullToRefresh from 'react-simple-pull-to-refresh';
import { useQueryClient } from '@tanstack/react-query';
import { ReactNode } from 'react';

interface MobilePageWrapperProps {
  children: ReactNode;
  className?: string;
}

export function MobilePageWrapper({ children, className = "" }: MobilePageWrapperProps) {
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    // Invalidate all queries to refresh data
    await queryClient.invalidateQueries();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className={`pt-safe pb-safe px-safe mobile-page-container ${className}`}>
        {children}
      </div>
    </PullToRefresh>
  );
}