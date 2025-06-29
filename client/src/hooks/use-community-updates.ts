import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface CommunityUpdateStatus {
  lastUpdate: number;
  hasUpdates: boolean;
  message: string;
}

export function useCommunityUpdates() {
  const [lastChecked, setLastChecked] = useState(Date.now());
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkForUpdates = async () => {
      try {
        const response = await fetch(`/api/community-updates/status?timestamp=${lastChecked}`);
        if (response.ok) {
          const status: CommunityUpdateStatus = await response.json();
          
          if (status.hasUpdates) {
            console.log('Community updates available:', status.message);
            setUpdateAvailable(true);
            
            // Invalidate all community-related queries
            await queryClient.invalidateQueries({ queryKey: ["/api/communities/recommended"] });
            await queryClient.invalidateQueries({ queryKey: ["/api/users"] });
            
            // Update timestamp
            setLastChecked(status.lastUpdate);
            
            // Notify service worker if available
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'GLOBAL_COMMUNITY_UPDATE'
              });
            }
          }
        }
      } catch (error) {
        // Silently handle errors - network issues are common
      }
    };

    // Check for updates every 30 seconds
    intervalId = setInterval(checkForUpdates, 30000);
    
    // Initial check
    checkForUpdates();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [lastChecked, queryClient]);

  const markUpdatesApplied = () => {
    setUpdateAvailable(false);
  };

  return {
    updateAvailable,
    markUpdatesApplied
  };
}